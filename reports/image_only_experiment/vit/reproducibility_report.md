# ANVESH: Vision Transformer (ViT-B/16) CXR Classification Reproducibility Report

**Project:** ANVESH — Multimodal & Vision-Only Chest Radiograph AI Research Evaluation  
**Experiment:** Pure Image-Only Normal vs. Abnormal Chest Radiograph Classification  
**Target Architecture:** Vision Transformer ViT-B/16 (`torchvision.models.vit_b_16`, ImageNet-1k initialization)  
**Date:** October 2026  
**Status:** COMPLETE & FULLY VERIFIED  

---

## 1. Executive Summary & Scientific Objective

In earlier phases of the ANVESH project, multimodal models evaluated on report-assisted prompt templates achieved high diagnostic accuracy (LLaVA-1.5-7B: 88.86%), but subsequent auditing demonstrated that performance was driven by text extraction from radiologist-dictated impression strings embedded within the prompt. When evaluated under strict **pure image-only conditions** (zero clinical text, findings, or indications), all autoregressive multimodal models collapsed to 50.00% chance accuracy due to unadapted visual token projections and mode collapse.

The scientific objective of this experiment was to evaluate whether a dedicated, fine-tuned **Vision Transformer (ViT-B/16)** operating directly on raw radiograph pixels could learn discriminative thoracic representations for normal vs. abnormal chest X-ray classification.

### Key Empirical Findings:
1. **Successful Thoracic Representation Learning:** ViT-B/16 completely avoids the single-class representation collapse observed in autoregressive multimodal models. ViT achieves **65.40% Accuracy** (95% CI: [60.74%, 69.78%]) and **65.40% Balanced Accuracy** on the held-out test cohort ($N = 422$), with balanced sensitivity (**66.35%**) and specificity (**64.45%**).
2. **Statistically Significant Discrimination:** ViT achieves a positive Matthews Correlation Coefficient of **+0.3081** and Cohen's Kappa of **0.3081**, with a genuine **ROC-AUC of 0.7062** (95% CI: [0.6552, 0.7569]) and **PR-AUC of 0.7187**, proving true visual signal extraction from radiograph pixels without text prompting.
3. **25x Lower Inference Latency:** Mean per-case forward latency for ViT-B/16 is **17.25 ms** (median 13.48 ms, P95 30.28 ms), compared to **419.58 ms** for LLaVA-1.5-7B, offering a 24.3x to 31.0x inference speedup suitable for real-time triage workflows.

---

## 2. Dataset Provenance, Partitions & Verification

All experiments utilize the Indiana University Open-i Chest Radiograph Collection (`ykumards/open-i`), de-identified at the study level (`uid`).

### 2.1 Cohort Partitioning (Zero-Leakage Verified)
| Split | Total Cases | Normal | Abnormal | Balance Ratio | Overlap with Other Splits |
|---|---|---|---|---|---|
| **Training (`train.json`)** | 1,474 | 737 | 737 | 50.0% / 50.0% | Exactly 0 cases ($\emptyset$) |
| **Validation (`val.json`)** | 211 | 106 | 105 | 50.2% / 49.8% | Exactly 0 cases ($\emptyset$) |
| **Held-Out Test (`test.json`)** | 422 | 211 | 211 | 50.0% / 50.0% | Exactly 0 cases ($\emptyset$) |
| **Total Cohort** | **2,107** | **1,054** | **1,053** | **50.0% / 50.0%** | **Pairwise Disjoint ($\emptyset$)** |

### 2.2 Physical Image & Integrity Audit
- **Missing Images on Disk:** 0 / 2,107
- **Corrupted / Unreadable Images:** 0 / 2,107
- **Duplicate Case IDs:** 0 across all splits
- **Input Modality:** Pure RGB image pixels ($224 \times 224$). Zero prompt text, clinical history, radiologist findings, or impression strings enter the model.

