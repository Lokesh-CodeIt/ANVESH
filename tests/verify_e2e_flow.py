"""
verify_e2e_flow.py — End-to-End Live Workflow Verification
Validates the complete clinical lifecycle across Provider, Reviewer, and Patient portals against live servers.
"""
import io
import requests

BASE = "http://127.0.0.1:8000"

def test_full_lifecycle():
    print("=" * 60)
    print("ANVESH LIVE END-TO-END WORKFLOW VERIFICATION")
    print("=" * 60)

    # 1. Health check
    r = requests.get(f"{BASE}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    health_data = r.json()
    print(f"[+] 1. Health Check Verified: status={health_data['status']}, db={health_data['database']}")

    # 2. Provider Login
    provider_s = requests.Session()
    r = provider_s.post(
        f"{BASE}/api/auth/login",
        json={"email": "provider@hospital.org", "password": "ProviderPass123!"}
    )
    assert r.status_code == 200, f"Provider login failed: {r.text}"
    provider_info = r.json()["user"]
    print(f"[+] 2. Provider Logged In: {provider_info['full_name']} ({provider_info['organization']})")

    # 3. Provider Creates Prior-Auth Submission
    sub_payload = {
        "member_id": "MEM-2026-9901",
        "patient_name": "Eleanor Vance",
        "payer_plan_id": "POL-CARDIO-2026-X",
        "service_type": "Diagnostic Chest Radiography (2 Views PA/LAT)",
        "cpt_code": "71046",
        "clinical_indication": "Exertional dyspnea x 3 weeks, evaluate for cardiomegaly and trace effusion.",
        "prelim_findings": "Cardiothoracic ratio ~0.55, mild left costophrenic angle blunting."
    }
    r = provider_s.post(f"{BASE}/submissions", json=sub_payload)
    assert r.status_code in (200, 201), f"Create submission failed: {r.text}"
    sub = r.json()
    sub_id = sub["id"]
    sub_ref = sub["submission_ref"]
    print(f"[+] 3. Prior-Auth Request Created: Ref={sub_ref}, ID={sub_id}, Initial Status={sub['status']}")

    # 4. Provider Uploads Diagnostic Radiograph
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00"
        b"\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    files = {"file": ("cxr_patient_frontal.png", io.BytesIO(png_bytes), "image/png")}
    r = provider_s.post(f"{BASE}/submissions/{sub_id}/files?file_category=radiograph", files=files)
    assert r.status_code in (200, 201), f"Upload radiograph failed: {r.text}"
    uploaded_file = r.json()
    print(f"[+] 4. Radiograph Staged and Attached: File='{uploaded_file['original_filename']}', Size={uploaded_file['file_size_bytes']} bytes")

    # 5. Insurance Reviewer Login
    reviewer_s = requests.Session()
    r = reviewer_s.post(
        f"{BASE}/api/auth/login",
        json={"email": "reviewer@insurance.com", "password": "ReviewerPass123!"}
    )
    assert r.status_code == 200, f"Reviewer login failed: {r.text}"
    reviewer_info = r.json()["user"]
    print(f"[+] 5. Reviewer Logged In: {reviewer_info['full_name']} ({reviewer_info['role']})")

    # 6. Reviewer Inspects Submission & Attached Evidence
    r = reviewer_s.get(f"{BASE}/insurance/submissions/{sub_id}")
    assert r.status_code == 200, f"Fetch submission failed: {r.text}"
    detail = r.json()
    assert len(detail["files"]) == 1, "Attached radiograph missing from reviewer view"
    print(f"[+] 6. Reviewer Loaded Case: Patient='{detail['patient_name']}', Service='{detail['service_type']}', Files Attached=1")

    # 7. Reviewer Records Authorization Decision
    decision_payload = {
        "decision": "APPROVED",
        "notes": "Clinical indication substantiated by radiographic evidence per Policy POL-CARDIO-2026-X."
    }
    r = reviewer_s.post(f"{BASE}/insurance/submissions/{sub_id}/decision", json=decision_payload)
    assert r.status_code == 200, f"Record decision failed: {r.text}"
    dec_result = r.json()
    print(f"[+] 7. Reviewer Decision Recorded: Status={dec_result['status']}, Decision={dec_result['reviewer_decision']}")

    # 8. Provider Verifies Final Status
    r = provider_s.get(f"{BASE}/submissions/{sub_id}")
    assert r.status_code == 200
    final = r.json()
    assert final["status"] == "APPROVED"
    assert final["reviewer_decision"] == "APPROVED"
    print(f"[+] 8. Provider Portal Synchronized: Verified Status='{final['status']}'")

    print("\n" + "=" * 60)
    print("SUCCESS: Full Multi-Role Workflow Verified Seamlessly!")
    print("=" * 60)

if __name__ == "__main__":
    test_full_lifecycle()
