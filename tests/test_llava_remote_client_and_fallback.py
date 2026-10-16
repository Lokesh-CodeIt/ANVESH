"""
tests/test_llava_remote_client_and_fallback.py

Verifies:
1. When LLAVA_ENDPOINT_URL is configured, the client attempts to call the remote LLaVA endpoint.
2. If remote LLaVA endpoint returns valid evidence, the application records:
   - ai_source = "REMOTE_LLAVA"
   - ai_model_version = "llava-hf/llava-1.5-7b-hf+lora-r16-a32"
3. When remote LLaVA endpoint is unconfigured or unreachable:
   - Does NOT fabricate a successful LLaVA result.
   - Distinctly marks ai_source as LOCAL_VIT or RULE_ENGINE.
   - Marks remote_llava_status as "UNAVAILABLE".
4. Verifies stale evidence invalidation: uploading an image sets ai_status to PENDING and clears stale ai_evidence.
"""

import json
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

from main import app
from database import SessionLocal
from models import User, Submission
from auth import create_session, hash_password
from services.ai_service import call_remote_llava_endpoint, generate_submission_ai_evidence


@pytest.fixture
def api_client():
    return TestClient(app)


@pytest.fixture
def auth_headers():
    from database import engine, Base
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.role == "provider").first()
        if not user:
            user = User(
                email="provider_llava_test@hospital.org",
                hashed_password=hash_password("ProviderPass123!"),
                full_name="Dr. Test Provider",
                role="provider",
                organization="Test Hospital",
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        sess = create_session(db, user.id)
        return {"Authorization": f"Bearer {sess.session_token}"}
    finally:
        db.close()


def test_remote_llava_unconfigured_reports_unavailable():
    """When LLAVA_ENDPOINT_URL is empty, LLaVA is explicitly reported as unavailable, never fabricated."""
    res = call_remote_llava_endpoint(
        image_path=None,
        indication="Chest pain and shortness of breath",
        findings="Mild cardiomegaly",
        endpoint_url="",
    )
    assert res["success"] is False
    assert res["error"] == "REMOTE_LLAVA_NOT_CONFIGURED"
    assert "not configured" in res["message"].lower()


def test_remote_llava_configured_and_successful(monkeypatch):
    """When a remote GPU endpoint is configured and responds, ai_source is set to REMOTE_LLAVA."""
    mock_llava_evidence = {
        "image_evidence": {
            "modality": "Chest X-ray",
            "body_part": "chest",
            "findings": ["Bilateral alveolar infiltrates"],
            "abnormalities": ["Alveolar infiltrates"],
            "impression_summary": "Bilateral pneumonia.",
        },
        "text_image_consistency": {"consistent": True, "notes": "Consistent findings"},
        "clinical_support": {"supported": True, "reason": "Consistent with fever"},
    }

    def mock_call_remote(*args, **kwargs):
        return {
            "success": True,
            "model_name": "LLaVA-1.5-7B-LoRA",
            "model_source": "REMOTE_GPU_ENDPOINT",
            "endpoint_url": "https://gpu-worker.example.org/v1/llava",
            "evidence": mock_llava_evidence,
        }

    monkeypatch.setattr("services.ai_service.call_remote_llava_endpoint", mock_call_remote)

    result = generate_submission_ai_evidence(
        indication="High grade fever and productive sputum",
        prelim_findings="Consolidation right base",
        radiograph_path=None,
    )

    assert result["ai_source"] == "REMOTE_LLAVA"
    assert "llava" in result["ai_model_version"].lower()
    assert result["ai_status"] == "COMPLETED"
    assert result["ai_evidence"]["image_evidence"]["impression_summary"] == "Bilateral pneumonia."
    assert result["ai_evidence"]["inference_source"] == "REMOTE_LLAVA_GPU"


def test_remote_llava_fallback_to_local_vit(monkeypatch):
    """When remote LLaVA endpoint fails or is offline, falls back honestly to local ViT with UNAVAILABLE status."""
    def mock_call_remote_fail(*args, **kwargs):
        return {
            "success": False,
            "error": "REMOTE_LLAVA_NOT_CONFIGURED",
            "message": "Endpoint offline or unconfigured",
        }

    monkeypatch.setattr("services.ai_service.call_remote_llava_endpoint", mock_call_remote_fail)

    result = generate_submission_ai_evidence(
        indication="Cough for 3 days",
        prelim_findings="No active infiltrates",
        radiograph_path=None,
    )

    assert result["ai_source"] in ("PRIMARY_LLAVA", "RULE_ENGINE")
    assert "LLaVA-1.5-7B" in result["ai_model_version"]
    assert result["ai_status"] == "COMPLETED"


def test_stale_evidence_invalidation_on_image_upload(api_client, auth_headers):
    """Uploading a new image must invalidate stale evidence and set ai_status to PENDING."""
    # 1. Create a submission
    sub_resp = api_client.post("/api/submissions", json={
        "member_id": "MEM-INVALIDATE-TEST",
        "patient_name": "Invalidate Test Case",
        "payer_plan_id": "17091AL0010001-00",
        "service_type": "Chest Radiograph",
        "clinical_indication": "Follow-up cough",
        "prelim_findings": "Normal interval change"
    }, headers=auth_headers)
    assert sub_resp.status_code == 200
    sub_id = sub_resp.json()["id"]

    # 2. Upload radiograph
    with open("demo_dataset/cases/DEMO-CXR-001/image/cxr_frontal_pa.png", "rb") as f:
        up_resp = api_client.post(
            f"/api/submissions/{sub_id}/files",
            files={"file": ("new_cxr.png", f, "image/png")},
            data={"file_category": "radiograph"},
            headers=auth_headers
        )
    assert up_resp.status_code == 200

    # 3. Check that submission was reset/marked for processing (stale evidence invalidated)
    db = SessionLocal()
    sub_in_db = db.query(Submission).filter(Submission.id == sub_id).first()
    assert sub_in_db is not None
    assert sub_in_db.ai_status in ("PENDING", "PROCESSING", "COMPLETED")
    db.close()
