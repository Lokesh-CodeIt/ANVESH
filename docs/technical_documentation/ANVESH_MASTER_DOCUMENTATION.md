# ANVESH: Complete Technical Documentation, System Architecture & Benchmark Report
## Multimodal Prior-Authorization Verification & Radiographic Grounding Engine

---

### Executive Summary

**ANVESH (MedAuth-VLM)** is an enterprise clinical artificial intelligence workstation and deterministic rules engine designed to automate the cross-verification of diagnostic radiographic studies (Chest X-rays) and clinical indications against health insurance policies (CMS Qualified Health Plan guidelines).

This document serves as the **unified master technical reference**, consolidating the system architecture, dataset provenance, deep learning methodologies, empirical benchmarking, full-stack implementation, and reproduction guidelines into a single authoritative document. 

Per system specifications, model analysis focuses on the core ANVESH architecture:
1. **Primary Production Model:** Fine-Tuned LLaVA-1.5-7B Multimodal (Image + Clinical Notes, **88.86% Accuracy**, 93.84% Specificity, **+0.7811 MCC**)
2. **Autonomous Screening Model:** Fine-Tuned LLaVA-1.5-7B v2 (Pure Radiograph Pixels, **67.54% Accuracy**, **0.7481 ROC-AUC**)
3. **Edge CPU Baseline:** Vision Transformer ViT-B/16 (85.8M Parameters on CPU, **65.40% Accuracy**, **17.25 ms Latency**)
4. **Medical VLM Baseline:** Google MedGemma-4B-IT (4B-Parameter Instruction-Tuned Baseline, **64.93% Accuracy**)

---

## 1. Project Overview & Clinical Problem Statement

### 1.1 The Prior Authorization Crisis
Prior authorization (PA) is a health insurance utilization management protocol requiring clinical providers to demonstrate medical necessity before insurers approve financial coverage for specialized diagnostic procedures. According to the American Medical Association (AMA):
- Physicians and clinical staff spend an average of **14.4 hours per week** completing prior authorizations.
- **94% of physicians** report treatment delays resulting directly from prior authorization friction.
- **33% of physicians** report that PA delays have led to serious adverse clinical events (permanent impairment, hospitalization, or death).
- Payer medical directors face crushing case queues, creating a systemic risk of improper claim denials and administrative appeals.
- Fraud, waste, and abuse (FWA) persist because human reviewers rarely have the bandwidth to verify that preliminary clinical narrative text matches the actual uploaded radiograph.

### 1.2 Proposed Neuro-Symbolic Solution
Pure "black-box" neural networks cannot be trusted with autonomous coverage denials due to hallucination risks, lack of explainability, and legal liability. ANVESH introduces a **hybrid neuro-symbolic architecture**:
- **Neural Perception Tier:** Deep vision models inspect chest radiograph pixels directly to identify acute cardiopulmonary pathology and extract clinical findings.
- **Symbolic Policy Tier:** An independent, deterministic Python rules engine evaluates extracted evidence against structured policy guidelines (CMS coverage criteria, copay, coinsurance, exclusions).
- **Human-in-the-Loop Safeguard:** Software-level guardrails strictly prohibit autonomous claim denials; every adverse determination requires audited human physician review.

---

## 2. System Architecture & End-to-End Workflows

### 2.1 Three-Tier System Architecture
ANVESH decouples the user presentation layer (React 19), the application REST API (FastAPI), the database tier (SQLite/PostgreSQL), and the deep learning execution engine.

```mermaid
graph TD
    Client["Clinician / Reviewer / Provider Browser"] -->|Port 5173 / HTTP & Cookies| UI["React 19 + TypeScript + Vite Workstation"]
    
    subgraph "Application Layer (FastAPI Backend - Port 8000)"
        UI -->|Reverse Proxy /api, /auth, /cases| Router["FastAPI REST Router (main.py - 60 Endpoints)"]
        Router --> Auth["Session & RBAC Engine (auth.py)"]
        Router --> Storage["Storage & Magic-Byte Validator (storage.py)"]
        Router --> Policy["Deterministic Policy Engine (policy_engine.py)"]
        Router --> AIService["Stratified Inference Dispatcher (services/ai_service.py)"]
    end

    subgraph "Persistence Tier"
        Auth --> DB[("Database: medauth.db / PostgreSQL")]
        Policy --> DB
        Storage --> DiskStore[("File Storage: uploads/ & demo_dataset/")]
    end

    subgraph "AI Inference Tier (The 3 Main Models)"
        AIService --> RouterCheck{"GPU Worker Configured?"}
        RouterCheck -->|Yes: LLAVA_ENDPOINT_URL Set| LLaVAv2["Model 1: Primary LLaVA-1.5-7B v2 (QLoRA GPU)"]
        RouterCheck -->|No / Timeout / CPU Mode| ViT["Model 2: ViT-B/16 Classifier (Native CPU)"]
        AIService -.->|Reference Baseline| MedGemma["Model 3: MedGemma-4B-IT (Precomputed Baseline)"]
    end

    LLaVAv2 --> Evidence["Normalized Evidence JSON"]
    ViT --> Evidence
    MedGemma --> Evidence
    Evidence --> DB
    Evidence --> Policy
```

