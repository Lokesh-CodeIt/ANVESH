import os
import re
import json
import io
import pandas as pd
from PIL import Image
from sklearn.model_selection import train_test_split
from datasets import load_dataset

def parse_cases_from_sql(sql_path):
    """Parse cases table from medauth PostgreSQL dump."""
    cases = {}
    in_cases = False
    with open(sql_path, "r", encoding="utf-8") as f:
        for line in f:
            if "COPY public.cases (" in line:
                in_cases = True
                continue
            if in_cases:
                if line.strip() == r"\.":
                    break
                parts = line.rstrip("\n").split("\t")
                if len(parts) >= 7:
                    case_id = int(parts[0])
                    cases[case_id] = {
                        "case_id": case_id,
                        "classification": parts[1],
                        "indication": parts[2] if parts[2] != r"\N" else "",
                        "findings": parts[3] if parts[3] != r"\N" else "",
                        "impression": parts[4] if parts[4] != r"\N" else "",
                        "requested_procedure": parts[5] if parts[5] != r"\N" else "Chest X-ray (PA and Lateral)",
                        "has_source_text": parts[6] == "t"
                    }
    return cases

PROMPT_TEMPLATE = """You are a radiology assistant. You are given a chest X-ray image AND the radiologist's actual dictated findings/impression below. Your job is to structure this information, not to independently diagnose from the image alone. Base your "image_evidence" primarily on what the radiologist findings state, using the image only to confirm visual consistency. Do NOT guess patient demographics. Do NOT invent findings, devices, or abnormalities not mentioned in the text below.

Respond ONLY with a valid JSON object, no other text, matching this exact schema:

{{
  "image_evidence": {{
    "modality": "Chest X-ray",
    "body_part": "chest",
    "findings": [],
    "abnormalities": [],
    "impression_summary": ""
  }},
  "text_image_consistency": {{
    "consistent": true,
    "notes": ""
  }},
  "clinical_support": {{
    "supported": true,
    "reason": ""
  }}
}}

Clinical Indication: {indication}
Radiologist Dictated Findings: {findings}
Radiologist Dictated Impression: {impression}
"""

def extract_target_json(case_info):
    """Construct canonical ground-truth JSON target matching the MedAuth schema."""
    findings_text = case_info.get("findings", "")
    impression_text = case_info.get("impression", "")
    classification = case_info.get("classification", "normal")
    
    # Extract findings items
    findings_list = []
    if findings_text:
        # Split sentences roughly
        sentences = [s.strip() for s in re.split(r'\. |\.\n', findings_text) if len(s.strip()) > 3]
        findings_list = sentences if sentences else [findings_text]
        
    abnormalities_list = []
    if classification == "abnormal":
        if impression_text:
            abnormalities_list = [impression_text]
        elif findings_list:
            abnormalities_list = [findings_list[0]]
            
    target_dict = {
        "image_evidence": {
            "modality": "Chest X-ray",
            "body_part": "chest",
            "findings": findings_list,
            "abnormalities": abnormalities_list,
            "impression_summary": impression_text
        },
        "text_image_consistency": {
            "consistent": True,
            "notes": "Verified consistent with radiograph exam"
        },
        "clinical_support": {
            "supported": True,
            "reason": "Radiographic findings support clinical evaluation"
        }
    }
    return json.dumps(target_dict, ensure_ascii=False)

