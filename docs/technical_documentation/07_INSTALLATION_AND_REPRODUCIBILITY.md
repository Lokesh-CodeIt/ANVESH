# ANVESH: Automated Prior-Authorization Verification & Radiographic Grounding Engine
## Technical Documentation — Document 7: Installation, Reproduction & Deployment Guide

---

### 1. Prerequisites & Environment Specifications

To install, execute, and reproduce the ANVESH platform on Microsoft Windows:

- **Operating System:** Windows 10 / Windows 11 (64-bit) or Windows Server 2022.
- **Python Version:** Python 3.11.9 (Verified compatible with PyTorch 2.6/2.11 and FastAPI 0.141).
- **Node.js & NPM:** Node.js v22.16.0 (LTS) or v20.x, with NPM 10.9.2+.
- **Git Version Control:** Git 2.40+ with Git LFS (Large File Storage) enabled.
- **C++ Build Tools:** Microsoft Visual C++ 14.0+ Build Tools (for compiled C-extensions such as `bcrypt` and `psutil`).

---

### 2. Hardware Requirements & Resource Budget

| Tier / Workload | CPU Requirements | System RAM | GPU Acceleration | Disk Footprint |
|---|---|---|---|---|
| **Tier 1: Web Workstation & ViT Inference** | Quad-Core 2.5 GHz+ (Intel i5/i7 or AMD Ryzen 5) | **8 GB RAM** | *None required* (Runs natively on CPU) | **5 GB** available storage |
| **Tier 2: Primary LLaVA v2 Training (QLoRA)** | 8-Core 3.5 GHz+ (Intel i7/i9 or AMD Ryzen 7/9) | **32 GB RAM** | **NVIDIA RTX 3090 / 4090 (24 GB VRAM)** with CUDA 12.4+ | **30 GB** (Weights + image cache) |
| **Tier 3: Remote GPU Worker (vLLM / Inference)** | Dual-Core Cloud vCPU | **16 GB RAM** | **NVIDIA T4 (16GB) or A10G (24GB)** | **20 GB** storage |

---

### 3. Step-by-Step Installation Instructions (Windows Shell)

#### Step 1: Clone Repository
```powershell
git clone https://github.com/Lokesh-CodeIt/ANVESH.git
cd ANVESH
```

#### Step 2: Set Up Python Virtual Environment
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

#### Step 3: Install Backend Dependencies
Install the required machine learning, web server, and database libraries:
```powershell
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
pip install transformers peft bitsandbytes accelerate
pip install fastapi uvicorn starlette pydantic sqlalchemy alembic bcrypt python-multipart
pip install pandas numpy scikit-learn pillow pytest
```

#### Step 4: Environment Variables Configuration (`.env`)
Create a `.env` file in the root project directory:
```ini
# ANVESH System Configuration
DATABASE_URL=sqlite:///./medauth.db
SECRET_KEY=anvesh_clinical_secret_development_key_change_in_production_2026
COOKIE_SECURE=False
COOKIE_SAMESITE=Lax

# Storage Directory for Submitted Radiographs
UPLOAD_DIR=uploads

# Optional: Remote LLaVA GPU Worker Endpoint (If unconfigured, auto-routes to local ViT)
LLAVA_ENDPOINT_URL=
LLAVA_TIMEOUT_SECONDS=30
```

#### Step 5: Initialize SQLite Benchmark Database
Populate `medauth.db` with all 950 canonical cases, 1,839 images, 100 CMS health policies, and demo portal accounts:
```powershell
python init_sqlite_db.py
```
*Expected Console Output:*
```text
[1/4] Creating all database tables via SQLAlchemy metadata...
[!] Database populated with 950 cases.
  - Cases:        950
  - Case Images:  1839
  - Evidence:     950
  - Policies:     100
  - Users:        6
[SUCCESS] SQLite database setup is complete and ready.
```

#### Step 6: Install Frontend Dependencies
```powershell
cd frontend
npm install
cd ..
```

---

### 4. Running the Platform Locally

To launch the full workstation, run the backend API server and the Vite dev server in separate terminal windows:

#### Terminal 1: Launch FastAPI Backend
```powershell
# From project root directory:
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
*Backend active at:* `http://127.0.0.1:8000` (Swagger UI at `/docs`, Health check at `/health`).

