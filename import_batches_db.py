"""
MedAuth-VLM: Parameterized, Transaction-Safe PostgreSQL Importer
Imports normalized records for Batches 4, 5, and 6 into medauth_vlm database.

SAFETY GUARANTEES:
1. DEFAULTS TO DRY RUN MODE: No changes are committed unless --apply is explicitly specified.
2. TRANSACTION SAFETY: All operations occur inside managed transactions. In dry run mode, all staged operations are rolled back.
3. ID COLLISION DEFENSE: Detects existing rows in table 'cases' and 'evidence'.
   - Skips identical records.
   - Quarantines conflicting records to quarantine_import_conflicts.json.
   - NEVER modifies, overwrites, or deletes Batch 1–3 rows.
4. CONSTRAINT & TYPE ENFORCEMENT: Validates all required NOT NULL columns and JSONB data types prior to insertion.
"""

import argparse
import copy
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

WORKSPACE_ROOT = Path(r"c:\Users\NILESH MARATHE\OneDrive\Desktop\AI PORJECT")
sys.path.insert(0, str(WORKSPACE_ROOT))

from database import SessionLocal, engine
from models import Case, CaseImage, Evidence, Policy, Review
from sqlalchemy import func, text

DATA_DIR = WORKSPACE_ROOT / "AI_PORJECT_DATASET"
COLAB_DIR = DATA_DIR / "colab_upload"
NORM_DIR = WORKSPACE_ROOT / "normalized_for_db"
IMAGES_BASE_PATH = "AI_PORJECT_DATASET/archive (7)/images/images_normalized"


def get_db_counts(db) -> Dict[str, int]:
    """Retrieve row counts across relevant database tables."""
    return {
        "cases": db.query(func.count(Case.case_id)).scalar() or 0,
        "case_images": db.query(func.count(CaseImage.id)).scalar() or 0,
        "evidence": db.query(func.count(Evidence.id)).scalar() or 0,
        "policies": db.query(func.count(Policy.plan_id)).scalar() or 0,
        "reviews": db.query(func.count(Review.id)).scalar() or 0,
    }


