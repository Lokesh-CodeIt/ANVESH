"""
ANVESH Medical AI Research: Image-Only Dataset Preparation
Creates image-only dataset splits strictly devoid of radiologist dictation, findings, or impressions.
Uses the identical case partitions (1,474 train, 211 val, 422 test) from anvesh_dataset/.
"""

import os
import json

IMAGE_ONLY_DIR = "anvesh_dataset_image_only"
SOURCE_DIR = "anvesh_dataset"

IMAGE_ONLY_PROMPT = """You are a thoracic radiology AI assistant. Analyze this chest radiograph carefully.
Determine whether this radiograph shows any cardiopulmonary or thoracic abnormality, or if it is normal.
Respond ONLY with a valid JSON object matching this schema:
{
  "classification": "normal" or "abnormal",
  "findings": ["visual findings observed in the image"],
  "confidence": "high" or "medium" or "low"
}"""

def make_target(classification: str) -> str:
    if classification == "abnormal":
        return json.dumps({
            "classification": "abnormal",
            "findings": ["Radiographic evidence of thoracic or cardiopulmonary abnormality."],
            "confidence": "high"
        })
    else:
        return json.dumps({
            "classification": "normal",
            "findings": ["Clear lung fields, normal cardiothoracic ratio, no acute abnormality."],
            "confidence": "high"
        })

def main():
    os.makedirs(IMAGE_ONLY_DIR, exist_ok=True)
    print("Preparing Image-Only Dataset with zero clinical report text...")
    
    for split in ["train", "val", "test"]:
        src_path = os.path.join(SOURCE_DIR, f"{split}.json")
        with open(src_path, "r", encoding="utf-8") as f:
            records = json.load(f)
            
        new_records = []
        for r in records:
            cls = r["classification"]
            new_records.append({
                "case_id": r["case_id"],
                "image_path": r["image_path"],
                "prompt": IMAGE_ONLY_PROMPT,
                "target": make_target(cls),
                "classification": cls,
                "split": split
            })
            
        dst_path = os.path.join(IMAGE_ONLY_DIR, f"{split}.json")
        with open(dst_path, "w", encoding="utf-8") as f:
            json.dump(new_records, f, indent=2)
            
        print(f"  {split}: {len(new_records)} cases (Normal: {sum(1 for x in new_records if x['classification']=='normal')}, Abnormal: {sum(1 for x in new_records if x['classification']=='abnormal')})")

    print("Image-only dataset preparation complete. Saved to:", IMAGE_ONLY_DIR)

if __name__ == "__main__":
    main()
