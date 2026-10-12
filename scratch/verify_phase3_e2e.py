"""
verify_phase3_e2e.py — ANVESH MedAuth-VLM Phase 3 End-to-End Verification

Tests the complete provider submission → file upload → insurance review → decision flow
against the live backend at http://127.0.0.1:8000.

Credentials used (provisioned via provision_admin.py):
  provider:    provider@hospital.org       / Provider123!
  reviewer:    reviewer@anvesh.com         / Reviewer123!
  auditor:     auditor@anvesh.com          / Auditor123!

API field reference (SubmissionResponse):
  id, submission_ref, member_id, patient_name, payer_plan_id,
  service_type, cpt_code, clinical_indication, status, files[], ...

Decision endpoint payload: { "decision": "APPROVED", "notes": "..." }
"""

import io
import requests

BASE_URL = "http://127.0.0.1:8000"

# ---------------------------------------------------------------------------
# Credentials matching provisioned accounts
# ---------------------------------------------------------------------------
PROVIDER_EMAIL    = "provider@hospital.org"
PROVIDER_PASSWORD = "Provider123!"
REVIEWER_EMAIL    = "reviewer@anvesh.com"
REVIEWER_PASSWORD = "Reviewer123!"
AUDITOR_EMAIL     = "auditor@anvesh.com"
AUDITOR_PASSWORD  = "Auditor123!"


def login(email: str, password: str) -> tuple[requests.Session, dict, dict]:
    """Login and return (session, login_json, auth_headers)."""
    sess = requests.Session()
    resp = sess.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    data = resp.json()
    headers = {"Authorization": f"Bearer {data['token']}"}
    print(f"   ✓ Logged in: {data['user']['full_name']} (role={data['user']['role']}, org={data['user']['organization']})")
    return sess, data, headers


