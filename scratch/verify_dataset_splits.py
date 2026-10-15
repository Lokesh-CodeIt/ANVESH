import json
import os
from PIL import Image

def verify():
    base_dir = "anvesh_dataset"
    data_dir = "anvesh_dataset_image_only"
    splits = ["train", "val", "test"]
    split_data = {}
    split_ids = {}
    split_imgs = {}
    
    print("=== DATASET VERIFICATION ===")
    for s in splits:
        p = os.path.join(data_dir, f"{s}.json")
        if not os.path.exists(p):
            print(f"ERROR: {p} does not exist!")
            return
        with open(p, "r", encoding="utf-8") as f:
            records = json.load(f)
        split_data[s] = records
        split_ids[s] = [r["case_id"] for r in records]
        split_imgs[s] = [r["image_path"] for r in records]
        
        counts = {}
        for r in records:
            cls = r.get("classification")
            counts[cls] = counts.get(cls, 0) + 1
            
        print(f"Split '{s}': Total = {len(records)}, Class counts = {counts}")
        
        # Check within-split duplicates
        unique_ids = set(split_ids[s])
        if len(unique_ids) != len(split_ids[s]):
            print(f"  WARNING: Duplicate case_ids in {s}! ({len(split_ids[s])} vs {len(unique_ids)} unique)")
        else:
            print(f"  All {len(records)} case_ids in {s} are unique.")
            
        unique_imgs = set(split_imgs[s])
        if len(unique_imgs) != len(split_imgs[s]):
            print(f"  WARNING: Duplicate image_paths in {s}! ({len(split_imgs[s])} vs {len(unique_imgs)} unique)")
        else:
            print(f"  All {len(records)} image_paths in {s} are unique.")

    # Cross-split intersections
    print("\n--- Split Intersection Checks ---")
    for s1, s2 in [("train", "val"), ("train", "test"), ("val", "test")]:
        id_inter = set(split_ids[s1]).intersection(set(split_ids[s2]))
        img_inter = set(split_imgs[s1]).intersection(set(split_imgs[s2]))
        print(f"Intersection {s1} and {s2}: Case ID overlap = {len(id_inter)}, Image overlap = {len(img_inter)}")

    # Check images existence and readability on disk
    print("\n--- Physical Image Verification ---")
    missing_images = []
    unreadable_images = []
    total_images_checked = 0
    for s in splits:
        for r in split_data[s]:
            total_images_checked += 1
            full_path = os.path.join(base_dir, r["image_path"])
            if not os.path.exists(full_path):
                missing_images.append(full_path)
            else:
                try:
                    with Image.open(full_path) as im:
                        im.verify()
                except Exception as e:
                    unreadable_images.append((full_path, str(e)))
                    
    print(f"Total images checked: {total_images_checked}")
    print(f"Missing images: {len(missing_images)}")
    print(f"Unreadable images: {len(unreadable_images)}")
    if missing_images:
        print("Sample missing:", missing_images[:5])
    if unreadable_images:
        print("Sample unreadable:", unreadable_images[:5])
        
    print("\nVerification finished successfully.")

if __name__ == "__main__":
    verify()
