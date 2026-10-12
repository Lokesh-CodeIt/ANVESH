import json
import os
import sys
from typing import Dict, List, Set, Tuple
from sqlalchemy import func

from database import SessionLocal
from models import Case, CaseImage, Evidence, Policy, Review


NO_SOURCE_TEXT_CASE_IDS = {614, 673, 894}
BATCH_SIZE = 100  # Number of cases per commit batch


def get_table_counts(db) -> Dict[str, int]:
    """Retrieve row counts across all relevant tables."""
    return {
        "cases": db.query(func.count(Case.case_id)).scalar() or 0,
        "case_images": db.query(func.count(CaseImage.id)).scalar() or 0,
        "evidence": db.query(func.count(Evidence.id)).scalar() or 0,
        "policies": db.query(func.count(Policy.plan_id)).scalar() or 0,
        "reviews": db.query(func.count(Review.id)).scalar() or 0,
    }


def seed_batch_2():
    print("=" * 70)
    print("SEEDING BATCH 2 INTO MEDAUTH_VLM DATABASE (APPEND MODE)")
    print("=" * 70)

    cases_file = os.path.normpath("AI_PORJECT_DATASET/colab_upload/case_batch_2.json")
    evidence_file = os.path.normpath("AI_PORJECT_DATASET/precomputed_evidence/evidence_batch_2.json")
    images_base_path = "AI_PORJECT_DATASET/archive (7)/images/images_normalized"

    # Step 0: Validate input files exist
    if not os.path.exists(cases_file):
        raise FileNotFoundError(f"Cases file not found: {cases_file}")
    if not os.path.exists(evidence_file):
        raise FileNotFoundError(f"Evidence file not found: {evidence_file}")

    print(f"[File] Cases file   : {cases_file}")
    print(f"[File] Evidence file: {evidence_file}")
    print(f"[Path] Images base  : {images_base_path}")

    # Load json files
    with open(cases_file, "r", encoding="utf-8") as f:
        cases_raw = json.load(f)
    print(f"[Loaded] {len(cases_raw)} cases from {cases_file}")

    with open(evidence_file, "r", encoding="utf-8") as f:
        evidence_raw = json.load(f)
    print(f"[Loaded] {len(evidence_raw)} evidence records from {evidence_file}")

    db = SessionLocal()

    inserted_case_ids_this_run: List[int] = []

    try:
        # Step 1: Check existing state before inserting
        initial_counts = get_table_counts(db)
        print("\n--- INITIAL DATABASE ROW COUNTS ---")
        for table, count in initial_counts.items():
            print(f"  {table:<15}: {count} row(s)")

        existing_case_ids: Set[int] = {row[0] for row in db.query(Case.case_id).all()}
        existing_evidence_cids: Set[int] = {row[0] for row in db.query(Evidence.case_id).all()}

        print(f"\nExisting cases in DB: {len(existing_case_ids)}")
        print(f"Existing evidence in DB: {len(existing_evidence_cids)}")

        # Step 2: Check for duplicate case_ids in batch 2 against existing DB
        batch_case_ids = [int(c["case_id"]) for c in cases_raw]
        duplicate_case_ids = [cid for cid in batch_case_ids if cid in existing_case_ids]

        if duplicate_case_ids:
            print(f"\n[WARNING] Found {len(duplicate_case_ids)} duplicate case_ids already in database:")
            print(f"  Duplicates: {duplicate_case_ids}")
            print("  These cases will be skipped to preserve existing data.")
        else:
            print("\n[Check] 0 duplicate case_ids found. All 400 cases are new to the database.")

        # Build evidence lookup by case_id for quick pairing
        evidence_by_cid = {}
        null_evidence_cids = []
        for ev_item in evidence_raw:
            cid = ev_item.get("case_id")
            if cid is None:
                continue
            cid = int(cid)
            ev_field = ev_item.get("evidence")
            if ev_field is not None and isinstance(ev_field, dict):
                evidence_by_cid[cid] = ev_item
            else:
                null_evidence_cids.append(cid)

        if null_evidence_cids:
            print(f"[Check] Found {len(null_evidence_cids)} evidence entries with null 'evidence' field.")
        else:
            print(f"[Check] All {len(evidence_raw)} evidence entries have non-null 'evidence' field.")

        # Step 3: Filter cases to insert (skipping duplicates)
        cases_to_process = []
        skipped_case_count = 0
        for item in cases_raw:
            cid = int(item["case_id"])
            if cid in existing_case_ids:
                skipped_case_count += 1
                continue
            cases_to_process.append(item)

        print(f"\nCases scheduled for insertion: {len(cases_to_process)}")

        # Step 4: Batch insertion with transaction management
        total_cases_inserted = 0
        total_images_inserted = 0
        total_evidence_inserted = 0
        skipped_evidence_count = 0

        # Split cases into chunks of BATCH_SIZE
        num_batches = (len(cases_to_process) + BATCH_SIZE - 1) // BATCH_SIZE if cases_to_process else 0
        print(f"\nProcessing in {num_batches} batch(es) of up to {BATCH_SIZE} cases each...")

        for batch_idx in range(num_batches):
            batch_slice = cases_to_process[batch_idx * BATCH_SIZE : (batch_idx + 1) * BATCH_SIZE]
            batch_case_objects: List[Case] = []
            batch_image_objects: List[CaseImage] = []
            batch_evidence_objects: List[Evidence] = []
            batch_cids: List[int] = []

            for item in batch_slice:
                cid = int(item["case_id"])
                batch_cids.append(cid)

                # Set has_source_text: False for 614, 673, 894; True for all others
                has_source = False if cid in NO_SOURCE_TEXT_CASE_IDS else True

                case_obj = Case(
                    case_id=cid,
                    classification=item.get("classification", "unknown"),
                    indication=item.get("indication"),
                    findings=item.get("findings"),
                    impression=item.get("impression"),
                    requested_procedure=item.get("requested_procedure", "Chest X-ray (PA and Lateral)"),
                    has_source_text=has_source,
                )
                batch_case_objects.append(case_obj)

                # Images for this case
                for img in item.get("images", []):
                    fname = img.get("filename")
                    if not fname:
                        continue
                    projection = img.get("projection", "Frontal")
                    norm_path = f"{images_base_path}/{fname}".replace("\\", "/")

                    img_obj = CaseImage(
                        case_id=cid,
                        filename=fname,
                        projection=projection,
                        file_path=norm_path,
                    )
                    batch_image_objects.append(img_obj)

                # Evidence for this case
                if cid in existing_evidence_cids:
                    skipped_evidence_count += 1
                elif cid in evidence_by_cid:
                    ev_item = evidence_by_cid[cid]
                    ev_field = ev_item["evidence"]
                    ev_obj = Evidence(
                        case_id=cid,
                        image_evidence=ev_field.get("image_evidence") or {},
                        text_image_consistency=ev_field.get("text_image_consistency") or {},
                        clinical_support=ev_field.get("clinical_support") or {},
                        raw_model_output=ev_item.get("raw_model_output"),
                    )
                    batch_evidence_objects.append(ev_obj)
                else:
                    skipped_evidence_count += 1

            # Insert batch within transaction
            db.add_all(batch_case_objects)
            db.flush()  # Flushes cases so case_id PKs are present for FKs

            db.add_all(batch_image_objects)
            db.flush()

            db.add_all(batch_evidence_objects)
            db.flush()

            db.commit()  # Batched commit

            inserted_case_ids_this_run.extend(batch_cids)
            total_cases_inserted += len(batch_case_objects)
            total_images_inserted += len(batch_image_objects)
            total_evidence_inserted += len(batch_evidence_objects)

            print(
                f"  [Batch {batch_idx + 1}/{num_batches}] Committed "
                f"{len(batch_case_objects)} cases, "
                f"{len(batch_image_objects)} images, "
                f"{len(batch_evidence_objects)} evidence rows."
            )

        # Step 5: Final counts and verification
        final_counts = get_table_counts(db)

        print("\n" + "=" * 70)
        print("SEEDING SUMMARY (BATCH 2)")
        print("=" * 70)
        print(f"Cases inserted in this run         : {total_cases_inserted}")
        print(f"Images inserted in this run        : {total_images_inserted}")
        print(f"Evidence inserted in this run      : {total_evidence_inserted}")
        print(f"Duplicate cases skipped            : {skipped_case_count}")
        print(f"Evidence entries skipped           : {skipped_evidence_count}")
        print("-" * 70)
        print("NEW TOTAL DATABASE ROW COUNTS:")
        for table, count in final_counts.items():
            print(f"  {table:<15}: {count} row(s)")
        print("=" * 70)

        # Sanity check against target expectations
        assert final_counts["cases"] == 550, f"Expected 550 cases, got {final_counts['cases']}"
        assert final_counts["evidence"] == 550, f"Expected 550 evidence rows, got {final_counts['evidence']}"
        assert final_counts["policies"] == 100, f"Expected 100 policies unchanged, got {final_counts['policies']}"
        print("ALL INTEGRITY CHECKS PASSED: 550 cases, 550 evidence, 100 policies (unchanged).")

    except Exception as e:
        db.rollback()
        print(f"\n[FATAL ERROR] Transaction rolled back due to error: {e}", file=sys.stderr)
        # Clean up any partial batches from this run if needed
        if inserted_case_ids_this_run:
            print(f"[Cleanup] Removing {len(inserted_case_ids_this_run)} partially committed cases from this run...")
            try:
                db.query(Case).filter(Case.case_id.in_(inserted_case_ids_this_run)).delete(synchronize_session=False)
                db.commit()
                print("[Cleanup] Cleanup complete. Database restored to pre-run state.")
            except Exception as clean_err:
                print(f"[Cleanup ERROR] Failed cleaning up: {clean_err}", file=sys.stderr)
                db.rollback()
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_batch_2()
