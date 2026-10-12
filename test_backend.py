import os
import pytest
from fastapi.testclient import TestClient
from main import app

# Safety Guard: Legacy tests connect to live PostgreSQL research database.
# Quarantined to prevent accidental mutation of production/research records.
if os.getenv("RUN_LIVE_DB_TESTS") != "1":
    pytestmark = pytest.mark.skip(
        reason="Quarantined: test connects directly to live PostgreSQL database. Set RUN_LIVE_DB_TESTS=1 only against an isolated staging database."
    )

client = TestClient(app)



@pytest.fixture(scope="module")
def sample_plan_id():
    """Retrieve an existing valid plan_id from the database via the API."""
    response = client.get("/policies?limit=1")
    assert response.status_code == 200
    policies = response.json()
    assert len(policies) > 0
    return policies[0]["plan_id"]


# ---------------------------------------------------------------------------
# 1. Valid Case Retrieval
# ---------------------------------------------------------------------------
def test_valid_case_retrieval():
    response = client.get("/cases/67")
    assert response.status_code == 200
    data = response.json()
    assert data["case_id"] == 67
    assert data["classification"] == "abnormal"
    assert data["has_source_text"] is True
    assert isinstance(data["images"], list)
    assert len(data["images"]) >= 1
    assert data["images"][0]["image_url"].startswith("/images/")
    assert data["evidence"] is not None
    assert "image_evidence" in data["evidence"]


# ---------------------------------------------------------------------------
# 2. Invalid Case Retrieval (Non-existent Case ID -> 404)
# ---------------------------------------------------------------------------
def test_invalid_case_not_found():
    response = client.get("/cases/9999999")
    assert response.status_code == 404
    error_data = response.json()
    assert error_data.get("error") == "Case not found"
    assert error_data.get("case_id") == 9999999


