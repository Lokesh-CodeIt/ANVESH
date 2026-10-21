# ANVESH: Automated Prior-Authorization Verification & Radiographic Grounding Engine
## Technical Documentation — Document 6: Full-Stack Implementation, REST API & Database Reference

---

### 1. Technology Stacks

#### 1.1 Frontend Workstation
- **Framework & Runtime:** React 19.2.8 with TypeScript 6.0.2 running on Vite 8.3.4.
- **Styling Architecture:** Zero-dependency Vanilla CSS layout engine (`tokens.css`, `global.css`, `App.css`, `clinical_utilities.css`).
- **Icons & Visuals:** Lucide React 1.55.0.
- **Client Networking:** Native `fetch` client wrapped in `frontend/src/services/api.ts` with `credentials: "include"` for cross-origin session cookies.
- **Development Proxy:** Configured in `vite.config.ts` reverse-proxying `/api`, `/auth`, `/cases`, `/health`, `/images`, and `/demo_dataset` to `http://127.0.0.1:8000`.

#### 1.2 Backend Service
- **Framework:** FastAPI 0.141.0 + Starlette running on Python 3.11.9.
- **ASGI Server:** Uvicorn (worker processes).
- **ORM & Dialect Engine:** SQLAlchemy 2.0 with auto-switching SQLite (`sqlite:///./medauth.db`) and PostgreSQL 18 dialects.
- **Data Validation & Schemas:** Pydantic v2 schemas (`schemas.py`).
- **Security & Cryptography:** `bcrypt` 5.0.0 (password hashing), Python `secrets` (64-character URL-safe session tokens).

---

### 2. Comprehensive REST API Endpoint Reference

