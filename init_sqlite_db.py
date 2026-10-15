"""
init_sqlite_db.py — Initialize and Populate SQLite Database for Standalone ANVESH Operation
Loads all historical schema and records from the SQL dump into medauth.db,
and provisions initial demo/test users for each portal role.
"""
import json
import os
import sys
from datetime import datetime, timezone

from database import Base, SessionLocal, engine
from models import Case, CaseImage, Evidence, Policy, Review, User, UserSession, Submission, SubmissionFile
from auth import hash_password

def parse_val(val: str, col_type: str = "str"):
    if val == r"\N" or val == "":
        return None
    if col_type == "bool":
        return val in ("t", "true", "True", "1")
    if col_type == "int":
        return int(val)
    if col_type == "float":
        return float(val)
    if col_type == "json":
        try:
            return json.loads(val)
        except Exception:
            return {}
    if col_type == "dt":
        try:
            # Parse ISO or postgres timestamp format
            clean_val = val.split("+")[0].strip()
            return datetime.fromisoformat(clean_val)
        except Exception:
            return datetime.now(timezone.utc)
    return val

def init_database():
    print("[1/4] Creating all database tables via SQLAlchemy metadata...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if already populated
        existing_cases = db.query(Case).count()
        if existing_cases > 0:
            print(f"[!] Database already populated with {existing_cases} cases.")
        else:
            sql_file = os.path.join(os.path.dirname(__file__), "backups", "medauth_vlm_pre_import_20261011_174043.sql")
            if not os.path.exists(sql_file):
                print(f"[!] Backup SQL not found at {sql_file}")
                return

            print(f"[2/4] Parsing and importing SQL dump from {sql_file}...")
            with open(sql_file, "r", encoding="utf-8") as f:
                current_table = None
                table_cols = []
                
                cases_to_add = []
                images_to_add = []
                evidence_to_add = []
                policies_to_add = []
                reviews_to_add = []

                for line in f:
                    line_str = line.strip("\r\n")
                    if line_str.startswith("COPY "):
                        parts = line_str.split()
                        table_name = parts[1].replace("public.", "")
                        cols_part = line_str[line_str.find("(") + 1 : line_str.find(")")]
                        table_cols = [c.strip() for c in cols_part.split(",")]
                        current_table = table_name
                        continue
                    elif current_table and line_str == r"\.":
                        current_table = None
                        table_cols = []
                        continue
                    elif current_table:
                        fields = line_str.split("\t")
                        if current_table == "cases":
                            cases_to_add.append(Case(
                                case_id=parse_val(fields[0], "int"),
                                classification=parse_val(fields[1]),
                                indication=parse_val(fields[2]),
                                findings=parse_val(fields[3]),
                                impression=parse_val(fields[4]),
                                requested_procedure=parse_val(fields[5]),
                                has_source_text=parse_val(fields[6], "bool")
                            ))
                        elif current_table == "case_images":
                            images_to_add.append(CaseImage(
                                id=parse_val(fields[0], "int"),
                                case_id=parse_val(fields[1], "int"),
                                filename=parse_val(fields[2]),
                                projection=parse_val(fields[3]),
                                file_path=parse_val(fields[4])
                            ))
                        elif current_table == "evidence":
                            evidence_to_add.append(Evidence(
                                id=parse_val(fields[0], "int"),
                                case_id=parse_val(fields[1], "int"),
                                image_evidence=parse_val(fields[2], "json"),
                                text_image_consistency=parse_val(fields[3], "json"),
                                clinical_support=parse_val(fields[4], "json"),
                                raw_model_output=parse_val(fields[5])
                            ))
                        elif current_table == "policies":
                            policies_to_add.append(Policy(
                                plan_id=parse_val(fields[0]),
                                state=parse_val(fields[1]),
                                is_covered=parse_val(fields[2]),
                                copay=parse_val(fields[3]),
                                coinsurance=parse_val(fields[4]),
                                limit_qty=parse_val(fields[5], "float"),
                                limit_unit=parse_val(fields[6]),
                                exclusions=parse_val(fields[7])
                            ))
                        elif current_table == "reviews":
                            reviews_to_add.append(Review(
                                id=parse_val(fields[0], "int"),
                                case_id=parse_val(fields[1], "int"),
                                plan_id=parse_val(fields[2]),
                                policy_compliance=parse_val(fields[3], "json"),
                                evidence_score=parse_val(fields[4], "float"),
                                recommendation=parse_val(fields[5]),
                                reviewer_decision=parse_val(fields[6]),
                                reviewer_notes=parse_val(fields[7]),
                                created_at=parse_val(fields[8], "dt"),
                                reviewed_at=parse_val(fields[9], "dt")
                            ))

            print(f"  -> Bulk inserting {len(cases_to_add)} cases...")
            db.bulk_save_objects(cases_to_add)
            print(f"  -> Bulk inserting {len(images_to_add)} case images...")
            db.bulk_save_objects(images_to_add)
            print(f"  -> Bulk inserting {len(evidence_to_add)} evidence records...")
            db.bulk_save_objects(evidence_to_add)
            print(f"  -> Bulk inserting {len(policies_to_add)} policies...")
            db.bulk_save_objects(policies_to_add)
            print(f"  -> Bulk inserting {len(reviews_to_add)} reviews...")
            db.bulk_save_objects(reviews_to_add)
            db.commit()
            print("[+] Scientific benchmark dataset successfully imported!")

        # Provision demo accounts for testing
        print("[3/4] Provisioning user accounts for all multi-role portals...")
        demo_users = [
            {
                "email": "admin@medauth.org",
                "password": "AdminPass123!",
                "full_name": "ANVESH System Administrator",
                "role": "insurance_admin",
                "org": "ANVESH Health Authority"
            },
            {
                "email": "reviewer@insurance.com",
                "password": "ReviewerPass123!",
                "full_name": "Dr. Sarah Jenkins (Senior Reviewer)",
                "role": "insurance_reviewer",
                "org": "National Health Insurance Group"
            },
            {
                "email": "reviewer@test.com",
                "password": "ReviewerPass123!",
                "full_name": "Test Insurance Reviewer",
                "role": "insurance_reviewer",
                "org": "Apex Health Plans"
            },
            {
                "email": "provider@hospital.org",
                "password": "ProviderPass123!",
                "full_name": "Dr. Marcus Vance (Chief of Radiology)",
                "role": "provider",
                "org": "Metropolitan University Hospital"
            },
            {
                "email": "patient@example.com",
                "password": "PatientPass123!",
                "full_name": "Alex Morgan (Member)",
                "role": "patient",
                "org": "Self"
            }
        ]

        for u_data in demo_users:
            existing = db.query(User).filter(User.email == u_data["email"]).first()
            if not existing:
                u = User(
                    email=u_data["email"],
                    hashed_password=hash_password(u_data["password"]),
                    full_name=u_data["full_name"],
                    role=u_data["role"],
                    organization=u_data["org"],
                    is_active=True,
                    is_verified=True,
                )
                db.add(u)
                print(f"  [+] Created user: {u_data['email']} ({u_data['role']})")
        db.commit()

        # Print summary
        print("[4/4] Verifying database inventory counts:")
        c_count = db.query(Case).count()
        img_count = db.query(CaseImage).count()
        ev_count = db.query(Evidence).count()
        pol_count = db.query(Policy).count()
        rev_count = db.query(Review).count()
        usr_count = db.query(User).count()
        print(f"  - Cases:        {c_count}")
        print(f"  - Case Images:  {img_count}")
        print(f"  - Evidence:     {ev_count}")
        print(f"  - Policies:     {pol_count}")
        print(f"  - Reviews:      {rev_count}")
        print(f"  - Users:        {usr_count}")
        print("[SUCCESS] SQLite database setup is complete and ready.")
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
