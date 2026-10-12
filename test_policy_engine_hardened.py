"""
Comprehensive Synthetic Test Suite for ANVESH Hardened Policy Engine.
Purely isolated unit and integration tests with ZERO live database mutations.

Guarantees:
1. Synthetic policy and evidence fixtures only; no research data modified.
2. In-memory SQLite execution with dependency overrides for API tests.
3. Live PostgreSQL research database connection is never accessed.
"""

import pytest
from datetime import datetime, timezone
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from database import get_db
from models import Base, Case, Evidence, Policy, Review
from policy_engine import (
    OUTCOME_COVERED,
    OUTCOME_NOT_COVERED,
    OUTCOME_EXCLUDED,
    OUTCOME_CONFLICTING_EVIDENCE,
    OUTCOME_INSUFFICIENT_INFORMATION,
    OUTCOME_UNKNOWN_POLICY,
    OUTCOME_MANUAL_REVIEW_REQUIRED,
    compare_evidence_to_policy,
    check_exclusions_overlap,
    parse_cost_sharing,
)

# Compile JSONB for SQLite in-memory test database
@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


# ===========================================================================
# 1. PURE UNIT TESTS: SCORING, OUTCOMES, PRECEDENCE, EDGE CASES
# ===========================================================================

class TestHardenedPolicyEngineUnit:
    """Unit tests running strictly in-memory without any database engine."""

    def test_standard_covered_case(self):
        """Scenario: Fully covered plan, supported indication, consistent imaging."""
        evidence = {
            "image_evidence": {
                "abnormalities": ["Right lower lobe consolidation"],
                "findings": ["Focal alveolar opacity in RLL compatible with pneumonia"]
            },
            "text_image_consistency": {"consistent": True, "notes": "Opacity matches report"},
            "clinical_support": {"supported": True, "reason": "Fever and cough justify imaging"}
        }
        policy = {
            "plan_id": "SYNTH-COV-01",
            "is_covered": "Covered",
            "copay": "$20",
            "coinsurance": "10%",
            "exclusions": "None"
        }

        res = compare_evidence_to_policy(evidence, policy, has_source_text=True)

        assert res["evidence_score"] == 100.0
        assert res["outcome_code"] == OUTCOME_COVERED
        assert res["policy_eligibility"] == "COVERED"
        assert res["recommendation"] == "Evidence appears sufficient"
        assert res["requires_human_review"] is False
        assert res["is_covered"] is True
        assert len(res["conflict_warnings"]) == 0
        assert len(res["exclusions_flagged"]) == 0

    def test_explicit_exclusion_override(self):
        """Scenario: High evidence score must NOT override an explicit policy exclusion."""
        evidence = {
            "image_evidence": {
                "abnormalities": ["Pneumothorax"],
                "findings": ["Small apical pneumothorax observed"]
            },
            "text_image_consistency": {"consistent": True},
            "clinical_support": {"supported": True}
        }
        policy = {
            "plan_id": "SYNTH-EXCL-01",
            "is_covered": "Covered",
            "exclusions": "Routine screening; Pneumothorax; Cosmetic procedures"
        }

        res = compare_evidence_to_policy(evidence, policy, has_source_text=True)

        # Base score reflects evidence + coverage (100.0), but outcome MUST be blocked
        assert res["evidence_score"] == 100.0
        assert res["outcome_code"] == OUTCOME_EXCLUDED
        assert res["policy_eligibility"] == "EXCLUDED"
        assert res["requires_human_review"] is True
        assert res["recommendation"] == "Potential conflict — human review required"
        assert "Pneumothorax" in res["exclusions_flagged"]
        assert any("Pneumothorax" in w for w in res["conflict_warnings"])

    def test_explicit_non_covered_policy(self):
        """Scenario: Procedure is explicitly not covered by the plan."""
        evidence = {
            "image_evidence": {
                "abnormalities": ["Cardiomegaly"],
                "findings": ["Enlarged cardiac silhouette"]
            },
            "text_image_consistency": {"consistent": True},
            "clinical_support": {"supported": True}
        }
        policy = {
            "plan_id": "SYNTH-NONCOV-01",
            "is_covered": "Not Covered",
            "exclusions": "None"
        }

        res = compare_evidence_to_policy(evidence, policy, has_source_text=True)

        # Consistency (40) + Support (40) + Not Covered (0) = 80.0
        assert res["evidence_score"] == 80.0
        assert res["outcome_code"] == OUTCOME_NOT_COVERED
        assert res["policy_eligibility"] == "NOT_COVERED"
        assert res["is_covered"] is False
        assert res["requires_human_review"] is True
        assert res["recommendation"] == "Potential conflict — human review required"

    def test_missing_source_text_grounding_cap(self):
        """Scenario: No original clinical report (has_source_text=False) caps score <= 40.0."""
        evidence = {
            "image_evidence": {"abnormalities": ["Nodule"]},
            "text_image_consistency": {"consistent": True},
            "clinical_support": {"supported": True}
        }
        policy = {"is_covered": "Covered"}

        res = compare_evidence_to_policy(evidence, policy, has_source_text=False)

        assert res["evidence_score"] <= 40.0
        assert res["outcome_code"] == OUTCOME_INSUFFICIENT_INFORMATION
        assert res["requires_human_review"] is True
        assert "Unverified AI evidence" in res["recommendation"]
        assert "source_clinical_report" in res["missing_information"]

        # Checklist verification
        grounding_item = next(i for i in res["policy_requirements_checklist"] if "Grounding" in i["requirement"])
        assert grounding_item["status"] == "WARNING"

    def test_empty_findings_and_abnormalities_dual_empty_case(self):
        """Scenario: Model emits empty abnormalities and empty findings; must flag review required."""
        evidence = {
            "image_evidence": {"abnormalities": [], "findings": []},
            "text_image_consistency": {"consistent": True},
            "clinical_support": {"supported": True}
        }
        policy = {"is_covered": "Covered"}

        res = compare_evidence_to_policy(evidence, policy, has_source_text=True)

        assert "clinical_findings_and_abnormalities" in res["missing_information"]
        assert res["outcome_code"] == OUTCOME_INSUFFICIENT_INFORMATION
        assert res["requires_human_review"] is True
        assert res["evidence_score"] == 100.0
        assert res["recommendation"] == "Evidence appears sufficient"
        assert any("No discrete clinical findings" in w for w in res["conflict_warnings"])

    def test_explicitly_documented_normal_case(self):
        """Scenario: Explicit normal findings with 0 abnormalities qualify for OUTCOME_COVERED without review."""
        evidence = {
            "image_evidence": {
                "abnormalities": [],
                "findings": ["Lungs are clear bilaterally. Heart size normal."]
            },
            "text_image_consistency": {"consistent": True},
            "clinical_support": {"supported": True}
        }
        policy = {"is_covered": "Covered"}

        res = compare_evidence_to_policy(evidence, policy, has_source_text=True)

        assert res["outcome_code"] == OUTCOME_COVERED
        assert res["requires_human_review"] is False
        assert res["evidence_score"] == 100.0
        assert res["recommendation"] == "Evidence appears sufficient"



    def test_contradictory_clinical_findings(self):
        """Scenario: Imaging contradicts text report (consistent=False)."""
        evidence = {
            "image_evidence": {"abnormalities": ["Pleural effusion"]},
            "text_image_consistency": {"consistent": False, "notes": "Report states clear lungs, image shows effusion"},
            "clinical_support": {"supported": True}
        }
        policy = {"is_covered": "Covered"}

        res = compare_evidence_to_policy(evidence, policy, has_source_text=True)

        assert res["outcome_code"] == OUTCOME_CONFLICTING_EVIDENCE
        assert res["requires_human_review"] is True
        assert res["recommendation"] == "Potential conflict — human review required"
        assert any("contradicts" in w for w in res["conflict_warnings"])

        consistency_item = next(i for i in res["policy_requirements_checklist"] if "Consistency" in i["requirement"])
        assert consistency_item["status"] == "FAIL"

    def test_missing_consistency_distinguished_from_contradiction(self):
        """Scenario: Consistency assessment is missing/null; must report INSUFFICIENT_DATA, not FAIL."""
        evidence = {
            "image_evidence": {"abnormalities": ["Atelectasis"], "findings": ["Band-like opacity"]},
            "text_image_consistency": {},  # Missing 'consistent' key
            "clinical_support": {"supported": True}
        }
        policy = {"is_covered": "Covered"}

        res = compare_evidence_to_policy(evidence, policy, has_source_text=True)

        consistency_item = next(i for i in res["policy_requirements_checklist"] if "Consistency" in i["requirement"])
        assert consistency_item["status"] == "INSUFFICIENT_DATA"
        assert "not available" in consistency_item["detail"]
        assert "text_image_consistency_assessment" in res["missing_information"]
        assert res["outcome_code"] == OUTCOME_INSUFFICIENT_INFORMATION

    def test_missing_clinical_support_distinguished_from_failure(self):
        """Scenario: Clinical support assessment is missing/null; must report INSUFFICIENT_DATA."""
        evidence = {
            "image_evidence": {"abnormalities": ["Atelectasis"], "findings": ["Opacity"]},
            "text_image_consistency": {"consistent": True},
            "clinical_support": {}  # Missing 'supported' key
        }
        policy = {"is_covered": "Covered"}

        res = compare_evidence_to_policy(evidence, policy, has_source_text=True)

        support_item = next(i for i in res["policy_requirements_checklist"] if "Support" in i["requirement"])
        assert support_item["status"] == "INSUFFICIENT_DATA"
        assert "not available" in support_item["detail"]
        assert "clinical_indication_support_assessment" in res["missing_information"]
        assert res["outcome_code"] == OUTCOME_INSUFFICIENT_INFORMATION

    def test_unknown_policy_coverage_terms(self):
        """Scenario: Policy has ambiguous or unknown coverage (e.g. 'Conditional' or empty)."""
        evidence = {
            "image_evidence": {"abnormalities": ["Fracture"], "findings": ["Rib fracture"]},
            "text_image_consistency": {"consistent": True},
            "clinical_support": {"supported": True}
        }
        policy = {"is_covered": "Conditional", "exclusions": None}

        res = compare_evidence_to_policy(evidence, policy, has_source_text=True)

        assert res["outcome_code"] == OUTCOME_UNKNOWN_POLICY
        assert res["policy_eligibility"] == "UNKNOWN"
        assert res["is_covered"] is False
        assert res["requires_human_review"] is True
        assert "authoritative_coverage_status" in res["missing_information"]

        cov_item = next(i for i in res["policy_requirements_checklist"] if "Benefit Coverage" in i["requirement"])
        assert cov_item["status"] == "UNKNOWN"

    def test_malformed_evidence_handling(self):
        """Scenario: Evidence contains malformed strings, nulls, or unexpected non-dict values."""
        # Malformed: abnormalities is a string instead of list, findings has nulls
        evidence = {
            "image_evidence": {
                "abnormalities": "Single abnormality as string",
                "findings": ["Valid finding", None, "   "]
            },
            "text_image_consistency": "not a dict",
            "clinical_support": None
        }
        policy = {"is_covered": "Covered"}

        # Must not raise unhandled exceptions
        res = compare_evidence_to_policy(evidence, policy, has_source_text=True)
        assert isinstance(res, dict)
        assert res["evidence_score"] >= 0.0
        assert res["outcome_code"] in [OUTCOME_INSUFFICIENT_INFORMATION, OUTCOME_MANUAL_REVIEW_REQUIRED]

    def test_malformed_policy_handling(self):
        """Scenario: Policy object is None or empty dict."""
        evidence = {"image_evidence": {"abnormalities": []}}

        res = compare_evidence_to_policy(evidence, None, has_source_text=True)
        assert isinstance(res, dict)
        assert res["policy_eligibility"] == "UNKNOWN"
        assert res["requires_human_review"] is True

    def test_deterministic_reproducibility(self):
        """Scenario: Repeated evaluation on identical inputs produces identical results."""
        evidence = {
            "image_evidence": {"abnormalities": ["Nodule"], "findings": ["Solitary pulmonary nodule"]},
            "text_image_consistency": {"consistent": True},
            "clinical_support": {"supported": True}
        }
        policy = {"is_covered": "Covered", "copay": "$30", "coinsurance": "20%"}

        res1 = compare_evidence_to_policy(evidence, policy, has_source_text=True)
        res2 = compare_evidence_to_policy(evidence, policy, has_source_text=True)

        assert res1 == res2
        assert res1["evidence_score"] == res2["evidence_score"]
        assert res1["outcome_code"] == res2["outcome_code"]

    def test_cost_sharing_parsing_variants(self):
        """Scenario: parse_cost_sharing handles all CMS PUF string variations."""
        assert "100% covered" in parse_cost_sharing("$0.00", "0.00%")
        assert "Copay: $25" in parse_cost_sharing("$25", "Not Applicable")
        assert "Coinsurance: 20%" in parse_cost_sharing("None", "20%")
        assert "No specific copay" in parse_cost_sharing("Not Applicable", "None")
        assert "No specific copay" in parse_cost_sharing(None, None)


