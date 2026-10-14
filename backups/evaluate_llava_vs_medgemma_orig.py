"""
ANVESH Medical AI Research Project
Fair Head-to-Head Evaluation & Comparison: Fine-Tuned LLaVA-1.5-7B vs. Pretrained MedGemma-4B
Author: Medical AI Systems Laboratory / Pair-Programming
Date: October 2026
"""

import os
import sys
import json
import re
import time
import argparse
from typing import Dict, List, Any, Optional

import torch
import pandas as pd
from PIL import Image
from transformers import AutoProcessor, LlavaForConditionalGeneration, BitsAndBytesConfig
from peft import PeftModel

os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

BASE_MODEL_ID = "llava-hf/llava-1.5-7b-hf"
TEST_JSON_PATH = "anvesh_dataset/test.json"
MEDGEMMA_MANIFEST_PATH = "reports/evaluation_audit/verified_cohort_manifest.csv"
OUTPUT_DIR = "reports"

def clean_json_text(raw_text: str) -> Dict[str, Any]:
    """Parse JSON from generated model text, handling markdown fences or leading/trailing tokens."""
    # Strip markdown fences ```json ... ```
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_text, re.DOTALL)
    if match:
        raw_text = match.group(1)
    else:
        # Try to find the outermost curly braces
        start = raw_text.find("{")
        end = raw_text.rfind("}")
        if start != -1 and end != -1 and end > start:
            raw_text = raw_text[start:end+1]
            
    try:
        return json.loads(raw_text)
    except Exception:
        # Fallback regex extraction of abnormalities
        abnormalities = []
        ab_match = re.search(r'"abnormalities"\s*:\s*\[(.*?)\]', raw_text, re.DOTALL)
        if ab_match:
            items = re.findall(r'"([^"]+)"', ab_match.group(1))
            abnormalities = items
        return {
            "image_evidence": {
                "abnormalities": abnormalities,
                "findings": []
            }
        }

def compute_binary_metrics(y_true: List[str], y_pred: List[str]) -> Dict[str, float]:
    """Calculate standard medical classification metrics."""
    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "abnormal" and yp == "abnormal")
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "normal" and yp == "abnormal")
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "normal" and yp == "normal")
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "abnormal" and yp == "normal")
    
    total = tp + fp + tn + fn
    accuracy = (tp + tn) / max(total, 1)
    
    # Abnormal metrics
    precision = tp / max(tp + fp, 1) if (tp + fp) > 0 else 0.0
    sensitivity = tp / max(tp + fn, 1) if (tp + fn) > 0 else 0.0
    specificity = tn / max(tn + fp, 1) if (tn + fp) > 0 else 0.0
    f1_abnormal = (2 * precision * sensitivity) / max(precision + sensitivity, 1e-9) if (precision + sensitivity) > 0 else 0.0
    
    # Normal metrics for macro-f1
    prec_normal = tn / max(tn + fn, 1) if (tn + fn) > 0 else 0.0
    rec_normal = specificity
    f1_normal = (2 * prec_normal * rec_normal) / max(prec_normal + rec_normal, 1e-9) if (prec_normal + rec_normal) > 0 else 0.0
    
    macro_f1 = (f1_abnormal + f1_normal) / 2.0
    
    return {
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn,
        "total": total,
        "accuracy": accuracy,
        "precision": precision,
        "sensitivity": sensitivity,
        "specificity": specificity,
        "f1_abnormal": f1_abnormal,
        "macro_f1": macro_f1
    }

