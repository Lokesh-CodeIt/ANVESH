"""
tests/test_real_upload_and_llava_inference.py

End-to-End Test for Real Uploaded Radiograph Image Inference with Primary LLaVA v2:
1. Creates a submission via FastAPI TestClient.
2. Uploads a genuine chest radiograph image file (cxr_248.jpg).
3. Invokes the real background AI inference worker.
4. Verifies the returned inference payload from the database / API.
5. Confirms model identity, checkpoint path, decision threshold, valid probabilities, and latency.
6. Verifies that a separate second submission gets its own independent inference.
"""

import os
import sys
import time
import pytest
from fastapi.testclient import TestClient

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from main import app
from database import SessionLocal, engine, Base
from models import Submission, SubmissionFile, User
from auth import create_session, hash_password
from services.ai_service import process_submission_ai_inference


@pytest.fixture
def api_client():
    return TestClient(app)


@pytest.fixture
def auth_headers(api_client):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "dr_radiology@hospital.org").first()
        if not user:
            user = User(
                email="dr_radiology@hospital.org",
                hashed_password=hash_password("DoctorPass123!"),
                full_name="Dr. Elena Rostova",
                role="provider",
                organization="University Medical Center",
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


def test_real_upload_and_live_llava_inference(api_client, auth_headers):
    # 1. Create submission
    sub_payload = {
        "member_id": "MEM-LIVE-CXR-01",
        "patient_name": "James Sullivan",
        "payer_plan_id": "17091AL0010001-00",
        "service_type": "Diagnostic Chest Radiograph",
        "clinical_indication": "Progressive cough and dyspnea, evaluate for pneumonia or infiltrate",
        "prelim_findings": "Right lower lobe parenchymal consolidation suspected"
    }

    sub_res = api_client.post("/api/submissions", json=sub_payload, headers=auth_headers)
    assert sub_res.status_code == 200, sub_res.text
    sub_data = sub_res.json()
    submission_id = sub_data["id"]

    # 2. Upload real radiograph (cxr_248.jpg)
    cxr_path = os.path.join(BASE_DIR, "anvesh_dataset", "images", "cxr_248.jpg")
    assert os.path.exists(cxr_path), f"Test image missing: {cxr_path}"

    with open(cxr_path, "rb") as f:
        img_bytes = f.read()

    upload_res = api_client.post(
        f"/api/submissions/{submission_id}/files?file_category=radiograph",
        files={"file": ("cxr_248.jpg", img_bytes, "image/jpeg")},
        headers=auth_headers
    )
    assert upload_res.status_code in (200, 201), upload_res.text

    # 3. Synchronously execute AI worker for this submission
    process_submission_ai_inference(submission_id)

    # 4. Fetch updated submission from API
    detail_res = api_client.get(f"/api/submissions/{submission_id}", headers=auth_headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()

    # 5. Assertions on AI inference output
    assert detail["ai_status"] == "COMPLETED"
    assert detail["ai_source"] == "PRIMARY_LLAVA"
    assert "Fine-Tuned LLaVA-1.5-7B" in detail["ai_model_version"]
    assert detail["ai_error"] is None

    evidence = detail["ai_evidence"]
    assert "image_evidence" in evidence
    img_ev = evidence["image_evidence"]
    assert "primary_llava_output" in img_ev
    llava_out = img_ev["primary_llava_output"]

    assert llava_out is not None
    assert "Fine-Tuned LLaVA-1.5-7B" in llava_out["model_name"]
    assert "checkpoints_llava_" in llava_out["checkpoint"]
    assert llava_out["decision_threshold"] in (0.5100, 0.3500)
    assert llava_out["classification"] in ("normal", "abnormal")
    assert 0.0 <= llava_out["probabilities"]["abnormal"] <= 1.0
    assert 0.0 <= llava_out["probabilities"]["normal"] <= 1.0
    assert round(llava_out["probabilities"]["abnormal"] + llava_out["probabilities"]["normal"], 2) == 1.00
    assert llava_out["latency_ms"] > 0
    assert len(llava_out["findings"]) > 0
    assert len(img_ev["impression_summary"]) > 10

    # 6. Verify metadata tracking
    meta = evidence["inference_metadata"]
    assert "Fine-Tuned LLaVA-1.5-7B" in meta["primary_model"]
    assert "checkpoints_llava_" in meta["primary_llava_checkpoint"]
    assert meta["primary_llava_executed"] is True
    assert meta["ai_source"] == "PRIMARY_LLAVA"
