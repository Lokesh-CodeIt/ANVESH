import os
import sys
from database import SessionLocal
from models import Case, Policy
from policy_engine import compare_evidence_to_policy

def main():
    if os.getenv("RUN_LIVE_DB_TESTS") != "1":
        print("Safety Notice: test_no_source.py connects to live PostgreSQL database. Set RUN_LIVE_DB_TESTS=1 to run.")
        sys.exit(0)
    db = SessionLocal()

    policy = db.query(Policy).first()
    print("=" * 60)
    print(f"EVALUATING NO-SOURCE-TEXT CASES AGAINST PLAN: {policy.plan_id}")
    print("=" * 60)

    for cid in [1615, 3782]:
        case = db.query(Case).filter(Case.case_id == cid).first()
        print(f"\n--- CASE {cid} ---")
        print(f"Classification : {case.classification}")
        print(f"Has Source Text: {case.has_source_text}")
        print(f"Findings       : {repr(case.findings)}")
        print(f"Impression     : {repr(case.impression)}")

        result = compare_evidence_to_policy(
            evidence=case.evidence,
            policy=policy,
            has_source_text=case.has_source_text
        )

        print(f"Evidence Score : {result['evidence_score']} (Capped at <= 40)")
        print(f"Recommendation : {result['recommendation']}")
        print("Checklist:")
        for item in result["policy_requirements_checklist"]:
            print(f"  * [{item['status']}] {item['requirement']}: {item['detail']}")

    db.close()

if __name__ == "__main__":
    main()
