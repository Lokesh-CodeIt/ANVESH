import json
import os
import numpy as np
from PIL import Image

# Compare validation and test sets
with open("anvesh_dataset_image_only/val.json") as f:
    val_data = json.load(f)
with open("anvesh_dataset_image_only/test.json") as f:
    test_data = json.load(f)
with open("anvesh_dataset_image_only/train.json") as f:
    train_data = json.load(f)

print(f"Train size: {len(train_data)}")
print(f"Val size: {len(val_data)} (Normal: {sum(1 for x in val_data if x['classification']=='normal')}, Abnormal: {sum(1 for x in val_data if x['classification']=='abnormal')})")
print(f"Test size: {len(test_data)} (Normal: {sum(1 for x in test_data if x['classification']=='normal')}, Abnormal: {sum(1 for x in test_data if x['classification']=='abnormal')})")

# Check original dataset metadata (e.g. findings, indications, case_ids)
orig_val = json.load(open("anvesh_dataset/val.json"))
orig_test = json.load(open("anvesh_dataset/test.json"))

# Inspect case IDs
val_ids = [x["case_id"] for x in orig_val]
test_ids = [x["case_id"] for x in orig_test]

print("\nSample Val Case IDs:", val_ids[:10])
print("Sample Test Case IDs:", test_ids[:10])

# Inspect original findings or targets in anvesh_dataset
print("\nSample Val target/prompt:", orig_val[0])
print("\nSample Test target/prompt:", orig_test[0])

# Check image sizes in val vs test
def get_image_stats(records, base_dir="anvesh_dataset"):
    sizes = []
    aspect_ratios = []
    for r in records[:50]:
        img_p = os.path.join(base_dir, r["image_path"])
        with Image.open(img_p) as im:
            w, h = im.size
            sizes.append((w, h))
            aspect_ratios.append(w / h)
    return np.mean([s[0] for s in sizes]), np.mean([s[1] for s in sizes]), np.mean(aspect_ratios)

vw, vh, va = get_image_stats(orig_val)
tw, th, ta = get_image_stats(orig_test)
print(f"\nVal Image Dimensions: {vw:.1f} x {vh:.1f} (aspect: {va:.3f})")
print(f"Test Image Dimensions: {tw:.1f} x {th:.1f} (aspect: {ta:.3f})")

# Check keyword presence in clinical text for val vs test to see pathology difficulty
keywords = ["cardiomegaly", "pneumonia", "effusion", "infiltrate", "atelectasis", "edema", "nodule", "fracture", "consolidation", "normal"]
def count_keywords(records):
    counts = {kw: 0 for kw in keywords}
    for r in records:
        txt = (r.get("target", "") + " " + r.get("prompt", "")).lower()
        for kw in keywords:
            if kw in txt:
                counts[kw] += 1
    return counts

val_kw = count_keywords(orig_val)
test_kw = count_keywords(orig_test)

print("\nKeyword distributions in underlying radiology text:")
for kw in keywords:
    v_pct = val_kw[kw] / len(orig_val) * 100
    t_pct = test_kw[kw] / len(orig_test) * 100
    print(f"  {kw:15s}: Val={v_pct:5.1f}% | Test={t_pct:5.1f}% | Diff={t_pct - v_pct:+5.1f}%")