### 2.3 Label Provenance and Limitations
- Ground truth binary labels (`normal` vs. `abnormal`) were determined from the original Indiana University radiologist report dictations.
- *Limitations:* Study-level binary targets aggregate diverse thoracic pathologies (cardiomegaly, pneumothorax, pulmonary edema, pleural effusion, atelectasis, consolidation) into a single "abnormal" class. Subtle degenerative spinal changes or minor osteophytes in elderly patients may be labeled abnormal in some instances, reflecting real-world radiologist variation.

---

## 3. Architecture & Training Pipeline Specification

### 3.1 Model Architecture
- **Base Model:** Vision Transformer ViT-B/16 (`torchvision.models.vit_b_16`)
- **Initialization:** ImageNet-1k pretrained weights (`ViT_B_16_Weights.IMAGENET1K_V1`, official PyTorch checkpoint `vit_b_16-c867db91.pth`)
- **Classification Head:** Linear projection $768 \to 2$ (`0`: normal, `1`: abnormal)
- **Total Parameters:** 85,800,194 parameters (~85.8 M)

### 3.2 Preprocessing & Data Augmentation
- **Training Augmentation (Conservative, Thorax-Preserving):**
  - Bilinear Resize to $224 \times 224$
  - Random Resized Crop ($224 \times 224$, scale $0.85$ to $1.00$)
  - Mild Random Rotation ($\pm 7^\circ$)
  - Color Jitter (Brightness $\pm 0.1$, Contrast $\pm 0.1$)
  - Normalization: ImageNet mean ($[0.485, 0.456, 0.406]$) and standard deviation ($[0.229, 0.224, 0.225]$)
  - *Design Choice:* Random horizontal flipping was strictly omitted to preserve anatomical left-right asymmetry (cardiac silhouette, aortic knob).
- **Validation & Test Preprocessing:**
  - Bilinear Resize to $224 \times 224$
  - Center Crop $224 \times 224$
  - ImageNet Normalization

### 3.3 Optimization & Hyperparameters
- **Optimizer:** AdamW ($\beta_1 = 0.9, \beta_2 = 0.999$, weight decay $= 0.01$)
- **Differential Learning Rates:**
  - Pretrained Transformer Backbone: $2 \times 10^{-5}$
  - Newly Initialized Classification Head: $2 \times 10^{-4}$
- **Learning Rate Schedule:** Cosine Annealing decay to $\eta_{\text{min}} = 10^{-6}$ over 15 epochs
- **Loss Function:** Categorical Cross-Entropy Loss
- **Batch Size:** 32 (effective batch size 32)
- **Gradient Clipping:** Max norm $1.0$
- **Total Epochs:** 15 (Completed in 642.6 seconds on local RTX 4090)
- **Best Validation Epoch:** Epoch 7 (Validation Loss: 0.5038, Val Acc: 75.83%, Val AUC: 0.8358)
- **Hardware:** NVIDIA GeForce RTX 4090 24GB VRAM (22.49 GB usable via PyTorch), Intel Core i9-13900K, 64 GB RAM, PyTorch 2.6.0+cu124, CUDA 12.4
- **Random Seed:** 42 (reproducible seed across PyTorch, NumPy, Python standard library)

---

## 4. Evaluation Protocol & Prior Test Set Disclosure

- **Model Selection Protocol:** The best model checkpoint (`best_vit_model.pt`) was selected strictly using validation loss on the 211-case validation cohort (`val.json`).
- **Prior Test Set Disclosure:** The 422-case held-out test split was examined in earlier multimodal experiments. In accordance with strict scientific disclosure guidelines, **the test split was NOT used at any point to tune ViT hyperparameters, select learning rates, adjust thresholds, or choose checkpoints**.
- **Probability Extraction:** All test predictions include genuine continuous softmax probabilities: $P(\text{normal}) + P(\text{abnormal}) = 1.0$.
- **Decision Threshold:** Standard uncalibrated decision boundary $P(\text{abnormal}) \ge 0.5$.
- **Latency Measurement:** Per-case GPU execution latency timed via high-precision `torch.cuda.synchronize()` surrounding forward passes, excluding data loading and disk I/O.

---

## 5. Empirical Results on Held-Out Test Cohort ($N = 422$)

