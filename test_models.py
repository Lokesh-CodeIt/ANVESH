import os
import pytest
from datetime import datetime, timezone
from database import SessionLocal
from models import Case, CaseImage, Evidence, Policy, Review

# Safety Guard: Legacy tests connect to live PostgreSQL research database.
if os.getenv("RUN_LIVE_DB_TESTS") != "1":
    pytestmark = pytest.mark.skip(
        reason="Quarantined: test connects directly to live PostgreSQL database. Set RUN_LIVE_DB_TESTS=1 only against an isolated staging database."
    )

def test_roundtrip():

    db = SessionLocal()
    try:
        # Create test policy
        policy = Policy(
            plan_id="TEST-PLAN-001",
            state="IN",
            is_covered="Covered",
            copay="$25",
            coinsurance="20%",
            limit_qty=2.0,
            limit_unit="Procedures per Year",
            exclusions="None"
        )
        db.merge(policy)

        # Create test case with related images, evidence, and review
        case = Case(
            case_id=999999,
            classification="abnormal",
            indication="Cough and fever",
            findings="Infiltrate in right lower lobe",
            impression="Right lower lobe pneumonia",
            requested_procedure="Chest X-ray (PA and Lateral)",
            has_source_text=True
        )

        # Add image
        case.images.append(
            CaseImage(
                filename="test_frontal.png",
                projection="Frontal",
                file_path="/data/images/test_frontal.png"
            )
        )

        # Add evidence (JSONB)
        case.evidence = Evidence(
            image_evidence={"findings": ["consolidation"], "confidence": 0.94},
            text_image_consistency={"consistent": True, "score": 0.95},
            clinical_support={"prior_authorization_justified": True},
            raw_model_output="Model output: Pneumonia detected."
        )

        # Add review
        case.reviews.append(
            Review(
                plan_id="TEST-PLAN-001",
                policy_compliance={"criteria_met": True, "rationale": "Meets clinical guidelines"},
                evidence_score=0.95,
                recommendation="Approve",
                reviewer_decision="Approved",
                reviewer_notes="Clean clinical justification",
                reviewed_at=datetime.now(timezone.utc)
            )
        )

        db.merge(case)
        db.commit()

        # Query back and verify relationships
        queried = db.query(Case).filter(Case.case_id == 999999).first()
        assert queried is not None
        assert len(queried.images) == 1
        assert queried.images[0].filename == "test_frontal.png"
        assert queried.evidence.image_evidence["confidence"] == 0.94
        assert len(queried.reviews) == 1
        assert queried.reviews[0].policy.plan_id == "TEST-PLAN-001"

        print("ORM roundtrip test PASSED successfully!")

        # Clean up test records
        db.delete(queried)
        db.delete(db.query(Policy).filter(Policy.plan_id == "TEST-PLAN-001").first())
        db.commit()
        print("Test data cleaned up cleanly.")
    finally:
        db.close()

if __name__ == "__main__":
    test_roundtrip()
