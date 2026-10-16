"""
verify_e2e_flow.py — End-to-End Live Workflow Verification
Validates the complete clinical lifecycle across Provider, Reviewer, and Patient portals against live servers.
"""
import io
import httpx

BASE = "http://127.0.0.1:8000"

def test_full_lifecycle():
    print("=" * 60)
    print("ANVESH LIVE END-TO-END WORKFLOW VERIFICATION")
    print("=" * 60)

    with httpx.Client(base_url=BASE, timeout=30.0) as client:
        # 1. Health check
        r = client.get("/health")
        assert r.status_code == 200, f"Health check failed: {r.text}"
        health_data = r.json()
        print(f"[+] 1. Health Check Verified: status={health_data['status']}, db={health_data['database']}")

        # 2. Provider Login
        r = client.post(
            "/api/auth/login",
            json={"email": "provider@hospital.org", "password": "ProviderPass123!"}
        )
        assert r.status_code == 200, f"Provider login failed: {r.text}"
        provider_info = r.json()["user"]
        prov_token = r.json().get("session_token")
        prov_headers = {"Authorization": f"Bearer {prov_token}"} if prov_token else {}
        print(f"[+] 2. Provider Logged In: {provider_info['full_name']} ({provider_info['organization']})")

        # 3. Provider Creates Prior-Auth Submission
        sub_payload = {
            "member_id": "MEM-2026-9901",
            "patient_name": "Eleanor Vance",
            "payer_plan_id": "17091AL0010001-00",
            "service_type": "Diagnostic Chest Radiography (2 Views PA/LAT)",
            "cpt_code": "71046",
            "clinical_indication": "Exertional dyspnea x 3 weeks, evaluate for cardiomegaly and trace effusion.",
            "prelim_findings": "Cardiothoracic ratio ~0.55, mild left costophrenic angle blunting."
        }
        r = client.post("/api/submissions", json=sub_payload, headers=prov_headers)
        assert r.status_code in (200, 201), f"Create submission failed: {r.text}"
        sub = r.json()
        sub_id = sub["id"]
        sub_ref = sub["submission_ref"]
        print(f"[+] 3. Prior-Auth Request Created: Ref={sub_ref}, ID={sub_id}, Initial Status={sub['status']}")

        # 4. Provider Uploads Diagnostic Radiograph (genuine test image)
        import os
        cxr_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "anvesh_dataset", "images", "cxr_248.jpg")
        with open(cxr_path, "rb") as f:
            cxr_bytes = f.read()
        
        files = {"file": ("cxr_patient_frontal.jpg", cxr_bytes, "image/jpeg")}
        r = client.post(f"/api/submissions/{sub_id}/files?file_category=radiograph", files=files, headers=prov_headers)
        assert r.status_code in (200, 201), f"Upload radiograph failed: {r.text}"
        uploaded_file = r.json()
        print(f"[+] 4. Radiograph Staged and Attached: File='{uploaded_file['original_filename']}', Size={uploaded_file['file_size_bytes']} bytes")

        # 5. Insurance Reviewer Login
        r = client.post(
            "/api/auth/login",
            json={"email": "reviewer@insurance.com", "password": "ReviewerPass123!"}
        )
        assert r.status_code == 200, f"Reviewer login failed: {r.text}"
        reviewer_info = r.json()["user"]
        rev_token = r.json().get("session_token")
        rev_headers = {"Authorization": f"Bearer {rev_token}"} if rev_token else {}
        print(f"[+] 5. Reviewer Logged In: {reviewer_info['full_name']} ({reviewer_info['role']})")

        # 6. Reviewer Inspects Submission & Attached Evidence
        r = client.get(f"/api/submissions/{sub_id}", headers=rev_headers)
        assert r.status_code == 200, f"Fetch submission failed: {r.text}"
        detail = r.json()
        assert len(detail["files"]) >= 1, "Attached radiograph missing from reviewer view"
        print(f"[+] 6. Reviewer Loaded Case: Patient='{detail['patient_name']}', Service='{detail['service_type']}', Files Attached={len(detail['files'])}")

        # 7. Reviewer Records Authorization Decision
        decision_payload = {
            "decision": "APPROVED",
            "notes": "Clinical indication substantiated by radiographic evidence."
        }
        r = client.post(f"/api/insurance/submissions/{sub_id}/decision", json=decision_payload, headers=rev_headers)
        assert r.status_code == 200, f"Record decision failed: {r.text}"
        dec_result = r.json()
        print(f"[+] 7. Reviewer Decision Recorded: Status={dec_result['status']}, Decision={dec_result['reviewer_decision']}")

        # 8. Provider Verifies Final Status
        r = client.get(f"/api/submissions/{sub_id}", headers=prov_headers)
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
