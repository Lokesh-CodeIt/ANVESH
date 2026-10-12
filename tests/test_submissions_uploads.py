import io
import os
import shutil
import tempfile
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles

from database import Base, get_db
from models import Case, Policy, Review, User, UserSession, Submission, SubmissionFile
from auth import hash_password, rate_limiter
from storage import UPLOAD_BASE_DIR
from main import app

# Enable PostgreSQL JSONB type compatibility on in-memory SQLite test database
@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "TEXT"

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # Seed isolated test users
    users = [
        User(
            id=101,
            email="provider1@test.com",
            hashed_password=hash_password("ProviderPass1!"),
            full_name="Dr. First Provider",
            role="provider",
            organization="St. Jude Medical Center",
            is_active=True,
            is_verified=True,
        ),
        User(
            id=102,
            email="provider2@test.com",
            hashed_password=hash_password("ProviderPass2!"),
            full_name="Dr. Second Provider",
            role="provider",
            organization="Metro Community Hospital",
            is_active=True,
            is_verified=True,
        ),
        User(
            id=103,
            email="reviewer@test.com",
            hashed_password=hash_password("ReviewerPass1!"),
            full_name="Dr. Insurance Reviewer",
            role="insurance_reviewer",
            organization="Apex Health Insurance",
            is_active=True,
            is_verified=True,
        ),
        User(
            id=104,
            email="auditor@test.com",
            hashed_password=hash_password("AuditorPass1!"),
            full_name="State Regulatory Auditor",
            role="auditor",
            organization="Office of Inspector General",
            is_active=True,
            is_verified=True,
        ),
        User(
            id=105,
            email="patient1@test.com",
            hashed_password=hash_password("PatientPass1!"),
            full_name="John Doe",
            role="patient",
            organization="Self-Enrolled",
            is_active=True,
            is_verified=True,
        ),
        User(
            id=106,
            email="patient2@test.com",
            hashed_password=hash_password("PatientPass2!"),
            full_name="Jane Smith",
            role="patient",
            organization="Self-Enrolled",
            is_active=True,
            is_verified=True,
        ),
    ]
    db.add_all(users)

    # Seed an isolated historical research case
    historical_case = Case(
        case_id=1,
        classification="abnormal",
        indication="Historical research case",
        requested_procedure="Chest Radiography",
        has_source_text=True,
    )
    db.add(historical_case)

    # Seed a policy
    test_policy = Policy(
        plan_id="COMMERCIAL_STANDARD",
        state="CA",
        is_covered="Covered",
        copay="$25",
        coinsurance="10%",
    )
    db.add(test_policy)

    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def login(client, email, password):
    client.cookies.clear()
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def get_error_msg(res):
    data = res.json()
    if isinstance(data, dict):
        if "detail" in data:
            detail = data["detail"]
            if isinstance(detail, dict) and "message" in detail:
                return detail["message"]
            return str(detail)
        if "message" in data:
            return data["message"]
    return str(data)


# ---------------------------------------------------------------------------
# Test Cases
# ---------------------------------------------------------------------------