The ANVESH backend registers 60 routes in [main.py](file:///c:/Users/EIS/Downloads/ML%20PROJECT/churn-predict-main/ANVESH/main.py). All endpoints are dual-mounted with `/api` prefixes and root prefixes:

#### 2.1 System & Health Checks
| Method | Route | Access Level | Description |
|---|---|:---:|---|
| `GET` | `/` | Public | System identification banner and version info |
| `GET` | `/health` | Public | Ping database connectivity and engine health |
| `GET` | `/api/summary` | Public | Aggregate database counts (cases, policies, users) |
| `GET` | `/docs` | Public | Interactive Swagger OpenAPI documentation UI |
| `GET` | `/redoc` | Public | ReDoc alternative API documentation UI |

#### 2.2 Authentication & User Management
| Method | Route | Access Level | Description |
|---|---|:---:|---|
| `POST` | `/api/auth/login` | Public (Rate-Limited) | Authenticate via email/password; issues `medauth_session` cookie |
| `POST` | `/api/auth/logout` | Authenticated | Revoke active user session in DB and clear cookie |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile and role |
| `POST` | `/api/auth/register/patient` | Public | Self-registration for patient/member role |
| `POST` | `/api/auth/register/provider` | Admin Only | Register accredited healthcare provider accounts |

#### 2.3 Clinical Case & Prior-Auth Reviews
| Method | Route | Access Level | Description |
|---|---|:---:|---|
| `GET` | `/api/cases` | Reviewer, Admin | Paginated list of benchmark radiograph cases |
| `GET` | `/api/cases/{case_id}` | Reviewer, Admin | Single case details with clinical indications & findings |
| `GET` | `/api/cases/{case_id}/images` | Reviewer, Admin | Radiograph image records (PA, AP, Lateral) for case |
| `GET` | `/api/cases/{case_id}/evidence` | Reviewer, Admin | Multimodal AI evidence record and raw model output |
| `GET` | `/api/cases/{case_id}/review` | Reviewer, Admin | Evaluate deterministic policy compliance (`persist=false`) |
| `POST` | `/api/cases/{case_id}/review` | Reviewer, Admin | Evaluate and persist review record to database |
| `GET` | `/api/reviews` | Reviewer, Admin | List historical clinical case review determinations |
| `POST` | `/api/reviews/{review_id}/decision` | Reviewer, Admin | Stamp human reviewer verdict (`APPROVED`/`DENIED`) |
| `GET` | `/api/policies` | Public / All Roles | List health insurance plan policies and coverage criteria |

#### 2.4 Live Prior Authorization Submissions (Provider & Insurer Portals)
| Method | Route | Access Level | Description |
|---|---|:---:|---|
| `POST` | `/api/submissions` | Provider | Create new prior authorization submission |
| `GET` | `/api/submissions/mine` | Provider | Retrieve submissions authored by current provider |
| `GET` | `/api/submissions/{id}` | Submitter, Reviewer | Retrieve full submission details and current status |
| `POST` | `/api/submissions/{id}/files` | Provider | Upload validated radiograph (PNG/DICOM) or PDF report |
| `GET` | `/api/submissions/{id}/files` | Submitter, Reviewer | List files attached to submission |
| `GET` | `/api/submissions/{id}/files/{file_id}` | Submitter, Reviewer | Download / retrieve attached radiograph or document |
| `DELETE`| `/api/submissions/{id}/files/{file_id}` | Provider | Remove attached file (resets AI processing status) |
| `GET` | `/api/insurance/submissions` | Reviewer, Admin | Queue of pending prior auth submissions for adjudication |
| `GET` | `/api/insurance/submissions/{id}` | Reviewer, Admin | Detailed adjudication workspace for submission |
| `GET` | `/api/insurance/submissions/{id}/review`| Reviewer, Admin | Synchronous AI policy compliance evaluation |
| `POST` | `/api/insurance/submissions/{id}/decision`| Reviewer, Admin | Record final clinical authorization verdict |

---

### 3. Pydantic v2 Request & Response Schemas

#### 3.1 Submission Creation Request (`schemas.py`)
```python
class SubmissionCreateRequest(BaseModel):
    member_id: str = Field(..., min_length=3, max_length=64)
    patient_name: str = Field(..., min_length=2, max_length=128)
    payer_plan_id: str = Field(..., min_length=3, max_length=64)
    service_type: str = Field(default="Diagnostic Chest Radiograph")
    cpt_code: Optional[str] = Field(default="71046") # 2-view chest radiograph
    clinical_indication: str = Field(..., min_length=5)
    prelim_findings: Optional[str] = Field(default=None)
```

#### 3.2 Reviewer Human Decision Request (`schemas.py`)
```python
class ReviewDecisionRequest(BaseModel):
    decision: str = Field(..., pattern="^(APPROVED|DENIED|PENDING_ADDITIONAL_INFO)$")
    reviewer_notes: str = Field(..., min_length=5, max_length=2000)
```

#### 3.3 Standard JSON Error Envelope
```json
{
  "detail": {
    "error": "Forbidden",
    "message": "Role 'patient' is not authorized to review submissions.",
    "status_code": 403,
    "timestamp": "2026-10-21T16:20:00Z"
  }
}
```

---

### 4. Database Models & Schema Specifications (`models.py`)

The database architecture is designed with strict relational constraints:

```python
class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True, index=True)
    submission_ref = Column(String(32), unique=True, nullable=False, index=True)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider_org = Column(String(128), nullable=True)
    member_id = Column(String(64), nullable=False, index=True)
    patient_name = Column(String(128), nullable=False)
    patient_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    payer_plan_id = Column(String(64), ForeignKey("policies.plan_id"), nullable=False)
    service_type = Column(String(128), nullable=False)
    cpt_code = Column(String(16), default="71046")
    clinical_indication = Column(Text, nullable=False)
    prelim_findings = Column(Text, nullable=True)
    status = Column(String(32), default="SUBMITTED", index=True) # SUBMITTED, IN_REVIEW, APPROVED, DENIED
    
    # AI Auditing Columns
    ai_status = Column(String(32), default="PENDING") # PENDING, COMPLETED, FAILED
    ai_model_version = Column(String(64), default="Fine-Tuned LLaVA-1.5-7B v2")
    ai_evidence = Column(JSON, nullable=True)
    ai_error = Column(Text, nullable=True)
    ai_processed_at = Column(DateTime(timezone=True), nullable=True)
    ai_source = Column(String(32), default="PROCESSING") # REMOTE_LLAVA, LOCAL_VIT, RULE_ENGINE
```

---

### 5. File Intake & Security Validation Engine (`storage.py`)

File uploads are protected by a 4-tier security pipeline:
1. **Filename Sanitization:** Path traversal sequences (`../`, `..\\`) and dangerous characters are stripped. The target storage path uses UUIDv4 hashing:
   $$\text{filepath} = \text{uploads}/\{\text{submission\_id}\}/\{\text{uuid4()}.\text{ext}\}$$
2. **Byte Limit Verification:** Maximum allowed payload is strictly capped at $50\text{ MB}$ ($52,428,800$ bytes).
3. **Magic-Byte Inspection:** The initial 16 bytes of the file stream are inspected:
   - PNG: `89 50 4E 47 0D 0A 1A 0A`
   - JPEG: `FF D8 FF`
   - PDF: `25 50 44 46` (`%PDF`)
   - DICOM: `44 49 43 4D` (`DICM` header at byte offset 128)
4. **MIME Verification:** `Content-Type` header must strictly match `image/png`, `image/jpeg`, `application/pdf`, or `application/dicom`. Executable scripts (`.exe`, `.sh`, `.py`, `.js`, `.bat`) are immediately rejected with HTTP 400.

---

### 6. Environment Configuration Variables (`.env`)

| Variable Name | Default Value | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./medauth.db` | SQLAlchemy connection string (SQLite or PostgreSQL) |
| `SECRET_KEY` | *(64-char crypto string)* | Secret seed for session cookie signing |
| `COOKIE_SECURE` | `False` (Dev) / `True` (Prod) | Enforces HTTPS-only transmission of session cookies |
| `COOKIE_SAMESITE` | `Lax` | Cross-site request forgery (CSRF) mitigation |
| `LLAVA_ENDPOINT_URL`| *(Optional URL)* | Remote GPU vLLM/Colab endpoint for 7B VLM inference |
| `LLAVA_TIMEOUT_SECONDS` | `30` | Timeout before falling back to local CPU ViT model |
| `UPLOAD_DIR` | `uploads/` | Root directory for submitted radiograph files |

---

### 7. Known Implementation & Test Edge Cases

1. **Missing Test Image Artifact (`cxr_248.jpg`):**
   - In `tests/test_real_upload_and_llava_inference.py`, the test attempts to read `anvesh_dataset/images/cxr_248.jpg`. Because raw training images were hosted on an external drive (`S:\anvesh_ml_cache`), the test fails on systems without the full raw dataset. A mock image should be used for CI/CD runs.
2. **Pytest Authentication Header Assertion in Hardened Tests:**
   - In `test_policy_engine_hardened.py`, older unit tests invoked `isolated_client.get("/cases/90001/review")` without passing authentication cookies. When RBAC authorization decorators were introduced in Phase 3, these endpoints correctly began returning HTTP 401 Unauthorized for unauthenticated requests, requiring test fixtures to supply mock reviewer tokens.
