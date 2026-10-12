import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

import pandas as pd
from sqlalchemy import func

from database import SessionLocal, engine
from models import Case, CaseImage, Evidence, Policy, Review


def find_file(relative_hint: str, filename_pattern: str, search_root: str = "AI_PORJECT_DATASET") -> str:
    """Find a required dataset file using the expected hint or falling back to recursive search."""
    # First check if the expected relative path exists
    candidate = os.path.normpath(relative_hint)
    if os.path.exists(candidate):
        return candidate

    # Fallback: search recursively inside search_root
    for root, _, files in os.walk(search_root):
        for file in files:
            if file == filename_pattern or file.lower() == filename_pattern.lower():
                found = os.path.normpath(os.path.join(root, file))
                print(f"[Locator] Found {filename_pattern} at: {found}")
                return found

    raise FileNotFoundError(f"Could not locate '{filename_pattern}' under '{search_root}'")


def get_existing_counts(db) -> Dict[str, int]:
    """Query current row counts for all relevant tables."""
    return {
        "cases": db.query(func.count(Case.case_id)).scalar() or 0,
        "case_images": db.query(func.count(CaseImage.id)).scalar() or 0,
        "evidence": db.query(func.count(Evidence.id)).scalar() or 0,
        "policies": db.query(func.count(Policy.plan_id)).scalar() or 0,
        "reviews": db.query(func.count(Review.id)).scalar() or 0,
    }


def prompt_user_action(existing_counts: Dict[str, int], cli_mode: Optional[str]) -> str:
    """Determine seeding mode: 'clear', 'skip', or 'append'."""
    total_existing = sum(existing_counts.values())
    if total_existing == 0:
        return "clean"

    print("\n" + "=" * 60)
    print("EXISTING DATA DETECTED IN DATABASE:")
    print("=" * 60)
    for table_name, count in existing_counts.items():
        print(f"  - {table_name:<15}: {count} row(s)")
    print("=" * 60)

    if cli_mode in ("clear", "skip", "append"):
        print(f"Using CLI-specified mode: '{cli_mode}'")
        return cli_mode

    # Check if standard input is interactive
    if sys.stdin and sys.stdin.isatty():
        print("\nChoose an action:")
        print("  [1] Clear and reseed (wipe existing records and insert fresh) [Default]")
        print("  [2] Skip existing (keep existing records, only insert new ones)")
        print("  [3] Append (attempt insert without deduplication, may error on PK conflict)")
        choice = input("\nEnter choice [1/2/3] (default 1): ").strip()
        if choice == "2":
            return "skip"
        if choice == "3":
            return "append"
        return "clear"
    else:
        # Non-interactive fallback: default to clear to ensure clean state
        print("Non-interactive execution detected. Defaulting to 'clear' and reseed.")
        return "clear"


def clear_existing_data(db) -> None:
    """Wipe existing rows in reverse foreign-key order."""
    print("\nClearing existing database records...")
    db.query(Review).delete()
    db.query(Evidence).delete()
    db.query(CaseImage).delete()
    db.query(Case).delete()
    db.query(Policy).delete()
    db.commit()
    print("Database tables cleared.")


def load_and_seed_cases(
    db,
    cases_file_path: str,
    images_base_dir: str,
    mode: str,
    existing_case_ids: Set[int]
) -> Tuple[int, int]:
    """Load case_batch.json, insert Case and CaseImage records."""
    print(f"\n[1/3] Loading cases from: {cases_file_path}")
    with open(cases_file_path, "r", encoding="utf-8") as f:
        cases_data = json.load(f)

    if not isinstance(cases_data, list):
        raise ValueError(f"Expected a list of cases in {cases_file_path}, got {type(cases_data)}")

    cases_to_insert: List[Case] = []
    images_to_insert: List[CaseImage] = []

    for item in cases_data:
        case_id = int(item["case_id"])
        if mode == "skip" and case_id in existing_case_ids:
            continue

        findings = (item.get("findings") or "").strip()
        impression = (item.get("impression") or "").strip()
        # Set has_source_text to False if BOTH findings and impression are empty strings, True otherwise
        has_source_text = not (findings == "" and impression == "")

        case_obj = Case(
            case_id=case_id,
            classification=item.get("classification", "unknown"),
            indication=item.get("indication"),
            findings=item.get("findings"),
            impression=item.get("impression"),
            requested_procedure=item.get("requested_procedure", "Chest X-ray (PA and Lateral)"),
            has_source_text=has_source_text,
        )
        cases_to_insert.append(case_obj)

        # Process associated images
        for img in item.get("images", []):
            filename = img.get("filename")
            if not filename:
                continue
            projection = img.get("projection", "Frontal")
            # Reconstruct file_path pointing to AI_PORJECT_DATASET/archive (7)/images/images_normalized/{filename}
            norm_file_path = f"{images_base_dir}/{filename}".replace("\\", "/")

            img_obj = CaseImage(
                case_id=case_id,
                filename=filename,
                projection=projection,
                file_path=norm_file_path,
            )
            images_to_insert.append(img_obj)

    print(f"  -> Prepared {len(cases_to_insert)} Case records and {len(images_to_insert)} CaseImage records.")

    # Batch insert cases
    if cases_to_insert:
        db.add_all(cases_to_insert)
        db.flush()  # Flush so case_ids exist for foreign key relations

    if images_to_insert:
        db.add_all(images_to_insert)
        db.flush()

    db.commit()
    return len(cases_to_insert), len(images_to_insert)


