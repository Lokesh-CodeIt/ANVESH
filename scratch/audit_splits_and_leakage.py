import os
import json
import hashlib
from collections import defaultdict

def hash_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

def main():
    print("=" * 80)
    print("PHASE 1 & 2 AUDIT: DATASET SPLITS, MANIFESTS, LEAKAGE & PATIENT/STUDY SEPARATION")
    print("=" * 80)

    with open("anvesh_dataset_image_only/train.json", "r") as f:
        train_data = json.load(f)
    with open("anvesh_dataset_image_only/val.json", "r") as f:
        val_data = json.load(f)
    with open("anvesh_dataset_image_only/test.json", "r") as f:
        test_data = json.load(f)

    print(f"Train cases: {len(train_data)}")
    print(f"Val cases  : {len(val_data)}")
    print(f"Test cases : {len(test_data)}")
    print(f"Total      : {len(train_data) + len(val_data) + len(test_data)}")

    # Check case_id overlaps
    train_ids = set(x["case_id"] for x in train_data)
    val_ids = set(x["case_id"] for x in val_data)
    test_ids = set(x["case_id"] for x in test_data)

    print(f"\nCase ID Overlaps:")
    print(f"  Train & Val : {len(train_ids & val_ids)}")
    print(f"  Train & Test: {len(train_ids & test_ids)}")
    print(f"  Val & Test  : {len(val_ids & test_ids)}")

    # Check image path overlaps
    train_paths = set(x["image_path"] for x in train_data)
    val_paths = set(x["image_path"] for x in val_data)
    test_paths = set(x["image_path"] for x in test_data)

    print(f"\nImage Path Overlaps:")
    print(f"  Train & Val : {len(train_paths & val_paths)}")
    print(f"  Train & Test: {len(train_paths & test_paths)}")
    print(f"  Val & Test  : {len(val_paths & test_paths)}")

    # Check physical file existence and content hashes (to check for duplicate images with different names)
    print("\nComputing SHA-256 hashes of physical image files to detect duplicate images across splits...")
    hash_to_split = defaultdict(list)
    missing_files = []

    for split_name, dataset in [("train", train_data), ("val", val_data), ("test", test_data)]:
        for item in dataset:
            full_p = os.path.join("anvesh_dataset", item["image_path"])
            if not os.path.exists(full_p):
                missing_files.append((split_name, item["case_id"], full_p))
            else:
                img_hash = hash_file(full_p)
                hash_to_split[img_hash].append((split_name, item["case_id"], item["image_path"]))

    print(f"Missing image files: {len(missing_files)}")

    duplicate_across_splits = []
    duplicate_within_splits = []
    for h, items in hash_to_split.items():
        if len(items) > 1:
            splits_seen = set(x[0] for x in items)
            if len(splits_seen) > 1:
                duplicate_across_splits.append((h, items))
            else:
                duplicate_within_splits.append((h, items))

    print(f"Identical image files across splits: {len(duplicate_across_splits)}")
    if duplicate_across_splits:
        for h, items in duplicate_across_splits[:5]:
            print(f"  Hash {h[:12]}: {items}")

    print(f"Identical image files within same split: {len(duplicate_within_splits)}")
    if duplicate_within_splits:
        for h, items in duplicate_within_splits[:5]:
            print(f"  Hash {h[:12]}: {items}")

    # Check if indiana_reports.csv or metadata exists to find patient identifiers
    print("\nChecking for source reports / patient metadata:")
    report_candidates = [
        "indiana_reports.csv",
        "anvesh_dataset/indiana_reports.csv",
        "anvesh_dataset/reports.json",
        "anvesh_dataset/dataset_manifest.json"
    ]
    for p in report_candidates:
        if os.path.exists(p):
            print(f"  Found metadata file: {p} ({os.path.getsize(p)} bytes)")

if __name__ == "__main__":
    main()
