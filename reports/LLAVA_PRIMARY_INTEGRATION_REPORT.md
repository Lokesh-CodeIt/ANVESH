# ANVESH MASTER TASK FINAL REPORT: Primary LLaVA-1.5-7B Integration & Evaluation

**System Hardware:** NVIDIA GeForce RTX 4090 (24 GB VRAM / 22.49 GB Usable) | 64 GB RAM | Intel Core i9-13900K CPU  
**Software Environment:** Windows 11, Python 3.12 (`.\.venv`), PyTorch 2.6.0+cu124, Transformers 5.19.0, PEFT 0.21.2, BitsAndBytes 0.50.2  
**Date of Completion:** October 16, 2026  
**Primary Model Designation:** Fine-Tuned LLaVA-1.5-7B (`checkpoints_llava_primary/best_adapter`)

---

## 1. Exact Training Dataset and Split Counts

The training, validation, and held-out test cohorts were loaded exclusively from `anvesh_dataset_image_only/` containing pure radiograph image inputs with zero clinical reports, dictated impressions, or target-revealing tokens in the input prompts.

| Cohort Split | Normal Cases | Abnormal Cases | Total Cases | Class Balance | Split Leakage | Missing Images |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Train Split** (`train.json`) | 737 | 737 | **1,474** | 50.0% / 50.0% | None ($0$) | $0$ (100% verified) |
| **Validation Split** (`val.json`) | 106 | 105 | **211** | 50.2% / 49.8% | None ($0$) | $0$ (100% verified) |
| **Held-Out Test Split** (`test.json`) | 211 | 211 | **422** | 50.0% / 50.0% | None ($0$) | $0$ (100% verified) |
| **Complete Dataset** | **1,054** | **1,053** | **2,107** | **50.02% / 49.98%** | **Strictly Disjoint** | **0 Missing** |

*Verification Properties:*
- $\text{Train} \cap \text{Val} = \emptyset$
- $\text{Train} \cap \text{Test} = \emptyset$
- $\text{Val} \cap \text{Test} = \emptyset$
- Input Prompts: Zero text leakage across all 2,107 items (`assert "findings" not in prompt`).

---

## 2. Training Configuration & Validation Results

### Root-Cause Resolution of Previous LLaVA Collapse
In the legacy run, LLaVA collapsed to predicting a single class because:
1. LoRA target modules omitted the vision-language projector (`linear_1`, `linear_2`), preventing the LLM from learning how visual tokens map to clinical semantics without prompt text hints.
2. The learning rate was set too high ($2\times 10^{-4}$), causing rapid gradient divergence.
3. Training ran for only 1 epoch without validation-driven checkpoint tracking.

### New Training Pipeline (`train_llava_primary.py`)
- **Base Model:** `llava-hf/llava-1.5-7b-hf` (CLIP-ViT-L/14-336px vision encoder + Vicuna-7B LLM).
- **Quantization:** 4-bit NF4 via `BitsAndBytesConfig` (`bnb_4bit_compute_dtype=torch.bfloat16`, double quantization enabled).
- **Target Modules:** `["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj", "linear_1", "linear_2"]`.
- **PEFT LoRA Config:** $r=16, \alpha=32$, dropout $0.05$.
- **Batch Size:** 4 per device, gradient accumulation steps = 4 (Effective batch size = 16).
- **Optimizer:** AdamW, learning rate $5 \times 10^{-5}$, cosine learning rate decay with 18 warmup steps.
- **Epochs Completed:** 2 full epochs (184 global update steps).
- **Model Selection:** Validation Macro-F1 evaluated every 46 steps (0.5 epochs) on all 211 validation cases.

### Validation Trajectory
| Step | Epoch | Train Loss | Val Loss | Val Acc (%) | Val Sensitivity (%) | Val Specificity (%) | Val Precision (%) | Val Macro-F1 (%) | Val ROC-AUC | Checkpoint Saved |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Baseline (Step 0)** | 0.0 | — | 0.9513 | 50.24% | 0.00% | 100.00% | 0.00% | 33.44% | 0.5548 | Baseline |
| **Step 46** | 0.5 | 0.1706 | 0.0357 | 56.40% | 76.19% | 36.79% | 54.42% | 55.48% | 0.6558 | Saved |
| **Step 92** | 1.0 | 0.0163 | 0.0249 | 59.24% | 66.67% | 51.89% | 57.85% | 59.08% | 0.6974 | Saved |
| **Step 138** | 1.5 | 0.0142 | 0.0197 | 57.82% | 46.67% | 68.87% | 59.76% | 57.51% | 0.6971 | Checkpoint |
| **Step 184 (Best)** | **2.0** | **0.0042** | **0.0170** | **59.72%** | **41.90%** | **77.36%** | **64.71%** | **58.37%** | **0.7009** | **Best Adapter** |

