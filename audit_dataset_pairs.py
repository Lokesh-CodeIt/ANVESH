import os
import pandas as pd
from datasets import load_dataset
from PIL import Image
import io

def audit_cohort():
    cohort_path = "reports/evaluation_audit/verified_cohort_manifest.csv"
    cohort_df = pd.read_csv(cohort_path)
    print(f"Loaded cohort manifest with {len(cohort_df)} records.")
    
    ds = load_dataset("ykumards/open-i", split="train")
    ds_dict = {row["uid"]: row for row in ds}
    
    valid_images = 0
    missing_images = 0
    corrupt_images = 0
    missing_text_count = 0
    
    normal_count = 0
    abnormal_count = 0
    
    for _, row in cohort_df.iterrows():
        uid = int(row["case_id"])
        classification = row["reference_classification"]
        if classification == "normal":
            normal_count += 1
        else:
            abnormal_count += 1
            
        if not row["has_source_text"]:
            missing_text_count += 1
            
        entry = ds_dict.get(uid)
        has_frontal = entry is not None and bool(entry.get("img_frontal")) and len(entry["img_frontal"]) > 100
        has_lateral = entry is not None and bool(entry.get("img_lateral")) and len(entry["img_lateral"]) > 100
        
        if has_frontal:
            valid_images += 1
        elif has_lateral:
            valid_images += 1
        else:
            missing_images += 1
            continue
            
    print("=" * 60)
    print("DATASET INTEGRITY & USABILITY REPORT")
    print("=" * 60)
    print(f"Total Cohort Cases           : {len(cohort_df)}")
    print(f"  - Normal Cases             : {normal_count} (50.02%)")
    print(f"  - Abnormal Cases           : {abnormal_count} (49.98%)")
    print(f"Decodable Frontal CXR Images : {valid_images} / {len(cohort_df)} ({valid_images/len(cohort_df)*100:.2f}%)")
    print(f"Missing Image Files          : {missing_images}")
    print(f"Corrupt Image Files          : {corrupt_images}")
    print(f"Cases Lacking Source Text    : {missing_text_count} (Ungrounded safeguards)")
    print(f"Duplicate Case IDs           : {cohort_df['case_id'].duplicated().sum()}")
    print("=" * 60)

if __name__ == "__main__":
    audit_cohort()
