import os
import json
import shutil
import zipfile
import pandas as pd

def main():
    base_dir = r"C:\Users\NILESH MARATHE\OneDrive\Desktop\AI PORJECT"
    dataset_dir = os.path.join(base_dir, "AI_PORJECT_DATASET")
    archive_dir = os.path.join(dataset_dir, "archive (7)")
    reports_path = os.path.join(archive_dir, "indiana_reports.csv")
    projections_path = os.path.join(archive_dir, "indiana_projections.csv")
    src_images_dir = os.path.join(archive_dir, "images", "images_normalized")

    colab_dir = os.path.join(dataset_dir, "colab_upload")
    dst_images_dir = os.path.join(colab_dir, "images")
    json_path = os.path.join(colab_dir, "case_batch.json")
    zip_path = os.path.join(dataset_dir, "colab_upload.zip")

    print("[Step 1] Reading indiana_reports.csv and classifying cases...")
    reports = pd.read_csv(reports_path)
    projections = pd.read_csv(projections_path)

    # Classify each case as 'normal' (Problems == 'normal', case-insensitive) or 'abnormal'
    is_normal = reports['Problems'].astype(str).str.strip().str.lower() == 'normal'
    reports['classification'] = is_normal.map({True: 'normal', False: 'abnormal'})

    normal_df = reports[is_normal]
    abnormal_df = reports[~is_normal]

    print(f"Total reports available: {len(reports)}")
    print(f"  - Total normal cases: {len(normal_df)}")
    print(f"  - Total abnormal cases: {len(abnormal_df)}")

    print("\n[Step 2] Sampling 75 normal and 75 abnormal cases (seed=42)...")
    selected_normal = normal_df.sample(n=75, random_state=42)
    selected_abnormal = abnormal_df.sample(n=75, random_state=42)

    print(f"Selected normal cases: {len(selected_normal)}")
    print(f"Selected abnormal cases: {len(selected_abnormal)}")
    print(f"Total selected cases: {len(selected_normal) + len(selected_abnormal)}")

    print("\nSample 5 'Problems' values from abnormal group:")
    for i, prob in enumerate(selected_abnormal['Problems'].head(5), 1):
        print(f"  {i}. {prob}")

    selected_cases_df = pd.concat([selected_normal, selected_abnormal]).sort_values('uid')

    print("\n[Step 3] Gathering full case data and cleaning redacted tokens...")
    def clean_text(text):
        if pd.isna(text):
            return ""
        return str(text).replace("XXXX", "[REDACTED]")

    case_batch = []
    images_to_copy = []

    for _, report in selected_cases_df.iterrows():
        uid = int(report['uid'])
        case_projections = projections[projections['uid'] == uid]

        case_images = []
        for _, row in case_projections.iterrows():
            img_filename = row['filename']
            projection_type = row['projection']
            case_images.append({
                'filename': img_filename,
                'projection': projection_type,
                'path': f"images/{img_filename}"
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

    print(f"Processed {len(case_batch)} cases with a total of {len(images_to_copy)} images.")

    print("\n[Step 4 & 5] Creating directories, saving JSON, and copying images...")
    os.makedirs(dst_images_dir, exist_ok=True)

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(case_batch, f, indent=2, ensure_ascii=False)
    print(f"Saved case data JSON to: {json_path}")

    copied_count = 0
    for img_filename in images_to_copy:
        src_file = os.path.join(src_images_dir, img_filename)
        dst_file = os.path.join(dst_images_dir, img_filename)
        if not os.path.exists(src_file):
            raise FileNotFoundError(f"Source image not found: {src_file}")
        shutil.copy2(src_file, dst_file)
        copied_count += 1

    print(f"Successfully copied {copied_count} images to: {dst_images_dir}")

    print("\n[Step 6] Creating zip archive colab_upload.zip...")
    # Create zip file containing colab_upload folder structure
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(colab_dir):
            for file in files:
                abs_file = os.path.join(root, file)
                rel_path = os.path.relpath(abs_file, start=dataset_dir)
                zipf.write(abs_file, arcname=rel_path)

    zip_size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"Created zip archive: {zip_path}")
    print(f"Final zip size: {zip_size_mb:.2f} MB")

    print("\n" + "="*50)
    print("SUMMARY")
    print("="*50)
    print(f"Total number of cases in the batch: {len(case_batch)}")
    print(f"  - Normal cases: {len(selected_normal)}")
    print(f"  - Abnormal cases: {len(selected_abnormal)}")
    print(f"Total number of images copied: {copied_count}")
    print(f"Final size of colab_upload.zip: {zip_size_mb:.2f} MB")
    print("="*50)

if __name__ == "__main__":
    main()