def test_full_phase3_workflow():
    print("=" * 70)
    print("ANVESH MedAuth-VLM Phase 3 End-to-End Verification")
    print("=" * 70)

    # ------------------------------------------------------------------
    # 1. Provider Login
    # ------------------------------------------------------------------
    print("\n[1] Provider login...")
    prov_sess, prov_data, prov_headers = login(PROVIDER_EMAIL, PROVIDER_PASSWORD)
    provider_user_id = prov_data["user"]["id"]

    # ------------------------------------------------------------------
    # 2. Create Submission
    # ------------------------------------------------------------------
    print("\n[2] Creating prior authorization submission...")
    sub_payload = {
        "member_id": "APEX-MEM-88412",
        "patient_name": "Eleanor Vance",
        "payer_plan_id": "apex-commercial",
        "service_type": "Left Heart Catheterization with Coronary Angiography",
        "cpt_code": "CPT-93458",
        "clinical_indication": (
            "Unstable angina refractory to maximal medical therapy; "
            "abnormal nuclear stress test indicating anterior wall ischemia."
        ),
        "prelim_findings": (
            "Patient with crescendo angina episodes over past 10 days. "
            "ST elevations during exercise treadmill test."
        ),
    }
    create_resp = prov_sess.post(f"{BASE_URL}/api/submissions", json=sub_payload, headers=prov_headers)
    assert create_resp.status_code == 201, f"Create submission failed ({create_resp.status_code}): {create_resp.text}"
    sub = create_resp.json()
    submission_id = sub["id"]
    submission_ref = sub["submission_ref"]
    assert sub["member_id"] == "APEX-MEM-88412"
    assert sub["patient_name"] == "Eleanor Vance"
    assert sub["status"] == "PENDING"
    assert sub["provider_id"] == provider_user_id
    print(f"   ✓ Submission created: {submission_ref} (ID={submission_id}, status={sub['status']})")

    # ------------------------------------------------------------------
    # 3. Upload PNG radiograph
    # ------------------------------------------------------------------
    print("\n[3] Uploading PNG radiograph...")
    # Minimal 1×1 valid PNG
    png_bytes = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
        b'\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc`\x00'
        b'\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82'
    )
    img_resp = prov_sess.post(
        f"{BASE_URL}/api/submissions/{submission_id}/files",
        files={"file": ("chest_angiogram.png", io.BytesIO(png_bytes), "image/png")},
        data={"category": "radiograph"},
        headers=prov_headers,
    )
    assert img_resp.status_code == 201, f"Image upload failed ({img_resp.status_code}): {img_resp.text}"
    img_file = img_resp.json()
    img_file_id = img_file["id"]
    assert img_file["original_filename"] == "chest_angiogram.png"
    assert img_file["file_category"] == "radiograph"
    assert img_file["mime_type"] == "image/png"
    print(f"   ✓ Radiograph uploaded: ID={img_file_id}, {img_file['file_size_bytes']} bytes")

    # ------------------------------------------------------------------
    # 4. Upload PDF clinical report
    # ------------------------------------------------------------------
    print("\n[4] Uploading PDF clinical report...")
    pdf_bytes = (
        b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
        b'2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'
        b'3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n'
        b'xref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n'
        b'0000000060 00000 n \n0000000124 00000 n \n'
        b'trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n207\n%%EOF\n'
    )
    pdf_resp = prov_sess.post(
        f"{BASE_URL}/api/submissions/{submission_id}/files",
        files={"file": ("stress_test_report.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        data={"category": "clinical_report"},
        headers=prov_headers,
    )
    assert pdf_resp.status_code == 201, f"PDF upload failed ({pdf_resp.status_code}): {pdf_resp.text}"
    pdf_file = pdf_resp.json()
    pdf_file_id = pdf_file["id"]
    assert pdf_file["original_filename"] == "stress_test_report.pdf"
    assert pdf_file["file_category"] == "clinical_report"
    assert pdf_file["mime_type"] == "application/pdf"
    print(f"   ✓ PDF report uploaded: ID={pdf_file_id}, {pdf_file['file_size_bytes']} bytes")

    # ------------------------------------------------------------------
    # 5. Provider verifies submission has 2 files
    # ------------------------------------------------------------------
    print("\n[5] Provider verifying submission details...")
    view_resp = prov_sess.get(f"{BASE_URL}/api/submissions/{submission_id}", headers=prov_headers)
    assert view_resp.status_code == 200, f"Provider view failed: {view_resp.text}"
    sub_detail = view_resp.json()
    assert len(sub_detail["files"]) == 2, f"Expected 2 files, got {len(sub_detail['files'])}"
    filenames = [f["original_filename"] for f in sub_detail["files"]]
    print(f"   ✓ Provider confirmed 2 attached files: {filenames}")

    # ------------------------------------------------------------------
    # 6. Provider lists their own submissions
    # ------------------------------------------------------------------
    print("\n[6] Provider listing own submissions...")
    mine_resp = prov_sess.get(f"{BASE_URL}/api/submissions/mine", headers=prov_headers)
    assert mine_resp.status_code == 200, f"Mine submissions failed: {mine_resp.text}"
    mine_list = mine_resp.json()
    assert any(s["id"] == submission_id for s in mine_list), \
        f"Submission {submission_id} not found in provider's own list!"
    print(f"   ✓ Provider sees {len(mine_list)} submission(s) in their history")

    # ------------------------------------------------------------------
    # 7. Reviewer Login
    # ------------------------------------------------------------------
    print("\n[7] Insurance reviewer login...")
    rev_sess, rev_data, rev_headers = login(REVIEWER_EMAIL, REVIEWER_PASSWORD)

    # ------------------------------------------------------------------
    # 8. Reviewer sees submission in insurance queue
    # ------------------------------------------------------------------
    print("\n[8] Reviewer checking insurance queue...")
    queue_resp = rev_sess.get(f"{BASE_URL}/api/insurance/submissions", headers=rev_headers)
    assert queue_resp.status_code == 200, f"Queue fetch failed: {queue_resp.text}"
    queue_list = queue_resp.json()
    matching = next((s for s in queue_list if s["id"] == submission_id), None)
    assert matching is not None, f"Submission {submission_id} not found in insurance queue!"
    print(f"   ✓ Found in queue: {matching['submission_ref']}, status={matching['status']}, files={len(matching['files'])}")

    # ------------------------------------------------------------------
    # 9. Reviewer loads workspace (full submission detail)
    # ------------------------------------------------------------------
    print("\n[9] Reviewer loading workspace...")
    ws_resp = rev_sess.get(f"{BASE_URL}/api/insurance/submissions/{submission_id}", headers=rev_headers)
    assert ws_resp.status_code == 200, f"Workspace fetch failed: {ws_resp.text}"
    ws = ws_resp.json()
    assert ws["patient_name"] == "Eleanor Vance"
    assert ws["service_type"] == "Left Heart Catheterization with Coronary Angiography"
    print(f"   ✓ Workspace loaded: {ws['patient_name']} / {ws['service_type']}")

    # ------------------------------------------------------------------
    # 10. Reviewer streams image bytes and validates fidelity
    # ------------------------------------------------------------------
    print("\n[10] Streaming uploaded image bytes (byte-perfect check)...")
    img_stream = rev_sess.get(
        f"{BASE_URL}/api/submissions/{submission_id}/files/{img_file_id}",
        headers=rev_headers,
    )
    assert img_stream.status_code == 200, f"Image stream failed: {img_stream.status_code}"
    assert img_stream.headers.get("content-type") == "image/png", \
        f"Expected image/png, got {img_stream.headers.get('content-type')}"
    assert img_stream.content == png_bytes, "Streamed image bytes did not match uploaded bytes!"
    print(f"   ✓ Image streamed intact: {len(img_stream.content)} bytes, content-type=image/png")

    # ------------------------------------------------------------------
    # 11. Reviewer streams PDF bytes and validates fidelity
    # ------------------------------------------------------------------
    print("\n[11] Streaming uploaded PDF bytes (byte-perfect check)...")
    pdf_stream = rev_sess.get(
        f"{BASE_URL}/api/submissions/{submission_id}/files/{pdf_file_id}",
        headers=rev_headers,
    )
    assert pdf_stream.status_code == 200, f"PDF stream failed: {pdf_stream.status_code}"
    assert pdf_stream.headers.get("content-type") == "application/pdf", \
        f"Expected application/pdf, got {pdf_stream.headers.get('content-type')}"
    assert pdf_stream.content == pdf_bytes, "Streamed PDF bytes did not match uploaded bytes!"
    print(f"   ✓ PDF streamed intact: {len(pdf_stream.content)} bytes, content-type=application/pdf")

    # ------------------------------------------------------------------
    # 12. Reviewer records APPROVED decision
    # ------------------------------------------------------------------
    print("\n[12] Reviewer recording APPROVED determination...")
    dec_payload = {
        "decision": "APPROVED",
        "notes": (
            "Clinical criteria for unstable angina met based on attached "
            "stress test and angiogram documentation. Authorized for 30-day window."
        ),
    }
    dec_resp = rev_sess.post(
        f"{BASE_URL}/api/insurance/submissions/{submission_id}/decision",
        json=dec_payload,
        headers=rev_headers,
    )
    assert dec_resp.status_code == 200, f"Decision recording failed ({dec_resp.status_code}): {dec_resp.text}"
    dec = dec_resp.json()
    assert dec["status"] == "APPROVED", f"Expected APPROVED, got {dec['status']}"
    assert dec["reviewer_id"] == rev_data["user"]["id"], "reviewer_id mismatch!"
    assert dec["reviewer_decision"] == "APPROVED"
    assert dec["reviewed_at"] is not None
    print(f"   ✓ Decision recorded: status={dec['status']}, reviewer_id={dec['reviewer_id']}, reviewed_at={dec['reviewed_at']}")

    # ------------------------------------------------------------------
    # 13. Provider sees updated status on their submission
    # ------------------------------------------------------------------
    print("\n[13] Provider confirming status update...")
    final_view = prov_sess.get(f"{BASE_URL}/api/submissions/{submission_id}", headers=prov_headers)
    assert final_view.status_code == 200
    final = final_view.json()
    assert final["status"] == "APPROVED", f"Provider sees stale status: {final['status']}"
    print(f"   ✓ Provider sees final status: {final['status']}")

    # ------------------------------------------------------------------
    # 14. Auditor: can view, cannot decide (403)
    # ------------------------------------------------------------------
    print("\n[14] Auditor RBAC check (read-only enforcement)...")
    aud_sess, _, aud_headers = login(AUDITOR_EMAIL, AUDITOR_PASSWORD)

    # Auditor CAN view insurance queue
    aud_queue = aud_sess.get(f"{BASE_URL}/api/insurance/submissions", headers=aud_headers)
    assert aud_queue.status_code == 200, f"Auditor should be able to view queue: {aud_queue.text}"

    # Auditor CAN view workspace
    aud_ws = aud_sess.get(f"{BASE_URL}/api/insurance/submissions/{submission_id}", headers=aud_headers)
    assert aud_ws.status_code == 200, f"Auditor should be able to view workspace: {aud_ws.text}"

    # Auditor CANNOT record a decision (must be 403)
    aud_dec = aud_sess.post(
        f"{BASE_URL}/api/insurance/submissions/{submission_id}/decision",
        json={"decision": "DENIED", "notes": "unauthorized test"},
        headers=aud_headers,
    )
    assert aud_dec.status_code == 403, f"Auditor should receive 403, got {aud_dec.status_code}: {aud_dec.text}"
    print("   ✓ Auditor: can view queue/workspace, correctly blocked (403) from recording decisions")

    # ------------------------------------------------------------------
    # 15. Provider cannot access insurance queue (403)
    # ------------------------------------------------------------------
    print("\n[15] Provider role cannot access insurance queue (403)...")
    prov_queue_attempt = prov_sess.get(f"{BASE_URL}/api/insurance/submissions", headers=prov_headers)
    assert prov_queue_attempt.status_code == 403, \
        f"Provider should be 403 on insurance queue, got {prov_queue_attempt.status_code}"
    print("   ✓ Provider correctly blocked from insurance queue (403)")

    # ------------------------------------------------------------------
    # Done
    # ------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("ALL PHASE 3 VERIFICATIONS PASSED ✓")
    print("=" * 70)
    print(f"\nSummary:")
    print(f"  Submission:    {submission_ref} (ID={submission_id})")
    print(f"  Provider:      {prov_data['user']['full_name']} ({PROVIDER_EMAIL})")
    print(f"  Reviewer:      {rev_data['user']['full_name']} ({REVIEWER_EMAIL})")
    print(f"  Final Status:  APPROVED")
    print(f"  Files:         2 (radiograph + clinical_report)")
    print(f"  Byte Fidelity: image/png ✓  application/pdf ✓")
    print(f"  RBAC:          Auditor read-only ✓  Provider queue-blocked ✓")


if __name__ == "__main__":
    test_full_phase3_workflow()
