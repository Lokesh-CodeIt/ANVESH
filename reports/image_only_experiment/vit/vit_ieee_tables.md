# IEEE Comparative Evaluation Tables: Vision Transformer vs. Multimodal Baselines

**Dataset:** Indiana University Open-i Chest Radiograph Collection (Held-Out Test Set, N = 422)
**Modality:** Pure Image-Only (Zero clinical findings, indications, or text prompts)

## Table I: Standalone and Comparative Classification Performance

| Metric | ViT-B/16 (Image-Only Fine-Tuned) | LLaVA-1.5-7B (Image-Only Adapter) | LLaVA-1.5-7B (Base Zero-Shot) | LLaVA-1.5-7B (Text Adapter Ablation) | MedGemma-4B-IT (Pretrained Baseline) |
| --- | --- | --- | --- | --- | --- |
| Total Cases (N) | 422 | 422 | 422 | 422 | NOT EVALUATED (Blocked) |
| True Positives (TP) | 140 | 211 | 0 | 0 | NOT EVALUATED (Blocked) |
| True Negatives (TN) | 136 | 0 | 211 | 211 | NOT EVALUATED (Blocked) |
| False Positives (FP) | 75 | 211 | 0 | 0 | NOT EVALUATED (Blocked) |
| False Negatives (FN) | 71 | 0 | 211 | 211 | NOT EVALUATED (Blocked) |
| Accuracy | 65.40% | 50.00% | 50.00% | 50.00% | NOT EVALUATED (Blocked) |
| Accuracy 95% CI | [60.74%, 69.78%] | [45.25%, 54.75%] | [45.25%, 54.75%] | [45.25%, 54.75%] | NOT EVALUATED (Blocked) |
| Balanced Accuracy | 65.40% | 50.00% | 50.00% | 50.00% | NOT EVALUATED (Blocked) |
| Sensitivity / Recall (Abnormal) | 66.35% | 100.00% | 0.00% | 0.00% | NOT EVALUATED (Blocked) |
| Sensitivity 95% CI | [59.73%, 72.38%] | [98.21%, 100.00%] | [0.00%, 1.79%] | [0.00%, 1.79%] | NOT EVALUATED (Blocked) |
| Specificity (Normal) | 64.45% | 0.00% | 100.00% | 100.00% | NOT EVALUATED (Blocked) |
| Specificity 95% CI | [57.79%, 70.60%] | [0.00%, 1.79%] | [98.21%, 100.00%] | [98.21%, 100.00%] | NOT EVALUATED (Blocked) |
| Precision (PPV - Abnormal) | 65.12% | 50.00% | 0.00% | 0.00% | NOT EVALUATED (Blocked) |
| Precision 95% CI | [58.53%, 71.17%] | [45.25%, 54.75%] | [0.00%, 0.00%] | [0.00%, 0.00%] | NOT EVALUATED (Blocked) |
| Negative Predictive Value (NPV) | 65.70% | 0.00% | 50.00% | 50.00% | NOT EVALUATED (Blocked) |
| F1-Score (Abnormal) | 65.73% | 66.67% | 0.00% | 0.00% | NOT EVALUATED (Blocked) |
| F1-Score (Normal) | 65.07% | 0.00% | 66.67% | 66.67% | NOT EVALUATED (Blocked) |
| Macro F1-Score | 65.40% | 33.33% | 33.33% | 33.33% | NOT EVALUATED (Blocked) |
| Weighted F1-Score | 65.40% | 33.33% | 33.33% | 33.33% | NOT EVALUATED (Blocked) |
| Matthews Correlation Coefficient (MCC) | 0.3081 | 0.0000 | 0.0000 | 0.0000 | NOT EVALUATED (Blocked) |
| Cohen's Kappa | 0.3081 | 0.0000 | 0.0000 | 0.0000 | NOT EVALUATED (Blocked) |
| ROC-AUC | 0.7062 | N/A | N/A | N/A | NOT EVALUATED (Blocked) |
| Mean Latency (ms) | 17.2475 | 419.5801 | 212.2753 | 330.5433 | NOT EVALUATED (Blocked) |
| Median Latency (ms) | 13.4787 | 417.5864 | 211.1253 | 325.7026 | NOT EVALUATED (Blocked) |
| P95 Latency (ms) | 30.2843 | 460.5663 | 221.8579 | 354.2361 | NOT EVALUATED (Blocked) |

*Note: MedGemma-4B-IT is marked 'NOT EVALUATED (Blocked)' because weights are gated on Hugging Face and require user credentials that are not stored in this autonomous environment. Cross-dataset evaluation is NOT COMPLETED as no independent verified external cohort is available without data fabrication.*