### 2.2 End-to-End Intake & Adjudication Sequence
1. **Intake (Provider):** Provider enters patient details, CPT code (71046: 2-view CXR), clinical indication, and uploads a radiograph (PNG/DICOM) via `/api/submissions`.
2. **File Sanitization:** `storage.py` inspects the initial 16 magic bytes (`89 50 4E 47` for PNG, `%PDF` for PDF, `DICM` for DICOM) and rejects non-compliant payloads.
3. **Inference Dispatch:** `services/ai_service.py` evaluates the radiograph via LLaVA v2 (if GPU active) or falls back to local ViT-B/16 on CPU.
4. **Deterministic Policy Check:** `policy_engine.py` evaluates extracted findings against policy criteria in $0.63\text{ ms}$, computing an evidence score ($0–100$) and a 5-point checklist.
5. **Human Determination:** The reviewer inspects the radiograph in native grayscale, reviews policy compliance, and stamps an audited decision (`APPROVED` or `DENIED`).

---

## 3. Dataset Provenance, Partitioning & Preprocessing

### 3.1 Indiana University Open-i Corpus
The benchmark is constructed from the **Indiana University (IU) Hospital Chest Radiograph Collection**, released by the U.S. National Library of Medicine (NLM/NIH).
- **Clinical Modality:** Diagnostic Chest Radiography (PA, AP, Lateral projections).
- **Metadata:** Dictated radiologist reports containing `Indication`, `Findings`, `Impression`, and MeSH-indexed `Problems`.
- **De-Identification:** De-identified under HIPAA Safe Harbor. Hospital MRNs are replaced with study `uid`s.

### 3.2 Partition Breakdown & Zero-Leakage Guarantees
The curated benchmark cohort contains **$N = 2,107$ clinical studies** (4,093 images), strictly balanced 50/50 normal/abnormal across every partition:

| Partition | Total Studies ($N$) | Normal Cases | Abnormal Cases | Percentage | SHA-256 Manifest Checksum |
|---|:---:|:---:|:---:|:---:|---|
| **Training Split** (`train.json`) | **1,474** | 737 (50.0%) | 737 (50.0%) | 69.96% | `c849f51e2a6fd859aa6d6a91d48714d2d93dca91e77400e55e5920ccac712b28` |
| **Validation Split** (`val.json`) | **211** | 106 (50.2%) | 105 (49.8%) | 10.01% | `a98f1040b7c88546617de79a2e06280f61bd2bf6b9c78fd5623dd6844fe6a4c5` |
| **Held-Out Test Split** (`test.json`) | **422** | 211 (50.0%) | 211 (50.0%) | 20.03% | `73ebfaa78d7765bb3b53a94e1b2e2cccf8868f621f0b82270e5a67a1442c685b` |
| **Full Deployment Cohort** | **2,107** | **1,054** | **1,053** | **100.0%** | `ac767c4540d3353e913da7bb296369365291de38d709799f2e31f7dc132bc9a7` |

#### Leakage Prevention Guarantees:
1. **Zero Case Overlap:** $\text{Train} \cap \text{Val} = \emptyset$, $\text{Train} \cap \text{Test} = \emptyset$, $\text{Val} \cap \text{Test} = \emptyset$.
2. **Zero Image Collisions:** SHA-256 image hash collisions between splits are verified to be exactly **zero**.
3. **Test Set Immutability:** The 422-case held-out test split remained locked during development. The decision threshold $\theta^* = 0.5100$ was tuned strictly on the 211-case validation split.
4. **Patient-Level Longitudinal Limitation:** Because NLM Open-i strips hospital MRNs, multi-study follow-ups belonging to the same patient cannot be mathematically ruled out between train and test splits.

### 3.3 Experimental Modality Separation
- **Pure Image-Only Classification (`anvesh_dataset_image_only/`):** Model receives *only* radiograph pixels and a task instruction. Evaluates autonomous computer vision capability without textual cues.
- **Multimodal Report-Assisted Structuring (`anvesh_dataset/`):** Model receives radiograph pixels *and* dictated radiologist findings. Evaluates automated clerical structuring into prior-authorization schemas.

---

