import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from models import Case, Policy, Review, User, UserSession
from auth import hash_password, verify_password, rate_limiter
from main import app
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles

# Enable PostgreSQL JSONB type compatibility on in-memory SQLite test database
@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "TEXT"

# ---------------------------------------------------------------------------
# Isolated In-Memory SQLite Test Database Fixture
# Guarantees tests NEVER touch the live PostgreSQL database!
# ---------------------------------------------------------------------------
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
            email="reviewer@test.com",
            hashed_password=hash_password("ReviewerPass123!"),
            full_name="Dr. Test Reviewer",
            role="insurance_reviewer",
            organization="Test Insurance",
            is_active=True,
            is_verified=True,
        ),
        User(
            email="auditor@test.com",
            hashed_password=hash_password("AuditorPass123!"),
            full_name="Test Auditor",
            role="auditor",
            organization="Audit Commission",
            is_active=True,
            is_verified=True,
        ),
        User(
            email="patient@test.com",
            hashed_password=hash_password("PatientPass123!"),
            full_name="Test Patient",
            role="patient",
            organization="Self-Enrolled",
            is_active=True,
            is_verified=True,
        ),
        User(
            email="provider@test.com",
            hashed_password=hash_password("ProviderPass123!"),
            full_name="Dr. Test Provider",
            role="provider",
            organization="Test Hospital",
            is_active=True,
            is_verified=True,
        ),
        User(
            email="admin@test.com",
            hashed_password=hash_password("AdminPass123!"),
            full_name="Test Administrator",
            role="insurance_admin",
            organization="ANVESH Ops",
            is_active=True,
            is_verified=True,
        ),
    ]
    db.add_all(users)

    # Seed isolated test clinical cases
    test_case = Case(
        case_id=9001,
        classification="abnormal",
        indication="Cough and hemoptysis",
        findings="Right lower lobe consolidation",
        impression="Pneumonia vs neoplasm",
        requested_procedure="CT Thorax",
        has_source_text=True,
    )
    db.add(test_case)

    # Seed isolated test policy
    test_policy = Policy(
        plan_id="TEST-POLICY-01",
        state="AK",
        is_covered="Covered",
        copay="$30",
        coinsurance="15%",
    )
    db.add(test_policy)

    # Seed isolated test review
    test_review = Review(
        id=1,
        case_id=9001,
        plan_id="TEST-POLICY-01",
        policy_compliance={"test": True},
        evidence_score=0.85,
        recommendation="AUTHORIZE",
        created_at=datetime.now(timezone.utc),
    )
    db.add(test_review)

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


# ---------------------------------------------------------------------------
# Test Cases
# ---------------------------------------------------------------------------

def test_password_hashing_security():
    """Verify passwords are encrypted with bcrypt and plaintext cannot be matched directly."""
    plain = "SuperSecretPassword123!"
    hashed = hash_password(plain)

    assert hashed != plain
    assert hashed.startswith("$2b$")
    assert verify_password(plain, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "reviewer@test.com").first()
    assert user.hashed_password.startswith("$2b$")
    assert "ReviewerPass123!" not in user.hashed_password
    db.close()


def test_login_success(client):
    """Verify valid login returns 200, user metadata, token, and session cookie."""
    res = client.post(
        "/api/auth/login",
        json={"email": "reviewer@test.com", "password": "ReviewerPass123!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["user"]["email"] == "reviewer@test.com"
    assert data["user"]["role"] == "insurance_reviewer"
    assert "anvesh_session" in res.cookies


def test_login_invalid_credentials(client):
    """Verify invalid password returns 401 with generic message to prevent account enumeration."""
    res = client.post(
        "/api/auth/login",
        json={"email": "reviewer@test.com", "password": "IncorrectPassword!"},
    )
    assert res.status_code == 401
    data = res.json()
    msg = data.get("message") or (data.get("detail", {}).get("message") if isinstance(data.get("detail"), dict) else data.get("detail"))
    assert "Invalid email or password" in msg


def test_unauthenticated_request_rejected(client):
    """Verify direct API request without session cookie or bearer token is rejected with 401."""
    res = client.get("/api/cases")
    assert res.status_code == 401


def test_patient_access_to_cases_denied(client):
    """Verify patient role receives 403 Forbidden when attempting to view research cohort cases."""
    login_res = client.post(
        "/api/auth/login",
        json={"email": "patient@test.com", "password": "PatientPass123!"},
    )
    token = login_res.json()["token"]

    res = client.get("/api/cases", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    data = res.json()
    msg = data.get("message") or (data.get("detail", {}).get("message") if isinstance(data.get("detail"), dict) else data.get("detail"))
    assert "not authorized to access historical research cases" in msg


def test_provider_access_to_cases_denied(client):
    """Verify provider role receives 403 Forbidden when attempting to view research cases."""
    login_res = client.post(
        "/api/auth/login",
        json={"email": "provider@test.com", "password": "ProviderPass123!"},
    )
    token = login_res.json()["token"]

    res = client.get("/api/cases", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


def test_reviewer_access_to_cases_permitted(client):
    """Verify insurance_reviewer role can access cases."""
    login_res = client.post(
        "/api/auth/login",
        json={"email": "reviewer@test.com", "password": "ReviewerPass123!"},
    )
    token = login_res.json()["token"]

    res = client.get("/api/cases", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    cases = res.json()
    assert len(cases) >= 1
    assert cases[0]["case_id"] == 9001


def test_auditor_cannot_mutate_decisions(client):
    """Verify auditor role receives 403 when trying to record decisions (read-only constraint)."""
    login_res = client.post(
        "/api/auth/login",
        json={"email": "auditor@test.com", "password": "AuditorPass123!"},
    )
    token = login_res.json()["token"]

    res = client.post(
        "/reviews/1/decision",
        json={"reviewer_decision": "Approved", "reviewer_notes": "Auditor attempt"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403
    data = res.json()
    msg = data.get("message") or (data.get("detail", {}).get("message") if isinstance(data.get("detail"), dict) else data.get("detail"))
    assert "read-only access" in msg


def test_reviewer_can_record_decision(client):
    """Verify authorized reviewer can record determination."""
    login_res = client.post(
        "/api/auth/login",
        json={"email": "reviewer@test.com", "password": "ReviewerPass123!"},
    )
    token = login_res.json()["token"]

    res = client.post(
        "/reviews/1/decision",
        json={"reviewer_decision": "Approved", "reviewer_notes": "Clinically indicated by CT Thorax"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["reviewer_decision"] == "Approved"


def test_logout_revokes_session(client):
    """Verify logout revokes session and subsequent requests with the token fail with 401."""
    login_res = client.post(
        "/api/auth/login",
        json={"email": "admin@test.com", "password": "AdminPass123!"},
    )
    token = login_res.json()["token"]

    # Verify session is active
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200

    # Logout
    logout_res = client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logout_res.status_code == 200

    # Verify session is invalidated
    me_after = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_after.status_code == 401


def test_patient_self_registration(client):
    """Verify self-service registration for patient role."""
    res = client.post(
        "/api/auth/register/patient",
        json={
            "email": "new.member@example.com",
            "password": "StrongMemberPassword2026!",
            "full_name": "Clara Oswald",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "new.member@example.com"
    assert data["role"] == "patient"

    # Verify the new user can login
    login_res = client.post(
        "/api/auth/login",
        json={"email": "new.member@example.com", "password": "StrongMemberPassword2026!"},
    )
    assert login_res.status_code == 200
