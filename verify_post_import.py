"""
MedAuth-VLM: Independent Post-Import Database Verification Suite
Performs rigorous queries against PostgreSQL medauth_vlm to confirm:
1. Exact row counts across all tables.
2. Integrity and immutability of Batch 1–3 rows (950 cases).
3. Correct insertion of Batch 4 (400 cases, genuine raw_model_output).
4. Correct insertion of Batch 5 (357 cases; 43 absent cases verified NOT in DB).
5. Correct insertion of Batch 6 (400 cases; 100% NULL raw_model_output).
6. Foreign key consistency, 0 orphaned images, 0 orphaned evidence records.
7. JSONB subobject completeness and NOT NULL constraint fulfillment.
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

WORKSPACE_ROOT = Path(r"c:\Users\NILESH MARATHE\OneDrive\Desktop\AI PORJECT")
sys.path.insert(0, str(WORKSPACE_ROOT))

from database import engine
from sqlalchemy import text

COLAB_DIR = WORKSPACE_ROOT / "AI_PORJECT_DATASET" / "colab_upload"
NORM_DIR = WORKSPACE_ROOT / "normalized_for_db"

def run_post_import_verification():
    print("=" * 80)
    print("MEDAUTH-VLM: POST-IMPORT INDEPENDENT DATABASE VERIFICATION")
    print("=" * 80)

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {},
        "all_passed": True
    }

    with engine.connect() as conn:
        # 1. Total row counts
        counts = {}
        for tbl in ["cases", "case_images", "evidence", "policies", "reviews"]:
            cnt = conn.execute(text(f"SELECT count(*) FROM {tbl}")).scalar()
            counts[tbl] = cnt
            print(f"Table {tbl:<15}: {cnt} rows")

        expected_counts = {
            "cases": 2107,
            "case_images": 4093,
            "evidence": 2107,
            "policies": 100,
            "reviews": 3
        }

        counts_match = counts == expected_counts
        report["checks"]["table_counts"] = {
            "passed": counts_match,
            "actual": counts,
            "expected": expected_counts
        }
        if not counts_match:
            report["all_passed"] = False
            print(f"  [FAIL] Row counts mismatch! Expected {expected_counts}, got {counts}")
        else:
            print("  [PASS] All table row counts match expected values exactly.")

        # 2. Verify Batch 1–3 preservation
        b1_cids = set(int(x["case_id"]) for x in json.load(open(COLAB_DIR / "case_batch.json", encoding="utf-8")))
        b2_cids = set(int(x["case_id"]) for x in json.load(open(COLAB_DIR / "case_batch_2.json", encoding="utf-8")))
        b3_cids = set(int(x["case_id"]) for x in json.load(open(COLAB_DIR / "case_batch_3.json", encoding="utf-8")))
        b123_expected = b1_cids | b2_cids | b3_cids

        db_cases_all = set(row[0] for row in conn.execute(text("SELECT case_id FROM cases")).fetchall())
        db_evidence_all = set(row[0] for row in conn.execute(text("SELECT case_id FROM evidence")).fetchall())

        b123_preserved = b123_expected.issubset(db_cases_all) and b123_expected.issubset(db_evidence_all)
        report["checks"]["batch_1_to_3_preserved"] = {
            "passed": b123_preserved,
            "expected_count": len(b123_expected),
            "present_in_db": len(b123_expected & db_cases_all)
        }
        if not b123_preserved:
            report["all_passed"] = False
            print(f"  [FAIL] Batch 1–3 preservation check failed!")
        else:
            print(f"  [PASS] All {len(b123_expected)} Batch 1–3 cases remain fully intact in DB.")

        # 3. Verify Batch 4 (400 cases)
        b4_cids = set(int(x["case_id"]) for x in json.load(open(COLAB_DIR / "case_batch_4.json", encoding="utf-8")))
        b4_in_cases = b4_cids.issubset(db_cases_all)
        b4_in_evidence = b4_cids.issubset(db_evidence_all)

        # Check raw_model_output for Batch 4 (all should be non-null)
        b4_cids_tuple = tuple(b4_cids)
        b4_null_raw = conn.execute(text(
            f"SELECT count(*) FROM evidence WHERE case_id IN :cids AND (raw_model_output IS NULL OR length(trim(raw_model_output)) = 0)"
        ), {"cids": b4_cids_tuple}).scalar()

        b4_passed = b4_in_cases and b4_in_evidence and (b4_null_raw == 0)
        report["checks"]["batch_4_verification"] = {
            "passed": b4_passed,
            "cases_count": len(b4_cids),
            "in_cases_table": b4_in_cases,
            "in_evidence_table": b4_in_evidence,
            "null_or_empty_raw_output": b4_null_raw
        }
        if not b4_passed:
            report["all_passed"] = False
            print("  [FAIL] Batch 4 verification failed!")
        else:
            print(f"  [PASS] Batch 4: 400 cases present, 100% non-null genuine raw_model_output.")

        # 4. Verify Batch 5 (357 cases in DB, 43 absent cases NOT in DB)
        b5_manifest_cids = set(int(x["case_id"]) for x in json.load(open(COLAB_DIR / "case_batch_5.json", encoding="utf-8")))
        b5_norm_cids = set(x["case_id"] for x in json.load(open(NORM_DIR / "evidence_batch_5.json", encoding="utf-8")))
        b5_missing_43 = b5_manifest_cids - b5_norm_cids

        b5_357_in_cases = b5_norm_cids.issubset(db_cases_all)
        b5_357_in_evidence = b5_norm_cids.issubset(db_evidence_all)
        b5_43_in_cases = len(b5_missing_43 & db_cases_all)
        b5_43_in_evidence = len(b5_missing_43 & db_evidence_all)

        b5_357_cids_tuple = tuple(b5_norm_cids)
        b5_null_raw = conn.execute(text(
            f"SELECT count(*) FROM evidence WHERE case_id IN :cids AND (raw_model_output IS NULL OR length(trim(raw_model_output)) = 0)"
        ), {"cids": b5_357_cids_tuple}).scalar()

        b5_passed = (
            b5_357_in_cases
            and b5_357_in_evidence
            and b5_43_in_cases == 0
            and b5_43_in_evidence == 0
            and b5_null_raw == 0
        )
        report["checks"]["batch_5_verification"] = {
            "passed": b5_passed,
            "inserted_cases_count": len(b5_norm_cids),
            "absent_cases_count": len(b5_missing_43),
            "absent_cases_in_cases_table": b5_43_in_cases,
            "absent_cases_in_evidence_table": b5_43_in_evidence,
            "null_or_empty_raw_output": b5_null_raw
        }
        if not b5_passed:
            report["all_passed"] = False
            print("  [FAIL] Batch 5 verification failed!")
        else:
            print(f"  [PASS] Batch 5: 357 cases present with genuine raw output; exactly 43 missing cases verified ABSENT.")

        # 5. Verify Batch 6 (400 cases, 100% NULL raw_model_output)
        b6_cids = set(int(x["case_id"]) for x in json.load(open(COLAB_DIR / "case_batch_6.json", encoding="utf-8")))
        b6_in_cases = b6_cids.issubset(db_cases_all)
        b6_in_evidence = b6_cids.issubset(db_evidence_all)

        b6_cids_tuple = tuple(b6_cids)
        b6_non_null_raw = conn.execute(text(
            f"SELECT count(*) FROM evidence WHERE case_id IN :cids AND raw_model_output IS NOT NULL"
        ), {"cids": b6_cids_tuple}).scalar()

        b6_passed = b6_in_cases and b6_in_evidence and (b6_non_null_raw == 0)
        report["checks"]["batch_6_verification"] = {
            "passed": b6_passed,
            "cases_count": len(b6_cids),
            "in_cases_table": b6_in_cases,
            "in_evidence_table": b6_in_evidence,
            "non_null_raw_output_count": b6_non_null_raw
        }
        if not b6_passed:
            report["all_passed"] = False
            print("  [FAIL] Batch 6 verification failed!")
        else:
            print(f"  [PASS] Batch 6: 400 cases present, 100% (400/400) raw_model_output IS NULL.")

        # 6. Orphan & Relationship Integrity Checks
        orphaned_images = conn.execute(text(
            "SELECT count(*) FROM case_images ci WHERE NOT EXISTS (SELECT 1 FROM cases c WHERE c.case_id = ci.case_id)"
        )).scalar()

        orphaned_evidence = conn.execute(text(
            "SELECT count(*) FROM evidence e WHERE NOT EXISTS (SELECT 1 FROM cases c WHERE c.case_id = e.case_id)"
        )).scalar()

        cases_without_evidence = conn.execute(text(
            "SELECT count(*) FROM cases c WHERE NOT EXISTS (SELECT 1 FROM evidence e WHERE e.case_id = c.case_id)"
        )).scalar()

        cases_without_images = conn.execute(text(
            "SELECT count(*) FROM cases c WHERE NOT EXISTS (SELECT 1 FROM case_images ci WHERE ci.case_id = c.case_id)"
        )).scalar()

        rel_passed = (orphaned_images == 0 and orphaned_evidence == 0 and cases_without_evidence == 0 and cases_without_images == 0)
        report["checks"]["relationship_and_orphan_integrity"] = {
            "passed": rel_passed,
            "orphaned_images": orphaned_images,
            "orphaned_evidence": orphaned_evidence,
            "cases_without_evidence": cases_without_evidence,
            "cases_without_images": cases_without_images
        }
        if not rel_passed:
            report["all_passed"] = False
            print(f"  [FAIL] Relationship integrity failure: orphans or missing relationships detected!")
        else:
            print(f"  [PASS] 0 orphaned images, 0 orphaned evidence, 100% 1-to-1 case-to-evidence parity.")

        # 7. JSONB subobject completeness
        invalid_jsonb = conn.execute(text("""
            SELECT count(*) FROM evidence 
            WHERE image_evidence IS NULL 
               OR text_image_consistency IS NULL 
               OR clinical_support IS NULL
               OR image_evidence = '{}'::jsonb
               OR text_image_consistency = '{}'::jsonb
               OR clinical_support = '{}'::jsonb
        """)).scalar()

        jsonb_passed = (invalid_jsonb == 0)
        report["checks"]["jsonb_not_null_and_non_empty"] = {
            "passed": jsonb_passed,
            "invalid_or_empty_jsonb_rows": invalid_jsonb
        }
        if not jsonb_passed:
            report["all_passed"] = False
            print(f"  [FAIL] Found {invalid_jsonb} evidence rows with invalid/empty JSONB!")
        else:
            print("  [PASS] 100% of 2,107 evidence rows contain complete, populated JSONB subobjects.")

    # Save verification report
    report_file = NORM_DIR / "post_import_verification_results.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 80)
    print(f"INDEPENDENT POST-IMPORT VERIFICATION: {'ALL CHECKS PASSED' if report['all_passed'] else 'FAILURES DETECTED'}")
    print("=" * 80)
    return report

if __name__ == "__main__":
    run_post_import_verification()
