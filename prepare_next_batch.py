import argparse
import json
import os
import shutil
import zipfile
import pandas as pd


def clean_text(text):
    """Replace XXXX anonymization tokens with [REDACTED]."""
    if pd.isna(text):
        return ""
    return str(text).replace("XXXX", "[REDACTED]")


def prepare_batch(batch_number: int, batch_size: int, commit: bool = False):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_dir = os.path.join(base_dir, "AI_PORJECT_DATASET")
    archive_dir = os.path.join(dataset_dir, "archive (7)")
    reports_path = os.path.join(archive_dir, "indiana_reports.csv")
    projections_path = os.path.join(archive_dir, "indiana_projections.csv")
    src_images_dir = os.path.join(archive_dir, "images", "images_normalized")

    tracking_file = os.path.join(dataset_dir, "processed_case_ids.json")
    colab_dir = os.path.join(dataset_dir, "colab_upload")
    dst_images_dir = os.path.join(colab_dir, f"images_batch_{batch_number}")
    json_path = os.path.join(colab_dir, f"case_batch_{batch_number}.json")
    zip_path = os.path.join(dataset_dir, f"colab_upload_batch_{batch_number}.zip")

    print(f"\n{'=' * 60}")
    print(f"PREPARING BATCH {batch_number} (Target size: {batch_size})")
    print(f"{'=' * 60}")

    # Step 1: Read tracking file of already processed case IDs
    if not os.path.exists(tracking_file):
        raise FileNotFoundError(
            f"Tracking file '{tracking_file}' not found! "
            f"Please ensure it exists before preparing the next batch."
        )

    with open(tracking_file, "r", encoding="utf-8") as f:
        processed_case_ids = json.load(f)
    processed_set = set(int(cid) for cid in processed_case_ids)
    print(f"[Step 1] Loaded {len(processed_set)} previously processed case IDs from tracking file.")

    # Step 2: Read reports and classify remaining cases
    print("[Step 2] Reading indiana_reports.csv and classifying remaining cases...")
    reports = pd.read_csv(reports_path)
    projections = pd.read_csv(projections_path)

    total_reports_count = len(reports)

    # Classify each case as 'normal' (Problems == 'normal', case-insensitive) or 'abnormal'
    is_normal = reports['Problems'].astype(str).str.strip().str.lower() == 'normal'
    reports['classification'] = is_normal.map({True: 'normal', False: 'abnormal'})

    # Exclude already processed cases
    remaining_reports = reports[~reports['uid'].isin(processed_set)].copy()
    remaining_normal = remaining_reports[remaining_reports['classification'] == 'normal']
    remaining_abnormal = remaining_reports[remaining_reports['classification'] == 'abnormal']

    print(f"Total reports in dataset: {total_reports_count}")
    print(f"Previously processed: {len(processed_set)}")
    print(f"Remaining pool before batch {batch_number}: {len(remaining_reports)}")
    print(f"  - Remaining normal: {len(remaining_normal)}")
    print(f"  - Remaining abnormal: {len(remaining_abnormal)}")

    if len(remaining_reports) < batch_size:
        raise ValueError(
            f"Requested batch_size ({batch_size}) exceeds remaining cases ({len(remaining_reports)})!"
        )

    # Step 3: Sample cases with 50/50 normal/abnormal balance (or closest possible)
    random_seed = 42 + batch_number
    print(f"\n[Step 3] Sampling {batch_size} cases (50/50 split target, seed={random_seed})...")

    target_normal = batch_size // 2
    target_abnormal = batch_size - target_normal

    avail_normal = len(remaining_normal)
    avail_abnormal = len(remaining_abnormal)

    n_normal = min(target_normal, avail_normal)
    n_abnormal = min(target_abnormal, avail_abnormal)

    # If one group falls short, pull remainder from the other
    if n_normal + n_abnormal < batch_size:
        shortfall = batch_size - (n_normal + n_abnormal)
        if n_normal == avail_normal and avail_abnormal > n_abnormal:
            add = min(shortfall, avail_abnormal - n_abnormal)
            n_abnormal += add
        elif n_abnormal == avail_abnormal and avail_normal > n_normal:
            add = min(shortfall, avail_normal - n_normal)
            n_normal += add

    selected_normal = remaining_normal.sample(n=n_normal, random_state=random_seed)
    selected_abnormal = remaining_abnormal.sample(n=n_abnormal, random_state=random_seed)

    selected_df = pd.concat([selected_normal, selected_abnormal]).sort_values('uid')
    selected_uids = [int(uid) for uid in selected_df['uid']]

    print(f"Selected normal cases: {len(selected_normal)}")
    print(f"Selected abnormal cases: {len(selected_abnormal)}")
    print(f"Total selected cases: {len(selected_df)}")

    # Step 4: Build case batch structure with cleaned text and associated images
    print("\n[Step 4] Building case structure and matching image projections...")
    case_batch = []
    images_to_copy = []

    for _, report in selected_df.iterrows():
        uid = int(report['uid'])
        case_projections = projections[projections['uid'] == uid]

        case_images = []
        for _, row in case_projections.iterrows():
            img_filename = row['filename']
            projection_type = row['projection']
            case_images.append({
                'filename': img_filename,
                'projection': projection_type,
                'path': f"images_batch_{batch_number}/{img_filename}"
            })
            images_to_copy.append(img_filename)

        case_dict = {
            'case_id': uid,
            'classification': report['classification'],
            'problems': str(report['Problems']) if pd.notna(report['Problems']) else "",
            'indication': clean_text(report['indication']),
            'findings': clean_text(report['findings']),
            'impression': clean_text(report['impression']),
            'requested_procedure': "Chest X-ray (PA and Lateral)",
            'images': case_images
        }
        case_batch.append(case_dict)

    # Deduplicate image filenames to copy if any
    unique_images = list(dict.fromkeys(images_to_copy))
    print(f"Cases prepared: {len(case_batch)}")
    print(f"Total image files to copy: {len(unique_images)}")

    # Step 5: Save JSON and copy images
    print(f"\n[Step 5] Saving batch JSON and copying images...")
    os.makedirs(dst_images_dir, exist_ok=True)

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(case_batch, f, indent=2, ensure_ascii=False)
    print(f"Saved batch JSON to: {json_path}")

    copied_count = 0
    for img_filename in unique_images:
        src_file = os.path.join(src_images_dir, img_filename)
        dst_file = os.path.join(dst_images_dir, img_filename)
        if not os.path.exists(src_file):
            raise FileNotFoundError(f"Source image not found: {src_file}")
        shutil.copy2(src_file, dst_file)
        copied_count += 1

    print(f"Copied {copied_count} images to: {dst_images_dir}")

    # Step 6: Create zip archive
    print(f"\n[Step 6] Creating zip archive {os.path.basename(zip_path)}...")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add batch JSON file
        json_arcname = os.path.relpath(json_path, start=dataset_dir)
        zipf.write(json_path, arcname=json_arcname)

        # Add image files for this batch
        for root, dirs, files in os.walk(dst_images_dir):
            for file in files:
                abs_file = os.path.join(root, file)
                rel_path = os.path.relpath(abs_file, start=dataset_dir)
                zipf.write(abs_file, arcname=rel_path)

    zip_size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"Zip created successfully: {zip_path} ({zip_size_mb:.2f} MB)")

    # Step 7: Handle tracking file
    if commit:
        updated_processed_ids = sorted(list(processed_set.union(selected_uids)))
        with open(tracking_file, 'w', encoding='utf-8') as f:
            json.dump(updated_processed_ids, f, indent=2)
        print(f"\n[Tracking] Committed {len(selected_uids)} new case IDs to {tracking_file}.")
    else:
        print(f"\n[Tracking] NOTE: {tracking_file} NOT modified (as requested).")
        print("Selected case_ids will be committed after Colab processing succeeds.")

    # Calculate remaining stats after this batch
    remaining_after_batch = len(remaining_reports) - len(selected_df)
    remaining_normal_after = len(remaining_normal) - len(selected_normal)
    remaining_abnormal_after = len(remaining_abnormal) - len(selected_abnormal)

    # Print summary
    print("\n" + "=" * 60)
    print("BATCH PREPARATION SUMMARY")
    print("=" * 60)
    print(f"Batch Number:                 {batch_number}")
    print(f"Total Cases Selected:         {len(case_batch)}")
    print(f"  - Normal Cases:             {len(selected_normal)} (50.0%)")
    print(f"  - Abnormal Cases:           {len(selected_abnormal)} (50.0%)")
    print(f"Total Images Copied:          {copied_count}")
    print(f"Batch JSON File:              {json_path}")
    print(f"Batch Images Directory:       {dst_images_dir}")
    print(f"Batch Zip Archive:            {zip_path}")
    print(f"Final Zip File Size:          {zip_size_mb:.2f} MB")
    print("-" * 60)
    print(f"Cases Unprocessed Remaining:  {remaining_after_batch}")
    print(f"  - Remaining Normal:         {remaining_normal_after}")
    print(f"  - Remaining Abnormal:       {remaining_abnormal_after}")
    print("=" * 60)

    print("\nSelected Case IDs for this batch:")
    print(selected_uids)
    print(f"\nTotal selected case IDs: {len(selected_uids)}")

    return {
        "batch_number": batch_number,
        "total_selected": len(case_batch),
        "normal_count": len(selected_normal),
        "abnormal_count": len(selected_abnormal),
        "copied_images": copied_count,
        "zip_path": zip_path,
        "zip_size_mb": zip_size_mb,
        "remaining_unprocessed": remaining_after_batch,
        "remaining_normal": remaining_normal_after,
        "remaining_abnormal": remaining_abnormal_after,
        "selected_case_ids": selected_uids,
    }


def main():
    parser = argparse.ArgumentParser(description="Prepare next batch of IU X-Ray cases for MedGemma.")
    parser.add_argument("--batch-number", type=int, required=True, help="Batch number (e.g. 2)")
    parser.add_argument("--batch-size", type=int, required=True, help="Number of cases to select (e.g. 400)")
    parser.add_argument(
        "--commit",
        action="store_true",
        default=False,
        help="Update processed_case_ids.json immediately (default: False)",
    )

    args = parser.parse_args()
    prepare_batch(batch_number=args.batch_number, batch_size=args.batch_size, commit=args.commit)


if __name__ == "__main__":
    main()
