# ANVESH: Multimodal Prior-Authorization Verification and Radiographic Evidence Grounding Engine

**Author 1**: `[Author Name Placeholder]`  
*Department of Computer Science & Engineering, [Institution Name Placeholder]*  
`[author1.email@institution.edu]`

**Author 2**: `[Author Name Placeholder]`  
*Department of Computer Science & Engineering, [Institution Name Placeholder]*  
`[author2.email@institution.edu]`

**Corresponding Supervisor**: `[Supervisor Name Placeholder]`, Senior Member, IEEE  
*Department of Computer Science & Engineering, [Institution Name Placeholder]*  
`[supervisor.email@institution.edu]`

---

### Abstract
Prior authorization in healthcare is a labor-intensive administrative bottleneck that mandates clinical justification before payers approve diagnostic imaging procedures. Current manual review workflows exacerbate clinician burnout, delay patient care, and introduce inconsistent claim determinations. We present **ANVESH**, an end-to-end clinical AI and policy compliance system that cross-verifies chest radiographs and clinical indications against health insurance guidelines. ANVESH pairs deep neural feature extractors with a deterministic, zero-hallucination rules engine under an auditable human-in-the-loop framework. 

To overcome gradient dilution in generative Vision-Language Models (VLMs), we introduce a Projector-Augmented QLoRA fine-tuning method with exact target-only loss masking on LLaVA-1.5-7B. We benchmark our model against an ImageNet-pretrained Vision Transformer (ViT-B/16), zero-shot foundation models, and Google MedGemma-4B-IT on an audited held-out test cohort of $N = 422$ chest radiographs from the Indiana University Open-i collection. In pure image-only abnormality classification, our fine-tuned LLaVA-1.5-7B v2 model achieves **67.54% Accuracy** (95% CI: [62.9%, 71.8%]), **62.09% Sensitivity**, **72.99% Specificity**, **0.6744 Macro $F_1$**, and **0.7481 ROC-AUC**, substantially outperforming off-the-shelf zero-shot LLaVA which collapsed entirely to normal predictions. Concurrently, our discriminative ViT-B/16 baseline delivers **65.40% Accuracy** and **0.7062 ROC-AUC** while executing in **17.25 ms** on standard CPU hardware ($8.2\times$ faster than the 7B VLM on an RTX 4090). When radiologist report text is provided for multimodal evidence structuring, LLaVA achieves **88.86% Accuracy** and a Matthews Correlation Coefficient of **+0.7811**. A companion deterministic policy engine evaluates compliance in $0.63\text{ ms}$ on CPU, enforcing strict safeguards including score capping when source reports are missing. ANVESH provides an empirical, open-source blueprint for verifiable utilization management in clinical radiology.

**Index Terms**—Medical Artificial Intelligence, Prior Authorization, Vision-Language Models, Vision Transformers, Chest Radiography, Clinical Decision Support Systems, Healthcare Informatics.

---

### I. Introduction
Prior authorization (PA) is mandated by healthcare insurers to ensure that requested diagnostic examinations are medically necessary and cost-effective. According to recent American Medical Association surveys, physicians complete an average of 43 prior authorization requests weekly, consuming over 14 hours of medical staff time, with 94% reporting treatment delays that compromise patient outcomes \cite{ama2024priorauth}. Conversely, insurance medical directors struggle under overwhelming caseloads, creating a precarious balance between improper claim rejections and unchecked healthcare fraud, waste, and abuse.

Automating prior authorization using autonomous machine learning has faced major resistance due to the "black-box" nature of deep neural networks. In healthcare adjudication, a denial must be backed by a clear, legally defensible, and clinically verified finding cross-referenced to explicit insurance policy clauses. 

To address this challenge, we present **ANVESH (MedAuth-VLM)**. Rather than relying on unconstrained generative language models to make autonomous coverage decisions, ANVESH introduces a **hybrid neuro-symbolic framework**:
1. Deep neural vision representations (ViT-B/16 and Projector-Augmented QLoRA LLaVA-1.5-7B v2) inspect radiograph pixels to identify disease indicators and extract clinical evidence.
2. An independent, deterministic Python rules engine cross-references extracted clinical findings against structured coverage criteria from Centers for Medicare \& Medicaid Services (CMS) Qualified Health Plan policies \cite{cms2024qhp}.
3. The platform strictly forbids autonomous rejections, presenting human reviewers with an auditable 5-point verification checklist.

---

### II. Related Work

#### A. Automated Chest Radiography Interpretation
Automated pathology detection from chest radiographs was largely pioneered by convolutional neural networks such as CheXNet \cite{rajpurkar2017chexnet}. While CNNs excel at localized feature extraction, they typically operate as single-task black boxes with fixed classification heads. More recently, Vision Transformers (ViT) \cite{dosovitskiy2020image} have demonstrated that global self-attention across non-overlapping image patches captures long-range thoracic dependencies without convolutional inductive biases.

