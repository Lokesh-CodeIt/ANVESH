# ANVESH: Automated Prior-Authorization Verification & Radiographic Grounding Engine
## Technical Documentation — Document 9: Project File Reference & Component Inventory

---

### 1. Backend Service & Application Core

| File Path | Purpose | Main Inputs | Main Outputs | Dependencies | Active Status |
|---|---|---|---|---|:---:|
| `main.py` | Core FastAPI application defining 60 REST endpoints, CORS, audit logging, and routing | HTTP requests, cookies, multipart uploads | JSON responses, file streams, HTTP error envelopes | `fastapi`, `sqlalchemy`, `pydantic`, `storage` | **Active** |
| `auth.py` | Session management, bcrypt password hashing, RBAC decorators (`require_role`), rate limiting | User credentials, session tokens | Secure cookies, UserSession records, authenticated User | `bcrypt`, `secrets`, `sqlalchemy` | **Active** |
| `database.py` | SQLAlchemy engine initialization, session factory (`SessionLocal`), SQLite/Postgres auto-switching | `DATABASE_URL` environment variable | Database connection session | `sqlalchemy` | **Active** |
| `models.py` | SQLAlchemy ORM models (`User`, `UserSession`, `Case`, `CaseImage`, `Evidence`, `Policy`, `Review`, `Submission`, `SubmissionFile`) | Relational schema definitions | Database tables and ORM mappings | `sqlalchemy` | **Active** |
| `schemas.py` | Pydantic v2 schemas for request validation and response serialization | JSON HTTP request bodies | Validated Python models, serialized JSON | `pydantic` | **Active** |
| `policy_engine.py` | Deterministic clinical policy engine evaluating evidence against coverage criteria | Evidence dict, Policy ORM, `has_source_text` flag | 5-point checklist, `evidence_score` (0-100), outcome code | Standard Library (`re`, `logging`) | **Active** |
| `storage.py` | Secure file intake, MIME verification, magic-byte inspection (PNG, PDF, DICOM) | UploadFile stream | Sanitized disk path, SHA-256 hash | Standard Library, `fastapi` | **Active** |
| `init_sqlite_db.py` | Populates `medauth.db` with canonical cases, images, policies, and demo accounts | `backups/medauth_vlm_pre_import_20261011_174043.sql` | `medauth.db` (SQLite) | `sqlite3`, `sqlalchemy`, `auth` | **Active** |

---

### 2. AI Inference & Model Services

| File Path | Purpose | Main Inputs | Main Outputs | Dependencies | Active Status |
|---|---|---|---|---|:---:|
| `services/ai_service.py` | Stratified AI dispatcher managing Remote LLaVA, local ViT, and rule engine fallback | Radiograph file path, clinical text | Structured AI evidence dict, `ai_source` tag | `torch`, `torchvision`, `requests`, `transformers` | **Active** |
| `checkpoints_vit_image_only/best_vit_model.pt` | PyTorch checkpoint of fine-tuned Vision Transformer (85.8M parameters) | Preprocessed image tensor ($224 \times 224$) | Logit predictions [normal, abnormal] | PyTorch | **Active** |
| `checkpoints_vit_image_only/vit_config.json` | Training hyperparameters and architecture config for ViT-B/16 | Configuration parameters | JSON config | Standard Library | **Active** |
| `checkpoints_llava_v2/best_adapter/` | LoRA adapter weights (169 MB) for primary LLaVA-1.5-7B v2 model (Step 460) | Preprocessed radiograph patches | Autoregressive token logits | PEFT, Transformers | **Active** |
| `checkpoints_llava/final_adapter/` | Multimodal report-assisted LoRA adapter weights | Image + Radiologist dictated text | Structured JSON evidence | PEFT, Transformers | **Active** |

---

### 3. Model Training & Evaluation Pipelines

| File Path | Purpose | Main Inputs | Main Outputs | Dependencies | Active Status |
|---|---|---|---|---|:---:|
| `train_llava_v2.py` | Primary 6-epoch QLoRA training script with exact target-only loss masking and projector tuning | `anvesh_dataset_image_only/train.json`, images | `checkpoints_llava_v2/` adapter weights | `transformers`, `peft`, `bitsandbytes`, `torch` | **Active** |
| `evaluate_llava_v2.py` | Standalone evaluation of primary LLaVA v2 on the 422-case held-out test split | `checkpoints_llava_v2/best_adapter`, `test.json` | `v2_llava_metrics.csv`, `v2_llava_summary.json` | `transformers`, `peft`, `torch`, `sklearn` | **Active** |
| `train_vit_image_only.py` | 15-epoch training pipeline for ViT-B/16 classifier directly on radiograph pixels | `anvesh_dataset_image_only/train.json`, images | `best_vit_model.pt`, `vit_training_history.csv` | `torch`, `torchvision`, `sklearn` | **Active** |
| `evaluate_vit_image_only.py` | Evaluates ViT-B/16 on 422 test cases; computes ROC-AUC, PR-AUC, confusion matrix | `best_vit_model.pt`, `test.json` | `vit_standalone_metrics.csv`, `vit_summary.json` | `torch`, `torchvision`, `sklearn` | **Active** |
| `evaluate_llava_vs_medgemma.py` | Benchmarking script comparing multimodal LLaVA against precomputed MedGemma | `anvesh_dataset/test.json`, precomputed predictions | Comparative CSVs, side-by-side matrices | `pandas`, `sklearn`, `matplotlib` | **Active** |
| `compare_metrics.py` | Aggregate benchmarking utility generating formatted markdown comparison tables | Metrics CSVs from `reports/` | Formatted comparison tables | `pandas` | **Active** |

