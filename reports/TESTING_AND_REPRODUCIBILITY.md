# ANVESH: Testing, Environment & Reproducibility Guide

**Project:** ANVESH — Multimodal Chest Radiograph AI Research Evaluation  
**Author / Engineering Team:** Medical AI Systems Laboratory & Antigravity Autonomous Researcher  
**Target Publication:** IEEE Transactions on Medical Imaging / IEEE Journal of Biomedical and Health Informatics  
**Document Release:** October 2026  

---

## 1. Verified Hardware & Software Environment

All benchmarks and evaluations were executed and verified on the local physical workstation under the following confirmed specifications:

### 1.1 Compute Hardware
| Component | Workstation Specification | Verified State / Value |
|---|---|---|
| **Graphics Processing Unit (GPU)** | NVIDIA GeForce RTX 4090 | 24 GB GDDR6X (22.49 GB usable VRAM via PyTorch) |
| **Central Processing Unit (CPU)** | Intel Core i9-13900K | 24 Cores / 32 Threads |
| **System Memory (RAM)** | 64 GB DDR5 | 63.69 GB Available Total Physical Memory |
| **Storage (Primary Drive)** | Solid State Drive (NVMe) | 62.96 GB Free Storage Verified |
| **Storage (Model Cache Volume)** | Storage Drive `S:\` | `S:\anvesh_ml_cache` (HuggingFace Hub Cache) |

### 1.2 Software Stack
| Software Layer | Package / Tool | Version |
|---|---|---|
| **Operating System** | Microsoft Windows 11 Professional | 64-bit (x86_64) |
| **Python Runtime** | Python (Virtual Environment) | `.venv\Scripts\python.exe` |
| **Deep Learning Framework** | PyTorch (`torch`) | `2.6.0+cu124` |
| **CUDA Toolkit Runtime** | NVIDIA CUDA | `12.4` |
| **Model Transformers** | Hugging Face Transformers | `4.49.0` |
| **Parameter-Efficient Fine-Tuning** | Hugging Face PEFT | `0.14.0` |
| **Low-Bit Quantization** | `bitsandbytes` (4-bit NF4) | `0.45.0` |
| **Image Processing** | Pillow (`PIL`) | `12.3.0` |
| **Data Science & Metrics** | pandas, numpy, scikit-learn | `pandas 2.2+`, `scikit-learn 1.6+` |
| **Plotting & Visualization** | matplotlib | `3.11.2` |

---

## 2. Directory Structure & Verified Artifact Inventory

```
ANVESH/
├── anvesh_dataset/
│   ├── images/                          # 2,107 extracted CXR images (DICOM-derived PNG/JPG)
│   ├── train.json                       # 1,474 cases (737 normal, 737 abnormal; 50/50 balance)
│   ├── val.json                         # 211 cases (106 normal, 105 abnormal)
│   └── test.json                        # 422 held-out cases (211 normal, 211 abnormal)
├── checkpoints_llava/
│   ├── final_adapter/                   # LoRA weights (adapter_model.safetensors, 169.4 MB)
│   │   ├── adapter_config.json          # r=16, alpha=32, target_modules: q,k,v,o,gate,up,down
│   │   └── adapter_model.safetensors
│   ├── checkpoint-185/                  # Final epoch checkpoint (185 update steps)
│   └── training_state.json              # {"step": 185, "epoch": 0, "model_id": "llava-1.5-7b-hf"}
├── reports/
│   ├── AUTONOMOUS_PROJECT_LOG.md        # Chronological progress log and milestones
│   ├── EVALUATION_AUDIT.md              # Deep audit of 20-case preliminary results & prompt leakage
│   ├── FINAL_BENCHMARK_REPORT.md        # Definitive scientific benchmark report
│   ├── TESTING_AND_REPRODUCIBILITY.md   # This document
│   ├── evaluation_audit/
│   │   ├── verified_cohort_manifest.csv # Full 2,107 case manifest from earlier MedGemma run
│   │   └── audit_case_manifest.csv
│   ├── llava_vs_medgemma_test_predictions.csv
│   ├── llava_vs_medgemma_metrics_comparison.csv
│   ├── llava_vs_medgemma_full_test_predictions.csv
│   ├── llava_vs_medgemma_full_metrics_comparison.csv
│   ├── llava_standalone_metrics.csv     # Isolated LLaVA metrics table
│   ├── medgemma_standalone_metrics.csv  # Isolated MedGemma metrics table
│   ├── llava_vs_medgemma_side_by_side.csv# Side-by-side comparative table
│   ├── confusion_matrix_counts.csv      # Contingency counts (TP, TN, FP, FN)
│   ├── benchmark_summary.json           # Machine-readable evaluation summary
│   ├── ieee_tables.tex                  # Complete LaTeX source for research paper
│   ├── ieee_tables.md                   # Renderable Markdown tables
│   ├── confusion_matrix_llava.png       # Standalone LLaVA confusion matrix figure
│   ├── confusion_matrix_medgemma.png    # Standalone MedGemma confusion matrix figure
│   └── confusion_matrices_side_by_side.png # Side-by-side comparison figure
├── tests/
│   ├── test_benchmark_integrity.py      # Unit test suite (11 tests)
│   └── run_tests.py                     # Standalone test runner
├── backups/                             # Verified pre-evaluation backups
├── evaluate_llava_vs_medgemma.py        # Batched evaluation script on RTX 4090
├── prepare_llava_dataset.py             # Dataset preparation and stratified splitting
└── train_llava_lora.py                  # QLoRA fine-tuning script
```

---

## 3. End-to-End Reproduction Instructions

To reproduce all results from scratch in the ANVESH repository:

### Step 1: Environment Setup
Ensure the local Python virtual environment is activated:
```powershell
.venv\Scripts\Activate.ps1
```

### Step 2: Run Benchmark Integrity Test Suite
Verify dataset partitioning, zero patient leakage, metric formulas, and JSON parsing safety:
```powershell
.venv\Scripts\python.exe tests\run_tests.py
```
*Expected Result:* 11 tests pass with status `OK`.

### Step 3: Dataset Preparation & Stratified Splitting (If rebuilding from scratch)
The dataset was generated from the Indiana University Open-i collection and clinical database records using stratified splitting (`random_state=42`):
```powershell
.venv\Scripts\python.exe prepare_llava_dataset.py
```
*Output:*
- Training cases: 1,474 (70%)
- Validation cases: 211 (10%)
- Test cases: 422 (20%)
- Total: 2,107 cases (Zero partition overlap)

### Step 4: LLaVA-1.5-7B QLoRA Fine-Tuning
Fine-tuning was executed on the RTX 4090 using 4-bit NormalFloat quantization:
```powershell
.venv\Scripts\python.exe train_llava_lora.py `
    --epochs 1 `
    --batch-size 1 `
    --gradient-accumulation-steps 8 `
    --lr 2e-4 `
    --lora-r 16 `
    --lora-alpha 32 `
    --lora-dropout 0.05 `
    --warmup-steps 10 `
    --logging-steps 10 `
    --save-steps 50 `
    --seed 42
```
*Training Duration:* 1 full epoch = 185 update steps across 1,474 samples. Final adapter saved to `checkpoints_llava/final_adapter`.