#### B. Multimodal Vision-Language Models in Medicine
Instruction-tuned multimodal models, initiated by LLaVA \cite{liu2023visual}, connect visual patch encoders (CLIP-ViT) to autoregressive language decoders (Vicuna/LLaMA) via projection matrices. Biomedical adaptations such as Med-PaLM M \cite{tu2024towards} and MedGemma demonstrate remarkable generative reasoning across multimodal clinical data. However, fine-tuning large generative models for diagnostic discrimination faces severe obstacles: when prompted to output structured JSON, standard causal language modeling loss optimizes boilerplate syntax rather than clinical pathology tokens—a defect we formally term *loss dilution*.

#### C. Parameter-Efficient Fine-Tuning (PEFT)
Quantized Low-Rank Adaptation (QLoRA) \cite{dettmers2023qlora, hu2021lora} enables 4-bit NormalFloat (NF4) quantization of 7B-parameter models while maintaining 16-bit adapter gradients, dramatically reducing VRAM requirements and allowing state-of-the-art multimodal fine-tuning on consumer workstation GPUs.

---

### III. Materials and Methods

#### A. Dataset Provenance and Cohort Curation
Experiments were conducted using the Indiana University (IU) Hospital Chest X-ray Collection made available by the National Library of Medicine (NLM) Open-i repository \cite{demner2016preparing}. The natural distribution of this dataset is imbalanced (35.8% normal vs. 64.2% abnormal).

We assembled an audited, balanced benchmark cohort of **$N = 2,107$ clinical studies** (4,093 images) partitioned into three immutable splits:
- **Training Set:** 1,474 cases (737 normal, 737 abnormal) — 70.0%
- **Validation Set:** 211 cases (106 normal, 105 abnormal) — 10.0%
- **Held-Out Test Set:** 422 cases (211 normal, 211 abnormal) — 20.0%

Partitions enforce zero case overlap ($\text{Train} \cap \text{Test} = \emptyset$) and zero SHA-256 image collisions. The 422-case test split remained locked and untouched during all model architecture decisions and threshold tuning.

#### B. Task Formulations: Image-Only vs. Multimodal Conditioning
We establish a strict distinction between two separate experimental conditions:
1. **Pure Image-Only Classification:** The model receives only the radiograph pixel tensor ($X \in \mathbb{R}^{H \times W \times C}$) and a standardized task prompt without clinical notes. The objective is to identify thoracic abnormality purely from image contrast.
2. **Multimodal Report-Assisted Structuring:** The model receives the radiograph **and** the dictated radiologist findings/impression text. The objective is to act as an extraction agent, converting clinical narrative into structured prior-authorization evidence.

---

### IV. Model Architectures & Training Strategy

#### A. Discriminative Vision Transformer (ViT-B/16 Baseline)
We implement `torchvision.models.vit_b_16` pretrained on ImageNet-1K. The radiograph is resized to $224 \times 224$ and divided into $196$ patches of $16 \times 16$ pixels. Patch tokens are projected into a 768-dimensional latent space, concatenated with a learnable `[CLS]` token, and processed across 12 transformer encoder layers. A linear head maps the final class token state to binary logits $\mathbb{R}^2$. 
- Parameters: $85,800,194$ ($\approx 85.8\text{ M}$).
- Training: 15 epochs, AdamW ($\text{lr}_{\text{backbone}} = 2\times 10^{-5}, \text{lr}_{\text{head}} = 2\times 10^{-4}$), batch size 32.

#### B. Generative Vision-Language Model (LLaVA-1.5-7B v2)
The LLaVA-1.5-7B architecture pairs a CLIP-ViT-L/14 visual encoder ($336 \times 336$ resolution, 576 visual tokens) with a 4-bit NF4 quantized Vicuna-7B-v1.5 language model linked via a 2-layer MLP projector.

We introduce two methodological modifications in `train_llava_v2.py`:
1. **Projector-Augmented LoRA:** LoRA adapters ($r=16, \alpha=32$, dropout 0.05) are attached not only to LLM attention projections (`q_proj`, `v_proj`, etc.) but also to the visual projection layers (`linear_1`, `linear_2`), aligning web-pretrained visual embeddings to medical grayscale contrast.
2. **Exact Target-Only Loss Masking:** To resolve loss dilution, input sequences are left-padded and terminated at `ASSISTANT: {"classification": "`. Target tokens are restricted solely to the diagnostic classification string and closing brace (`normal"}` or `abnormal"}`). All prompt, pad, and boilerplate tokens are masked with label $-100$:
$$\mathcal{L} = -\sum_{t \in \mathcal{T}_{\text{diagnostic}}} \log P(x_t \mid x_{<t}, H_v)$$
- Trainable parameters: $20,496,384$ (0.289% of 7.08B total).
- Training: 6 epochs (552 steps), AdamW ($\text{lr} = 5\times 10^{-5}$, Cosine Annealing), effective batch size 16 on an NVIDIA RTX 4090 24GB GPU. Optimal validation checkpoint selected at Step 460 ($\theta^* = 0.5100$).

---

### V. Results & Experimental Evaluation

All models were evaluated on the identical 422-case held-out test cohort (211 normal, 211 abnormal). Performance metrics with 95% Wilson score confidence intervals are summarized in Table I.

