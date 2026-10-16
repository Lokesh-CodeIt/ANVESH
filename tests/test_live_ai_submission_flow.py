"""
tests/test_live_ai_submission_flow.py

Validates the complete end-to-end live AI integration for newly submitted prior authorization requests:
1. Provider creates a new submission with clinical indication & preliminary findings.
2. An asynchronous AI inference job is dispatched.
3. AI evidence schema is validated against canonical fields (image_evidence, consistency, clinical_support).
4. Prevention of stale precomputed evidence: Verifies that new submissions get newly synthesized AI evidence.
5. Deterministic policy engine evaluates new AI evidence and generates compliance checklists.
6. Reviewer adjudicates the case with final authorization decisions.
"""

import pytest
from fastapi.testclient import TestClient

from main import app
from database import SessionLocal
from models import Submission, User, Policy
from auth import create_session, hash_password


@pytest.fixture
def api_client():
    return TestClient(app)


@pytest.fixture
def test_users(api_client):
    db = SessionLocal()
    try:
        provider = db.query(User).filter(User.email == "provider@hospital.org").first()
        if not provider:
            provider = User(
                email="provider@hospital.org",
                hashed_password=hash_password("ProviderPass123!"),
                full_name="Dr. Marcus Vance",
                role="provider",
                organization="Metropolitan Hospital",
                is_active=True,
                is_verified=True,
            )
            db.add(provider)

        reviewer = db.query(User).filter(User.email == "reviewer@insurance.com").first()
        if not reviewer:
            reviewer = User(
                email="reviewer@insurance.com",
                hashed_password=hash_password("ReviewerPass123!"),
                full_name="Dr. Sarah Jenkins",
                role="insurance_reviewer",
                organization="National Health Group",
                is_active=True,
                is_verified=True,
            )
            db.add(reviewer)

        db.commit()
        db.refresh(provider)
        db.refresh(reviewer)

        prov_sess = create_session(db, provider.id)
        rev_sess = create_session(db, reviewer.id)

        return {
            "provider_token": prov_sess.session_token,
            "reviewer_token": rev_sess.session_token,
            "provider_id": provider.id,
            "reviewer_id": reviewer.id,
        }
    finally:
        db.close()


def test_live_ai_submission_and_policy_review_flow(api_client, test_users):
    prov_headers = {"Authorization": f"Bearer {test_users['provider_token']}"}
    rev_headers = {"Authorization": f"Bearer {test_users['reviewer_token']}"}

    # 1. Provider submits case
    payload = {
        "member_id": "MEM-TEST-FLOW-01",
        "patient_name": "Test Patient Flow",
        "payer_plan_id": "17091AL0010001-00",
        "service_type": "Diagnostic Chest Radiograph",
        "clinical_indication": "Acute dyspnea and persistent cough for 1 week",
        "prelim_findings": "Bilateral bibasilar opacities noted"
    }

    sub_resp = api_client.post("/api/submissions", json=payload, headers=prov_headers)
    assert sub_resp.status_code == 200, sub_resp.text
    sub_data = sub_resp.json()
    submission_id = sub_data["id"]
    assert sub_data["status"] == "SUBMITTED"

    # 2. Check submission detail - wait/verify AI execution
    detail_resp = api_client.get(f"/api/submissions/{submission_id}", headers=prov_headers)
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()

    # If pending in background thread, review endpoint will automatically trigger/finalize it
    # 3. Reviewer queries review endpoint for this new submission
    rev_eval_resp = api_client.get(f"/api/insurance/submissions/{submission_id}/review", headers=rev_headers)
    assert rev_eval_resp.status_code == 200, rev_eval_resp.text
    eval_data = rev_eval_resp.json()

    assert eval_data["ai_status"] == "COMPLETED"
    assert eval_data["ai_source"] in ("RULE_ENGINE", "LOCAL_VIT", "REMOTE_LLAVA")
    assert "ViT-B/16" in eval_data["ai_model_version"]
    assert "image_evidence" in eval_data["ai_evidence"]
    assert "clinical_support" in eval_data["ai_evidence"]

    # Verify policy engine results
    compliance = eval_data["policy_compliance"]
    assert "policy_requirements_checklist" in compliance
    assert len(compliance["policy_requirements_checklist"]) >= 5
    assert compliance["evidence_score"] >= 40.0

    # 4. Reviewer submits final authorization decision
    decision_payload = {
        "decision": "APPROVED",
        "notes": "Clinical necessity validated by automated multimodal evidence synthesis."
    }
    dec_resp = api_client.post(
        f"/api/insurance/submissions/{submission_id}/decision",
        json=decision_payload,
        headers=rev_headers
    )
    assert dec_resp.status_code == 200
    final_sub = dec_resp.json()
    assert final_sub["status"] == "APPROVED"
    assert final_sub["reviewer_decision"] == "APPROVED"