def load_and_seed_evidence(
    db,
    evidence_file_path: str,
    mode: str,
    valid_case_ids: Set[int],
    existing_evidence_case_ids: Set[int]
) -> Tuple[int, int, List[Tuple[int, str]]]:
    """Load evidence_cleaned.json, insert Evidence records, reporting skipped entries."""
    print(f"\n[2/3] Loading evidence from: {evidence_file_path}")
    with open(evidence_file_path, "r", encoding="utf-8") as f:
        evidence_data = json.load(f)

    if not isinstance(evidence_data, list):
        raise ValueError(f"Expected a list in {evidence_file_path}, got {type(evidence_data)}")

    evidence_to_insert: List[Evidence] = []
    skipped_entries: List[Tuple[int, str]] = []

    for item in evidence_data:
        case_id = item.get("case_id")
        if case_id is None:
            skipped_entries.append((-1, "Missing case_id"))
            continue

        case_id = int(case_id)

        if mode == "skip" and case_id in existing_evidence_case_ids:
            continue

        if case_id not in valid_case_ids:
            skipped_entries.append((case_id, f"case_id {case_id} does not exist in cases table"))
            continue

        ev_field = item.get("evidence")
        if ev_field is None or not isinstance(ev_field, dict):
            skipped_entries.append((case_id, "'evidence' field is null or not a valid dictionary"))
            continue

        image_evidence = ev_field.get("image_evidence") or {}
        text_image_consistency = ev_field.get("text_image_consistency") or {}
        clinical_support = ev_field.get("clinical_support") or {}
        raw_output = item.get("raw_model_output")

        evidence_obj = Evidence(
            case_id=case_id,
            image_evidence=image_evidence,
            text_image_consistency=text_image_consistency,
            clinical_support=clinical_support,
            raw_model_output=raw_output,
        )
        evidence_to_insert.append(evidence_obj)

    if skipped_entries:
        print("\n  [Skipped Evidence Entries]:")
        for cid, reason in skipped_entries:
            print(f"    * case_id: {cid} -> Reason: {reason}")
    else:
        print("  -> No evidence entries were skipped (all 150 entries valid).")

    print(f"  -> Prepared {len(evidence_to_insert)} Evidence records.")

    if evidence_to_insert:
        db.add_all(evidence_to_insert)
        db.commit()

    return len(evidence_to_insert), len(skipped_entries), skipped_entries


def load_and_seed_policies(
    db,
    csv_file_path: str,
    mode: str,
    existing_plan_ids: Set[str],
    max_plans: int = 100
) -> int:
    """Load CMS benefits CSV, filter to 'X-rays and Diagnostic Imaging', and insert up to max_plans."""
    print(f"\n[3/3] Loading CMS policies from: {csv_file_path}")
    
    if mode == "skip" and len(existing_plan_ids) >= max_plans:
        print(f"  -> Target of {max_plans} policies already reached in database ({len(existing_plan_ids)} existing). Skipping policy insertion.")
        return 0

    plans_needed = max_plans - (len(existing_plan_ids) if mode == "skip" else 0)

    cols_needed = [
        "PlanId", "StateCode", "BenefitName", "IsCovered",
        "CopayInnTier1", "CoinsInnTier1", "LimitQty", "LimitUnit", "Exclusions"
    ]

    distinct_plans: Dict[str, Policy] = {}

    for chunk in pd.read_csv(csv_file_path, usecols=cols_needed, chunksize=30000, low_memory=False):
        filtered = chunk[chunk["BenefitName"] == "X-rays and Diagnostic Imaging"]
        for _, row in filtered.iterrows():
            raw_plan_id = row.get("PlanId")
            if pd.isna(raw_plan_id):
                continue
            plan_id = str(raw_plan_id).strip()

            if mode == "skip" and plan_id in existing_plan_ids:
                continue

            if plan_id in distinct_plans:
                continue

            # Field sanitization
            raw_state = row.get("StateCode")
            state = str(raw_state).strip()[:10] if not pd.isna(raw_state) else "Unknown"

            raw_is_covered = row.get("IsCovered")
            is_covered = str(raw_is_covered).strip()[:50] if not pd.isna(raw_is_covered) else "Unknown"

            raw_copay = row.get("CopayInnTier1")
            copay = str(raw_copay).strip()[:100] if not pd.isna(raw_copay) else "Not Applicable"

            raw_coins = row.get("CoinsInnTier1")
            coinsurance = str(raw_coins).strip()[:100] if not pd.isna(raw_coins) else "Not Applicable"

            raw_limit_qty = row.get("LimitQty")
            limit_qty = float(raw_limit_qty) if not pd.isna(raw_limit_qty) else None

            raw_limit_unit = row.get("LimitUnit")
            limit_unit = str(raw_limit_unit).strip()[:50] if not pd.isna(raw_limit_unit) else None

            raw_exclusions = row.get("Exclusions")
            exclusions = str(raw_exclusions).strip() if not pd.isna(raw_exclusions) else None

            policy_obj = Policy(
                plan_id=plan_id,
                state=state,
                is_covered=is_covered,
                copay=copay,
                coinsurance=coinsurance,
                limit_qty=limit_qty,
                limit_unit=limit_unit,
                exclusions=exclusions,
            )
            distinct_plans[plan_id] = policy_obj

            if len(distinct_plans) >= plans_needed:
                break

        if len(distinct_plans) >= plans_needed:
            break

    print(f"  -> Extracted {len(distinct_plans)} distinct 'X-rays and Diagnostic Imaging' policies.")

    if distinct_plans:
        db.add_all(list(distinct_plans.values()))
        db.commit()

    return len(distinct_plans)