#### Terminal 2: Launch Vite React Workstation
```powershell
cd frontend
npm run dev
```
*Frontend workstation active at:* `http://localhost:5173`.

---

### 5. Demo Credentials for Immediate Testing

The SQLite database includes pre-provisioned demo accounts across all clinical roles:

| Role | Email | Password | Intended Workflow |
|---|---|---|---|
| **System Admin** | `admin@medauth.org` | `AdminPass123!` | Audit logs, policy catalog, user accounts |
| **Senior Reviewer** | `reviewer@insurance.com` | `ReviewerPass123!` | Prior auth review queue, radiograph viewer, decision stamping |
| **Reviewer 2** | `reviewer@test.com` | `ReviewerPass123!` | Secondary adjudication review |
| **Hospital Provider** | `provider@hospital.org` | `ProviderPass123!` | 6-step prior authorization intake, radiograph upload |
| **Patient / Member** | `patient@example.com` | `PatientPass123!` | Track my authorization submissions, deductible lookup |

---

### 6. Executing Model Evaluations & Reproducing Benchmarks

#### 6.1 Reproduce ViT-B/16 Image-Only Benchmark
Execute evaluation of the 85.8M parameter Vision Transformer on the 422-case held-out test cohort:
```powershell
python evaluate_vit_image_only.py --checkpoint checkpoints_vit_image_only/best_vit_model.pt --test_json anvesh_dataset_image_only/test.json
```
*Expected Result:* Accuracy: **65.40%**, Sensitivity: **66.35%**, Specificity: **64.45%**, ROC-AUC: **0.7062**, Latency: **~17 ms**.

#### 6.2 Reproduce LLaVA-1.5-7B v2 Evaluation (Requires GPU)
Execute evaluation using the frozen validation decision threshold ($\theta^* = 0.5100$):
```powershell
python evaluate_llava_v2.py --adapter_path checkpoints_llava_v2/best_adapter --threshold 0.5100 --batch_size 4
```
*Expected Result:* Accuracy: **67.54%**, Sensitivity: **62.09%**, Specificity: **72.99%**, Macro-$F_1$: **0.6744**, ROC-AUC: **0.7481**.

#### 6.3 Compare All Model Metrics
```powershell
python compare_metrics.py
```
Generates formatted markdown and CSV comparison tables in `reports/comprehensive_model_comparison.md`.

---

### 7. Automated Test Suite Execution

#### Backend Pytest Regression Suites:
```powershell
# RBAC and session security tests (11 passed):
python -m pytest tests/test_auth_rbac.py

# Submissions intake, uploads, and magic-byte security (10 passed):
python -m pytest tests/test_submissions_uploads.py

# Benchmark artifact integrity & confusion matrix consistency (4 passed):
python -m pytest tests/test_final_artifacts.py

# Vision Transformer artifact verification (5 passed):
python -m pytest tests/test_vit_artifacts.py

# Pure image-only diagnosis consistency (5 passed):
python -m pytest tests/test_image_only_diagnosis.py
```

#### Frontend Automated Test Suite:
```powershell
cd frontend
npm test
npm run build
```
*Verifies design tokens, motion easing, session isolation, and compiles production bundle cleanly in ~2.5 seconds.*

---

### 8. Troubleshooting & Common Operational Edge Cases

1. **Port 8000 or 5173 In Use:**
   - Detect conflicting process: `netstat -ano | findstr "8000 5173"`
   - Terminate hanging process: `taskkill /F /PID <PID>`
2. **Missing Module `main` when Running Scratch Scripts:**
   - Python requires the current directory in `sys.path`. Launch scripts from the project root or include `import sys, os; sys.path.insert(0, os.path.abspath("."))`.
3. **CUDA Out of Memory (OOM) During LLaVA Fine-Tuning:**
   - Reduce per-device batch size to 2 in `train_llava_v2.py` and increase `gradient_accumulation_steps` to 8 to maintain an effective batch size of 16.
4. **HuggingFace Gated Model Access for MedGemma:**
   - `google/medgemma-4b-it` requires signing the Google Health research agreement on HuggingFace. If unauthenticated, the system transparently utilizes precomputed database records.