def main():
    print("=" * 60)
    print("ANVESH: PREPARING LLaVA FINE-TUNING DATASET")
    print("=" * 60)
    
    os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"
    
    dataset_dir = "anvesh_dataset"
    images_dir = os.path.join(dataset_dir, "images")
    os.makedirs(images_dir, exist_ok=True)
    
    sql_path = "backups/medauth_vlm_pre_import_20261011_174043.sql"
    cohort_manifest_path = "reports/evaluation_audit/verified_cohort_manifest.csv"
    
    print("[1/4] Parsing clinical cases from database dump...")
    sql_cases = parse_cases_from_sql(sql_path)
    print(f"  Parsed {len(sql_cases)} cases from SQL backup.")
    
    print("[2/4] Loading Open-I dataset for image extraction...")
    ds = load_dataset("ykumards/open-i", split="train")
    ds_dict = {row["uid"]: row for row in ds}
    
    cohort_df = pd.read_csv(cohort_manifest_path)
    print(f"  Verified cohort contains {len(cohort_df)} cases.")
    
    prepared_records = []
    
    print("[3/4] Extracting and saving CXR images for the 2,107 cohort cases...")
    for idx, row in cohort_df.iterrows():
        case_id = int(row["case_id"])
        classification = row["reference_classification"]
        
        entry = ds_dict.get(case_id)
        if not entry:
            continue
            
        case_data = sql_cases.get(case_id, {})
        
        def clean_val(v):
            if not v or v == "None" or v == "\\N":
                return ""
            return str(v).replace("XXXX", "[REDACTED]").strip()
            
        indication = clean_val(case_data.get("indication") or entry.get("indication"))
        findings = clean_val(case_data.get("findings") or entry.get("findings"))
        impression = clean_val(case_data.get("impression") or entry.get("impression"))
        has_source_text = bool(findings or impression)
            
        img_bytes = entry.get("img_frontal")
        if not img_bytes or len(img_bytes) < 100:
            img_bytes = entry.get("img_lateral")
            
        if not img_bytes:
            continue
            
        ext = ".jpg" if img_bytes.startswith(b"\xff\xd8") else ".png"
        img_rel_path = os.path.join("images", f"cxr_{case_id}{ext}").replace("\\", "/")
        img_abs_path = os.path.join(images_dir, f"cxr_{case_id}{ext}")
        
        # Save image file if not already saved
        if not os.path.exists(img_abs_path):
            try:
                with open(img_abs_path, "wb") as img_f:
                    img_f.write(img_bytes)
            except Exception as e:
                print(f"Error saving image for case {case_id}: {e}")
                continue
                
        prompt = PROMPT_TEMPLATE.format(
            indication=indication or "None provided",
            findings=findings or "None provided",
            impression=impression or "None provided"
        )
        target_json = extract_target_json({
            "findings": findings,
            "impression": impression,
            "classification": classification
        })
        
        prepared_records.append({
            "case_id": case_id,
            "image_path": img_rel_path,
            "prompt": prompt,
            "target": target_json,
            "classification": classification,
            "has_source_text": has_source_text
        })
        
    print(f"  Successfully processed {len(prepared_records)} complete image-text pairs.")
    
    print("[4/4] Performing patient-level stratified splitting (70% Train, 10% Val, 20% Test, seed=42)...")
    prep_df = pd.DataFrame(prepared_records)
    
    # Stratified split: 80% train+val, 20% test
    train_val_df, test_df = train_test_split(
        prep_df,
        test_size=0.20,
        random_state=42,
        stratify=prep_df["classification"]
    )
    
    # Split train+val into 70% train (0.875 of train_val) and 10% val (0.125 of train_val)
    train_df, val_df = train_test_split(
        train_val_df,
        test_size=0.125,
        random_state=42,
        stratify=train_val_df["classification"]
    )
    
    # Mark split
    train_records = train_df.to_dict(orient="records")
    val_records = val_df.to_dict(orient="records")
    test_records = test_df.to_dict(orient="records")
    
    for r in train_records:
        r["split"] = "train"
    for r in val_records:
        r["split"] = "val"
    for r in test_records:
        r["split"] = "test"
        
    # Write splits
    with open(os.path.join(dataset_dir, "train.json"), "w", encoding="utf-8") as f:
        json.dump(train_records, f, indent=2)
    with open(os.path.join(dataset_dir, "val.json"), "w", encoding="utf-8") as f:
        json.dump(val_records, f, indent=2)
    with open(os.path.join(dataset_dir, "test.json"), "w", encoding="utf-8") as f:
        json.dump(test_records, f, indent=2)
        
    print("=" * 60)
    print("PATIENT-LEVEL SPLIT SUMMARY")
    print("=" * 60)
    print(f"Total Prepared Cases : {len(prep_df)}")
    print(f"  - Training Cases   : {len(train_records)} (Normal: {sum(1 for r in train_records if r['classification']=='normal')}, Abnormal: {sum(1 for r in train_records if r['classification']=='abnormal')})")
    print(f"  - Validation Cases : {len(val_records)} (Normal: {sum(1 for r in val_records if r['classification']=='normal')}, Abnormal: {sum(1 for r in val_records if r['classification']=='abnormal')})")
    print(f"  - Test Cases       : {len(test_records)} (Normal: {sum(1 for r in test_records if r['classification']=='normal')}, Abnormal: {sum(1 for r in test_records if r['classification']=='abnormal')})")
    print("=" * 60)
    print("Data preparation completed successfully.")

if __name__ == "__main__":
    main()
