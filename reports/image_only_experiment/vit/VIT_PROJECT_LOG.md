# Vision Transformer (ViT-B/16) CXR Classification Project Log

**Project:** ANVESH — Pure Image-Only Vision Transformer Pipeline  
**Investigator:** Antigravity Autonomous Research Assistant  
**Hardware:** NVIDIA GeForce RTX 4090 24GB VRAM, Intel Core i9-13900K, 64 GB RAM  
**Environment:** Windows 11, PyTorch 2.6.0+cu124, Torchvision 0.21.0+cu124, CUDA 12.4  
**Date:** October 2026  

---

## Chronological Task Log

### Milestone 1: Environment & Dataset Audit
- Confirmed PyTorch 2.6.0+cu124 and Torchvision 0.21.0 on local RTX 4090.
- Audited `anvesh_dataset_image_only/`:
  - `train.json`: 1,474 cases (737 normal, 737 abnormal; 50.0% balance)
  - `val.json`: 211 cases (106 normal, 105 abnormal)
  - `test.json`: 422 cases (211 normal, 211 abnormal; 50.0% balance)
  - Split intersections: Zero overlap between all pairs ($\text{Train} \cap \text{Val} = \emptyset$, $\text{Train} \cap \text{Test} = \emptyset$, $\text{Val} \cap \text{Test} = \emptyset$).
  - Physical images: 2,107 images in `anvesh_dataset/images/` checked; 0 missing, 0 unreadable.
  - Zero clinical text leakage confirmed.

### Milestone 2: Pipeline Implementation & Architecture Design
- Script: `train_vit_image_only.py`
- Selected `torchvision.models.vit_b_16` with ImageNet-1k pretrained weights (`ViT_B_16_Weights.IMAGENET1K_V1`).
- Replaced linear head: $768 \to 2$ (`normal`: 0, `abnormal`: 1).
- Designed conservative CXR data augmentations (resizing, mild crop, $\pm 7^\circ$ rotation, mild color jitter; strictly omitted horizontal flipping to preserve thoracic situs).
- Parameter groups with differential learning rates: backbone $2\times 10^{-5}$, head $2\times 10^{-4}$, weight decay $0.01$.
- Implemented validation evaluation loop, cosine annealing schedule, and safe checkpointing (`best_vit_model.pt` and `checkpoint_last.pt` for resumption).

### Milestone 3: Model Fine-Tuning Execution
- Executed 15 training epochs on RTX 4090 (total time: 642.62 seconds, ~34s/epoch).
- Monitored validation loss, balanced accuracy, and ROC-AUC.
- Discovered and fixed PyTorch 2.6 default `weights_only=True` behavior by explicitly setting `weights_only=False` for safe local checkpoint deserialization.
- Best validation model saved at Epoch 7 (Val Loss: 0.5038, Val Acc: 75.83%, Val AUC: 0.8358).

### Milestone 4: Held-Out Test Evaluation & Metric Computation
- Script: `evaluate_vit_image_only.py`
- Evaluated `checkpoints_vit_image_only/best_vit_model.pt` across all 422 held-out test cases.
- Recorded per-case continuous probabilities (`prob_normal`, `prob_abnormal`) and dedicated GPU execution latencies.
- Evaluated metrics:
  - $TP = 140, TN = 136, FP = 75, FN = 71$ ($N = 422$)
  - Accuracy: **65.40%** (95% CI: [60.74%, 69.78%])
  - Balanced Accuracy: **65.40%**
  - Sensitivity: **66.35%** (95% CI: [59.73%, 72.38%])
  - Specificity: **64.45%** (95% CI: [57.79%, 70.60%])
  - Precision: **65.12%** (95% CI: [58.53%, 71.17%])
  - Negative Predictive Value: **65.70%**
  - Macro F1-Score: **65.40%**
  - MCC: **+0.3081**
  - Cohen's Kappa: **0.3081**
  - ROC-AUC: **0.7062** (95% CI: [0.6552, 0.7569])
  - PR-AUC: **0.7187**
  - Forward Latency: Mean **17.25 ms**, Median **13.48 ms**, P95 **30.28 ms**

### Milestone 5: Comparative Analysis & Research Artifact Export
- Exported side-by-side comparison with multimodal baselines (`llava_image_only`, `llava_base_zeroshot`, `llava_text_adapter_ablation`).
- Reused verified predictions without re-running expensive inference.
- MedGemma-4B-IT strictly recorded as `NOT EVALUATED (Blocked)` due to gated HF repository credentials.
- Generated publication-ready IEEE Markdown and LaTeX tables.
- Plotted 300 DPI confusion matrix heatmap and training history convergence curves.

### Milestone 6: Automated Testing & Verification
- Unit test suite `tests/test_vit_artifacts.py` integrated into `tests/run_tests.py`.
- Verified file existence, unique case IDs, probability bounds in $[0, 1]$, sum-to-one constraint, confusion matrix counts, and PNG headers.