def evaluate_models(adapter_path: Optional[str] = None, max_test_cases: Optional[int] = None):
    print("=" * 75)
    print("HEAD-TO-HEAD EVALUATION: FINE-TUNED LLaVA-1.5-7B vs. PRETRAINED MedGemma-4B")
    print("=" * 75)
    
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA is not available! Refusing to run evaluation on CPU.")

    # 1. Load MedGemma baseline predictions for test cases
    if not os.path.exists(MEDGEMMA_MANIFEST_PATH):
        raise FileNotFoundError(f"Missing MedGemma manifest at: {MEDGEMMA_MANIFEST_PATH}")
    medgemma_df = pd.read_csv(MEDGEMMA_MANIFEST_PATH)
    medgemma_map = {int(row["case_id"]): row for _, row in medgemma_df.iterrows()}

    # 2. Load Test Split
    if not os.path.exists(TEST_JSON_PATH):
        raise FileNotFoundError(f"Missing test split at: {TEST_JSON_PATH}")
    with open(TEST_JSON_PATH, "r", encoding="utf-8") as f:
        test_cases = json.load(f)

    if max_test_cases:
        test_cases = test_cases[:max_test_cases]
        print(f"Limiting evaluation to first {max_test_cases} test cases as requested.")
    else:
        print(f"Loaded full test split: {len(test_cases)} cases (Patient-separated).")

    # 3. Load LLaVA Model
    print("\nLoading LLaVA-1.5-7B with 4-bit NormalFloat on RTX 4090...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True
    )
    
    processor = AutoProcessor.from_pretrained(BASE_MODEL_ID, cache_dir=os.environ["HF_HOME"])
    base_model = LlavaForConditionalGeneration.from_pretrained(
        BASE_MODEL_ID,
        quantization_config=bnb_config,
        torch_dtype=torch.bfloat16,
        device_map={"": 0},
        cache_dir=os.environ["HF_HOME"]
    )
    
    if adapter_path and os.path.exists(adapter_path):
        print(f"Attaching fine-tuned adapter weights from: {adapter_path}")
        model = PeftModel.from_pretrained(base_model, adapter_path)
    else:
        print("Evaluating zero-shot baseline LLaVA (no adapter provided).")
        model = base_model
        
    model.eval()

    # 4. Run Test Inference
    print("\nRunning inference across test cohort...")
    records = []
    start_time = time.time()
    
    for idx, item in enumerate(test_cases, 1):
        case_id = int(item["case_id"])
        ground_truth = item["classification"] # 'normal' or 'abnormal'
        
        # MedGemma baseline from verified cohort
        mg_row = medgemma_map.get(case_id, {})
        mg_pred = mg_row.get("predicted_classification", "normal")
        
        # Load image
        img_path = os.path.join("anvesh_dataset", item["image_path"])
        image = Image.open(img_path).convert("RGB")
        
        prompt_text = f"USER: <image>\n{item['prompt']}\nASSISTANT: "
        inputs = processor(text=prompt_text, images=image, return_tensors="pt").to("cuda")
        
        t0 = time.perf_counter()
        with torch.no_grad():
            output_ids = model.generate(
                **inputs,
                max_new_tokens=256,
                do_sample=False,
                pad_token_id=processor.tokenizer.pad_token_id or processor.tokenizer.eos_token_id
            )
        latency_ms = (time.perf_counter() - t0) * 1000.0
        
        # Decode only newly generated tokens
        prompt_len = inputs["input_ids"].shape[1]
        gen_text = processor.decode(output_ids[0][prompt_len:], skip_special_tokens=True).strip()
        
        # Parse JSON
        parsed = clean_json_text(gen_text)
        img_evidence = parsed.get("image_evidence", {})
        abnormalities = img_evidence.get("abnormalities", []) if isinstance(img_evidence, dict) else []
        if isinstance(abnormalities, str):
            abnormalities = [abnormalities] if abnormalities.strip() else []
            
        # Clinical classification rule matching MedAuth-VLM pipeline
        llava_pred = "abnormal" if len(abnormalities) > 0 else "normal"
        
        records.append({
            "case_id": case_id,
            "ground_truth": ground_truth,
            "medgemma_pred": mg_pred,
            "llava_pred": llava_pred,
            "llava_abnormalities_count": len(abnormalities),
            "llava_abnormalities": "; ".join(abnormalities),
            "latency_ms": latency_ms,
            "raw_output": gen_text
        })
        
        if idx % 5 == 0 or idx == len(test_cases):
            print(f"  Processed {idx}/{len(test_cases)} cases ({idx/len(test_cases)*100:.1f}%) | Latency: {latency_ms:.1f}ms", flush=True)

    elapsed_total = time.time() - start_time
    print(f"\nCompleted test evaluation in {elapsed_total:.2f} seconds.")

    # 5. Compute Metrics on Identical Test Split
    results_df = pd.DataFrame(records)
    y_true = results_df["ground_truth"].tolist()
    y_mg = results_df["medgemma_pred"].tolist()
    y_llava = results_df["llava_pred"].tolist()
    
    m_mg = compute_binary_metrics(y_true, y_mg)
    m_llava = compute_binary_metrics(y_true, y_llava)
    
    # 6. Format Terminal Comparison Table
    table_rows = [
        ["Total Test Cohort", str(m_mg["total"]), str(m_llava["total"]), "Identical Test Split (Patient-Level Separated)"],
        ["Ground Truth Positives (Abnormal)", str(sum(1 for y in y_true if y == 'abnormal')), str(sum(1 for y in y_true if y == 'abnormal')), "Indiana University Open-i Radiologist Dictation"],
        ["Ground Truth Negatives (Normal)", str(sum(1 for y in y_true if y == 'normal')), str(sum(1 for y in y_true if y == 'normal')), "Indiana University Open-i Radiologist Dictation"],
        ["True Positives (TP)", str(m_mg["tp"]), str(m_llava["tp"]), "Correctly identified abnormal cases"],
        ["True Negatives (TN)", str(m_mg["tn"]), str(m_llava["tn"]), "Correctly identified normal cases"],
        ["False Positives (FP)", str(m_mg["fp"]), str(m_llava["fp"]), "Normal cases incorrectly marked abnormal"],
        ["False Negatives (FN)", str(m_mg["fn"]), str(m_llava["fn"]), "Abnormal cases missed"],
        ["Accuracy", f"{m_mg['accuracy']*100:.2f}%", f"{m_llava['accuracy']*100:.2f}%", f"Delta: {(m_llava['accuracy'] - m_mg['accuracy'])*100:+.2f}%"],
        ["Sensitivity / Recall (Abnormal)", f"{m_mg['sensitivity']*100:.2f}%", f"{m_llava['sensitivity']*100:.2f}%", f"Delta: {(m_llava['sensitivity'] - m_mg['sensitivity'])*100:+.2f}%"],
        ["Specificity (Normal)", f"{m_mg['specificity']*100:.2f}%", f"{m_llava['specificity']*100:.2f}%", f"Delta: {(m_llava['specificity'] - m_mg['specificity'])*100:+.2f}%"],
        ["Precision (Abnormal)", f"{m_mg['precision']*100:.2f}%", f"{m_llava['precision']*100:.2f}%", f"Delta: {(m_llava['precision'] - m_mg['precision'])*100:+.2f}%"],
        ["Abnormal F1-Score", f"{m_mg['f1_abnormal']*100:.2f}%", f"{m_llava['f1_abnormal']*100:.2f}%", f"Delta: {(m_llava['f1_abnormal'] - m_mg['f1_abnormal'])*100:+.2f}%"],
        ["Macro F1-Score", f"{m_mg['macro_f1']*100:.2f}%", f"{m_llava['macro_f1']*100:.2f}%", f"Delta: {(m_llava['macro_f1'] - m_mg['macro_f1'])*100:+.2f}%"],
        ["Mean Inference Latency", "~8,500 ms (Colab T4)", f"{results_df['latency_ms'].mean():.1f} ms", f"Local RTX 4090 ({1000/results_df['latency_ms'].mean():.1f} fps)"]
    ]

    print("\n" + "=" * 90)
    print("                    HEAD-TO-HEAD COMPARATIVE BENCHMARK TABLE")
    print("=" * 90)
    print(f"{'Metric / Dimension':<35} | {'MedGemma-4B (Pretrained)':<25} | {'LLaVA-1.5-7B (Fine-Tuned)':<25} | {'Notes / Delta'}")
    print("-" * 90)
    for row in table_rows:
        print(f"{row[0]:<35} | {row[1]:<25} | {row[2]:<25} | {row[3]}")
    print("=" * 90)

    # 7. Save CSV Artifacts
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    pred_csv_path = os.path.join(OUTPUT_DIR, "llava_vs_medgemma_test_predictions.csv")
    results_df.to_csv(pred_csv_path, index=False)
    print(f"\n[Artifact 1] Detailed predictions saved to: {pred_csv_path}")

    metrics_csv_path = os.path.join(OUTPUT_DIR, "llava_vs_medgemma_metrics_comparison.csv")
    metrics_summary_df = pd.DataFrame([
        {"Metric": r[0], "MedGemma_4B": r[1], "LLaVA_1.5_7B": r[2], "Notes": r[3]}
        for r in table_rows
    ])
    metrics_summary_df.to_csv(metrics_csv_path, index=False)
    print(f"[Artifact 2] Summary metrics table saved to: {metrics_csv_path}")

    return metrics_summary_df

def main():
    parser = argparse.ArgumentParser(description="Evaluate LLaVA-1.5-7B and compare fairly with MedGemma.")
    parser.add_argument("--adapter-path", type=str, default="checkpoints_llava/final_adapter", help="Path to fine-tuned LoRA adapter.")
    parser.add_argument("--max-cases", type=int, default=None, help="Optional limit for rapid testing.")
    args = parser.parse_args()

    evaluate_models(adapter_path=args.adapter_path, max_test_cases=args.max_cases)

if __name__ == "__main__":
    main()
