from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import relationship

# Enable PostgreSQL JSONB type compatibility on SQLite
@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

from database import Base


class Case(Base):
    __tablename__ = "cases"

    case_id = Column(Integer, primary_key=True, index=True)
    classification = Column(String(50), nullable=False)  # "normal" or "abnormal"
    indication = Column(Text, nullable=True)
    findings = Column(Text, nullable=True)
    impression = Column(Text, nullable=True)
    requested_procedure = Column(Text, nullable=True)
    has_source_text = Column(Boolean, default=False, nullable=False)

    # Relationships
    images = relationship("CaseImage", back_populates="case", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="case", uselist=False, cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="case", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Case(case_id={self.case_id}, classification='{self.classification}')>"


class CaseImage(Base):
    __tablename__ = "case_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("cases.case_id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    projection = Column(String(50), nullable=False)  # "Frontal" or "Lateral"
    file_path = Column(String(512), nullable=False)

    # Relationship
    case = relationship("Case", back_populates="images")

    def __repr__(self):
        return f"<CaseImage(id={self.id}, case_id={self.case_id}, filename='{self.filename}', projection='{self.projection}')>"


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(
        Integer,
        ForeignKey("cases.case_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )
    image_evidence = Column(JSONB, nullable=False, default=dict)
    text_image_consistency = Column(JSONB, nullable=False, default=dict)
    clinical_support = Column(JSONB, nullable=False, default=dict)
    raw_model_output = Column(Text, nullable=True)

    # Relationship (one-to-one with Case)
    case = relationship("Case", back_populates="evidence")

    def __repr__(self):
        return f"<Evidence(id={self.id}, case_id={self.case_id})>"


class Policy(Base):
    __tablename__ = "policies"

    plan_id = Column(String(100), primary_key=True, index=True)
    state = Column(String(10), nullable=False, index=True)
    is_covered = Column(String(50), nullable=False)
    copay = Column(String(100), nullable=False)
    coinsurance = Column(String(100), nullable=False)
    limit_qty = Column(Float, nullable=True)
    limit_unit = Column(String(50), nullable=True)
    exclusions = Column(Text, nullable=True)

    # Relationship
    reviews = relationship("Review", back_populates="policy", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Policy(plan_id='{self.plan_id}', state='{self.state}', is_covered='{self.is_covered}')>"


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("cases.case_id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(String(100), ForeignKey("policies.plan_id", ondelete="CASCADE"), nullable=False, index=True)
    policy_compliance = Column(JSONB, nullable=False, default=dict)
    evidence_score = Column(Float, nullable=True)
    recommendation = Column(Text, nullable=True)
    reviewer_decision = Column(String(50), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    case = relationship("Case", back_populates="reviews")
    policy = relationship("Policy", back_populates="reviews")

    def __repr__(self):
        return f"<Review(id={self.id}, case_id={self.case_id}, plan_id='{self.plan_id}', decision='{self.reviewer_decision}')>"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, index=True)  # patient, provider, insurance_reviewer, insurance_supervisor, insurance_admin, auditor
    organization = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_token = Column(String(128), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="sessions")

    def __repr__(self):
        return f"<UserSession(id={self.id}, user_id={self.user_id}, revoked={self.is_revoked})>"


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    submission_ref = Column(String(64), unique=True, index=True, nullable=False)
    provider_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    provider_org = Column(String(255), nullable=True)
    member_id = Column(String(100), nullable=False, index=True)
    patient_name = Column(String(255), nullable=False)
    patient_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    payer_plan_id = Column(String(100), nullable=False, index=True)
    service_type = Column(String(255), nullable=False)
    cpt_code = Column(String(50), nullable=True)
    clinical_indication = Column(Text, nullable=False)
    prelim_findings = Column(Text, nullable=True)
    status = Column(String(50), default="SUBMITTED", nullable=False, index=True)
    ai_status = Column(String(50), default="PENDING", nullable=False, index=True) # PENDING, PROCESSING, COMPLETED, FAILED
    ai_source = Column(String(50), default="NONE", nullable=True) # REMOTE_LLAVA, LOCAL_VIT, UNPROCESSED, FAILED
    ai_model_version = Column(String(100), nullable=True)
    ai_evidence = Column(JSONB, nullable=True)
    ai_error = Column(Text, nullable=True)
    ai_processed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    reviewer_decision = Column(String(50), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    files = relationship("SubmissionFile", back_populates="submission", cascade="all, delete-orphan", order_by="SubmissionFile.id.asc()")
    provider = relationship("User", foreign_keys=[provider_id])
    patient = relationship("User", foreign_keys=[patient_user_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])

    def __repr__(self):
        return f"<Submission(id={self.id}, ref='{self.submission_ref}', status='{self.status}')>"


class SubmissionFile(Base):
    __tablename__ = "submission_files"

    id = Column(Integer, primary_key=True, autoincrement=True)
    submission_id = Column(Integer, ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), unique=True, index=True, nullable=False)
    file_path = Column(String(512), nullable=False)
    file_category = Column(String(50), nullable=False)  # "radiograph" or "clinical_report"
    mime_type = Column(String(100), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationship
    submission = relationship("Submission", back_populates="files")

    def __repr__(self):
        return f"<SubmissionFile(id={self.id}, filename='{self.original_filename}', category='{self.file_category}')>"


