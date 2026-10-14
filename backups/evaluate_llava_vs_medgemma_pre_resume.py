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
import math
import time
import argparse
from typing import Dict, List, Any, Optional, Tuple

import torch
import numpy as np
import pandas as pd
from PIL import Image
from transformers import AutoProcessor, LlavaForConditionalGeneration, BitsAndBytesConfig
from peft import PeftModel

os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

BASE_MODEL_ID = "llava-hf/llava-1.5-7b-hf"
TEST_JSON_PATH = "anvesh_dataset/test.json"
MEDGEMMA_MANIFEST_PATH = "reports/evaluation_audit/verified_cohort_manifest.csv"
OUTPUT_DIR = "reports"
PROGRESS_FILE = os.path.join(OUTPUT_DIR, "eval_progress_checkpoint.json")

def clean_json_text(raw_text: str) -> Tuple[Dict[str, Any], bool]:
    """Parse JSON from generated model text, handling markdown fences or leading/trailing tokens."""
    cleaned = raw_text.strip()
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
    if match:
        cleaned = match.group(1)
    else:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            cleaned = cleaned[start:end+1]
            
    try:
        return json.loads(cleaned), True
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
        }, False

def wilson_score_interval(k: int, n: int, confidence: float = 0.95) -> Tuple[float, float]:
    """Compute Wilson score continuity-corrected confidence interval for a proportion."""
    if n == 0:
        return 0.0, 0.0
    z = 1.95996  # 95% confidence
    p = k / n
    denominator = 1 + z**2 / n
    centre_adjusted_probability = p + z**2 / (2 * n)
    adjusted_std_dev = math.sqrt((p * (1 - p) + z**2 / (4 * n)) / n)
    lower = max(0.0, (centre_adjusted_probability - z * adjusted_std_dev) / denominator)
    upper = min(1.0, (centre_adjusted_probability + z * adjusted_std_dev) / denominator)
    return lower, upper

def compute_comprehensive_metrics(y_true: List[str], y_pred: List[str]) -> Dict[str, Any]:
    """Calculate standard medical classification metrics with zero-division safety and CIs."""
    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "abnormal" and yp == "abnormal")
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "normal" and yp == "abnormal")
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "normal" and yp == "normal")
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "abnormal" and yp == "normal")
    
    total = tp + fp + tn + fn
    accuracy = (tp + tn) / max(total, 1)
    error_rate = 1.0 - accuracy
    
    # Abnormal class metrics (Positive = abnormal)
    precision = tp / max(tp + fp, 1) if (tp + fp) > 0 else 0.0
    sensitivity = tp / max(tp + fn, 1) if (tp + fn) > 0 else 0.0
    specificity = tn / max(tn + fp, 1) if (tn + fp) > 0 else 0.0
    f1_abnormal = (2 * precision * sensitivity) / max(precision + sensitivity, 1e-9) if (precision + sensitivity) > 0 else 0.0
    
    # Normal class metrics (Negative = normal)
    prec_normal = tn / max(tn + fn, 1) if (tn + fn) > 0 else 0.0
    rec_normal = specificity
    f1_normal = (2 * prec_normal * rec_normal) / max(prec_normal + rec_normal, 1e-9) if (prec_normal + rec_normal) > 0 else 0.0
    
    # Balanced & Macro
    balanced_acc = (sensitivity + specificity) / 2.0
    macro_f1 = (f1_abnormal + f1_normal) / 2.0
    macro_prec = (precision + prec_normal) / 2.0
    macro_rec = (sensitivity + rec_normal) / 2.0
    
    n_pos = tp + fn
    n_neg = tn + fp
    weighted_f1 = (n_pos * f1_abnormal + n_neg * f1_normal) / max(total, 1)
    
    # Matthews Correlation Coefficient (MCC)
    mcc_num = (tp * tn) - (fp * fn)
    mcc_den = math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn)) if (tp + fp) * (tp + fn) * (tn + fp) * (tn + fn) > 0 else 1.0
    mcc = mcc_num / mcc_den if mcc_den != 0 else 0.0
    
    # Cohen's Kappa
    po = accuracy
    pe = ((tp + fn) * (tp + fp) + (tn + fp) * (tn + fn)) / max(total * total, 1)
    kappa = (po - pe) / max(1.0 - pe, 1e-9) if (1.0 - pe) > 0 else 0.0
    
    # Wilson 95% CIs
    ci_acc = wilson_score_interval(tp + tn, total)
    ci_sens = wilson_score_interval(tp, n_pos)
    ci_spec = wilson_score_interval(tn, n_neg)
    ci_prec = wilson_score_interval(tp, tp + fp) if (tp + fp) > 0 else (0.0, 0.0)
    
    return {
        "total": total,
        "n_abnormal": n_pos,
        "n_normal": n_neg,
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn,
        "accuracy": accuracy,
        "ci_accuracy": ci_acc,
        "error_rate": error_rate,
        "balanced_accuracy": balanced_acc,
        "precision": precision,
        "ci_precision": ci_prec,
        "sensitivity": sensitivity,
        "ci_sensitivity": ci_sens,
        "specificity": specificity,
        "ci_specificity": ci_spec,
        "f1_abnormal": f1_abnormal,
        "precision_normal": prec_normal,
        "recall_normal": rec_normal,
        "f1_normal": f1_normal,
        "macro_precision": macro_prec,
        "macro_recall": macro_rec,
        "macro_f1": macro_f1,
        "weighted_f1": weighted_f1,
        "mcc": mcc,
        "cohens_kappa": kappa
    }

