"""
MedAuth-VLM: Targeted Recovery Script for 43 Missing Batch 5 Cases
Model: google/medgemma-4b-it
Runtime: Google Colab (T4 GPU) or local CUDA GPU

This script processes ONLY the 43 missing Batch 5 cases, preserving the
canonical schema:
    {
        "case_id": int,
        "evidence": {
            "image_evidence": {...},
            "text_image_consistency": {...},
            "clinical_support": {...}
        },
        "raw_model_output": str
    }

Features:
- Idempotent by case_id: skips already-processed cases upon rerun.
- Atomic file writes (.tmp -> .json) to prevent corruption on disconnect.
- Saves progress after every individual case.
"""

import gc
import json
import os
import re
import sys
from typing import Dict, List, Set

import torch
from PIL import Image
from transformers import AutoModelForImageTextToText, AutoProcessor


MODEL_ID = "google/medgemma-4b-it"

# Paths (adaptable for Google Colab or local GPU)
# For Colab: set DATA_DIR to where the recovery zip or batch 5 folder is extracted
DATA_DIR = os.environ.get("MEDAUTH_DATA_DIR", "/content/colab_upload")
MANIFEST_PATH = os.path.join(DATA_DIR, "case_batch_5_recovery_43.json")
IMAGES_DIR = os.path.join(DATA_DIR, "images_batch_5")
OUTPUT_PATH = os.environ.get("MEDAUTH_OUTPUT_PATH", "/content/drive/MyDrive/evidence_batch_5_recovered_43.json")
TMP_OUTPUT_PATH = OUTPUT_PATH + ".tmp"


EXTRACTION_PROMPT_TEMPLATE = """You are a radiology assistant. You are given a chest X-ray image AND the radiologist's actual dictated findings/impression below. Your job is to structure this information, not to independently diagnose from the image alone. Base your "image_evidence" primarily on what the radiologist findings state, using the image only to confirm visual consistency. Do NOT guess patient demographics. Do NOT invent findings, devices, or abnormalities not mentioned in the text below.

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


def extract_evidence(model, processor, image: Image.Image, indication: str, findings: str, impression: str) -> str:
    prompt = EXTRACTION_PROMPT_TEMPLATE.format(
        indication=indication or "None provided",
        findings=findings or "None provided",
        impression=impression or "None provided",
    )

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image"},
                {"type": "text", "text": prompt},
            ],
        }
    ]

    text = processor.apply_chat_template(messages, add_generation_prompt=True)
    inputs = processor(text=text, images=image, return_tensors="pt").to(model.device)

    with torch.no_grad():
        generated_ids = model.generate(
            **inputs,
            max_new_tokens=1024,
            do_sample=False,
        )

    # Decode only the generated tokens
    prompt_len = inputs["input_ids"].shape[1]
    response = processor.decode(generated_ids[0][prompt_len:], skip_special_tokens=True)
    return response.strip()


def run_recovery():
    print("=" * 70)
    print("MEDAUTH-VLM: BATCH 5 (43 MISSING CASES) RECOVERY RUNNER")
    print("=" * 70)

    if not torch.cuda.is_available():
        print("[WARNING] CUDA is not available! MedGemma 4B requires a GPU (e.g. Colab T4).", file=sys.stderr)
        if "--force-cpu" not in sys.argv:
            print("Aborting. Run on Google Colab or specify --force-cpu if intentional.", file=sys.stderr)
            sys.exit(1)

    if not os.path.exists(MANIFEST_PATH):
        raise FileNotFoundError(f"Recovery manifest not found at: {MANIFEST_PATH}")
    if not os.path.exists(IMAGES_DIR):
        raise FileNotFoundError(f"Images directory not found at: {IMAGES_DIR}")

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        cases: List[Dict] = json.load(f)

    print(f"Loaded {len(cases)} cases to process from {MANIFEST_PATH}.")

    # Load existing progress if resuming
    results: List[Dict] = []
    done_ids: Set[int] = set()

    if os.path.exists(OUTPUT_PATH):
        try:
            with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
                results = json.load(f)
            done_ids = {int(r["case_id"]) for r in results if r.get("evidence") is not None}
            print(f"[Resume] Found {len(done_ids)} previously completed cases in {OUTPUT_PATH}.")
        except Exception as e:
            print(f"[Warning] Could not load checkpoint from {OUTPUT_PATH}: {e}")

    remaining_cases = [c for c in cases if int(c["case_id"]) not in done_ids]
    print(f"[Progress] Total: {len(cases)} | Done: {len(done_ids)} | Remaining: {len(remaining_cases)}")

    if not remaining_cases:
        print("All 43 cases have already been recovered! Nothing to do.")
        return

    # Load Model & Processor
    print(f"\nLoading model {MODEL_ID}...")
    processor = AutoProcessor.from_pretrained(MODEL_ID)
    model = AutoModelForImageTextToText.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
        device_map="auto" if torch.cuda.is_available() else None,
    )
    model.eval()
    print("Model loaded successfully.")

    # Main inference loop
    for idx, case in enumerate(remaining_cases, start=1):
        cid = int(case["case_id"])
        print(f"\n[{idx}/{len(remaining_cases)}] Processing Case ID {cid}...")

        # Find Frontal projection first, fallback to first image
        images = case.get("images", [])
        if not images:
            print(f"  [ERROR] Case {cid} has no image entries! Logging error.")
            results.append({"case_id": cid, "evidence": None, "error": "no_images_in_case"})
            continue

        frontal = next((img for img in images if img.get("projection") == "Frontal"), images[0])
        fname = frontal.get("filename")
        img_path = os.path.join(IMAGES_DIR, fname)

        if not os.path.exists(img_path):
            print(f"  [ERROR] Image not found: {img_path}")
            results.append({"case_id": cid, "evidence": None, "error": f"image_missing_{fname}"})
            continue

        try:
            pil_img = Image.open(img_path).convert("RGB")
            raw_output = extract_evidence(
                model=model,
                processor=processor,
                image=pil_img,
                indication=case.get("indication", ""),
                findings=case.get("findings", ""),
                impression=case.get("impression", ""),
            )

            # Parse JSON from markdown code fence
            m = re.search(r"\{.*\}", raw_output, re.DOTALL)
            if m:
                ev_data = json.loads(m.group())
                results.append({
                    "case_id": cid,
                    "evidence": ev_data,
                    "raw_model_output": raw_output,
                })
                print(f"  [SUCCESS] Extracted evidence for Case {cid}.")
            else:
                print(f"  [ERROR] No valid JSON block in output for Case {cid}.")
                results.append({
                    "case_id": cid,
                    "evidence": None,
                    "raw_model_output": raw_output,
                    "error": "json_parse_failed",
                })

        except Exception as e:
            print(f"  [EXCEPTION] Failed processing Case {cid}: {e}")
            results.append({
                "case_id": cid,
                "evidence": None,
                "error": str(e),
            })

        # Memory cleanup
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        gc.collect()

        # Atomic incremental save
        os.makedirs(os.path.dirname(os.path.abspath(OUTPUT_PATH)), exist_ok=True)
        with open(TMP_OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        os.replace(TMP_OUTPUT_PATH, OUTPUT_PATH)

    print("\n" + "=" * 70)
    print(f"RECOVERY COMPLETE: {len(results)} records saved to {OUTPUT_PATH}")
    print("=" * 70)


if __name__ == "__main__":
    run_recovery()