# ===========================================================================
# 2. ISOLATED IN-MEMORY SQLITE API INTEGRATION TESTS
# ===========================================================================

@pytest.fixture(scope="module")
def sqlite_test_db():
    """Create an isolated in-memory SQLite database pre-seeded with synthetic fixtures."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Seed SYNTHETIC records
    db = TestingSessionLocal()
    try:
        synth_case = Case(
            case_id=90001,
            classification="abnormal",
            indication="Shortness of breath",
            findings="Bilateral lower lobe infiltrates",
            impression="Multifocal pneumonia",
            requested_procedure="Chest Radiograph",
            has_source_text=True
        )
        synth_evidence = Evidence(
            case_id=90001,
            image_evidence={"abnormalities": ["Bilateral infiltrates"], "findings": ["Infiltrates"]},
            text_image_consistency={"consistent": True, "notes": "Corroborates clinical presentation"},
            clinical_support={"supported": True, "reason": "Dyspnea justifies examination"},
            raw_model_output="Synthetic model output"
        )
        synth_policy = Policy(
            plan_id="SYNTH-TEST-PLAN-01",
            state="IN",
            is_covered="Covered",
            copay="$25.00",
            coinsurance="20.00%",
            limit_qty=None,
            limit_unit=None,
            exclusions="Cosmetic; Routine"
        )
        synth_case.evidence = synth_evidence
        db.add(synth_case)
        db.add(synth_policy)
        db.commit()
    finally:
        db.close()

    yield TestingSessionLocal

    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def isolated_client(sqlite_test_db):
    """FastAPI TestClient with overridden get_db pointing to SQLite test database."""
    def override_get_db() -> Generator:
        db = sqlite_test_db()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)

    yield test_client

    app.dependency_overrides.clear()


class TestIsolatedApiReviewLifecycle:
    """Integration tests verifying backward compatibility and side-effect controls."""

    def test_get_review_with_persist_false_has_no_side_effects(self, isolated_client, sqlite_test_db):
        """GET /cases/{id}/review?persist=false must evaluate without inserting review row."""
        db = sqlite_test_db()
        initial_review_count = db.query(Review).count()
        db.close()

        resp = isolated_client.get("/cases/90001/review?plan_id=SYNTH-TEST-PLAN-01&persist=false")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == 0
        assert data["case_id"] == 90001
        assert data["evidence_score"] == 100.0
        assert data["policy_compliance"]["outcome_code"] == OUTCOME_COVERED

        # Verify no review was committed
        db = sqlite_test_db()
        assert db.query(Review).count() == initial_review_count
        db.close()

    def test_get_review_with_default_persist_true_maintains_backward_compatibility(self, isolated_client, sqlite_test_db):
        """Default GET /cases/{id}/review?plan_id=... persists review for backward compatibility."""
        resp = isolated_client.get("/cases/90001/review?plan_id=SYNTH-TEST-PLAN-01")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] > 0
        assert data["case_id"] == 90001
        assert data["evidence_score"] == 100.0

        db = sqlite_test_db()
        persisted = db.query(Review).filter(Review.id == data["id"]).first()
        assert persisted is not None
        assert persisted.policy_compliance["outcome_code"] == OUTCOME_COVERED
        db.close()

    def test_explicit_post_review_persistence(self, isolated_client, sqlite_test_db):
        """POST /cases/{id}/review?plan_id=... explicitly creates or updates review record."""
        resp = isolated_client.post("/cases/90001/review?plan_id=SYNTH-TEST-PLAN-01")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] > 0
        assert data["case_id"] == 90001
        assert data["policy_compliance"]["outcome_code"] == OUTCOME_COVERED

    def test_submit_adjudication_decision_state_transition(self, isolated_client, sqlite_test_db):
        """POST /reviews/{id}/decision stamps human reviewer decision and notes."""
        # Ensure a review exists
        rev_prep = isolated_client.post("/cases/90001/review?plan_id=SYNTH-TEST-PLAN-01")
        assert rev_prep.status_code == 200
        review_id = rev_prep.json()["id"]

        payload = {
            "reviewer_decision": "Approved",
            "reviewer_notes": "Clinical indications and imaging findings satisfy protocol criteria."
        }
        resp = isolated_client.post(f"/reviews/{review_id}/decision", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["reviewer_decision"] == "Approved"
        assert data["reviewed_at"] is not None

        db = sqlite_test_db()
        updated = db.query(Review).filter(Review.id == review_id).first()
        assert updated.reviewer_decision == "Approved"
        db.close()

    def test_non_existent_case_or_plan_404(self, isolated_client):
        """Invalid synthetic case or plan returns clean 404."""
        resp_case = isolated_client.get("/cases/999999/review?plan_id=SYNTH-TEST-PLAN-01")
        assert resp_case.status_code == 404
        assert resp_case.json()["error"] == "Case not found"

        resp_plan = isolated_client.get("/cases/90001/review?plan_id=NON-EXISTENT-PLAN")
        assert resp_plan.status_code == 404
        assert resp_plan.json()["error"] == "Policy not found"

    def test_persistence_rollback_on_database_error(self, isolated_client, monkeypatch):
        """Database commit failure triggers rollback and clean HTTP 500 without corrupting state."""
        from sqlalchemy.orm import Session
        def mock_commit(self):
            raise RuntimeError("Simulated database failure during commit")

        monkeypatch.setattr(Session, "commit", mock_commit)

        resp = isolated_client.post("/cases/90001/review?plan_id=SYNTH-TEST-PLAN-01")
        assert resp.status_code == 500
        data = resp.json()
        assert data["error"] == "Database error"
        assert "Failed to persist review record" in data["message"]

