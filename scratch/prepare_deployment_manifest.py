"""
prepare_deployment_manifest.py — Combine all 2,107 verified image-only cases into full_cohort_deployment.json
Used EXCLUSIVELY for final deployment model training after held-out development test evaluation has been frozen.
"""
import os
import json
import hashlib

DATASET_DIR = "anvesh_dataset_image_only"

train_path = os.path.join(DATASET_DIR, "train.json")
val_path = os.path.join(DATASET_DIR, "val.json")
test_path = os.path.join(DATASET_DIR, "test.json")

with open(train_path, "r", encoding="utf-8") as f:
    train_data = json.load(f)
with open(val_path, "r", encoding="utf-8") as f:
    val_data = json.load(f)
with open(test_path, "r", encoding="utf-8") as f:
    test_data = json.load(f)

print(f"Train cases: {len(train_data)}")
print(f"Val cases  : {len(val_data)}")
print(f"Test cases : {len(test_data)}")

full_cohort = train_data + val_data + test_data
print(f"Total Combined Cohort: {len(full_cohort)} cases")

# Verify case IDs are all unique
case_ids = [c["case_id"] for c in full_cohort]
assert len(case_ids) == len(set(case_ids)), "Duplicate case IDs found!"
assert len(full_cohort) == 2107, f"Expected 2107 cases, got {len(full_cohort)}"

# Check class distribution
n_normal = sum(1 for c in full_cohort if c["classification"] == "normal")
n_abnormal = sum(1 for c in full_cohort if c["classification"] == "abnormal")
print(f"Class distribution: {n_normal} normal ({n_normal/len(full_cohort)*100:.1f}%), {n_abnormal} abnormal ({n_abnormal/len(full_cohort)*100:.1f}%)")

out_path = os.path.join(DATASET_DIR, "full_cohort_deployment.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(full_cohort, f, indent=2)

print(f"Successfully saved {len(full_cohort)} cases to {out_path}")

# Calculate SHA-256 hash of manifest
with open(out_path, "rb") as f:
    manifest_hash = hashlib.sha256(f.read()).hexdigest()
print(f"Manifest SHA-256: {manifest_hash}")
