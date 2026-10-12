"""
MedAuth-VLM: Lightweight Recovery Packager for 43 Missing Batch 5 Cases
Creates: AI_PORJECT_DATASET/colab_upload_batch_5_recovery_43.zip
Contents:
- colab_upload/case_batch_5_recovery_43.json
- colab_upload/images_batch_5/<85 image files>
"""

import json
import os
import zipfile


def package_recovery():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_dir = os.path.join(base_dir, "AI_PORJECT_DATASET")
    manifest_path = os.path.join(dataset_dir, "colab_upload", "case_batch_5_recovery_43.json")
    src_images_dir = os.path.join(dataset_dir, "archive (7)", "images", "images_normalized")
    zip_out = os.path.join(dataset_dir, "colab_upload_batch_5_recovery_43.zip")

    if not os.path.exists(manifest_path):
        raise FileNotFoundError(f"Missing manifest: {manifest_path}")

    with open(manifest_path, "r", encoding="utf-8") as f:
        cases = json.load(f)

    print(f"Packaging {len(cases)} cases for Batch 5 recovery...")

    # Gather images
    image_filenames = []
    for c in cases:
        for img in c.get("images", []):
            image_filenames.append(img["filename"])

    unique_images = list(dict.fromkeys(image_filenames))
    print(f"Total unique images to package: {len(unique_images)}")

    with zipfile.ZipFile(zip_out, "w", zipfile.ZIP_DEFLATED) as z:
        # Add manifest
        z.write(manifest_path, arcname="colab_upload/case_batch_5_recovery_43.json")
        # Add images
        for idx, fname in enumerate(unique_images, 1):
            src_fp = os.path.join(src_images_dir, fname)
            if not os.path.exists(src_fp):
                raise FileNotFoundError(f"Image not found: {src_fp}")
            z.write(src_fp, arcname=f"colab_upload/images_batch_5/{fname}")

    size_mb = os.path.getsize(zip_out) / (1024 * 1024)
    print(f"\n[SUCCESS] Created {zip_out} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    package_recovery()
