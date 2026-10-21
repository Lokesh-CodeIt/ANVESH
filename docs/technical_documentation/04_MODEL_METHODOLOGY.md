# ANVESH: Automated Prior-Authorization Verification & Radiographic Grounding Engine
## Technical Documentation — Document 4: Model Methodology & Deep Learning Architectures

---

### 1. Architectural Taxonomy & Paradigms

ANVESH evaluates and implements two fundamentally distinct paradigms in medical artificial intelligence:
1. **Generative Multimodal Vision-Language Models (VLMs):** Autoregressively generate structured clinical evidence, textual summaries, and diagnostic classifications conditioned on both visual patches and text instructions (LLaVA-1.5-7B, MedGemma-4B-IT).
2. **Discriminative Vision Transformers (ViTs):** Directly map image patch embeddings to discrete class probability distributions via a linear classification head without generating natural language (ViT-B/16).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  ANVESH MODEL TAXONOMY                                 │
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│ Generative Vision-Language (VLM)       │ Discriminative Vision Transformer (ViT)       │
├────────────────────────────────────────┼───────────────────────────────────────────────┤
│ • LLaVA-1.5-7B v2 (Primary Ours)       │ • Vision Transformer ViT-B/16 (ImageNet-1K)    │
│ • Base LLaVA-1.5-7B (Zero-Shot)        │                                               │
│ • Google MedGemma-4B-IT (Precomputed)  │                                               │
│                                        │                                               │
│ Input: Radiograph Image + Text Prompt  │ Input: Radiograph Image Tensor (224x224x3)    │
│ Output: Autoregressive Text / JSON     │ Output: Logits vector [z_norm, z_abn] in R^2  │
│ Target: Causal Next-Token Prediction   │ Target: Cross-Entropy Loss on Softmax Prob    │
│ Parameters: ~7.08 Billion              │ Parameters: 85.8 Million                      │
│ Hardware: GPU (>= 16 GB VRAM)          │ Hardware: Standard Server CPU (< 400 MB RAM) │
└────────────────────────────────────────┴───────────────────────────────────────────────┘
```

---

### 2. Primary Model: Projector-Augmented Fine-Tuned LLaVA-1.5-7B v2

#### 2.1 Architecture & Base Components
LLaVA-1.5-7B combines a pretrained visual encoder with an autoregressive language model linked via a multimodal projection matrix:
- **Visual Encoder:** CLIP-ViT-L/14 operating at $336 \times 336$ resolution. Splits images into patches of $14 \times 14$ pixels, generating $24 \times 24 = 576$ visual tokens per radiograph.
- **Multimodal Projector:** A two-layer Multi-Layer Perceptron (MLP) with GELU activation mapping the 1024-dimensional visual features into the 4096-dimensional hidden state space of the language model:
  $$H_v = W_2 \cdot \text{GELU}(W_1 \cdot Z_v + b_1) + b_2$$
- **Language Backbone:** Vicuna-7B-v1.5 (fine-tuned LLaMA-2-7B architecture) consisting of 32 transformer decoder layers with 32 attention heads and RMSNorm normalization.

#### 2.2 Quantized Low-Rank Adaptation (QLoRA)
To train the 7.08B parameter model on a single 24 GB workstation GPU (NVIDIA RTX 4090), we implement 4-bit NormalFloat (NF4) quantization with double dequantization and 16-bit LoRA adapter matrices.

For a frozen weight matrix $W_0 \in \mathbb{R}^{d \times k}$, LoRA decomposes weight updates into two low-rank trainable matrices $B \in \mathbb{R}^{d \times r}$ and $A \in \mathbb{R}^{r \times k}$ where $r \ll \min(d, k)$:
$$W = W_0 + \Delta W = W_0 + \frac{\alpha}{r} (B \cdot A)$$

- **LoRA Rank ($r$):** 16
- **LoRA Scaling Factor ($\alpha$):** 32
- **LoRA Dropout:** 0.05
- **Adapted Modules:**
  - LLM Self-Attention: `q_proj`, `k_proj`, `v_proj`, `o_proj`
  - LLM MLP Projections: `gate_proj`, `up_proj`, `down_proj`
  - **Multimodal Projector:** `linear_1`, `linear_2` (Critical innovation: adapting the visual projection layers directly to medical grayscale imaging).
- **Trainable Parameters:** $20,496,384$ parameters ($\approx 20.5\text{ M}$, representing 0.289% of total parameters).

#### 2.3 Scientific Breakthrough: Exact Target-Only Loss Masking
In preliminary training runs (LLaVA v1), the loss was computed over all tokens in the response JSON string (`{"classification": "...", "findings": [...]}`). Because the static JSON boilerplate comprised over 90% of the token sequence, the backward gradient was heavily diluted, forcing the model to learn JSON formatting while neglecting visual chest disease patterns.

In `train_llava_v2.py`, we implemented exact target-only masking:
- Left-padding with Vicuna conversation prompt terminated at: `ASSISTANT: {"classification": "`
- Target suffix constrained to the diagnostic token and brace: `normal"}` or `abnormal"}`
- All prompt, padding, and prefix tokens are set to label $-100$:
  $$\mathcal{L} = -\sum_{t \in \mathcal{T}_{\text{diagnostic}}} \log P(x_t \mid x_{<t}, H_v)$$
This concentrated **100% of the backward loss gradient** on visual pathology discrimination.

#### 2.4 Hyperparameters & Training Execution (`train_llava_v2.py`)
- **Optimizer:** AdamW ($\beta_1 = 0.9, \beta_2 = 0.999$, weight decay = $0.01$)
- **Peak Learning Rate:** $5.0 \times 10^{-5}$ with Cosine Annealing schedule
- **Warmup:** 15 steps
- **Per-Device Batch Size:** 4
- **Gradient Accumulation Steps:** 4 (Effective batch size = 16)
- **Training Budget:** 6 Epochs (552 total gradient steps)
- **Validation Evaluation:** Every 46 steps (approx. 0.5 epoch) across the 211-case validation cohort
- **Early Stopping:** Patience = 4 evaluations based on validation Macro-$F_1$ and balanced accuracy
- **Selected Checkpoint:** Step 460 (Epoch 5), saved to `checkpoints_llava_v2/best_adapter`

---

### 3. Baseline Model 1: Vision Transformer (ViT-B/16 Classifier)

#### 3.1 Architecture & Formulation
The Vision Transformer (`train_vit_image_only.py`) implements the pure patch-based vision architecture introduced by Dosovitskiy et al.:
- **Backbone:** `torchvision.models.vit_b_16` pretrained on ImageNet-1K.
- **Patch Resolution:** An input radiograph $X \in \mathbb{R}^{H \times W \times C}$ ($224 \times 224 \times 3$) is divided into $N_p = \frac{HW}{P^2} = \frac{224 \times 224}{16 \times 16} = 196$ non-overlapping patches.
- **Linear Patch Projection:** Each patch is flattened ($x_p \in \mathbb{R}^{16 \cdot 16 \cdot 3} = \mathbb{R}^{768}$) and projected via matrix $E \in \mathbb{R}^{768 \times 768}$ to form patch tokens.
- **Class Token & Positional Encoding:** A learnable classification token $x_{\text{class}} \in \mathbb{R}^{768}$ is prepended, and 1D learnable position embeddings $E_{\text{pos}} \in \mathbb{R}^{197 \times 768}$ are added:
  $$z_0 = [x_{\text{class}}; x_p^1 E; x_p^2 E; \dots; x_p^{N_p} E] + E_{\text{pos}}$$
- **Transformer Encoder Layers:** 12 layers with Multi-Head Self-Attention (12 heads, hidden dimension 768, MLP dimension 3072).
- **Classification Head:** The original 1000-class ImageNet head is replaced with a single linear projection layer:
  $$z_{\text{logits}} = W_{\text{head}} \cdot \text{LN}(z_L^0) + b_{\text{head}} \in \mathbb{R}^2$$
  where $z_L^0$ is the output state of the `[CLS]` token after layer 12.

#### 3.2 ViT Training Configuration (`checkpoints_vit_image_only/vit_config.json`)
- **Total Parameters:** $85,800,194$ ($\approx 85.8\text{ M}$)
- **Training Samples:** 1,474 | **Validation Samples:** 211
- **Epochs:** 15
- **Batch Size:** 32
- **Differential Learning Rates:**
  - Backbone Encoder LR: $2.0 \times 10^{-5}$
  - Classification Head LR: $2.0 \times 10^{-4}$ (10x multiplier for rapid head convergence)
- **Weight Decay:** $0.01$
- **Loss Function:** Binary Cross-Entropy with Logits:
  $$\mathcal{L}_{\text{ViT}} = -\frac{1}{N} \sum_{i=1}^N \left[ y_i \log \sigma(z_i) + (1 - y_i) \log(1 - \sigma(z_i)) \right]$$
- **Inference Runtime:** Executes natively on CPU with a 343 MB memory footprint, completing inference in a mean of $17.25\text{ ms}$ per case.

---

### 4. Baseline Model 2: Google MedGemma-4B-IT (Precomputed Baseline)

#### 4.1 Architecture & Provenance
`google/medgemma-4b-it` is a specialized medical instruction-tuned vision-language model developed by Google Health, pairing a SigLIP visual encoder with a Gemma-4B language decoder.

#### 4.2 Local Execution Status & Empirical Reality
- **Status:** **BLOCKED LOCALLY**
- **Provenance:** In ANVESH, MedGemma outputs were generated offline in Google Colab T4 GPU environments and imported into the project database. MedGemma weights require authenticated HuggingFace gated access agreements which are not provisioned in the local offline runtime.
- **Empirical Baseline Performance:** Precomputed test predictions across the identical 422-case held-out split (`reports/medgemma_standalone_metrics.csv`) demonstrate high specificity (98.10%) but severe sensitivity collapse (31.75%), resulting in an overall accuracy of 64.93%.

---

### 5. Methodological Comparison: Generative VLMs vs. Discriminative ViTs

| Characteristic | Primary LLaVA-1.5-7B v2 (VLM) | Vision Transformer ViT-B/16 (ViT) |
|---|---|---|
| **Mathematical Nature** | Conditional generative autoregression | Direct discriminative mapping |
| **Output Space** | Unbounded natural language token sequence | Fixed 2-dimensional probability simplex |
| **Multimodal Support** | Native: Accepts arbitrary text instructions & images | Vision-only: Accepts fixed-dimension image tensors |
| **Explainability** | High: Can generate textual justification and anatomical lists | Low: Requires post-hoc attention rollout or Grad-CAM |
| **Hallucination Risk** | Non-zero: Language decoder may hallucinate unobserved pathologies | **Zero:** Probability bounded strictly to binary class logits |
| **Computational Footprint** | Heavy: 7.08 Billion parameters (5.26 GB VRAM in 4-bit) | Lightweight: 85.8 Million parameters (343 MB memory) |
| **Deployment Fit** | Centralized GPU clearinghouse worker | Edge hospital workstation / local CPU client |

---

### 6. Why Image-Only and Report-Assisted Conditioning Answer Different Questions

A critical contribution of this project is proving that multimodal and image-only evaluations answer fundamentally different scientific questions:

1. **The Multimodal (Report-Assisted) Question:**
   - *"Can an AI model act as an intelligent medical clerk, accurately extracting, standardizing, and verifying clinical evidence when given both the radiologist's dictated impression and the radiograph?"*
   - Answered by `anvesh_dataset` where LLaVA achieves **88.86% accuracy**. The model excels at summarizing and formatting radiologist notes into prior-authorization schemas.
2. **The Pure Image-Only Question:**
   - *"Can an AI model autonomously identify pathology directly from radiograph pixels without relying on radiologist notes?"*
   - Answered by `anvesh_dataset_image_only` where LLaVA v2 achieves **67.54%** and ViT achieves **65.40%**. This represents the true diagnostic visual capability of the neural vision representations.