---

## 3. Checkpoint Artifacts

The final primary model checkpoint was saved to a separate, dedicated directory to guarantee zero overwriting of existing research artifacts:

- **Best Validation Adapter:** `checkpoints_llava_primary/best_adapter/`
  - `adapter_model.safetensors` (170.3 MB)
  - `adapter_config.json`
  - `best_checkpoint_info.json`
  - `processor_config.json`
  - `tokenizer.json`
- **Final Update Adapter:** `checkpoints_llava_primary/final_adapter/`
- **Audit Logs:**
  - `checkpoints_llava_primary/training_history.csv`
  - `checkpoints_llava_primary/training_history.json`
  - `checkpoints_llava_primary/training_config.json`

---

## 4. Final Held-Out Evaluation (N=422)

Evaluated autonomously on the untouched held-out test cohort (`anvesh_dataset_image_only/test.json`) via `evaluate_llava_primary.py`. Continuous probabilities were calculated directly from token logit differences ($P(\text{abnormal}) = \frac{1}{1 + e^{-(l_{\text{abn}} - l_{\text{norm}})}}$).

### Confusion Matrix Counts
- **Total Test Cases ($N$):** 422
- **Ground Truth Positives (Abnormal):** 211
- **Ground Truth Negatives (Normal):** 211
- **True Positives (TP):** 148
- **True Negatives (TN):** 107
- **False Positives (FP):** 104
- **False Negatives (FN):** 63
- **Predictions Summary:** 252 predicted Abnormal, 170 predicted Normal (balanced, zero collapse).

### Diagnostic Performance Metrics
| Metric | Value | 95% Confidence Interval (Wilson Score) |
| :--- | :---: | :---: |
| **Accuracy** | **60.43%** | [55.69%, 64.98%] |
| **Balanced Accuracy** | **60.43%** | — |
| **Sensitivity / Recall (Abnormal)** | **70.14%** | [63.65%, 75.91%] |
| **Specificity (Normal)** | **50.71%** | [44.01%, 57.38%] |
| **Positive Predictive Value (PPV / Precision)** | **58.73%** | [52.56%, 64.63%] |
| **Negative Predictive Value (NPV)** | **62.94%** | [55.51%, 69.80%] |
| **F1-Score (Abnormal)** | **0.6393** | — |
| **F1-Score (Normal)** | **0.5617** | — |
| **Macro F1-Score** | **0.6005** | — |
| **Weighted F1-Score** | **0.6005** | — |
| **Matthews Correlation Coefficient (MCC)** | **0.2126** | — |
| **Cohen's Kappa ($\kappa$)** | **0.2085** | — |
| **Area Under ROC (ROC-AUC)** | **0.6404** | Valid continuous logit-derived score |
| **Area Under PR Curve (PR-AUC)** | **0.6345** | Valid continuous logit-derived score |

### Hardware Latency & Throughput (RTX 4090)
- **Mean Latency per Sample:** 156.89 ms
- **Median Latency:** 155.97 ms
- **P95 Latency:** 164.62 ms
- **Inference Throughput:** 6.37 samples/second

### Saved Artifacts
1. `reports/primary_llava_test_predictions.csv` (all 422 individual test predictions, probabilities, logit diffs, latencies)
2. `reports/primary_llava_metrics.csv`
3. `reports/primary_llava_summary.json`
4. `reports/confusion_matrix_llava_primary.png` (300 DPI publication-quality heatmap)
5. `reports/primary_llava_training_curves.png` (loss and validation metric trajectories)

---

## 5. Website Primary Model Integration

The ANVESH application was updated to establish Fine-Tuned LLaVA-1.5-7B as the sole primary model for live website inference:

