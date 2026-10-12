"""
provision_admin.py — Secure Initial Administrator & Operator Account Provisioning CLI

Provides a secure operator-controlled mechanism to provision administrator, supervisor,
reviewer, and provider accounts.
- Enforces bcrypt hashing
- Never sets silent default credentials
- Validates password length (>= 8 characters)
- Safe to re-run to update existing operator accounts or roles
"""

import argparse
import getpass
import sys

from database import get_db_context
from models import User
from auth import hash_password, VALID_ROLES


def provision_user(email: str, password: str, full_name: str, role: str, organization: str = None) -> User:
    email = email.strip().lower()
    full_name = full_name.strip()
    role = role.strip().lower()

    if not email or "@" not in email:
        raise ValueError("A valid email address is required.")

    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")

    if role not in VALID_ROLES:
        raise ValueError(f"Invalid role '{role}'. Allowed roles: {', '.join(sorted(VALID_ROLES))}")

    hashed = hash_password(password)

    with get_db_context() as db:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.hashed_password = hashed
            user.full_name = full_name
            user.role = role
            user.organization = organization
            user.is_active = True
            user.is_verified = True
            action = "UPDATED"
        else:
            user = User(
                email=email,
                hashed_password=hashed,
                full_name=full_name,
                role=role,
                organization=organization,
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            action = "CREATED"

    print(f"[PROVISION SUCCESS] User '{email}' {action} successfully with role '{role}'.")
    return user


def main():
    parser = argparse.ArgumentParser(description="Provision an ANVESH Administrator or Staff Account")
    parser.add_argument("--email", type=str, help="Operator email address")
    parser.add_argument("--password", type=str, help="Operator password (min 8 chars)")
    parser.add_argument("--full-name", type=str, default="System Administrator", help="Full name")
    parser.add_argument(
        "--role",
        type=str,
        default="insurance_admin",
        choices=sorted(list(VALID_ROLES)),
        help="System role for this account",
    )
    parser.add_argument(
        "--org",
        type=str,
        default="ANVESH Healthcare Administration",
        help="Organization or Department",
    )

    args = parser.parse_args()

    email = args.email
    if not email:
        email = input("Enter operator email: ").strip()

    password = args.password
    if not password:
        password = getpass.getpass("Enter operator password (min 8 chars): ")
        password_confirm = getpass.getpass("Confirm operator password: ")
        if password != password_confirm:
            print("Error: Passwords do not match.", file=sys.stderr)
            sys.exit(1)

    try:
        provision_user(
            email=email,
            password=password,
            full_name=args.full_name,
            role=args.role,
            organization=args.org,
        )
    except Exception as exc:
        print(f"Error provisioning user: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