### 5.1 Standalone ViT-B/16 Performance Metrics
| Metric | Point Estimate | 95% Confidence Interval | Method |
|---|---|---|---|
| **Total Cohort ($N$)** | 422 | — | Exact Count |
| **Ground Truth Positives (Abnormal)** | 211 | — | Exact Count |
| **Ground Truth Negatives (Normal)** | 211 | — | Exact Count |
| **True Positives (TP)** | 140 | — | Contingency Count |
| **True Negatives (TN)** | 136 | — | Contingency Count |
| **False Positives (FP)** | 75 | — | Contingency Count |
| **False Negatives (FN)** | 71 | — | Contingency Count |
| **Accuracy** | **65.40%** | [60.74%, 69.78%] | Wilson Score Interval |
| **Error Rate** | 34.60% | — | $1 - \text{Accuracy}$ |
| **Balanced Accuracy** | **65.40%** | — | $(\text{Sens} + \text{Spec}) / 2$ |
| **Sensitivity / Recall (Abnormal)** | **66.35%** | [59.73%, 72.38%] | Wilson Score Interval |
| **Specificity (Normal)** | **64.45%** | [57.79%, 70.60%] | Wilson Score Interval |
| **Precision (PPV - Abnormal)** | **65.12%** | [58.53%, 71.17%] | Wilson Score Interval |
| **Negative Predictive Value (NPV)** | 65.70% | — | $\text{TN} / (\text{TN} + \text{FN})$ |
| **F1-Score (Abnormal)** | 65.73% | — | Harmonic Mean |
| **F1-Score (Normal)** | 65.07% | — | Harmonic Mean |
| **Macro F1-Score** | **65.40%** | — | Unweighted Class Average |
| **Weighted F1-Score** | **65.40%** | — | Balanced Class Weights |
| **Matthews Correlation Coefficient (MCC)** | **+0.3081** | — | Correlation Coefficient |
| **Cohen's Kappa ($\kappa$)** | **0.3081** | — | Inter-rater Agreement |
| **ROC-AUC** | **0.7062** | [0.6552, 0.7569] | Nonparametric Bootstrap ($B=1000$) |
| **PR-AUC** | **0.7187** | — | Precision-Recall AUC |
| **Mean Forward Latency** | **17.25 ms** | — | Dedicated GPU Timing |
| **Median Forward Latency** | **13.48 ms** | — | Dedicated GPU Timing |
| **P95 Forward Latency** | **30.28 ms** | — | 95th Percentile |

---

## 6. Comparative Analysis: ViT vs. Multimodal Baselines

The table below contrasts the dedicated fine-tuned Vision Transformer with the three multimodal LLaVA conditions evaluated under identical zero-leakage, pure image-only constraints across the exact same 422 held-out cases:

| Metric | ViT-B/16 (Ours) | LLaVA Image-Only | LLaVA Base | LLaVA Text-Ablation | MedGemma-4B-IT |
|---|:---:|:---:|:---:|:---:|:---:|
| **Condition** | Dedicated ViT Fine-Tuned | Fine-Tuned QLoRA Adapter | Pretrained Base Zero-Shot | Text Adapter (No Text) | Pretrained Baseline |
| **Modality** | Pure Pixels | Pure Pixels | Pure Pixels | Pure Pixels | Pure Pixels |
| **Total Cases ($N$)** | 422 | 422 | 422 | 422 | NOT EVALUATED (Blocked) |
| **TP / TN / FP / FN** | 140 / 136 / 75 / 71 | 211 / 0 / 211 / 0 | 0 / 211 / 0 / 211 | 0 / 211 / 0 / 211 | NOT EVALUATED (Blocked) |
| **Accuracy** | **65.40%** | 50.00% | 50.00% | 50.00% | NOT EVALUATED (Blocked) |
| **Accuracy 95% CI** | **[60.74%, 69.78%]** | [45.25%, 54.75%] | [45.25%, 54.75%] | [45.25%, 54.75%] | NOT EVALUATED (Blocked) |
| **Balanced Accuracy** | **65.40%** | 50.00% | 50.00% | 50.00% | NOT EVALUATED (Blocked) |
| **Sensitivity (Abnormal)** | **66.35%** | 100.00% | 0.00% | 0.00% | NOT EVALUATED (Blocked) |
| **Specificity (Normal)** | **64.45%** | 0.00% | 100.00% | 100.00% | NOT EVALUATED (Blocked) |
| **Precision (Abnormal)** | **65.12%** | 50.00% | 0.00% | 0.00% | NOT EVALUATED (Blocked) |
| **Macro F1-Score** | **65.40%** | 33.33% | 33.33% | 33.33% | NOT EVALUATED (Blocked) |
| **MCC** | **+0.3081** | 0.0000 | 0.0000 | 0.0000 | NOT EVALUATED (Blocked) |
| **ROC-AUC** | **0.7062** | N/A (Discrete Mode) | N/A (Discrete Mode) | N/A (Discrete Mode) | NOT EVALUATED (Blocked) |
| **Mean Latency (ms)** | **17.25 ms** | 419.58 ms | 212.28 ms | 330.54 ms | NOT EVALUATED (Blocked) |