```
TABLE I: Model Benchmark Comparison on Held-Out Test Cohort (N = 422)
-------------------------------------------------------------------------------------------------------
Model Architecture           Modality    Params   Accuracy [95% CI]      Sens.      Spec.    Macro F1   MCC     ROC-AUC   Latency
-------------------------------------------------------------------------------------------------------
Base LLaVA (Zero-Shot)       Pure Image  7.06 B   50.00% [45.2, 54.8]    0.00%    100.00%   0.3333   0.0000   0.5547    145.2 ms
Prior LLaVA v1 (Step 184)    Pure Image  7.08 B   50.24% [45.5, 55.0]    0.47%    100.00%   0.3344  +0.0487   0.5500    419.6 ms
Google MedGemma (Precomp.)   Multi/Text  4.00 B   64.93% [60.3, 69.3]   31.75%     98.10%   0.6059  +0.3991     ---     Offline
ViT-B/16 Classifier          Pure Image  85.8 M   65.40% [60.7, 69.8]   66.35%     64.45%   0.6540  +0.3081   0.7062     17.2 ms (CPU)
Primary LLaVA v2 (Ours)      Pure Image  7.08 B   67.54% [62.9, 71.8]   62.09%     72.99%   0.6744  +0.3528   0.7481    141.1 ms (GPU)
-------------------------------------------------------------------------------------------------------
LLaVA LoRA (Multimodal)*     Image+Text  7.08 B   88.86% [85.5, 91.5]   83.89%     93.84%   0.8883  +0.7811     ---    2433.0 ms
-------------------------------------------------------------------------------------------------------
*Multimodal condition receives dictated report text; reported for extraction reference.
```

#### A. Confusion Matrix Analysis ($N = 422$)
- **LLaVA-1.5-7B v2:** $\text{TP} = 131, \text{TN} = 154, \text{FP} = 57, \text{FN} = 80$. Precision: 69.68%, NPV: 65.81%, Balanced Accuracy: 67.54%.
- **ViT-B/16:** $\text{TP} = 140, \text{TN} = 136, \text{FP} = 75, \text{FN} = 71$. Precision: 65.12%, NPV: 65.70%, Balanced Accuracy: 65.40%.
- **Base LLaVA (Zero-Shot):** $\text{TP} = 0, \text{TN} = 211, \text{FP} = 0, \text{FN} = 211$. Zero-shot web foundation models completely collapse to predicting normal without clinical domain adaptation.

#### B. Statistical Significance Testing
McNemar's test with continuity correction was performed between LLaVA-1.5-7B v2 (285 correct) and ViT-B/16 (276 correct):
$$\chi^2 = \frac{(|82 - 73| - 1)^2}{82 + 73} = \frac{64}{155} \approx 0.4129 \quad (p = 0.5205)$$
Although LLaVA v2 achieves superior specificity (72.99% vs. 64.45%) and higher discrimination (ROC-AUC 0.7481 vs. 0.7062), overall diagnostic accuracy is not statistically significantly different at the $\alpha = 0.05$ level. 

---

### VI. Deterministic Policy Engine & System Architecture

Extracted clinical evidence is processed by an independent Python policy engine (`policy_engine.py`) that evaluates coverage against 100 CMS health policies:
- **Evidence Score ($S \in [0, 100]$):**
  $$S = 40 \cdot \mathbb{I}(\text{consistent}) + 40 \cdot \mathbb{I}(\text{supported}) + 20 \cdot \mathbb{I}(\text{covered})$$
- **Grounding Safeguard:** If clinical report text is missing (`has_source_text = False`), the score is capped at $S \le 40/100$ and flagged for mandatory human review.
- **Latency:** Mean rule execution latency is **$0.6317\text{ ms}$** on CPU (throughput: 1,576 cases/sec), ensuring zero perceptual lag during clinical reviews.

---

### VII. Discussion & Limitations

1. **CPU vs. GPU Viability in Clinical Deployment:**
   A key finding is that the 85.8M ViT-B/16 model achieves competitive diagnostic accuracy (65.40%) at **17.25 ms latency on CPU**, consuming less than 400 MB RAM. This enables lightweight edge deployment inside hospital intranets without requiring costly 24 GB GPU infrastructure.
2. **Single-Center Limitations:**
   The evaluation is limited to the Indiana University Open-i cohort. Validation across external multicenter datasets (MIMIC-CXR, CheXpert) is planned for future phases.
3. **Absence of Spatial Pixel Grounding:**
   Current outputs provide textual descriptions of abnormalities; they do not generate spatial bounding boxes or segmentation masks.

---

### VIII. Conclusion
ANVESH provides an open, auditable, and scientifically verified framework for AI-assisted prior authorization. By eliminating loss dilution in Vision-Language Models, our primary LLaVA-1.5-7B v2 model achieves 67.54% image-only accuracy (0.7481 ROC-AUC), while our ViT-B/16 baseline proves that lightweight CPU models can deliver competitive clinical screening. Coupled with deterministic policy verification and strict human-in-the-loop safeguards, ANVESH offers a viable path toward reducing administrative burden while protecting patient safety.

---

### References
\bibliographystyle{IEEEtran}
\bibliography{references}
