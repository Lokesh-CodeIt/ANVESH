from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Error Schemas
# ---------------------------------------------------------------------------

class ErrorResponse(BaseModel):
    error: str
    message: Optional[str] = None
    case_id: Optional[int] = None
    plan_id: Optional[str] = None
    review_id: Optional[int] = None


# ---------------------------------------------------------------------------
# Health & System Summary Schemas
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    database: str
    timestamp: str
    version: str


class SummaryResponse(BaseModel):
    status: str
    total_cases: int
    total_case_images: int
    total_evidence: int
    total_policies: int
    total_reviews: int
    classifications: Dict[str, int]
    has_source_text: Dict[str, int]
    raw_model_output: Dict[str, int]
    batch_coverage: Dict[str, Any]


# ---------------------------------------------------------------------------
# Case Schemas
# ---------------------------------------------------------------------------

class CaseListItem(BaseModel):
    case_id: int
    classification: str
    indication: Optional[str] = None
    requested_procedure: Optional[str] = None
    has_source_text: bool

    model_config = ConfigDict(from_attributes=True)


class CaseImageResponse(BaseModel):
    id: int
    case_id: int
    filename: str
    projection: str
    file_path: str
    image_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EvidenceResponse(BaseModel):
    id: int
    case_id: int
    image_evidence: Dict[str, Any]
    text_image_consistency: Dict[str, Any]
    clinical_support: Dict[str, Any]
    raw_model_output: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CaseDetailResponse(BaseModel):
    case_id: int
    classification: str
    indication: Optional[str] = None
    findings: Optional[str] = None
    impression: Optional[str] = None
    requested_procedure: Optional[str] = None
    has_source_text: bool
    images: List[CaseImageResponse] = []
    evidence: Optional[EvidenceResponse] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Policy Schemas
# ---------------------------------------------------------------------------

class PolicyListItem(BaseModel):
    plan_id: str
    state: str
    is_covered: str
    copay: str
    coinsurance: str
    limit_qty: Optional[float] = None
    limit_unit: Optional[str] = None
    exclusions: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Review Schemas
# ---------------------------------------------------------------------------

class ReviewResponse(BaseModel):
    id: int
    case_id: int
    plan_id: str
    policy_compliance: Dict[str, Any]
    evidence_score: Optional[float] = None
    recommendation: Optional[str] = None
    reviewer_decision: Optional[str] = None
    reviewer_notes: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ReviewDecisionRequest(BaseModel):
    reviewer_decision: str = Field(..., min_length=1, description="Decision such as 'Approved', 'Denied', 'Additional Info Required'")
    reviewer_notes: Optional[str] = Field(None, description="Clinical reasoning or notes from the human reviewer")


class EvaluationResponse(BaseModel):
    case_id: int
    plan_id: str
    evidence_score: float
    recommendation: str
    outcome_code: str
    policy_eligibility: str
    requires_human_review: bool
    policy_requirements_checklist: List[Dict[str, str]]
    cost_sharing_summary: str
    usage_limit: Optional[str] = None
    exclusions_flagged: List[str] = []
    conflict_warnings: List[str] = []
    missing_information: List[str] = []
    is_covered: bool
    has_source_text: bool


# ---------------------------------------------------------------------------
# Authentication & RBAC Schemas
# ---------------------------------------------------------------------------

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    organization: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class LoginResponse(BaseModel):
    user: UserResponse
    token: str
    expires_at: datetime
    message: str = "Authenticated successfully"


class PatientRegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=255)


class AdminCreateUserRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=255)
    role: str = Field(..., min_length=3, max_length=50)
    organization: Optional[str] = None


# ---------------------------------------------------------------------------
# Provider Submission & File Upload Schemas
# ---------------------------------------------------------------------------

class SubmissionFileResponse(BaseModel):
    id: int
    submission_id: int
    original_filename: str
    file_category: str  # radiograph or clinical_report
    mime_type: str
    file_size_bytes: int
    created_at: datetime
    download_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SubmissionCreateRequest(BaseModel):
    member_id: str = Field(..., min_length=2, max_length=100)
    patient_name: str = Field(..., min_length=2, max_length=255)
    payer_plan_id: str = Field(..., min_length=1, max_length=100)
    service_type: str = Field(..., min_length=2, max_length=255)
    cpt_code: Optional[str] = Field(None, max_length=50)
    clinical_indication: str = Field(..., min_length=3)
    prelim_findings: Optional[str] = None


class SubmissionDecisionRequest(BaseModel):
    decision: str = Field(..., min_length=2, max_length=50)  # APPROVED, DENIED, ADDITIONAL_INFO_REQUIRED
    notes: Optional[str] = None


class SubmissionResponse(BaseModel):
    id: int
    submission_ref: str
    provider_id: Optional[int] = None
    provider_org: Optional[str] = None
    member_id: str
    patient_name: str
    patient_user_id: Optional[int] = None
    payer_plan_id: str
    service_type: str
    cpt_code: Optional[str] = None
    clinical_indication: str
    prelim_findings: Optional[str] = None
    status: str
    created_at: datetime
    submitted_at: Optional[datetime] = None
    updated_at: datetime
    reviewer_id: Optional[int] = None
    reviewer_decision: Optional[str] = None
    reviewer_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    files: List[SubmissionFileResponse] = []

    model_config = ConfigDict(from_attributes=True)