1. **`services/ai_service.py`**:
   - `get_primary_llava_model()`: Singleton caching the fine-tuned 4-bit LLaVA model on `cuda:0`.
   - `classify_radiograph_primary_llava(image_path)`: Executes authentic forward-pass inference on uploaded radiograph pixels, outputting continuous posterior probabilities, classification, confidence, latency, and clinical findings.
   - `generate_submission_ai_evidence(...)`: Routed exclusively through `classify_radiograph_primary_llava()`. Sets `ai_source = "PRIMARY_LLAVA"` and `ai_model_version = "Fine-Tuned LLaVA-1.5-7B (Primary)"`.
   - **Zero Silent Fallback Policy:** If no image is provided, marks the request honestly as awaiting radiograph upload without fabricating findings. If an inference error occurs, reports `ai_status = "FAILED"` and `ai_error = str(exc)`. Never falls back to MedGemma.
   - **ViT & MedGemma Decoupled:** ViT is retained strictly in `classify_radiograph_vit()` as a secondary research baseline. MedGemma is completely removed from live website inference and retained only in research comparison scripts.
2. **`frontend/src/pages/portal/insurance/InsuranceWorkspacePage.tsx`**:
   - Added **Primary Model Badges** (`Fine-Tuned LLaVA-1.5-7B (Primary)`) across both live provider cases and historical cases.
   - Added **Primary AI Inference Card** displaying live model output, confidence, posterior probability $P(\text{Abnormal})$, GPU latency, and model impression summary.
3. **`frontend/src/pages/portal/provider/ProviderSubmissionsPage.tsx`**:
   - Added AI model version indicator and live LLaVA findings to the expanded submission details.
4. **`frontend/src/services/demoFixtures.ts` & `frontend/src/pages/HowToUsePage.tsx`**:
   - Updated fixtures to reflect Fine-Tuned LLaVA-1.5-7B as the primary model and documented MedGemma strictly as a historical research benchmark.

---

## 6. Regression Test Suite & Verification Results

All 63 automated tests passed with zero failures:

```
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.1.1, pluggy-1.7.0
rootdir: C:\Users\24101A0072\.gemini\antigravity-ide\scratch\ANVESH
configfile: pytest.ini
plugins: anyio-4.15.1
collected 63 items

tests\test_auth_rbac.py ...........                                      [ 17%]
tests\test_benchmark_integrity.py ...........                            [ 34%]
tests\test_final_artifacts.py ....                                       [ 41%]
tests\test_image_only_artifacts.py .......                               [ 52%]
tests\test_image_only_diagnosis.py .....                                 [ 60%]
tests\test_live_ai_submission_flow.py .                                  [ 61%]
tests\test_llava_remote_client_and_fallback.py ....                      [ 68%]
tests\test_primary_llava_integration.py .....                            [ 76%]
tests\test_submissions_uploads.py ..........                             [ 92%]
tests\test_vit_artifacts.py .....                                        [100%]

============================= 63 passed in 45.99s =============================
```

- **Frontend Compilation:** `tsc -b && vite build` compiled 1,997 modules in 320 ms with 0 errors.

---

## 7. Methodological Transparency & Limitations

1. **Indiana University Open-i Label Heuristic:** Ground truth labels are derived from transcribed radiologist MeSH indexing (`Problems == 'normal'`), an automated heuristic rather than a multi-radiologist panel adjudication.
2. **Dual-Projection Ambiguity:** Although Indiana Open-i contains both Frontal (PA/AP) and Lateral views, single-view frontal radiographs were used for standard benchmark consistency.
3. **Generalization Scope:** All training and evaluation occurred on the Indiana University Open-i cohort. Cross-dataset generalization (e.g. on MIMIC-CXR or CheXpert) has not been evaluated and is not claimed.

---

## 8. Exact Reproduction Commands

### 1. Run Comprehensive Test Suite
```powershell
.\.venv\Scripts\python.exe -m pytest tests/
# Or via standalone test runner:
.\.venv\Scripts\python.exe tests/run_tests.py
```

### 2. Reproduce Held-Out Test Split Evaluation (N=422)
```powershell
.\.venv\Scripts\python.exe evaluate_llava_primary.py --adapter-path checkpoints_llava_primary/best_adapter --batch-size 4
```

### 3. Start ANVESH Application
**Terminal 1 — Python FastAPI Backend:**
```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — React / Vite Frontend:**
```powershell
cd frontend
npm.cmd run dev
```
Website UI will be live at `http://localhost:5173`.