# ---------------------------------------------------------------------------
# 3. Invalid Case ID Format (Negative number, zero, or string -> 422)
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("invalid_id", [-1, -99, 0, "abc", "case_67"])
def test_invalid_case_id_format(invalid_id):
    response = client.get(f"/cases/{invalid_id}")
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# 4. Review Generation for Normal Case (has_source_text = True)
# ---------------------------------------------------------------------------
def test_review_generation_normal_case(sample_plan_id):
    response = client.get(f"/cases/67/review?plan_id={sample_plan_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["case_id"] == 67
    assert data["plan_id"] == sample_plan_id
    assert data["evidence_score"] is not None
    assert data["evidence_score"] >= 80.0
    assert data["recommendation"] == "Evidence appears sufficient"
    assert "policy_compliance" in data
    assert len(data["policy_compliance"]["policy_requirements_checklist"]) >= 5


# ---------------------------------------------------------------------------
# 5. Review Generation for No-Source-Text Cases (1615 and 3782)
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("no_source_case_id", [1615, 3782])
def test_review_generation_no_source_text_case(sample_plan_id, no_source_case_id):
    # Verify the case itself has has_source_text=False
    case_resp = client.get(f"/cases/{no_source_case_id}")
    assert case_resp.status_code == 200
    assert case_resp.json()["has_source_text"] is False

    # Generate review
    review_resp = client.get(f"/cases/{no_source_case_id}/review?plan_id={sample_plan_id}")
    assert review_resp.status_code == 200
    data = review_resp.json()

    # Verify score is capped at <= 40.0
    assert data["evidence_score"] <= 40.0

    # Verify warning in recommendation
    assert "Unverified AI evidence" in data["recommendation"]
    assert "no original clinical report available for grounding" in data["recommendation"]
    assert "Requires manual review" in data["recommendation"]

    # Verify warning in checklist
    checklist = data["policy_compliance"]["policy_requirements_checklist"]
    grounding_item = next(
        (item for item in checklist if item["requirement"] == "Source Clinical Report Grounding"),
        None
    )
    assert grounding_item is not None
    assert grounding_item["status"] == "WARNING"


# ---------------------------------------------------------------------------
# 6. Review with Non-Existent Policy Plan ID (-> 404)
# ---------------------------------------------------------------------------
def test_review_non_existent_plan_id():
    response = client.get("/cases/67/review?plan_id=NON_EXISTENT_PLAN_99999")
    assert response.status_code == 404
    error_data = response.json()
    assert error_data.get("error") == "Policy not found"
    assert error_data.get("plan_id") == "NON_EXISTENT_PLAN_99999"


# ---------------------------------------------------------------------------
# 7. Review with Non-Existent Case ID (-> 404)
# ---------------------------------------------------------------------------
def test_review_non_existent_case_id(sample_plan_id):
    response = client.get(f"/cases/9999999/review?plan_id={sample_plan_id}")
    assert response.status_code == 404
    error_data = response.json()
    assert error_data.get("error") == "Case not found"
    assert error_data.get("case_id") == 9999999


# ---------------------------------------------------------------------------
# 8. Submitting Reviewer Decision Successfully
# ---------------------------------------------------------------------------
def test_submit_reviewer_decision_success(sample_plan_id):
    # First ensure review exists
    review_prep = client.get(f"/cases/67/review?plan_id={sample_plan_id}")
    assert review_prep.status_code == 200
    review_id = review_prep.json()["id"]

    # Post human reviewer decision
    payload = {
        "reviewer_decision": "Approved",
        "reviewer_notes": "Clinical indications and imaging findings satisfy protocol criteria."
    }
    response = client.post(f"/reviews/{review_id}/decision", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == review_id
    assert data["reviewer_decision"] == "Approved"
    assert data["reviewer_notes"] == "Clinical indications and imaging findings satisfy protocol criteria."
    assert data["reviewed_at"] is not None


# ---------------------------------------------------------------------------
# 9. Submitting Reviewer Decision to Non-Existent Review ID (-> 404)
# ---------------------------------------------------------------------------
def test_submit_reviewer_decision_not_found():
    payload = {
        "reviewer_decision": "Denied",
        "reviewer_notes": "Review does not exist."
    }
    response = client.post("/reviews/9999999/decision", json=payload)
    assert response.status_code == 404
    error_data = response.json()
    assert error_data.get("error") == "Review not found"
    assert error_data.get("review_id") == 9999999


# ---------------------------------------------------------------------------
# 10. Health Check Endpoint (/health)
# ---------------------------------------------------------------------------
def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert "version" in data


# ---------------------------------------------------------------------------
# 11. System Summary Endpoint (/api/summary)
# ---------------------------------------------------------------------------
def test_system_summary_endpoint():
    response = client.get("/api/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert data["total_cases"] == 2107
    assert data["total_case_images"] == 4093
    assert data["total_evidence"] == 2107
    assert data["total_policies"] == 100
    assert data["total_reviews"] >= 3
    assert "classifications" in data
    assert "batch_coverage" in data


# ---------------------------------------------------------------------------
# 12. Case List with Filters (/api/cases)
# ---------------------------------------------------------------------------
def test_case_list_with_filters():
    # Filter by classification normal
    resp_norm = client.get("/api/cases?classification=normal&limit=10")
    assert resp_norm.status_code == 200
    norm_cases = resp_norm.json()
    assert len(norm_cases) == 10
    assert all(c["classification"] == "normal" for c in norm_cases)

    # Filter by classification abnormal
    resp_abnorm = client.get("/api/cases?classification=abnormal&limit=10")
    assert resp_abnorm.status_code == 200
    abnorm_cases = resp_abnorm.json()
    assert len(abnorm_cases) == 10
    assert all(c["classification"] == "abnormal" for c in abnorm_cases)

    # Filter by has_source_text False
    resp_hst = client.get("/api/cases?has_source_text=false&limit=5")
    assert resp_hst.status_code == 200
    hst_cases = resp_hst.json()
    assert len(hst_cases) > 0
    assert all(c["has_source_text"] is False for c in hst_cases)


# ---------------------------------------------------------------------------
# 13. Case Images Endpoint (/api/cases/{case_id}/images)
# ---------------------------------------------------------------------------
def test_case_images_endpoint():
    response = client.get("/api/cases/67/images")
    assert response.status_code == 200
    images = response.json()
    assert isinstance(images, list)
    assert len(images) >= 1
    assert all(img["case_id"] == 67 for img in images)
    assert all("projection" in img and "image_url" in img for img in images)

    # Non-existent case
    not_found = client.get("/api/cases/9999999/images")
    assert not_found.status_code == 404


# ---------------------------------------------------------------------------
# 14. Case Evidence Endpoint (/api/cases/{case_id}/evidence)
# ---------------------------------------------------------------------------
def test_case_evidence_endpoint():
    # Existing case with evidence
    response = client.get("/api/cases/67/evidence")
    assert response.status_code == 200
    ev = response.json()
    assert ev["case_id"] == 67
    assert "image_evidence" in ev
    assert "text_image_consistency" in ev
    assert "clinical_support" in ev
    assert "modality" in ev["image_evidence"]

    # Non-existent case
    not_found = client.get("/api/cases/9999999/evidence")
    assert not_found.status_code == 404


# ---------------------------------------------------------------------------
# 15. Policies with Filters (/api/policies)
# ---------------------------------------------------------------------------
def test_policies_filter():
    response = client.get("/api/policies?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5

    # Filter by state
    st_resp = client.get("/api/policies?state=AK&limit=10")
    assert st_resp.status_code == 200
    st_data = st_resp.json()
    assert len(st_data) > 0
    assert all(p["state"] == "AK" for p in st_data)


# ---------------------------------------------------------------------------
# 16. Reviews Endpoint (/api/reviews)
# ---------------------------------------------------------------------------
def test_reviews_endpoint():
    response = client.get("/api/reviews?limit=10")
    assert response.status_code == 200
    reviews = response.json()
    assert isinstance(reviews, list)
    assert len(reviews) > 0
    assert all("case_id" in r and "plan_id" in r and "policy_compliance" in r for r in reviews)