---

### 4. Dataset Partitions & Manifests

| File Path | Purpose | Total Cases | Normal | Abnormal | Active Status |
|---|---|:---:|:---:|:---:|:---:|
| `anvesh_dataset/train.json` | Multimodal (report-assisted) training split | 1,474 | 737 | 737 | **Active** |
| `anvesh_dataset/val.json` | Multimodal validation split for model tuning | 211 | 106 | 105 | **Active** |
| `anvesh_dataset/test.json` | Multimodal held-out test split (untouched during tuning) | 422 | 211 | 211 | **Active** |
| `anvesh_dataset_image_only/train.json` | Pure image-only training split (zero text prompts) | 1,474 | 737 | 737 | **Active** |
| `anvesh_dataset_image_only/val.json` | Pure image-only validation split | 211 | 106 | 105 | **Active** |
| `anvesh_dataset_image_only/test.json` | Pure image-only held-out test split | 422 | 211 | 211 | **Active** |
| `demo_dataset/manifest.json` | Manifest for 6 curated demo cases with PNG radiographs | 6 | 3 | 3 | **Active** |

---

### 5. Frontend Workstation Core (`frontend/src/`)

| File Path | Purpose | Key Components / Features | Active Status |
|---|---|---|:---:|
| `frontend/src/App.tsx` | Main application shell, route coordinator, and authentication provider wrapper | Shell layout, navigation bar, footer | **Active** |
| `frontend/src/context/AuthContext.tsx` | React authentication context managing active user profile, login/logout, and preview mode | `useAuth()`, role state | **Active** |
| `frontend/src/services/api.ts` | Type-safe REST client communicating with FastAPI backend | `login()`, `fetchCases()`, `submitPriorAuth()` | **Active** |
| `frontend/src/styles/clinical_utilities.css` | 1,934-line zero-dependency Vanilla CSS layout engine | Flex, grids, anti-jitter cards, tables, steppers | **Active** |
| `frontend/src/pages/portal/insurance/InsuranceWorkspacePage.tsx` | Payer review workstation with radiographic viewer, policy criteria, and decision sign-off | Radiograph inspection, checklist evaluation | **Active** |
| `frontend/src/pages/portal/provider/ProviderNewRequestPage.tsx` | 6-step clinical prior-authorization intake stepper with file uploader | Stepper, DICOM upload, eligibility prescreen | **Active** |
| `frontend/src/pages/portal/patient/PatientClaimsPage.tsx` | Patient claim transparency dashboard | Plain-language status tracking | **Active** |
| `frontend/src/pages/HowToUsePage.tsx` | Clinical user manual and operational troubleshooting guide | Section selector, error resolution steps | **Active** |

---

### 6. Automated Test Suites (`tests/`)

| File Path | Test Scope | Test Count | Status |
|---|---|:---:|:---:|
| `tests/test_auth_rbac.py` | Password hashing, session creation, cookie issuance, role access restrictions | 11 tests | **100% Passed** |
| `tests/test_submissions_uploads.py` | Prior auth submission creation, magic-byte file validation, PDF/PNG verification | 10 tests | **100% Passed** |
| `tests/test_final_artifacts.py` | Physical existence, row counts, and numerical consistency of benchmark artifacts | 4 tests | **100% Passed** |
| `tests/test_vit_artifacts.py` | ViT model config, checkpoint files, test prediction bounds, and confusion matrix | 5 tests | **100% Passed** |
| `tests/test_image_only_diagnosis.py` | Verification of pure image-only diagnosis consistency without text prompts | 5 tests | **100% Passed** |
| `tests/test_llava_remote_client_and_fallback.py` | Tests graceful fallback to local ViT when remote LLaVA GPU worker is offline | 4 tests | **100% Passed** |
| `tests/test_live_ai_submission_flow.py` | End-to-end integration test from provider submission to AI evidence generation | 1 test | **100% Passed** |
| `frontend/tests/*.test.mjs` | Automated frontend tests: design tokens, motion limits, session isolation, decision safety | 10 tests | **100% Passed** |