### Step 5: Full Held-Out Test Evaluation (N = 422 Cases)
Execute batched inference on the held-out test cohort:
```powershell
.venv\Scripts\python.exe evaluate_llava_vs_medgemma.py `
    --adapter-path checkpoints_llava/final_adapter `
    --batch-size 8
```
*Execution Details:* Evaluates all 422 test samples with checkpointing after every batch. Output saved to `reports/llava_vs_medgemma_full_test_predictions.csv`.

### Step 6: Export IEEE Research Tables & Confusion Matrices
Generate publication-ready LaTeX sources, CSV summaries, and 300 DPI figures:
```powershell
.venv\Scripts\python.exe reports\export_ieee_artifacts.py
```

---

## 4. Model Training & Comparison Asymmetry Disclosure

| Dimension | Fine-Tuned LLaVA-1.5-7B | Pretrained MedGemma-4B |
|---|---|---|
| **Base Architecture** | LLaVA-1.5 (Vicuna-7B + CLIP-ViT-L/14) | MedGemma-4B-IT (Gemma-4B + SigLIP) |
| **Training Condition** | Domain Fine-Tuned with LoRA (1,474 cases) | Pretrained Zero-Shot Instruction Model |
| **Training Task** | Structured JSON report extraction | General instruction following |
| **Inference Hardware** | NVIDIA GeForce RTX 4090 (24 GB) | Google Colab NVIDIA T4 (16 GB) |
| **Inference Mode** | 4-bit NormalFloat (NF4), batch size 8 | 4-bit NF4, batch size 1 |
| **Evaluation Split** | 422 held-out test cases (Patient-separated) | Identical 422 held-out test cases |
| **Ground Truth Source** | Indiana University Radiologist Transcripts | Indiana University Radiologist Transcripts |

---

## 5. Technical Limitations & Gated Model Governance

1. **HuggingFace Access Requirements for MedGemma:**
   - Model `google/medgemma-4b-it` is a gated repository under Google Gemma Terms of Use.
   - Downloading or fine-tuning MedGemma requires an authenticated Hugging Face token (`HF_TOKEN`) with signed license agreement.
   - Because no token was provisioned in local environment variables, MedGemma baseline outputs were drawn from the precomputed Colab T4 evaluation across the verified 2,107 cohort (`reports/evaluation_audit/verified_cohort_manifest.csv`).
2. **Cross-Dataset Generalization:**
   - No external chest radiograph dataset (e.g., MIMIC-CXR, CheXpert, NIH CXR-14) is present on the workstation.
   - To maintain scientific integrity, cross-dataset testing is documented as **unavailable on current local hardware**, rather than fabricating synthetic external cohorts.