### Key Scientific Takeaways:
1. **Resolution of Single-Class Collapse:** All multimodal autoregressive models collapsed to degenerate 50.00% heuristics (all-abnormal or all-normal, MCC=0.0000). ViT-B/16 achieves balanced sensitivity (66.35%) and specificity (64.45%), yielding an MCC of +0.3081 and ROC-AUC of 0.7062.
2. **Computational Efficiency:** ViT-B/16 executes live forward inference in 17.25 ms on RTX 4090, compared to 419.58 ms for LLaVA-1.5-7B (a 24.3x reduction in GPU execution time).
3. **Honest Baseline Accounting:** MedGemma-4B-IT remains strictly marked as `NOT EVALUATED (Blocked: Gated model requires HF authentication)` to maintain scientific integrity. Cross-dataset generalization remains `NOT COMPLETED`.

---

## 7. Artifact Manifest & Verification

All generated artifacts are persisted in the repository:
- `reports/image_only_experiment/vit/vit_test_predictions.csv`: 422 case predictions with probabilities and latencies.
- `reports/image_only_experiment/vit/vit_standalone_metrics.csv`: Complete standalone metric table.
- `reports/image_only_experiment/vit/vit_summary.json`: Machine-readable structured evaluation summary.
- `reports/image_only_experiment/vit/vit_confusion_matrix_counts.csv`: Contingency counts ($140, 136, 75, 71$).
- `reports/image_only_experiment/vit/vit_confusion_matrix.png`: 300 DPI annotated confusion matrix figure.
- `reports/image_only_experiment/vit/vit_training_history.csv`: Per-epoch training log across 15 epochs.
- `reports/image_only_experiment/vit/vit_training_curves.png`: 300 DPI convergence curves.
- `reports/image_only_experiment/vit/vit_vs_existing_models_comparison.csv`: Side-by-side comparison table.
- `reports/image_only_experiment/vit/vit_ieee_tables.md`: IEEE Markdown formatted tables.
- `reports/image_only_experiment/vit/vit_ieee_tables.tex`: IEEE LaTeX formatted booktabs tables.
- `checkpoints_vit_image_only/best_vit_model.pt`: Serialized PyTorch state dictionary (343.3 MB).
- `checkpoints_vit_image_only/vit_config.json`: Hardware, hyperparameters, and environment config.

---

## 8. Limitations & Clinical Disclaimers

1. **Not for Autonomous Clinical Diagnosis:** A binary classification accuracy of 65.40% and ROC-AUC of 0.7062 is a proof-of-concept for representation learning, not clinical diagnostic competence. It must not be deployed in real patient care without extensive domain-specific pretraining and radiologist oversight.
2. **Single-Center Cohort:** Evaluation was conducted exclusively on the Indiana University Open-i cohort. External cross-dataset generalization to other centers (e.g., CheXpert, MIMIC-CXR) is unverified and marked NOT COMPLETED.
3. **Binary Pathological Aggregation:** Abnormal cases encapsulate broad conditions ranging from severe pneumonia to minor apical thickening. Multi-label granular classification is required for clinical utility.
