# ANVESH Multimodal Benchmark: IEEE Research Tables

## Table I: Head-to-Head Comparative Results (Held-Out Test Cohort, N = 422)

| Metric / Dimension | MedGemma-4B (Pretrained) | LLaVA-1.5-7B (Fine-Tuned) | Absolute Delta ($\Delta$) | Statistical 95% CI / Protocol Note |
|---|:---:|:---:|:---:|---|
| **Total Test Cohort ($N$)** | 422 | 422 | 0 | Patient-level separated held-out split |
| **Ground Truth Abnormal ($P$)** | 211 | 211 | 0 | Indiana University Open-i Radiologist Dictation |
| **Ground Truth Normal ($N$)** | 211 | 211 | 0 | Indiana University Open-i Radiologist Dictation |
| **True Positives ($TP$)** | 67 | 177 | +110 | Correctly detected abnormal studies |
| **True Negatives ($TN$)** | 207 | 198 | -9 | Correctly identified normal studies |
| **False Positives ($FP$)** | 4 | 13 | +9 | Normal studies flagged abnormal |
| **False Negatives ($FN$)** | 144 | 34 | -110 | Missed abnormal studies |
| **Standard Accuracy** | 64.93% | 88.86% | +23.93% | Wilson CI: [85.50%, 91.52%] |
| **Balanced Accuracy** | 64.93% | 88.86% | +23.93% | Mean of sensitivity and specificity |
| **Sensitivity / Recall (Abnormal)** | 31.75% | 83.89% | +52.13% | Wilson CI: [78.33%, 88.23%] |
| **Specificity (Normal)** | 98.10% | 93.84% | -4.27% | Wilson CI: [89.75%, 96.36%] |
| **Precision (PPV - Abnormal)** | 94.37% | 93.16% | -1.21% | Wilson CI: [88.65%, 95.96%] |
| **Negative Predictive Value (NPV)** | 58.97% | 85.34% | +26.37% | Precision of normal class |
| **Abnormal $F_1$-Score** | 47.52% | 88.28% | +40.76% | Harmonic mean of PPV and sensitivity |
| **Normal $F_1$-Score** | 73.67% | 89.39% | +15.73% | Harmonic mean of NPV and specificity |
| **Macro $F_1$-Score** | 60.59% | 88.83% | +28.24% | Unweighted class average |
| **Weighted $F_1$-Score** | 60.59% | 88.83% | +28.24% | Prevalence-weighted class average |
| **Matthews Corr. Coeff. (MCC)** | +0.3991 | +0.7811 | +0.3821 | Pearson correlation for binary classification |
| **Cohen's Kappa ($\kappa$)** | +0.2986 | +0.7773 | +0.4787 | Agreement beyond chance |
| **Inference Latency** | ~8,500 ms (Colab T4) | 2433.3 ms | Local RTX 4090 | Measured batch execution |

---

## Table II: Confusion Matrix Breakdown (Side-by-Side)

| Actual Ground Truth | MedGemma Pred Normal | MedGemma Pred Abnormal | LLaVA Pred Normal | LLaVA Pred Abnormal | Class Total |
|---|:---:|:---:|:---:|:---:|:---:|
| **Actual Normal** | **207 (TN)** | **4 (FP)** | **198 (TN)** | **13 (FP)** | 211 |
| **Actual Abnormal** | **144 (FN)** | **67 (TP)** | **34 (FN)** | **177 (TP)** | 211 |
| **Total Predicted** | **351** | **71** | **232** | **190** | 422 |

---

## Table III: Cross-Dataset Generalization Status

| Dataset Name | Source / Institution | Samples Evaluated | Availability Status | Limitation / Note |
|---|---|:---:|:---:|---|
| **Indiana University Open-i** | NIH / Indiana University | 422 held-out | **Completed** | Full in-distribution test split evaluated. |
| **External CXR Cohort** | N/A (MIMIC-CXR / CheXpert / NIH CXR-14) | 0 | **NOT COMPLETED (Unavailable)** | No external CXR dataset provisioned on local hardware. |
