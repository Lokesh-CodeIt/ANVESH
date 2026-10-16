# ANVESH Comprehensive Image-Only Model Benchmark Comparison

| Model Architecture | Input Modality | Parameters | Test Cohort N | Accuracy (%) | Sensitivity (%) | Specificity (%) | Macro F1 (%) | MCC | ROC-AUC | Inference Device | Latency (ms) | Status / Failure Mode |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Base LLaVA-1.5-7B (Zero-Shot) | Pure Image | 7.06 B | 422 | 50.00% | 0.00% | 100.00% | 33.33% | 0.0000 | 0.5547 | CUDA (RTX 4090) | 145.20 | Single-class collapse (Normal only) |
| Prior LLaVA-1.5-7B v1 (Step 184) | Pure Image | 7.08 B (19.9M LoRA) | 422 | 50.24% | 0.00% | 100.00% | 33.44% | 0.0000 | 0.5500 | CUDA (RTX 4090) | 419.58 | Defective loss masking (3% gradient) & token bug |
| Vision Transformer (ViT-B/16 Baseline) | Pure Image | 85.8 M | 422 | 65.40% | 66.35% | 64.45% | 65.39% | +0.3081 | 0.7062 | CPU | 17.25 | Balanced baseline, lower specificity & AUC |
| Fine-Tuned LLaVA-1.5-7B v2 (Primary Ours) | Pure Image | 7.08 B (20.5M LoRA + Projector) | 422 | 67.54% | 62.09% | 72.99% | 67.44% | +0.3528 | 0.7481 | CUDA (RTX 4090) | 141.14 | Primary Model: Best Accuracy, Specificity, MCC & AUC |
