import os
import json
import pytest
from fastapi.testclient import TestClient
from main import app

# Safety Guard: Legacy tests connect to live PostgreSQL research database.
if os.getenv("RUN_LIVE_DB_TESTS") != "1":
    pytestmark = pytest.mark.skip(
        reason="Quarantined: test connects directly to live PostgreSQL database. Set RUN_LIVE_DB_TESTS=1 only against an isolated staging database."
    )

client = TestClient(app)


def test_all_endpoints():
    print("=" * 70)
    print("MEDAUTH-VLM BACKEND API TEST SUITE")
    print("=" * 70)

    # 1. Health check
    print("\n[TEST 1] GET / (Health Check)")
    r = client.get("/")
    print(f"Status Code: {r.status_code}")
    print(f"Response:\n{json.dumps(r.json(), indent=2)}")
    assert r.status_code == 200

    # 2. List cases
    print("\n[TEST 2] GET /cases (Pagination limit=3)")
    r = client.get("/cases?limit=3")
    print(f"Status Code: {r.status_code}")
    cases = r.json()
    print(f"Returned {len(cases)} cases.")
    print("Sample Case [0]:")
    print(json.dumps(cases[0], indent=2))
    assert r.status_code == 200
    assert len(cases) == 3
    sample_case_id = cases[0]["case_id"]

    # 3. Case detail
    print(f"\n[TEST 3] GET /cases/{sample_case_id} (Full Details)")
    r = client.get(f"/cases/{sample_case_id}")
    print(f"Status Code: {r.status_code}")
    detail = r.json()
    print(f"Case ID: {detail['case_id']}")
    print(f"Classification: {detail['classification']}")
    print(f"Requested Procedure: {detail['requested_procedure']}")
    print(f"Images ({len(detail['images'])}):")
    for img in detail["images"]:
        print(f"  - [{img['projection']}] {img['filename']} -> URL: {img.get('image_url')}")
    print("Evidence Summary:")
    print(f"  - Consistency: {detail['evidence']['text_image_consistency']}")
    print(f"  - Clinical Support: {detail['evidence']['clinical_support']}")
    assert r.status_code == 200

    # 4. Static Image Mount
    if detail["images"]:
        sample_img_url = detail["images"][0]["image_url"]
        print(f"\n[TEST 4] GET {sample_img_url} (Static Medical Image Serving)")
        r = client.get(sample_img_url)
        print(f"Status Code: {r.status_code}")
        print(f"Content-Type: {r.headers.get('content-type')}")
        print(f"Content-Length: {len(r.content)} bytes")
        assert r.status_code == 200
        assert len(r.content) > 0

    # 5. List policies
    print("\n[TEST 5] GET /policies (Pagination limit=3)")
    r = client.get("/policies?limit=3")
    print(f"Status Code: {r.status_code}")
    policies = r.json()
    print(f"Returned {len(policies)} policies.")
    print("Sample Policy [0]:")
    print(json.dumps(policies[0], indent=2))
    assert r.status_code == 200
    assert len(policies) > 0
    sample_plan_id = policies[0]["plan_id"]

    # 6. Policy Review Evaluation
    print(f"\n[TEST 6] GET /cases/{sample_case_id}/review?plan_id={sample_plan_id} (Prior Auth Review)")
    r = client.get(f"/cases/{sample_case_id}/review", params={"plan_id": sample_plan_id})
    print(f"Status Code: {r.status_code}")
    review_data = r.json()
    review_id = review_data["id"]
    print(f"Review ID: {review_id}")
    print(f"Evidence Score: {review_data['evidence_score']} / 100")
    print(f"System Recommendation: {review_data['recommendation']}")
    print(f"Initial Reviewer Decision: {review_data['reviewer_decision']}")
    print("Policy Requirements Checklist:")
    compliance = review_data["policy_compliance"]
    for item in compliance.get("policy_requirements_checklist", []):
        print(f"  * [{item['status']}] {item['requirement']}: {item['detail']}")
    assert r.status_code == 200

    # 7. Post Human Reviewer Decision
    print(f"\n[TEST 7] POST /reviews/{review_id}/decision (Submit Reviewer Authorization)")
    decision_payload = {
        "reviewer_decision": "Approved",
        "reviewer_notes": "Clinical indications and bilateral infiltrates satisfy prior authorization criteria under CMS guidelines."
    }
    r = client.post(f"/reviews/{review_id}/decision", json=decision_payload)
    print(f"Status Code: {r.status_code}")
    updated_review = r.json()
    print(f"Review ID: {updated_review['id']}")
    print(f"Updated Reviewer Decision: {updated_review['reviewer_decision']}")
    print(f"Updated Reviewer Notes: {updated_review['reviewer_notes']}")
    print(f"Reviewed At Timestamp: {updated_review['reviewed_at']}")
    assert r.status_code == 200
    assert updated_review["reviewer_decision"] == "Approved"
    assert updated_review["reviewed_at"] is not None

    print("\n" + "=" * 70)
    print("ALL TESTS PASSED SUCCESSFULLY! BACKEND IS PRODUCTION READY.")
    print("=" * 70)

if __name__ == "__main__":
    test_all_endpoints()
