# MedAuth-VLM: Backend REST API Reference & Specification

**Service Name:** MedAuth-VLM Backend API  
**Framework:** FastAPI 0.115+ / Python 3.13  
**Base URL:** `http://127.0.0.1:8000`  
**OpenAPI Docs:** `http://127.0.0.1:8000/docs`  
**Specification Version:** 1.1.0  
**Status:** Production Ready  

---

## 1. Architecture Overview

The MedAuth-VLM REST API provides high-throughput, parameterized access to the underlying PostgreSQL 18 `medauth_vlm` database. All routes are non-destructive, transaction-safe, and validated through Pydantic v2 schemas.

Key Architectural Guarantees:
- **Bounded Pagination:** All list endpoints enforce minimum `skip=0` and upper bounds on `limit` (max 500 on cases, max 200 on policies, max 100 on reviews) to prevent memory exhaustion.
- **Input Validation:** All integer ID path parameters enforce strict positive integers (`gt=0`), returning clean `HTTP 422 Unprocessable Entity` for negative or non-numeric identifiers.
- **Safe Error Masking:** Client 404 errors return informative diagnostic JSON (`{"error": "Case not found", "case_id": 9999999}`), while internal 500 errors mask tracebacks to prevent information disclosure.
- **CORS Protection:** Whitelisted for frontend origins (`http://localhost:5173`, `http://localhost:3000`).

---

## 2. API Endpoints Directory

| Method | Endpoint Route | Summary & Purpose |
|---|---|---|
| `GET` | `/` | Root service identification and metadata |
| `GET` | `/health` | Service health and live PostgreSQL connection ping |
| `GET` | `/api/summary` | Authoritative system metrics and table row counts |
| `GET` | `/api/cases` (or `/cases`) | Paginated clinical case list with classification filters |
| `GET` | `/api/cases/{case_id}` (or `/cases/{case_id}`) | Full clinical case record, image list, and evidence |
| `GET` | `/api/cases/{case_id}/images` (or `/cases/{case_id}/images`) | Projection metadata and static image serving URLs |
| `GET` | `/api/cases/{case_id}/evidence` (or `/cases/{case_id}/evidence`) | Structured VLM evidence subobjects & raw output |
| `GET` | `/api/policies` (or `/policies`) | CMS insurance policy benefits and copayment rules |
| `GET` | `/api/reviews` (or `/reviews`) | Historical prior auth evaluations and decisions |
| `GET` | `/cases/{case_id}/review` | Evaluates case against policy with grounding check |
| `POST` | `/reviews/{review_id}/decision` | Submits human clinician authorization decision |

---

## 3. Detailed Endpoint Specifications