def test_provider_create_submission(client):
    headers = login(client, "provider1@test.com", "ProviderPass1!")
    payload = {
        "member_id": "MEM-100293",
        "patient_name": "Eleanor Vance",
        "payer_plan_id": "COMMERCIAL_STANDARD",
        "service_type": "Chest Radiography (PA & Lateral)",
        "cpt_code": "71046",
        "clinical_indication": "Persistent cough, hemoptysis, and shortness of breath for 3 weeks.",
        "prelim_findings": "Right lower lobe opacity noted on initial examination.",
    }
    res = client.post("/api/submissions", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["submission_ref"].startswith("AUTH-")
    assert data["member_id"] == "MEM-100293"
    assert data["patient_name"] == "Eleanor Vance"
    assert data["status"] == "SUBMITTED"
    assert data["provider_id"] == 101
    assert data["files"] == []


def test_unauthorized_role_cannot_create_submission(client):
    headers = login(client, "patient1@test.com", "PatientPass1!")
    payload = {
        "member_id": "MEM-9999",
        "patient_name": "Should Fail",
        "payer_plan_id": "COMMERCIAL_STANDARD",
        "service_type": "MRI Brain",
        "clinical_indication": "Headache",
    }
    res = client.post("/api/submissions", json=payload, headers=headers)
    assert res.status_code == 403


def test_file_upload_png_and_pdf(client):
    headers = login(client, "provider1@test.com", "ProviderPass1!")
    # Create submission
    sub_res = client.post("/api/submissions", json={
        "member_id": "MEM-2004",
        "patient_name": "Arthur Pendelton",
        "payer_plan_id": "COMMERCIAL_STANDARD",
        "service_type": "Chest X-Ray",
        "clinical_indication": "Dyspnea on exertion",
    }, headers=headers)
    assert sub_res.status_code == 200
    sub_id = sub_res.json()["id"]

    # Valid PNG bytes: signature \x89PNG\r\n\x1a\n + mock IHDR chunk
    valid_png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x10\x00\x00\x00\x10\x08\x06\x00\x00\x00"
    upload_res = client.post(
        f"/api/submissions/{sub_id}/files",
        files={"file": ("chest_pa.png", valid_png_bytes, "image/png")},
        data={"file_category": "radiograph"},
        headers=headers,
    )
    assert upload_res.status_code == 200, upload_res.text
    file_data = upload_res.json()
    assert file_data["original_filename"] == "chest_pa.png"
    assert file_data["file_category"] == "radiograph"
    assert file_data["mime_type"] == "image/png"
    assert file_data["file_size_bytes"] == len(valid_png_bytes)
    assert file_data["download_url"] == f"/api/submissions/{sub_id}/files/{file_data['id']}"

    # Valid PDF bytes: signature %PDF-1.4 + mock content
    valid_pdf_bytes = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    upload_pdf_res = client.post(
        f"/api/submissions/{sub_id}/files",
        files={"file": ("clinical_history.pdf", valid_pdf_bytes, "application/pdf")},
        data={"file_category": "clinical_report"},
        headers=headers,
    )
    assert upload_pdf_res.status_code == 200, upload_pdf_res.text
    pdf_file_data = upload_pdf_res.json()
    assert pdf_file_data["original_filename"] == "clinical_history.pdf"
    assert pdf_file_data["file_category"] == "clinical_report"
    assert pdf_file_data["mime_type"] == "application/pdf"


def test_invalid_magic_bytes_rejected(client):
    headers = login(client, "provider1@test.com", "ProviderPass1!")
    sub_res = client.post("/api/submissions", json={
        "member_id": "MEM-2005",
        "patient_name": "Test Spoof",
        "payer_plan_id": "COMMERCIAL_STANDARD",
        "service_type": "Chest X-Ray",
        "clinical_indication": "Testing spoofing",
    }, headers=headers)
    sub_id = sub_res.json()["id"]

    # File named .png but containing ASCII text
    fake_png_bytes = b"Hello world, I am not a real PNG image!"
    res = client.post(
        f"/api/submissions/{sub_id}/files",
        files={"file": ("fake_image.png", fake_png_bytes, "image/png")},
        headers=headers,
    )
    assert res.status_code == 400
    assert "magic signature" in get_error_msg(res).lower()


def test_invalid_extension_rejected(client):
    headers = login(client, "provider1@test.com", "ProviderPass1!")
    sub_res = client.post("/api/submissions", json={
        "member_id": "MEM-2006",
        "patient_name": "Test Extension",
        "payer_plan_id": "COMMERCIAL_STANDARD",
        "service_type": "Chest X-Ray",
        "clinical_indication": "Testing disallowed extension",
    }, headers=headers)
    sub_id = sub_res.json()["id"]

    res = client.post(
        f"/api/submissions/{sub_id}/files",
        files={"file": ("malicious_script.sh", b"echo 'bad'", "application/x-sh")},
        headers=headers,
    )
    assert res.status_code == 400
    assert "not supported" in get_error_msg(res).lower()



def test_provider_organization_isolation(client):
    headers_p1 = login(client, "provider1@test.com", "ProviderPass1!")
    headers_p2 = login(client, "provider2@test.com", "ProviderPass2!")

    # Provider 1 creates submission
    sub_res = client.post("/api/submissions", json={
        "member_id": "MEM-2007",
        "patient_name": "Private Patient",
        "payer_plan_id": "COMMERCIAL_STANDARD",
        "service_type": "Chest X-Ray",
        "clinical_indication": "Private notes",
    }, headers=headers_p1)
    sub_id = sub_res.json()["id"]

    # Provider 2 cannot access Provider 1's submission
    get_res = client.get(f"/api/submissions/{sub_id}", headers=headers_p2)
    assert get_res.status_code == 403

    # Provider 2 cannot upload to Provider 1's submission
    upload_res = client.post(
        f"/api/submissions/{sub_id}/files",
        files={"file": ("test.png", b"\x89PNG\r\n\x1a\n\x00\x00", "image/png")},
        headers=headers_p2,
    )
    assert upload_res.status_code == 403


def test_unauthorized_patient_access_restriction(client):
    headers_p1 = login(client, "provider1@test.com", "ProviderPass1!")
    headers_pt = login(client, "patient1@test.com", "PatientPass1!")

    # Provider creates submission for different patient
    sub_res = client.post("/api/submissions", json={
        "member_id": "MEM-9999",
        "patient_name": "Different Person",
        "payer_plan_id": "COMMERCIAL_STANDARD",
        "service_type": "Chest X-Ray",
        "clinical_indication": "Sensitive data",
    }, headers=headers_p1)
    sub_id = sub_res.json()["id"]

    # Patient1 cannot access this unlinked submission
    get_res = client.get(f"/api/submissions/{sub_id}", headers=headers_pt)
    assert get_res.status_code == 403


def test_file_retrieval_streams_exact_bytes(client):
    headers_p1 = login(client, "provider1@test.com", "ProviderPass1!")
    headers_rev = login(client, "reviewer@test.com", "ReviewerPass1!")

    sub_res = client.post("/api/submissions", json={
        "member_id": "MEM-3001",
        "patient_name": "Radiograph Case",
        "payer_plan_id": "COMMERCIAL_STANDARD",
        "service_type": "Chest Radiography",
        "clinical_indication": "Verify byte streaming",
    }, headers=headers_p1)
    sub_id = sub_res.json()["id"]

    original_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"A" * 120
    upload_res = client.post(
        f"/api/submissions/{sub_id}/files",
        files={"file": ("authentic_film.png", original_bytes, "image/png")},
        headers=headers_p1,
    )
    assert upload_res.status_code == 200
    file_id = upload_res.json()["id"]

    # Reviewer retrieves file bytes
    get_res = client.get(f"/api/submissions/{sub_id}/files/{file_id}", headers=headers_rev)
    assert get_res.status_code == 200
    assert get_res.content == original_bytes, "Downloaded bytes do not match uploaded image bytes!"
    assert get_res.headers["content-type"] == "image/png"


def test_insurance_queue_and_reviewer_decision(client):
    headers_p1 = login(client, "provider1@test.com", "ProviderPass1!")
    headers_rev = login(client, "reviewer@test.com", "ReviewerPass1!")
    headers_aud = login(client, "auditor@test.com", "AuditorPass1!")

    # Provider submits request
    sub_res = client.post("/api/submissions", json={
        "member_id": "MEM-4001",
        "patient_name": "Clinical Adjudication",
        "payer_plan_id": "COMMERCIAL_STANDARD",
        "service_type": "Chest Radiography",
        "clinical_indication": "Adjudication workflow test",
    }, headers=headers_p1)
    sub_id = sub_res.json()["id"]

    # Reviewer lists queue
    queue_res = client.get("/api/insurance/submissions", headers=headers_rev)
    assert queue_res.status_code == 200
    queue = queue_res.json()
    assert any(s["id"] == sub_id for s in queue)

    # Reviewer inspects workspace
    detail_res = client.get(f"/api/insurance/submissions/{sub_id}", headers=headers_rev)
    assert detail_res.status_code == 200
    assert detail_res.json()["status"] == "SUBMITTED"

    # Auditor attempts to mutate / record decision -> must be HTTP 403 Forbidden!
    aud_res = client.post(f"/api/insurance/submissions/{sub_id}/decision", json={
        "decision": "APPROVED",
        "notes": "Auditor attempting illegal mutation",
    }, headers=headers_aud)
    assert aud_res.status_code == 403
    assert "read-only" in get_error_msg(aud_res).lower()

    # Authorized reviewer records approval
    dec_res = client.post(f"/api/insurance/submissions/{sub_id}/decision", json={
        "decision": "APPROVED",
        "notes": "Clinical criteria satisfied according to policy guidelines.",
    }, headers=headers_rev)
    assert dec_res.status_code == 200
    dec_data = dec_res.json()
    assert dec_data["status"] == "APPROVED"
    assert dec_data["reviewer_id"] == 103
    assert dec_data["reviewer_decision"] == "APPROVED"

    # Further file uploads to an approved/finalized submission must be rejected
    further_upload = client.post(
        f"/api/submissions/{sub_id}/files",
        files={"file": ("late_film.png", b"\x89PNG\r\n\x1a\n\x00\x00", "image/png")},
        headers=headers_p1,
    )
    assert further_upload.status_code == 400


def test_file_deletion_and_cleanup(client):
    headers_p1 = login(client, "provider1@test.com", "ProviderPass1!")
    sub_res = client.post("/api/submissions", json={
        "member_id": "MEM-5001",
        "patient_name": "File Removal Test",
        "payer_plan_id": "COMMERCIAL_STANDARD",
        "service_type": "Chest Radiography",
        "clinical_indication": "Delete file test",
    }, headers=headers_p1)
    sub_id = sub_res.json()["id"]

    upload_res = client.post(
        f"/api/submissions/{sub_id}/files",
        files={"file": ("to_remove.png", b"\x89PNG\r\n\x1a\n\x00\x00\x00", "image/png")},
        headers=headers_p1,
    )
    assert upload_res.status_code == 200
    file_id = upload_res.json()["id"]

    # Provider deletes file before submission finalization
    del_res = client.delete(f"/api/submissions/{sub_id}/files/{file_id}", headers=headers_p1)
    assert del_res.status_code == 200

    # Ensure file record is gone from list
    list_res = client.get(f"/api/submissions/{sub_id}/files", headers=headers_p1)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 0