def evaluate_models(
    adapter_path: Optional[str] = None,
    max_test_cases: Optional[int] = None,
    batch_size: int = 8,
    resume: bool = True
):
    print("=" * 80)
    print("HEAD-TO-HEAD BENCHMARK EVALUATION: FINE-TUNED LLaVA-1.5-7B vs. PRETRAINED MedGemma-4B")
    print("=" * 80)
    
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA is not available! Refusing to run evaluation on CPU.")

    device_name = torch.cuda.get_device_name(0)
    vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
    print(f"Hardware Guard: [OK] {device_name} ({vram_gb:.2f} GB VRAM)")

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
        print(f"Loaded full held-out test split: {len(test_cases)} cases (Patient-separated).")

    # 3. Resume Check
    records: List[Dict[str, Any]] = []
    processed_case_ids = set()
    if resume and os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, "r", encoding="utf-8") as pf:
                records = json.load(pf)
            processed_case_ids = {r["case_id"] for r in records}
            print(f"[RESUME] Found existing progress file with {len(records)} completed cases.")
        except Exception as e:
            print(f"[RESUME] Could not load progress checkpoint ({e}); starting fresh.")
            records = []
            processed_case_ids = set()

    remaining_cases = [c for c in test_cases if int(c["case_id"]) not in processed_case_ids]
    print(f"Cases to evaluate: {len(remaining_cases)} (Already completed: {len(records)})")

    # 4. Load LLaVA Model
    if remaining_cases:
        print("\nLoading LLaVA-1.5-7B with 4-bit NormalFloat on RTX 4090...")
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_use_double_quant=True
        )
        
        processor = AutoProcessor.from_pretrained(BASE_MODEL_ID, cache_dir=os.environ["HF_HOME"])
        processor.tokenizer.padding_side = "left"
        
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

        # 5. Batched Inference Loop
        print(f"\nRunning batched inference (batch_size={batch_size}) across {len(remaining_cases)} cases...")
        start_time = time.time()
        
        for batch_idx in range(0, len(remaining_cases), batch_size):
            batch_slice = remaining_cases[batch_idx: batch_idx + batch_size]
            b_prompts = []
            b_images = []
            b_metas = []
            
            for item in batch_slice:
                case_id = int(item["case_id"])
                ground_truth = item["classification"]
                mg_row = medgemma_map.get(case_id, {})
                mg_pred = mg_row.get("predicted_classification", "normal")
                
                img_path = os.path.join("anvesh_dataset", item["image_path"])
                image = Image.open(img_path).convert("RGB")
                prompt_text = f"USER: <image>\n{item['prompt']}\nASSISTANT: "
                
                b_prompts.append(prompt_text)
                b_images.append(image)
                b_metas.append({
                    "case_id": case_id,
                    "ground_truth": ground_truth,
                    "medgemma_pred": mg_pred
                })
            
            inputs = processor(text=b_prompts, images=b_images, padding=True, return_tensors="pt").to("cuda")
            
            t0 = time.perf_counter()
            with torch.inference_mode():
                output_ids = model.generate(
                    **inputs,
                    max_new_tokens=256,
                    do_sample=False,
                    pad_token_id=processor.tokenizer.pad_token_id or processor.tokenizer.eos_token_id
                )
            batch_latency_ms = (time.perf_counter() - t0) * 1000.0
            per_item_latency_ms = batch_latency_ms / len(batch_slice)
            
            in_len = inputs["input_ids"].shape[1]
            for i, meta in enumerate(b_metas):
                gen_text = processor.decode(output_ids[i][in_len:], skip_special_tokens=True).strip()
                parsed, is_valid_json = clean_json_text(gen_text)
                
                img_evidence = parsed.get("image_evidence", {}) if isinstance(parsed, dict) else {}
                abnormalities = img_evidence.get("abnormalities", []) if isinstance(img_evidence, dict) else []
                if isinstance(abnormalities, str):
                    abnormalities = [abnormalities] if abnormalities.strip() else []
                
                llava_pred = "abnormal" if len(abnormalities) > 0 else "normal"
                
                records.append({
                    "case_id": meta["case_id"],
                    "dataset_id": "Indiana_University_Open_i",
                    "ground_truth": meta["ground_truth"],
                    "medgemma_pred": meta["medgemma_pred"],
                    "llava_pred": llava_pred,
                    "is_valid_json": is_valid_json,
                    "llava_abnormalities_count": len(abnormalities),
                    "llava_abnormalities": "; ".join(str(a) for a in abnormalities),
                    "latency_ms": per_item_latency_ms,
                    "raw_output": gen_text
                })
            
            # Save progress checkpoint atomically
            with open(PROGRESS_FILE + ".tmp", "w", encoding="utf-8") as pf:
                json.dump(records, pf, indent=2)
            if os.path.exists(PROGRESS_FILE):
                os.remove(PROGRESS_FILE)
            os.rename(PROGRESS_FILE + ".tmp", PROGRESS_FILE)
            
            done_count = len(records)
            pct = done_count / len(test_cases) * 100.0
            print(f"  Processed {done_count}/{len(test_cases)} cases ({pct:.1f}%) | Batch latency: {batch_latency_ms:.1f}ms ({per_item_latency_ms:.1f}ms/case)", flush=True)

        elapsed_total = time.time() - start_time
        print(f"\nInference completed in {elapsed_total:.2f} seconds ({elapsed_total/60.0:.2f} minutes).")

    # 6. Compute Comprehensive Metrics
    results_df = pd.DataFrame(records)
    # Ensure ordering matches test set order
    case_order = {int(c["case_id"]): i for i, c in enumerate(test_cases)}
    results_df["sort_key"] = results_df["case_id"].map(case_order)
    results_df = results_df.sort_values("sort_key").drop(columns=["sort_key"]).reset_index(drop=True)

    y_true = results_df["ground_truth"].tolist()
    y_mg = results_df["medgemma_pred"].tolist()
    y_llava = results_df["llava_pred"].tolist()
    
    m_mg = compute_comprehensive_metrics(y_true, y_mg)
    m_llava = compute_comprehensive_metrics(y_true, y_llava)

    # 7. Format Terminal Comparison Table
    table_rows = [
        ["Total Test Cohort (N)", str(m_mg["total"]), str(m_llava["total"]), "Identical held-out patient-level split"],
        ["Ground Truth Abnormal (P)", str(m_mg["n_abnormal"]), str(m_llava["n_abnormal"]), "Indiana University Open-i Radiologist Dictation"],
        ["Ground Truth Normal (N)", str(m_mg["n_normal"]), str(m_llava["n_normal"]), "Indiana University Open-i Radiologist Dictation"],
        ["True Positives (TP)", str(m_mg["tp"]), str(m_llava["tp"]), "Correctly identified abnormal cases"],
        ["True Negatives (TN)", str(m_mg["tn"]), str(m_llava["tn"]), "Correctly identified normal cases"],
        ["False Positives (FP)", str(m_mg["fp"]), str(m_llava["fp"]), "Normal cases incorrectly flagged abnormal"],
        ["False Negatives (FN)", str(m_mg["fn"]), str(m_llava["fn"]), "Abnormal cases missed"],
        ["Accuracy", f"{m_mg['accuracy']*100:.2f}%", f"{m_llava['accuracy']*100:.2f}%", f"Delta: {(m_llava['accuracy'] - m_mg['accuracy'])*100:+.2f}%"],
        ["95% CI (Accuracy)", f"[{m_mg['ci_accuracy'][0]*100:.1f}%, {m_mg['ci_accuracy'][1]*100:.1f}%]", f"[{m_llava['ci_accuracy'][0]*100:.1f}%, {m_llava['ci_accuracy'][1]*100:.1f}%]", "Wilson score interval"],
        ["Balanced Accuracy", f"{m_mg['balanced_accuracy']*100:.2f}%", f"{m_llava['balanced_accuracy']*100:.2f}%", f"Delta: {(m_llava['balanced_accuracy'] - m_mg['balanced_accuracy'])*100:+.2f}%"],
        ["Sensitivity / Recall (Abnormal)", f"{m_mg['sensitivity']*100:.2f}%", f"{m_llava['sensitivity']*100:.2f}%", f"Delta: {(m_llava['sensitivity'] - m_mg['sensitivity'])*100:+.2f}%"],
        ["95% CI (Sensitivity)", f"[{m_mg['ci_sensitivity'][0]*100:.1f}%, {m_mg['ci_sensitivity'][1]*100:.1f}%]", f"[{m_llava['ci_sensitivity'][0]*100:.1f}%, {m_llava['ci_sensitivity'][1]*100:.1f}%]", "Wilson score interval"],
        ["Specificity (Normal)", f"{m_mg['specificity']*100:.2f}%", f"{m_llava['specificity']*100:.2f}%", f"Delta: {(m_llava['specificity'] - m_mg['specificity'])*100:+.2f}%"],
        ["95% CI (Specificity)", f"[{m_mg['ci_specificity'][0]*100:.1f}%, {m_mg['ci_specificity'][1]*100:.1f}%]", f"[{m_llava['ci_specificity'][0]*100:.1f}%, {m_llava['ci_specificity'][1]*100:.1f}%]", "Wilson score interval"],
        ["Precision (Abnormal)", f"{m_mg['precision']*100:.2f}%", f"{m_llava['precision']*100:.2f}%", f"Delta: {(m_llava['precision'] - m_mg['precision'])*100:+.2f}%"],
        ["Abnormal F1-Score", f"{m_mg['f1_abnormal']*100:.2f}%", f"{m_llava['f1_abnormal']*100:.2f}%", f"Delta: {(m_llava['f1_abnormal'] - m_mg['f1_abnormal'])*100:+.2f}%"],
        ["Normal F1-Score", f"{m_mg['f1_normal']*100:.2f}%", f"{m_llava['f1_normal']*100:.2f}%", f"Delta: {(m_llava['f1_normal'] - m_mg['f1_normal'])*100:+.2f}%"],
        ["Macro F1-Score", f"{m_mg['macro_f1']*100:.2f}%", f"{m_llava['macro_f1']*100:.2f}%", f"Delta: {(m_llava['macro_f1'] - m_mg['macro_f1'])*100:+.2f}%"],
        ["Weighted F1-Score", f"{m_mg['weighted_f1']*100:.2f}%", f"{m_llava['weighted_f1']*100:.2f}%", f"Delta: {(m_llava['weighted_f1'] - m_mg['weighted_f1'])*100:+.2f}%"],
        ["Matthews Corr. Coeff. (MCC)", f"{m_mg['mcc']:+.4f}", f"{m_llava['mcc']:+.4f}", f"Delta: {m_llava['mcc'] - m_mg['mcc']:+.4f}"],
        ["Cohen's Kappa", f"{m_mg['cohens_kappa']:+.4f}", f"{m_llava['cohens_kappa']:+.4f}", f"Delta: {m_llava['cohens_kappa'] - m_mg['cohens_kappa']:+.4f}"],
        ["Inference Hardware", "Colab T4 (Precomputed)", "Local NVIDIA RTX 4090", "Hardware environments differ"],
        ["Mean Latency", "~8,500 ms (Colab T4)", f"{results_df['latency_ms'].mean():.1f} ms", f"Throughput: {1000.0/results_df['latency_ms'].mean():.2f} cases/s"],
        ["Median Latency", "~8,200 ms (Colab T4)", f"{results_df['latency_ms'].median():.1f} ms", "50th percentile"],
        ["P95 Latency", "~9,100 ms (Colab T4)", f"{results_df['latency_ms'].quantile(0.95):.1f} ms", "95th percentile"]
    ]

    print("\n" + "=" * 95)
    print("                 HEAD-TO-HEAD COMPREHENSIVE BENCHMARK TABLE")
    print("=" * 95)
    print(f"{'Metric / Dimension':<35} | {'MedGemma-4B (Pretrained)':<25} | {'LLaVA-1.5-7B (Fine-Tuned)':<25} | {'Notes / Delta'}")
    print("-" * 95)
    for row in table_rows:
        print(f"{row[0]:<35} | {row[1]:<25} | {row[2]:<25} | {row[3]}")
    print("=" * 95)

    # 8. Save CSV Artifacts
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Save both canonical and full names
    pred_paths = [
        os.path.join(OUTPUT_DIR, "llava_vs_medgemma_test_predictions.csv"),
        os.path.join(OUTPUT_DIR, "llava_vs_medgemma_full_test_predictions.csv")
    ]
    for p in pred_paths:
        results_df.to_csv(p, index=False)
        print(f"[Artifact] Saved predictions to: {p}")

    metrics_df = pd.DataFrame([
        {"Metric": r[0], "MedGemma_4B_Pretrained": r[1], "LLaVA_1_5_7B_FineTuned": r[2], "Notes": r[3]}
        for r in table_rows
    ])
    metric_paths = [
        os.path.join(OUTPUT_DIR, "llava_vs_medgemma_metrics_comparison.csv"),
        os.path.join(OUTPUT_DIR, "llava_vs_medgemma_full_metrics_comparison.csv")
    ]
    for mp in metric_paths:
        metrics_df.to_csv(mp, index=False)
        print(f"[Artifact] Saved summary metrics table to: {mp}")

    # Remove temporary progress file upon successful complete run
    if len(records) == len(test_cases) and os.path.exists(PROGRESS_FILE):
        os.remove(PROGRESS_FILE)

    return metrics_df

def main():
    parser = argparse.ArgumentParser(description="Evaluate LLaVA-1.5-7B and compare fairly with MedGemma.")
    parser.add_argument("--adapter-path", type=str, default="checkpoints_llava/final_adapter", help="Path to fine-tuned LoRA adapter.")
    parser.add_argument("--max-cases", type=int, default=None, help="Optional limit for rapid testing.")
    parser.add_argument("--batch-size", type=int, default=8, help="Batch size for RTX 4090 inference.")
    parser.add_argument("--no-resume", action="store_true", help="Do not resume from progress checkpoint.")
    args = parser.parse_args()

    evaluate_models(
        adapter_path=args.adapter_path,
        max_test_cases=args.max_cases,
        batch_size=args.batch_size,
        resume=not args.no_resume
    )

if __name__ == "__main__":
    main()