### 3.1 GET `/health`
- **Description:** Verifies service health and executes an active read-only ping (`SELECT 1`) against the PostgreSQL database.
- **Request Parameters:** None.
- **Response `200 OK`:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-10-11T18:25:00.000000+00:00",
  "version": "1.1.0"
}
```

### 3.2 GET `/api/summary`
- **Description:** Returns authoritative live counts across all database tables, classification breakdowns, and batch coverage.
- **Request Parameters:** None.
- **Response `200 OK`:**
```json
{
  "status": "operational",
  "total_cases": 2107,
  "total_case_images": 4093,
  "total_evidence": 2107,
  "total_policies": 100,
  "total_reviews": 4,
  "classifications": {
    "abnormal": 1053,
    "normal": 1054
  },
  "has_source_text": {
    "present": 2085,
    "absent": 22
  },
  "raw_model_output": {
    "present": 1707,
    "null": 400
  },
  "batch_coverage": {
    "batch_1": {"cases": 150, "status": "completed"},
    "batch_2": {"cases": 400, "status": "completed"},
    "batch_3": {"cases": 400, "status": "completed"},
    "batch_4": {"cases": 400, "status": "completed"},
    "batch_5": {"cases": 357, "missing_cases": 43, "status": "completed_with_missing_absent"},
    "batch_6": {"cases": 400, "raw_model_output": "null", "status": "completed_provenance_preserved"}
  }
}
```

### 3.3 GET `/api/cases` (Alias: `GET /cases`)
- **Description:** Retrieves paginated clinical case records with optional diagnostic filters.
- **Query Parameters:**
  - `classification` (optional, string): `"normal"` or `"abnormal"`
  - `has_source_text` (optional, boolean): `true` or `false`
  - `skip` (optional, integer, default: 0, ge: 0): Pagination offset
  - `limit` (optional, integer, default: 150, ge: 1, le: 500): Bounded batch size
- **Response `200 OK`:** Array of `CaseListItem`
```json
[
  {
    "case_id": 67,
    "classification": "abnormal",
    "indication": "Shortness of breath, rule out infiltrate",
    "requested_procedure": "Chest X-ray (PA and Lateral)",
    "has_source_text": true
  }
]
```

### 3.4 GET `/api/cases/{case_id}` (Alias: `GET /cases/{case_id}`)
- **Description:** Returns the complete clinical record, associated images, and precomputed VLM evidence.
- **Path Parameters:**
  - `case_id` (required, integer, gt: 0)
- **Response `200 OK`:** `CaseDetailResponse`
```json
{
  "case_id": 67,
  "classification": "abnormal",
  "indication": "Shortness of breath, rule out infiltrate",
  "findings": "Bilateral lower lobe airspace opacity consistent with pneumonia. Heart size normal.",
  "impression": "Bilateral lower lobe pneumonia.",
  "requested_procedure": "Chest X-ray (PA and Lateral)",
  "has_source_text": true,
  "images": [
    {
      "id": 134,
      "case_id": 67,
      "filename": "67_frontal.png",
      "projection": "Frontal",
      "file_path": "AI_PORJECT_DATASET/archive (7)/images/images_normalized/67_frontal.png",
      "image_url": "/images/67_frontal.png"
    }
  ],
  "evidence": {
    "id": 67,
    "case_id": 67,
    "image_evidence": {
      "modality": "Chest X-ray",
      "body_part": "chest",
      "findings": ["Bilateral lower lobe consolidation"],
      "abnormalities": ["Pneumonia"],
      "impression_summary": "Bilateral pneumonia"
    },
    "text_image_consistency": {
      "consistent": true,
      "notes": "Consolidation observed on frontal view."
    },
    "clinical_support": {
      "supported": true,
      "reason": "Radiographic evidence supports indication."
    },
    "raw_model_output": "```json\n{\n  \"image_evidence\": ...\n}```"
  }
}
```
- **Response `404 Not Found`:**
```json
{
  "error": "Case not found",
  "case_id": 9999999
}
```

### 3.5 GET `/api/cases/{case_id}/images`
- **Description:** Returns medical image records and sanitized serving URLs for a specific case.
- **Response `200 OK`:** Array of `CaseImageResponse`
```json
[
  {
    "id": 134,
    "case_id": 67,
    "filename": "67_frontal.png",
    "projection": "Frontal",
    "file_path": "AI_PORJECT_DATASET/archive (7)/images/images_normalized/67_frontal.png",
    "image_url": "/images/67_frontal.png"
  }
]
```

### 3.6 GET `/api/cases/{case_id}/evidence`
- **Description:** Returns only the structured VLM evidence subobjects and raw model output.
- **Response `200 OK`:** `EvidenceResponse`
```json
{
  "id": 67,
  "case_id": 67,
  "image_evidence": { ... },
  "text_image_consistency": { ... },
  "clinical_support": { ... },
  "raw_model_output": "..."
}
```

### 3.7 GET `/api/policies` (Alias: `GET /policies`)
- **Description:** Lists CMS insurance policies with state and coverage filters.
- **Query Parameters:**
  - `state` (optional, string): e.g. `"AK"`, `"IN"`
  - `is_covered` (optional, string): Coverage rule filter
  - `skip` (optional, integer, default: 0)
  - `limit` (optional, integer, default: 100, le: 200)
- **Response `200 OK`:** Array of `PolicyListItem`

### 3.8 GET `/api/reviews` (Alias: `GET /reviews`)
- **Description:** Lists compliance reviews with optional filtering by case, policy plan, or decision.
- **Query Parameters:**
  - `case_id` (optional, integer, gt: 0)
  - `plan_id` (optional, string)
  - `decision` (optional, string): `"Approved"`, `"Denied"`
  - `skip` (optional, integer, default: 0)
  - `limit` (optional, integer, default: 50, le: 100)
- **Response `200 OK`:** Array of `ReviewResponse`

### 3.9 GET `/cases/{case_id}/review`
- **Description:** Executes deterministic guideline comparison for a case against a policy.
- **Query Parameters:**
  - `plan_id` (required, string, min_length: 1): Policy identifier to evaluate against.
  - `persist` (optional, boolean, default: `true`): Set to `false` for pure, side-effect-free evaluation without committing a review to the database.
- **Response `200 OK`:** `ReviewResponse`
  - Computed `evidence_score` ($0.0 - 100.0$): Composite evidence metric (40% consistency + 40% clinical support + 20% plan coverage). *Note: This score is a heuristic evidence measure, not a calibrated probability of claim approval or payer agreement.*
  - Enforces score cap at $\le 40.0$ if `has_source_text = False`.
  - Structured `outcome_code` inside `policy_compliance` (`OUTCOME_COVERED`, `OUTCOME_NOT_COVERED`, `OUTCOME_EXCLUDED`, `OUTCOME_CONFLICTING_EVIDENCE`, `OUTCOME_INSUFFICIENT_INFORMATION`, `OUTCOME_UNKNOWN_POLICY`, `OUTCOME_MANUAL_REVIEW_REQUIRED`).
  - Returns complete 5-point `policy_requirements_checklist`, `conflict_warnings`, and `missing_information`.

### 3.10 POST `/cases/{case_id}/review`
- **Description:** Explicitly evaluates and persists a prior authorization review record in the database.
- **Query Parameters:**
  - `plan_id` (required, string, min_length: 1): Policy identifier.
- **Response `200 OK`:** Persisted `ReviewResponse` with assigned `id` and timestamps.

### 3.11 POST `/reviews/{review_id}/decision`
- **Description:** Submits human physician final determination and clinical notes.
- **Request Body:**
```json
{
  "reviewer_decision": "Approved",
  "reviewer_notes": "Clinical findings corroborate medical necessity under CMS section 4 guidelines."
}
```
- **Response `200 OK`:** Updated `ReviewResponse` with `reviewed_at` timestamp.

---

## 4. Policy Engine Decision Logic & Rule Precedence

The hardened deterministic policy engine enforces strict precedence to prevent premature or ungrounded authorization:

1. **Source Grounding Precedence:** If original clinical text is absent (`has_source_text == False`), evidence is flagged as ungrounded, score is capped at $\le 40.0$, and outcome is set to `OUTCOME_INSUFFICIENT_INFORMATION`.
2. **Exclusion Precedence:** Explicit policy exclusions take precedence over high evidence scores. Any match sets outcome to `OUTCOME_EXCLUDED` with mandatory human review.
3. **Coverage Gating:** If policy status is explicitly non-covered, outcome is `OUTCOME_NOT_COVERED`. If terms are ambiguous/empty, outcome is `OUTCOME_UNKNOWN_POLICY`.
4. **Consistency Gating:** If VLM reports an explicit contradiction between image and report, outcome is `OUTCOME_CONFLICTING_EVIDENCE`. Missing assessments report `INSUFFICIENT_DATA`.
5. **Coverage Eligibility:** `OUTCOME_COVERED` is assigned only when the benefit is covered, evidence is consistent, necessity is supported, no exclusions exist, and score $\ge 80.0$.
6. **Regulatory Disclaimer:** ANVESH is a research decision-support prototype. Evaluated outputs are advisory and require qualified clinician over-read.

---

## 5. Security & Deployment Prerequisites: Authentication & Authorization

> [!IMPORTANT]
> **Enterprise Deployment Requirement:** The current ANVESH research prototype backend does not provide an integrated Identity Provider (OAuth2 / SAML / OIDC / JWT session authentication) or server-side role-based access control (RBAC).

1. **Server-Side Enforcement Required:** Frontend route guards, client-side role dropdowns, or preview toggles are not security mechanisms. True member privacy, provider organization isolation, and medical director review permissions must be enforced at the API gateway / FastAPI dependency layer.
2. **Frontend Fail-Closed Boundary:** To protect live clinical records from unauthenticated public exposure, the frontend application operates with a strict fail-closed boundary: direct access to live case records is locked when unauthenticated.
3. **Isolated Development Design Preview:** Demonstration and evaluation of the 3 portals operate exclusively within an isolated preview mode using synthetic data fixtures and fictitious identifiers (`DEMO-CASE-101`, etc.). All backend mutations are disabled in preview mode.


