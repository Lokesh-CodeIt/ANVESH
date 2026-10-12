import logging
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Callable, List, Optional, Set

import bcrypt
from fastapi import Cookie, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserSession

logger = logging.getLogger("medauth.auth")

# Session & Security Settings
SESSION_COOKIE_NAME = "anvesh_session"
SESSION_EXPIRY_HOURS = 12
MAX_FAILED_ATTEMPTS = 5
RATE_LIMIT_WINDOW_SECONDS = 300  # 5 minutes

VALID_ROLES: Set[str] = {
    "patient",
    "provider",
    "insurance_reviewer",
    "insurance_supervisor",
    "insurance_admin",
    "auditor",
}

# Roles that can access research prior-authorization case data
RESEARCH_REVIEW_ROLES: Set[str] = {
    "insurance_reviewer",
    "insurance_supervisor",
    "insurance_admin",
    "auditor",
}

# Roles permitted to mutate reviews or record authorization decisions (auditor is excluded)
REVIEW_MUTATION_ROLES: Set[str] = {
    "insurance_reviewer",
    "insurance_supervisor",
    "insurance_admin",
}


# ---------------------------------------------------------------------------
# Rate Limiting & Brute-Force Protection
# ---------------------------------------------------------------------------
class InMemoryRateLimiter:
    """Tracks failed authentication attempts by key (IP or email) within a sliding window."""

    def __init__(self, max_attempts: int = MAX_FAILED_ATTEMPTS, window_seconds: int = RATE_LIMIT_WINDOW_SECONDS):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: defaultdict = defaultdict(deque)

    def is_rate_limited(self, key: str) -> bool:
        now = time.time()
        q = self._attempts[key]
        # Purge timestamps outside the sliding window
        while q and (now - q[0]) > self.window_seconds:
            q.popleft()
        return len(q) >= self.max_attempts

    def record_failure(self, key: str) -> None:
        now = time.time()
        self._attempts[key].append(now)

    def record_success(self, key: str) -> None:
        # Clear failures upon successful authentication
        if key in self._attempts:
            self._attempts[key].clear()


rate_limiter = InMemoryRateLimiter()


# ---------------------------------------------------------------------------
# Password Management (bcrypt)
# ---------------------------------------------------------------------------
def hash_password(plain_password: str) -> str:
    """Hash plaintext password using bcrypt with salt rounds 12."""
    if len(plain_password) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against bcrypt hash. Safe against timing attacks."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Session Token & Database Management
# ---------------------------------------------------------------------------
def create_session(
    db: Session,
    user_id: int,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    duration_hours: int = SESSION_EXPIRY_HOURS,
) -> UserSession:
    """Generate a secure cryptographic session token and persist to database."""
    token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=duration_hours)

    session = UserSession(
        session_token=token,
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent[:255] if user_agent else None,
        expires_at=expires_at,
        is_revoked=False,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def revoke_session(db: Session, session_token: str) -> bool:
    """Revoke a session in the database."""
    session = (
        db.query(UserSession)
        .filter(UserSession.session_token == session_token, UserSession.is_revoked == False)
        .first()
    )
    if session:
        session.is_revoked = True
        db.commit()
        return True
    return False


def set_session_cookie(response: Response, session_token: str, max_age_seconds: int = SESSION_EXPIRY_HOURS * 3600):
    """Set HttpOnly, SameSite=Lax session cookie."""
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        max_age=max_age_seconds,
        expires=max_age_seconds,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production behind HTTPS
        path="/",
    )


def clear_session_cookie(response: Response):
    """Clear session cookie on logout."""
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
    )


# ---------------------------------------------------------------------------
# FastAPI Auth Dependencies
# ---------------------------------------------------------------------------
def extract_session_token(
    request: Request,
    authorization: Optional[str] = Header(None),
) -> Optional[str]:
    """
    Extract session token from HttpOnly cookie first, or Bearer header fallback.
    Never logs or exposes the raw token.
    """
    # 1. Primary: Explicit Bearer authorization header (API clients / integration tests)
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]

    # 2. Secondary: HttpOnly session cookie
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        return token

    return None


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
) -> User:
    """
    Validate session token and return the authenticated User.
    Raises 401 if unauthenticated or session invalid/expired.
    Raises 403 if account is inactive.
    """
    token = extract_session_token(request, authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Query active, non-revoked session
    user_session = (
        db.query(UserSession)
        .filter(
            UserSession.session_token == token,
            UserSession.is_revoked == False,
        )
        .first()
    )

    if not user_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or was revoked. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check expiration
    now_utc = datetime.now(timezone.utc)
    if user_session.expires_at.tzinfo is None:
        user_session_exp = user_session.expires_at.replace(tzinfo=timezone.utc)
    else:
        user_session_exp = user_session.expires_at

    if user_session_exp < now_utc:
        # Invalidate expired session in DB
        user_session.is_revoked = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = user_session.user
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with this session no longer exists.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended or deactivated. Contact administrator.",
        )

    return user


def require_roles(*allowed_roles: str) -> Callable:
    """
    FastAPI dependency factory enforcing server-side role-based authorization.
    Rejects any caller without one of the explicitly allowed roles with 403.
    """
    def role_dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            logger.warning(
                "Access denied for user_id=%d with role '%s' to endpoint requiring %s",
                user.id,
                user.role,
                allowed_roles,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: role '{user.role}' lacks sufficient privileges for this resource.",
            )
        return user

    return role_dependency