def main():
    parser = argparse.ArgumentParser(description="Seed medauth_vlm database with cases, evidence, and policies.")
    parser.add_argument(
        "--mode",
        choices=["clear", "skip", "append"],
        default=None,
        help="Action to take if data already exists: 'clear' (wipe and reseed), 'skip' (skip existing), 'append' (attempt insert)"
    )
    args = parser.parse_args()

    print("=" * 60)
    print("MEDAUTH-VLM DATABASE SEEDING SCRIPT")
    print("=" * 60)

    # 1. Locate dataset files
    cases_file = find_file(
        "AI_PORJECT_DATASET/colab_upload/case_batch.json",
        "case_batch.json"
    )
    evidence_file = find_file(
        "AI_PORJECT_DATASET/precomputed_evidence/evidence_cleaned.json",
        "evidence_cleaned.json"
    )
    policy_file = find_file(
        "AI_PORJECT_DATASET/CMS Health Insurance Exchange PUFs (insurancepolicy data)/benefits-and-cost-sharing-puf/benefits-and-cost-sharing-puf.csv",
        "benefits-and-cost-sharing-puf.csv"
    )
    images_base = "AI_PORJECT_DATASET/archive (7)/images/images_normalized"

    db = SessionLocal()
    try:
        # 2. Check existing records and determine seeding mode
        existing_counts = get_existing_counts(db)
        action_mode = prompt_user_action(existing_counts, args.mode)

        if action_mode == "clear":
            clear_existing_data(db)

        # Refresh existing keys for 'skip' mode
        existing_case_ids: Set[int] = set()
        existing_evidence_case_ids: Set[int] = set()
        existing_plan_ids: Set[str] = set()

        if action_mode == "skip":
            existing_case_ids = {row[0] for row in db.query(Case.case_id).all()}
            existing_evidence_case_ids = {row[0] for row in db.query(Evidence.case_id).all()}
            existing_plan_ids = {row[0] for row in db.query(Policy.plan_id).all()}

        # 3. Insert Cases and Images
        cases_inserted, images_inserted = load_and_seed_cases(
            db=db,
            cases_file_path=cases_file,
            images_base_dir=images_base,
            mode=action_mode,
            existing_case_ids=existing_case_ids
        )

        # Get all valid case_ids currently in DB
        valid_case_ids = {row[0] for row in db.query(Case.case_id).all()}

        # 4. Insert Evidence
        evidence_inserted, skipped_count, skipped_details = load_and_seed_evidence(
            db=db,
            evidence_file_path=evidence_file,
            mode=action_mode,
            valid_case_ids=valid_case_ids,
            existing_evidence_case_ids=existing_evidence_case_ids
        )

        # 5. Insert Policies
        policies_inserted = load_and_seed_policies(
            db=db,
            csv_file_path=policy_file,
            mode=action_mode,
            existing_plan_ids=existing_plan_ids,
            max_plans=100
        )

        # 6. Final verification & summary
        final_counts = get_existing_counts(db)

        print("\n" + "=" * 60)
        print("SEEDING SUMMARY")
        print("=" * 60)
        print(f"Total Cases Inserted           : {cases_inserted}")
        print(f"Total Images Inserted          : {images_inserted}")
        print(f"Total Evidence Records Inserted: {evidence_inserted}")
        print(f"Total Evidence Records Skipped : {skipped_count}")
        print(f"Total Policies Inserted        : {policies_inserted}")
        print("-" * 60)
        print("CURRENT DATABASE ROW COUNTS:")
        for table, count in final_counts.items():
            print(f"  - {table:<15}: {count} row(s)")
        print("=" * 60)
        print("Database seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] An error occurred during seeding: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