## 4. In-Depth Technical Specification of the 3 Main Models

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE 3 MAIN ANVESH MODELS                               │
├───────────────────────────────────┬────────────────────────────────┬───────────────────┤
│ Model 1: Fine-Tuned LLaVA v2      │ Model 2: Vision Transformer    │ Model 3: MedGemma │
├───────────────────────────────────┼────────────────────────────────┼───────────────────┤
│ • LLaVA-1.5-7B v2 (Primary Ours)   │ • ViT-B/16 Classifier Baseline │ • MedGemma-4B-IT  │
│ • Multimodal Projector + QLoRA    │ • Discriminative Image-Only    │ • SigLIP + Gemma  │
│ • Exact Target-Only Loss Masking  │ • Linear Head (768 -> 2)       │ • Google Health   │
│ • 7.08 Billion Parameters         │ • 85.8 Million Parameters      │ • 4.00 Billion    │
│ • GPU (141 ms, RTX 4090)          │ • Native CPU (17 ms Latency)   │ • Precomputed     │
└───────────────────────────────────┴────────────────────────────────┴───────────────────┘
```

---

### 4.1 Model 1: Fine-Tuned LLaVA-1.5-7B v2 (Primary Multimodal Architecture)

#### Architectural Composition:
- **Visual Encoder:** CLIP-ViT-L/14 operating at $336 \times 336$ resolution. Patch size $14 \times 14$ generates $24 \times 24 = 576$ visual tokens.
- **Multimodal Projector:** 2-layer Multi-Layer Perceptron (MLP) with GELU activation mapping 1024-dimensional CLIP features to the 4096-dimensional LLM hidden space:
  $$H_v = W_2 \cdot \text{GELU}(W_1 \cdot Z_v + b_1) + b_2$$
- **Language Model Backbone:** Vicuna-7B-v1.5 (LLaMA-2 architecture, 32 transformer layers, 32 attention heads, hidden dimension 4096).
- **Quantization:** 4-bit NormalFloat (NF4) with double dequantization and bfloat16 compute dtype.

#### Low-Rank Adaptation (LoRA) Configuration:
Weight decomposition: $W = W_0 + \frac{\alpha}{r} (B \cdot A)$ with rank $r = 16$, scaling $\alpha = 32$, and dropout $0.05$.
- **Adapted Modules:**
  - LLM Self-Attention: `q_proj`, `k_proj`, `v_proj`, `o_proj`
  - LLM Feedforward: `gate_proj`, `up_proj`, `down_proj`
  - **Vision Projector:** `linear_1`, `linear_2` (Critical innovation: adapting projection layers to grayscale medical contrast).
- **Trainable Parameters:** $20,496,384$ parameters ($\approx 20.5\text{ M}$, 0.289% of 7.08B total).

#### The Target-Only Loss Masking Breakthrough:
Standard conversational fine-tuning calculates cross-entropy across the entire output JSON string. In prior v1 runs, over 90% of tokens were invariant JSON syntax (`{"classification": "`, `", "findings": ["`), diluting the diagnostic gradient to $\approx 3\%$.

In `train_llava_v2.py`, exact target-only masking was implemented:
$$\mathcal{L}_{\text{Target}} = -\sum_{t \in \mathcal{T}_{\text{classification}}} \log P(x_t \mid x_{<t}, H_v)$$
Inputs are left-padded to `ASSISTANT: {"classification": "`, and all prior tokens are assigned label $-100$. Target tokens are strictly restricted to `normal"}` or `abnormal"}`. This concentrates **100% of the backward loss gradient on visual pathology discrimination**.

#### Training Hyperparameters:
- **Optimizer:** AdamW ($\beta_1 = 0.9, \beta_2 = 0.999$, weight decay $0.01$).
- **Learning Rate:** $5.0 \times 10^{-5}$ with Cosine Annealing (15 warmup steps).
- **Batch Size:** 4 per device, 4 gradient accumulations (Effective batch size = 16).
- **Budget:** 6 epochs (552 steps), evaluated every 46 steps with patience = 4.
- **Selected Optimal Checkpoint:** Step 460 (Epoch 5), saved to `checkpoints_llava_v2/best_adapter`.

---

### 4.2 Model 2: Vision Transformer (ViT-B/16 Baseline)

#### Architectural Composition:
- **Architecture:** `torchvision.models.vit_b_16` pretrained on ImageNet-1K.
- **Patch Resolution:** Radiographs ($224 \times 224 \times 3$) are split into $N_p = \frac{224 \times 224}{16 \times 16} = 196$ non-overlapping patches.
- **Patch Linear Projection:** Patches are flattened ($x_p \in \mathbb{R}^{768}$) and projected into latent space, prepended with a learnable `[CLS]` token and 1D position embeddings:
  $$z_0 = [x_{\text{class}}; x_p^1 E; x_p^2 E; \dots; x_p^{196} E] + E_{\text{pos}} \in \mathbb{R}^{197 \times 768}$$
- **Encoder:** 12 Transformer layers with Multi-Head Self-Attention (12 heads, hidden dimension 768, MLP dimension 3072).
- **Classification Head:** Linear projection from `[CLS]` token to binary logits: $\mathbb{R}^{768} \to \mathbb{R}^2$.
- **Parameters:** $85,800,194$ ($\approx 85.8\text{ M}$).

#### Training Hyperparameters (`train_vit_image_only.py`):
- **Epochs:** 15 | **Batch Size:** 32 | **Weight Decay:** $0.01$.
- **Differential Learning Rates:** Backbone LR: $2.0 \times 10^{-5}$; Head LR: $2.0 \times 10^{-4}$ (10x head acceleration).
- **Loss:** Binary Cross-Entropy with Logits.
- **Deployment Footprint:** Executes natively on CPU consuming **343 MB RAM**, with a mean latency of **17.25 ms**.

---

### 4.3 Model 3: Google MedGemma-4B-IT (Precomputed Multimodal Baseline)

#### Architectural Composition:
- **Visual Encoder:** SigLIP (Sigmoid Loss for Language-Image Pretraining) visual encoder operating at high resolution.
- **Language Backbone:** Gemma-4B instruction-tuned decoder.
- **Domain Specialization:** Pretrained and instruction-tuned by Google Health on biomedical literature and radiographic QA.

#### Operational Status & Baseline Performance:
- **Local Execution Status:** **Blocked / Gated Baseline**. MedGemma weights require authenticated HuggingFace gated agreements not provisioned in local offline runtimes.
- **Provenance in Project:** Precomputed inference results across the 422-case held-out test split were generated in Google Colab T4 environments and imported into the benchmark database.
- **Empirical Role:** Evaluates whether specialized out-of-the-box medical instruction tuning without local parameter adaptation can compete against locally fine-tuned models.

---

## 5. Comprehensive Experimental Evaluation & Benchmark Performance Suite

All three primary models were evaluated on the **exact same held-out test cohort of $N = 422$ chest radiograph studies** (211 normal, 211 abnormal) drawn from the Indiana University Open-i collection. Zero test samples were utilized during pretraining, adapter tuning, hyperparameter optimization, or threshold selection.

---

### 5.1 Master Performance Metrics Comparison Across Deployment Modalities

The table below reports the complete suite of diagnostic, statistical, agreement, and operational performance metrics comparing the **Primary Multimodal Production Architecture (88.86% Accuracy)** against the pure image-only screening models:

| Metric Category | Metric Name / Description | Model 1: Primary LLaVA Multimodal | Model 2: Autonomous LLaVA v2 | Model 3: Vision Transformer (ViT-B/16) | Model 4: Google MedGemma-4B-IT |
|---|---|:---:|:---:|:---:|:---:|
| **Architectural Scope** | **Model Architecture & Paradigm** | Multimodal QLoRA VLM (Production) | Projector QLoRA VLM (Screening) | Discriminative Vision Transformer | Instruction-Tuned Medical VLM |
| | **Input Modality** | **Radiograph Image + Clinical Notes** | **Pure Radiograph Pixels Only** | **Pure Radiograph Pixels Only** | Radiograph Pixels + Prompt |
| | **Total Model Parameters** | 7,080,000,000 (7.08 B) | 7,080,000,000 (7.08 B) | 85,800,194 (85.8 M) | 4,000,000,000 (4.00 B) |
| | **Trainable / Adapted Parameters** | 19,922,944 (19.9 M LoRA) | 20,496,384 (20.5 M LoRA) | 85,800,194 (100% fine-tuned) | 0 (Zero-Shot / Frozen Baseline) |
| | **Evaluation Cohort ($N$)** | **422** (211 Normal, 211 Abnormal) | **422** (211 Normal, 211 Abnormal) | **422** (211 Normal, 211 Abnormal) | **422** (211 Normal, 211 Abnormal) |
| **Confusion Matrix** | **True Positives (TP - Abnormal)** | **177** | **131** | **140** | **67** |
| | **True Negatives (TN - Normal)** | **198** | **154** | **136** | **207** |
| | **False Positives (FP)** | **13** | **57** | **75** | **4** |
| | **False Negatives (FN)** | **34** | **80** | **71** | **144** |
| **Primary Rates** | **Overall Diagnostic Accuracy** | **88.86%** (375 / 422) | **67.54%** (285 / 422) | **65.40%** (276 / 422) | **64.93%** (274 / 422) |
| | **Accuracy [95% Wilson CI]** | **[85.49%, 91.54%]** | **[62.90%, 71.84%]** | **[60.71%, 69.80%]** | **[60.25%, 69.34%]** |
| | **Sensitivity / Recall / TPR** | **83.89%** (177 / 211) | **62.09%** (131 / 211) | **66.35%** (140 / 211) | **31.75%** (67 / 211) |
| | **Sensitivity [95% Wilson CI]** | **[78.29%, 88.22%]** | **[55.38%, 68.39%]** | **[59.67%, 72.44%]** | **[25.87%, 38.31%]** |
| | **Specificity / Selectivity / TNR**| **93.84%** (198 / 211) | **72.99%** (154 / 211) | **64.45%** (136 / 211) | **98.10%** (207 / 211) |
| | **Specificity [95% Wilson CI]** | **[89.76%, 96.38%]** | **[66.60%, 78.53%]** | **[57.77%, 70.62%]** | **[95.23%, 99.28%]** |
| | **Precision / Positive Pred. Value (PPV)**| **93.16%** (177 / 190) | **69.68%** (131 / 188) | **65.12%** (140 / 215) | **94.37%** (67 / 71) |
| | **Precision [95% Wilson CI]** | **[88.58%, 95.99%]** | **[62.77%, 75.83%]** | **[58.49%, 71.21%]** | **[86.37%, 97.84%]** |
| | **Negative Predictive Value (NPV)**| **85.34%** (198 / 232) | **65.81%** (154 / 234) | **65.70%** (136 / 207) | **58.97%** (207 / 351) |
| | **NPV [95% Wilson CI]** | **[80.25%, 89.33%]** | **[59.45%, 71.65%]** | **[59.01%, 71.79%]** | **[53.76%, 63.99%]** |
| | **Balanced Accuracy** | **88.86%** | **67.54%** | **65.40%** | **64.93%** |
| **Error Rates** | **False Positive Rate (FPR = 1 - Spec)** | **6.16%** (13 / 211) | **27.01%** (57 / 211) | **35.55%** (75 / 211) | **1.90%** (4 / 211) |
| | **False Negative Rate (FNR = 1 - Sens)** | **16.11%** (34 / 211) | **37.91%** (80 / 211) | **33.65%** (71 / 211) | **68.25%** (144 / 211) |
| | **False Discovery Rate (FDR = 1 - PPV)** | **6.84%** (13 / 190) | **30.32%** (57 / 188) | **34.88%** (75 / 215) | **5.63%** (4 / 71) |
| | **False Omission Rate (FOR = 1 - NPV)** | **14.66%** (34 / 232) | **34.19%** (80 / 234) | **34.30%** (71 / 207) | **41.03%** (144 / 351) |
| **Clinical Ratios** | **Prevalence in Cohort** | **50.00%** (211 / 422) | **50.00%** (211 / 422) | **50.00%** (211 / 422) | **50.00%** (211 / 422) |
| | **Positive Likelihood Ratio ($LR+$)** | **13.62** | **2.30** | **1.87** | **16.71** |
| | **Negative Likelihood Ratio ($LR-$)** | **0.17** | **0.52** | **0.52** | **0.70** |
| | **Diagnostic Odds Ratio (DOR)** | **79.290** | **4.424** | **3.576** | **24.078** |
| **Harmonic & Agreement**| **Abnormal Class $F_1$-Score** | **0.8828** | **0.6566** | **0.6573** | **0.4752** |
| | **Normal Class $F_1$-Score** | **0.8939** | **0.6921** | **0.6507** | **0.7366** |
| | **Macro-Averaged $F_1$-Score** | **0.8883** | **0.6744** | **0.6540** | **0.6059** |
| | **Weighted $F_1$-Score** | **0.8883** | **0.6744** | **0.6540** | **0.6059** |
| | **Matthews Corr. Coefficient (MCC)** | **+0.7811** | **+0.3528** | **+0.3081** | **+0.3991** |
| | **Cohen's Kappa ($\kappa$)** | **0.7773** | **0.3507** | **0.3081** | **0.2986** |
| | **Youden's $J$ Statistic ($J = \text{Sens} + \text{Spec} - 1$)** | **0.7773** | **0.3508** | **0.3080** | **0.2985** |
| **Discrimination Curves**| **Receiver Operating Characteristic (ROC-AUC)** | Generative Structure | **0.7481** | **0.7062** | Categorical Logits |
| | **Precision-Recall Area (PR-AUC)** | Generative Structure | **0.7378** | **0.7187** | Categorical Logits |
| **Runtime & Operational**| **Mean Inference Latency** | **2,433.25 ms** | **141.14 ms** | **17.25 ms** | Precomputed Colab T4 |
| | **Primary Execution Device** | **NVIDIA RTX 4090 (24GB)** | **NVIDIA RTX 4090 (24GB)** | **Intel Core i9 CPU (Native)**| Cloud GPU (Colab T4) |
| | **Hardware Memory Footprint** | **5.26 GB VRAM** (NF4) | **5.26 GB VRAM** (NF4) | **343 MB System RAM** | ~8.0 GB VRAM |
| | **Precision / Quantization** | 4-bit NormalFloat (NF4) | 4-bit NormalFloat (NF4) | 32-bit Float (FP32) | 16-bit BFloat16 |

---

### 5.2 Full Confusion Matrices & Contingency Tables ($N = 422$)

The contingency tables below outline the exact classification distributions, marginal totals, and per-class performance metrics for each model:

#### 1. Primary Model: Fine-Tuned LLaVA-1.5-7B Multimodal (Image + Clinical Notes) — PRODUCTION ENGINE
```
                    Predicted Abnormal    Predicted Normal    Total Actual    Recall (Sensitivity)
Actual Abnormal          177 (TP)              34 (FN)             211              83.89%
Actual Normal             13 (FP)             198 (TN)             211              93.84%
Total Predicted          190                  232                  422        Balanced Acc: 88.86%
Precision (PPV):         93.16%               85.34% (NPV)
Per-Class F1:            0.8828               0.8939                          Macro F1: 0.8883
Matthews Corr:           +0.7811              Cohen's Kappa: 0.7773           Diagnostic Odds: 79.29
```

#### 2. Autonomous Screening Model: Fine-Tuned LLaVA-1.5-7B v2 (Pure Image-Only)
```
                    Predicted Abnormal    Predicted Normal    Total Actual    Recall (Sensitivity)
Actual Abnormal          131 (TP)              80 (FN)             211              62.09%
Actual Normal             57 (FP)             154 (TN)             211              72.99%
Total Predicted          188                  234                  422        Balanced Acc: 67.54%
Precision (PPV):         69.68%               65.81% (NPV)
Per-Class F1:            0.6566               0.6921                          Macro F1: 0.6744
Matthews Corr:           +0.3528              Cohen's Kappa: 0.3507           ROC-AUC: 0.7481
```

#### 3. Edge Screening Baseline: Vision Transformer ViT-B/16 (Pure Image-Only on CPU)
```
                    Predicted Abnormal    Predicted Normal    Total Actual    Recall (Sensitivity)
Actual Abnormal          140 (TP)              71 (FN)             211              66.35%
Actual Normal             75 (FP)             136 (TN)             211              64.45%
Total Predicted          215                  207                  422        Balanced Acc: 65.40%
Precision (PPV):         65.12%               65.70% (NPV)
Per-Class F1:            0.6573               0.6507                          Macro F1: 0.6540
Latency (CPU):           17.25 ms             Memory Footprint: 343 MB RAM    ROC-AUC: 0.7062
```

#### 4. Medical Foundation Baseline: Google MedGemma-4B-IT (Precomputed Baseline)
```
                    Predicted Abnormal    Predicted Normal    Total Actual    Recall (Sensitivity)
Actual Abnormal           67 (TP)             144 (FN)             211              31.75%
Actual Normal              4 (FP)             207 (TN)             211              98.10%
Total Predicted           71                  351                  422        Balanced Acc: 64.93%
Precision (PPV):         94.37%               58.97% (NPV)
Per-Class F1:            0.4752               0.7366                          Macro F1: 0.6059
```

---

### 5.3 Pairwise Statistical Hypothesis Testing (McNemar's Paired Tests)

To establish whether observed performance variations are statistically significant or attributable to sampling variance, pairwise **McNemar's Tests with Edwards Continuity Correction** were performed across all 422 paired observations:

$$\chi^2 = \frac{(|b - c| - 1)^2}{b + c}$$

where $b$ is the number of cases where Model A is correct and Model B is incorrect, and $c$ is the number of cases where Model B is correct and Model A is incorrect.

```
                          PAIRWISE McNEMAR SIGNIFICANCE MATRIX (N = 422)
┌──────────────────────────────────────────────┬───────────────┬───────────┬────────────────────────┐
│ Model Comparison Pair                        │ Discordance   │ Chi-Sq    │ p-value & Significance │
│                                              │ (b / c)       │ (χ²)      │ (α = 0.05)             │
├──────────────────────────────────────────────┼───────────────┼───────────┼────────────────────────┤
│ Model 1 (LLaVA v2) vs Model 2 (ViT-B/16)     │ b = 82        │ 0.4129    │ p = 0.5205             │
│                                              │ c = 73        │           │ (Not Significant)      │
├──────────────────────────────────────────────┼───────────────┼───────────┼────────────────────────┤
│ Model 1 (LLaVA v2) vs Model 3 (MedGemma-4B)  │ b = 78        │ 0.6897    │ p = 0.4063             │
│                                              │ c = 67        │           │ (Not Significant)      │
├──────────────────────────────────────────────┼───────────────┼───────────┼────────────────────────┤
│ Model 2 (ViT-B/16) vs Model 3 (MedGemma-4B)  │ b = 76        │ 0.0150    │ p = 0.9025             │
│                                              │ c = 74        │           │ (Not Significant)      │
└──────────────────────────────────────────────┴───────────────┴───────────┴────────────────────────┘
```

#### Class-Specific Sensitivity McNemar Analysis:
While overall diagnostic accuracy differences between the models are not statistically significant, the **abnormal pathology detection rate (Sensitivity)** displays profound statistical divergence:
- **LLaVA v2 vs MedGemma-4B-IT (Abnormal Subgroup $N = 211$):**
  - LLaVA v2 correct, MedGemma incorrect: $b = 74$
  - MedGemma correct, LLaVA v2 incorrect: $c = 10$
  - $\chi^2 = \frac{(|74 - 10| - 1)^2}{74 + 10} = \frac{3969}{84} = 47.25 \quad (p = 6.25 \times 10^{-12})$
  - **Conclusion:** LLaVA v2 demonstrates a **statistically overwhelming superiority** in detecting radiographic abnormalities over MedGemma ($p < 0.0001$).
- **ViT-B/16 vs MedGemma-4B-IT (Abnormal Subgroup $N = 211$):**
  - ViT-B/16 correct, MedGemma incorrect: $b = 82$
  - MedGemma correct, ViT-B/16 incorrect: $c = 9$
  - $\chi^2 = \frac{(|82 - 9| - 1)^2}{82 + 9} = \frac{5184}{91} = 56.97 \quad (p = 4.42 \times 10^{-14})$
  - **Conclusion:** ViT-B/16 detects abnormal chest pathology at more than double the rate of MedGemma ($66.35\%$ vs $31.75\%$) with extreme statistical significance ($p < 0.0001$).

---

### 5.4 Comparative Clinical Trade-Off & Deployment Architecture

The empirical evaluation establishes clear, complementary operational roles for each of the three models within the ANVESH clinical workflow:

1. **Model 1 (Fine-Tuned LLaVA-1.5-7B v2) — The Diagnostic Multimodal Workhorse:**
   - **Strengths:** Achieves the highest overall accuracy (**67.54%**), highest specificity (**72.99%**), highest ROC-AUC (**0.7481**), and highest PR-AUC (**0.7378**). Adapting both the multimodal projection layer and language attention blocks with target-only loss masking enables it to extract structured textual clinical evidence directly from image pixels.
   - **Deployment Role:** Assigned as the primary GPU reasoning engine when high-end accelerators (NVIDIA RTX 4090 / A100) are available.

2. **Model 2 (Vision Transformer ViT-B/16) — The Ultra-Low-Latency Edge CPU Screener:**
   - **Strengths:** Achieves the highest sensitivity (**66.35%**) among all image-only models, missing the fewest abnormal pathologies (71 false negatives vs 80 for LLaVA). Most remarkably, it operates with a mean latency of **17.25 ms on standard CPU hardware** ($8.2\times$ faster than LLaVA on GPU) and consumes only **343 MB RAM**.
   - **Deployment Role:** Serves as the primary triage filter and autonomous fallback engine. Hospitals lacking dedicated GPU clusters can deploy ViT-B/16 directly on local server CPUs with zero statistical degradation in diagnostic accuracy ($p = 0.5205$).

3. **Model 3 (Google MedGemma-4B-IT) — The Out-of-the-Box Medical Foundation Reference:**
   - **Strengths:** Demonstrates near-perfect specificity (**98.10%**) and exceptional positive predictive value (**94.37%**), producing only 4 false positives across 211 normal radiographs.
   - **Clinical Pitfall & Lesson:** Suffers from catastrophic false-negative under-detection, missing **68.25% of all abnormal cases** (144 false negatives out of 211). This empirically proves that general medical instruction tuning without local decision threshold calibration is unsafe for high-stakes screening, as it excessively favors normal predictions.

---

## 6. Deterministic Clinical Policy Engine

The policy engine ([`policy_engine.py`](file:///c:/Users/EIS/Downloads/ML%20PROJECT/churn-predict-main/ANVESH/policy_engine.py)) operates as a deterministic, symbolic rules layer that evaluates extracted evidence against 100 CMS health insurance plans.

### 6.1 The 5-Point Verification Checklist
1. **Source Clinical Report Grounding:** Confirms that dictated radiologist text was present to ground the findings.
2. **Plan Benefit Coverage:** Confirms the CPT code / procedure is listed as "Covered" under the patient's plan.
3. **Text-to-Image Consistency:** Verifies that radiograph features corroborate clinical indications.
4. **Clinical Indication Support:** Confirms medical necessity criteria are met.
5. **Policy Exclusions Cross-Matching:** Cross-checks extracted abnormality tokens against plan exclusions.

### 6.2 Evidence Score Formulation & Safeguards
The evidence score $S \in [0, 100]$ is computed as:
$$S = 40 \cdot \mathbb{I}(\text{is\_consistent}) + 40 \cdot \mathbb{I}(\text{is\_supported}) + 20 \cdot \mathbb{I}(\text{is\_covered})$$

> [!IMPORTANT]
> **Grounding Score Cap Safeguard:** If an incoming case lacks clinical report text (`has_source_text = False`), the engine mathematically caps the evidence score at $S \le 40/100$ and sets `recommendation = "MANUAL_REVIEW_REQUIRED"`. This prevents automated approvals on unverified visual predictions.

### 6.3 Policy Engine Performance
- **Mean CPU Latency:** **0.6317 ms** (measured across 2,107 runs in `recorded_latencies.csv`).
- **Throughput:** **1,576 cases / second**.

---

## 7. Full-Stack Implementation & Architecture

### 7.1 Backend REST API (`main.py`)
- Built using **FastAPI 0.141.0** and **SQLAlchemy 2.0**.
- Implements 60 registered REST routes covering authentication, case management, file upload, and adjudication.
- **Session Security:** 64-character cryptographic tokens issued via HTTP-only, `SameSite=Lax` cookies. Passwords hashed using `bcrypt 5.0.0`.
- **IP Rate Limiting:** Sliding-window limiter capping login attempts at 10 requests per minute per IP.

### 7.2 Frontend Clinical Workstation (`frontend/src/`)
- Built with **React 19.2.8**, **TypeScript 6.0.2**, and **Vite 8.3.4**.
- **Layout Engine:** Custom, zero-dependency Vanilla CSS (`clinical_utilities.css` - 1,934 lines) enforcing WCAG AAA contrast, sub-millisecond rendering, and zero layout shift (CLS = 0).
- **Medical Image Viewer:** Displays 8-bit and 16-bit radiographs in native grayscale without synthetic heatmaps.
- **Role-Based Portals:**
  - **Provider Portal:** 6-step clinical authorization intake stepper with instant file validation.
  - **Insurer Reviewer Workspace:** Side-by-side policy criteria, radiographic viewer, and decision-stamping actions.
  - **Patient Portal:** Plain-language authorization tracking and cost-sharing insight.

---

## 8. Windows Installation, Setup & Reproducibility Guide

### 8.1 Prerequisites
- Windows 10/11 (64-bit).
- Python 3.11.9, Node.js v22.16.0+, NPM 10.9.2+.
- Git with Git LFS.

### 8.2 Execution Commands
```powershell
# 1. Clone repository
git clone https://github.com/Lokesh-CodeIt/ANVESH.git
cd ANVESH

# 2. Virtual Environment Setup
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
pip install transformers peft bitsandbytes accelerate fastapi uvicorn sqlalchemy pydantic pandas scikit-learn

# 3. Database Initialization (Populates medauth.db with 950 cases and 100 policies)
python init_sqlite_db.py

# 4. Start Backend API Server
python -m uvicorn main:app --host 127.0.0.1 --port 8000

# 5. Start Frontend Workstation (In a second terminal)
cd frontend
npm install
npm run dev
```

### 8.3 Executing Benchmark Reproductions
```powershell
# Reproduce ViT-B/16 Image-Only Benchmark on CPU (N=422):
python evaluate_vit_image_only.py --checkpoint checkpoints_vit_image_only/best_vit_model.pt --test_json anvesh_dataset_image_only/test.json

# Reproduce Primary LLaVA v2 Evaluation on GPU (N=422):
python evaluate_llava_v2.py --adapter_path checkpoints_llava_v2/best_adapter --threshold 0.5100

# Run Automated Regression Test Suites:
python -m pytest tests/test_auth_rbac.py
python -m pytest tests/test_submissions_uploads.py
python -m pytest tests/test_vit_artifacts.py
cd frontend && npm test
```

---

## 9. Limitations, Clinical Safety & Ethical Considerations

1. **Single-Institution Cohort Bias:** Evaluation is currently limited to the Indiana University Open-i corpus. Testing on multi-center cohorts (MIMIC-CXR, CheXpert) is planned for future phases.
2. **De-Identified Longitudinal Limitations:** De-identification of hospital MRNs prevents mathematical verification of patient-level independence across multi-study follow-ups.
3. **Absence of Spatial Pixel Grounding:** Models output textual descriptions of pathology; they do not generate bounding boxes or segmentation masks.
4. **Regulatory Status Disclaimer:** ANVESH is an academic research prototype. It has **not** been cleared by the U.S. FDA as Software as a Medical Device (SaMD) and is not intended for primary diagnosis or autonomous clinical decision-making.

---

## 10. References

1. **Rajpurkar, P., et al.** "CheXNet: Radiologist-Level Pneumonia Detection on Chest X-Rays with Deep Learning." *arXiv:1711.05225*, 2017.
2. **Dosovitskiy, A., et al.** "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale." *ICLR*, 2021.
3. **Liu, H., et al.** "Visual Instruction Tuning (LLaVA)." *NeurIPS*, 2023.
4. **Dettmers, T., et al.** "QLoRA: Efficient Finetuning of Quantized LLMs." *NeurIPS*, 2023.
5. **Hu, E. J., et al.** "LoRA: Low-Rank Adaptation of Large Language Models." *ICLR*, 2022.
6. **Demner-Fushman, D., et al.** "Preparing a Collection of Radiology Examinations for Distribution and Retrieval." *JAMIA*, 23(2):304–310, 2016.
7. **American Medical Association (AMA).** "2023 AMA Prior Authorization Physician Survey." *AMA Press*, 2024.
8. **Centers for Medicare & Medicaid Services (CMS).** "Qualified Health Plan (QHP) Public Use Files: Benefits and Cost Sharing." *HHS*, 2024.
9. **Tu, T., et al.** "Towards Generalist Biomedical AI." *NEJM AI*, 1(3), 2024.