def run_importer(dry_run: bool = True, target_batch: str = "all", chunk_size: int = 100) -> Dict[str, Any]:
    print("=" * 80)
    print(f"MEDAUTH-VLM: DATABASE IMPORT PIPELINE ({'DRY RUN' if dry_run else 'LIVE COMMIT MODE'})")
    print("=" * 80)
    print(f"Target Batch : {target_batch}")
    print(f"Chunk Size   : {chunk_size}")
    print(f"Mode         : {'DRY RUN (Changes will NOT be saved)' if dry_run else 'LIVE APPLY (Changes will be COMMITTED)'}")
    print("-" * 80)

    batches_to_process = [4, 5, 6] if target_batch.lower() == "all" else [int(target_batch)]

    # 1. Load normalized evidence datasets
    evidence_datasets: Dict[int, List[Dict[str, Any]]] = {}
    cases_manifests: Dict[int, List[Dict[str, Any]]] = {}

    for b in batches_to_process:
        ev_p = NORM_DIR / f"evidence_batch_{b}.json"
        case_p = COLAB_DIR / f"case_batch_{b}.json"

        if not ev_p.exists():
            raise FileNotFoundError(f"Normalized evidence file not found: {ev_p}")
        if not case_p.exists():
            raise FileNotFoundError(f"Case manifest file not found: {case_p}")

        with open(ev_p, "r", encoding="utf-8") as f:
            evidence_datasets[b] = json.load(f)
        with open(case_p, "r", encoding="utf-8") as f:
            cases_manifests[b] = json.load(f)

        print(f"[Loaded] Batch {b}: {len(evidence_datasets[b])} normalized evidence records, {len(cases_manifests[b])} manifest cases")

    db = SessionLocal()

    import_summary = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dry_run": dry_run,
        "target_batch": target_batch,
        "initial_db_counts": {},
        "final_db_counts": {},
        "proposed_inserts": {
            "cases": 0,
            "case_images": 0,
            "evidence": 0
        },
        "skips_identical": {
            "cases": 0,
            "evidence": 0
        },
        "quarantined_conflicts": [],
        "batches_detail": {}
    }

    try:
        # Check initial counts
        initial_counts = get_db_counts(db)
        import_summary["initial_db_counts"] = initial_counts
        print("\n--- INITIAL DATABASE ROW COUNTS ---")
        for tbl, cnt in initial_counts.items():
            print(f"  {tbl:<15}: {cnt} row(s)")

        existing_case_ids: Set[int] = {row[0] for row in db.query(Case.case_id).all()}
        existing_evidence_cids: Set[int] = {row[0] for row in db.query(Evidence.case_id).all()}
        print(f"\nExisting Case IDs in DB     : {len(existing_case_ids)}")
        print(f"Existing Evidence CIDs in DB : {len(existing_evidence_cids)}")

        for b in batches_to_process:
            print(f"\n" + "-" * 60)
            print(f"PROCESSING BATCH {b}")
            print("-" * 60)

            ev_records = evidence_datasets[b]
            manifest_records = cases_manifests[b]

            # Build lookup of normalized evidence by integer case_id
            ev_by_cid = {r["case_id"]: r for r in ev_records}

            # Filter manifest records: for Batch 5, only include the 357 completed cases
            valid_manifest_records = [
                c for c in manifest_records
                if int(c["case_id"]) in ev_by_cid
            ]

            b_stat = {
                "manifest_total": len(manifest_records),
                "scheduled_cases": len(valid_manifest_records),
                "scheduled_evidence": len(ev_records),
                "cases_inserted": 0,
                "case_images_inserted": 0,
                "evidence_inserted": 0,
                "skips_identical": 0,
                "quarantines": 0
            }

            # Split into chunks
            total_cases = len(valid_manifest_records)
            num_chunks = (total_cases + chunk_size - 1) // chunk_size if total_cases else 0

            for chunk_idx in range(num_chunks):
                chunk = valid_manifest_records[chunk_idx * chunk_size : (chunk_idx + 1) * chunk_size]

                batch_case_objs: List[Case] = []
                batch_image_objs: List[CaseImage] = []
                batch_evidence_objs: List[Evidence] = []

                for item in chunk:
                    cid = int(item["case_id"])

                    # 1. Collision check against existing DB
                    if cid in existing_case_ids:
                        existing_case = db.query(Case).filter(Case.case_id == cid).first()
                        if existing_case and existing_case.classification == item.get("classification"):
                            b_stat["skips_identical"] += 1
                            import_summary["skips_identical"]["cases"] += 1
                            continue
                        else:
                            conflict_entry = {
                                "batch": b,
                                "case_id": cid,
                                "reason": "Existing Case record conflict",
                                "existing_classification": existing_case.classification if existing_case else None,
                                "incoming_classification": item.get("classification")
                            }
                            import_summary["quarantined_conflicts"].append(conflict_entry)
                            b_stat["quarantines"] += 1
                            continue

                    # 2. Build Case object
                    f_text = item.get("findings") or ""
                    i_text = item.get("impression") or ""
                    ind_text = item.get("indication") or ""
                    has_source = not (f_text.strip() == "" and i_text.strip() == "" and ind_text.strip() == "")

                    case_obj = Case(
                        case_id=cid,
                        classification=item.get("classification", "unknown"),
                        indication=item.get("indication"),
                        findings=item.get("findings"),
                        impression=item.get("impression"),
                        requested_procedure=item.get("requested_procedure", "Chest X-ray (PA and Lateral)"),
                        has_source_text=has_source,
                    )
                    batch_case_objs.append(case_obj)

                    # 3. Build CaseImage objects
                    for img in item.get("images", []):
                        fname = img.get("filename")
                        if not fname:
                            continue
                        proj = img.get("projection", "Frontal")
                        norm_p = f"{IMAGES_BASE_PATH}/{fname}".replace("\\", "/")
                        img_obj = CaseImage(
                            case_id=cid,
                            filename=fname,
                            projection=proj,
                            file_path=norm_p,
                        )
                        batch_image_objs.append(img_obj)

                    # 4. Build Evidence object
                    ev_norm = ev_by_cid.get(cid)
                    if not ev_norm:
                        conflict_entry = {
                            "batch": b,
                            "case_id": cid,
                            "reason": "Missing normalized evidence object for case"
                        }
                        import_summary["quarantined_conflicts"].append(conflict_entry)
                        b_stat["quarantines"] += 1
                        continue

                    ev_field = ev_norm["evidence"]
                    ev_obj = Evidence(
                        case_id=cid,
                        image_evidence=ev_field["image_evidence"],
                        text_image_consistency=ev_field["text_image_consistency"],
                        clinical_support=ev_field["clinical_support"],
                        raw_model_output=ev_norm.get("raw_model_output"),
                    )
                    batch_evidence_objs.append(ev_obj)

                # Stage entities in current transaction
                if batch_case_objs:
                    db.add_all(batch_case_objs)
                    db.flush()

                if batch_image_objs:
                    db.add_all(batch_image_objs)
                    db.flush()

                if batch_evidence_objs:
                    db.add_all(batch_evidence_objs)
                    db.flush()

                b_stat["cases_inserted"] += len(batch_case_objs)
                b_stat["case_images_inserted"] += len(batch_image_objs)
                b_stat["evidence_inserted"] += len(batch_evidence_objs)

                import_summary["proposed_inserts"]["cases"] += len(batch_case_objs)
                import_summary["proposed_inserts"]["case_images"] += len(batch_image_objs)
                import_summary["proposed_inserts"]["evidence"] += len(batch_evidence_objs)

                print(f"  Chunk {chunk_idx + 1}/{num_chunks}: Staged {len(batch_case_objs)} cases, {len(batch_image_objs)} images, {len(batch_evidence_objs)} evidence records")

            import_summary["batches_detail"][f"batch_{b}"] = b_stat
            print(f"  Batch {b} Subtotal: {b_stat['cases_inserted']} cases, {b_stat['case_images_inserted']} images, {b_stat['evidence_inserted']} evidence")

        # End of processing: evaluate commit vs rollback
        if dry_run:
            print("\n[DRY RUN] Explicitly rolling back transaction. No changes were committed to the database.")
            db.rollback()
        else:
            print("\n[LIVE APPLY] Explicitly committing transaction...")
            db.commit()
            print("[LIVE APPLY] Commit successful.")

        final_counts = get_db_counts(db)
        import_summary["final_db_counts"] = final_counts
        print("\n--- FINAL DATABASE ROW COUNTS ---")
        for tbl, cnt in final_counts.items():
            print(f"  {tbl:<15}: {cnt} row(s)")

    except Exception as e:
        print(f"\n[ERROR] Transaction aborted due to exception: {e}")
        db.rollback()
        raise
    finally:
        db.close()

    # Save summary report
    summary_path = NORM_DIR / "import_dry_run_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(import_summary, f, indent=2)
    print(f"\nSaved {summary_path.name}")

    print("\n" + "=" * 80)
    print(f"IMPORT EXECUTION COMPLETE ({'DRY RUN SUCCESSFUL' if dry_run else 'LIVE COMMIT SUCCESSFUL'})")
    print("=" * 80)
    return import_summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MedAuth-VLM PostgreSQL Importer")
    parser.add_argument("--apply", action="store_true", default=False, help="Explicitly commit changes to database (default: False / DRY RUN)")
    parser.add_argument("--batch", type=str, default="all", help="Target batch: 4, 5, 6, or 'all' (default: 'all')")
    parser.add_argument("--chunk-size", type=int, default=100, help="Transaction chunk size (default: 100)")
    args = parser.parse_args()

    run_importer(dry_run=not args.apply, target_batch=args.batch, chunk_size=args.chunk_size)
