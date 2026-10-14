"""
ANVESH Medical AI Research: Image-Only Head-to-Head Evaluation Pipeline
Evaluates models strictly on chest radiograph pixel inputs with zero clinical text in prompts.
Supports:
1. Newly fine-tuned image-only LLaVA adapter (checkpoints_llava_image_only/final_adapter)
2. Zero-shot pretrained base LLaVA-1.5-7B (no adapter)
3. Text-assisted LLaVA adapter ablation (prompt deficit: evaluated without text)
Outputs saved to: reports/image_only_experiment/
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
import pandas as pd
from PIL import Image
from transformers import AutoProcessor, LlavaForConditionalGeneration, BitsAndBytesConfig
from peft import PeftModel

os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

BASE_MODEL_ID = "llava-hf/llava-1.5-7b-hf"
TEST_JSON_PATH = "anvesh_dataset_image_only/test.json"
IMAGE_BASE_DIR = "anvesh_dataset"
OUTPUT_DIR = "reports/image_only_experiment"

def parse_image_only_output(raw_text: str) -> Tuple[str, bool, Dict[str, Any]]:
    """Parse JSON prediction from image-only model output."""
    cleaned = raw_text.strip()
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
    if match:
        cleaned = match.group(1)
    else:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            cleaned = cleaned[start:end+1]

    parsed_obj = {}
    is_valid_json = False
    try:
        parsed_obj = json.loads(cleaned)
        is_valid_json = True
    except Exception:
        pass

    pred_cls = ""
    if isinstance(parsed_obj, dict):
        val = parsed_obj.get("classification", "")
        if isinstance(val, str):
            val_clean = val.strip().lower()
            if "abnormal" in val_clean:
                pred_cls = "abnormal"
            elif "normal" in val_clean:
                pred_cls = "normal"

    # Regex fallback if not found in valid JSON
    if not pred_cls:
        lower_raw = raw_text.lower()
        match_cls = re.search(r'"classification"\s*:\s*"(normal|abnormal)"', lower_raw)
        if match_cls:
            pred_cls = match_cls.group(1)
        elif "abnormal" in lower_raw and "no abnormal" not in lower_raw:
            pred_cls = "abnormal"
        elif "normal" in lower_raw:
            pred_cls = "normal"
        else:
            pred_cls = "normal"  # Default fallback if unparseable

    return pred_cls, is_valid_json, parsed_obj

def wilson_interval(k: int, n: int, confidence: float = 0.95) -> Tuple[float, float]:
    if n == 0: return 0.0, 0.0
    z = 1.95996
    p = k / n
    denom = 1 + z**2 / n
    center = p + z**2 / (2 * n)
    adj_sd = math.sqrt((p * (1 - p) + z**2 / (4 * n)) / n)
    return max(0.0, (center - z * adj_sd) / denom), min(1.0, (center + z * adj_sd) / denom)

def compute_metrics(y_true: List[str], y_pred: List[str], latencies: Optional[List[float]] = None) -> Dict[str, Any]:
    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "abnormal" and yp == "abnormal")
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "normal" and yp == "normal")
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "normal" and yp == "abnormal")
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "abnormal" and yp == "normal")
    
    total = len(y_true)
    n_pos = tp + fn
    n_neg = tn + fp
    
    accuracy = (tp + tn) / max(total, 1)
    precision = tp / max(tp + fp, 1) if (tp + fp) > 0 else 0.0
    sensitivity = tp / max(n_pos, 1) if n_pos > 0 else 0.0
    specificity = tn / max(n_neg, 1) if n_neg > 0 else 0.0
    npv = tn / max(tn + fn, 1) if (tn + fn) > 0 else 0.0
    
    f1_abn = (2 * precision * sensitivity) / max(precision + sensitivity, 1e-9) if (precision + sensitivity) > 0 else 0.0
    f1_norm = (2 * npv * specificity) / max(npv + specificity, 1e-9) if (npv + specificity) > 0 else 0.0
    balanced_acc = (sensitivity + specificity) / 2.0
    macro_f1 = (f1_abn + f1_norm) / 2.0
    weighted_f1 = (n_pos * f1_abn + n_neg * f1_norm) / max(total, 1)
    
    mcc_num = (tp * tn) - (fp * fn)
    mcc_den = math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn)) if (tp + fp) * (tp + fn) * (tn + fp) * (tn + fn) > 0 else 1.0
    mcc = mcc_num / mcc_den if mcc_den != 0 else 0.0
    
    po = accuracy
    pe = ((tp + fn) * (tp + fp) + (tn + fp) * (tn + fn)) / max(total * total, 1)
    kappa = (po - pe) / max(1.0 - pe, 1e-9) if (1.0 - pe) > 0 else 0.0
    
    ci_acc = wilson_interval(tp + tn, total)
    ci_sens = wilson_interval(tp, n_pos)
    ci_spec = wilson_interval(tn, n_neg)
    ci_prec = wilson_interval(tp, tp + fp) if (tp + fp) > 0 else (0.0, 0.0)
    
    res = {
        "Total Cases (N)": total,
        "Ground Truth Positives (Abnormal)": n_pos,
        "Ground Truth Negatives (Normal)": n_neg,
        "True Positives (TP)": tp,
        "True Negatives (TN)": tn,
        "False Positives (FP)": fp,
        "False Negatives (FN)": fn,
        "Accuracy": accuracy,
        "Accuracy 95% CI": f"[{ci_acc[0]*100:.2f}%, {ci_acc[1]*100:.2f}%]",
        "Balanced Accuracy": balanced_acc,
        "Sensitivity / Recall (Abnormal)": sensitivity,
        "Sensitivity 95% CI": f"[{ci_sens[0]*100:.2f}%, {ci_sens[1]*100:.2f}%]",
        "Specificity (Normal)": specificity,
        "Specificity 95% CI": f"[{ci_spec[0]*100:.2f}%, {ci_spec[1]*100:.2f}%]",
        "Precision (PPV - Abnormal)": precision,
        "Precision 95% CI": f"[{ci_prec[0]*100:.2f}%, {ci_prec[1]*100:.2f}%]",
        "Negative Predictive Value (NPV)": npv,
        "F1-Score (Abnormal)": f1_abn,
        "F1-Score (Normal)": f1_norm,
        "Macro F1-Score": macro_f1,
        "Weighted F1-Score": weighted_f1,
        "Matthews Correlation Coefficient (MCC)": mcc,
        "Cohen's Kappa": kappa
    }
    
    if latencies:
        s = pd.Series(latencies)
        res["Mean Latency (ms)"] = float(s.mean())
        res["Median Latency (ms)"] = float(s.median())
        res["P95 Latency (ms)"] = float(s.quantile(0.95))
        
    return res

def run_evaluation(adapter_path: Optional[str], condition_name: str, batch_size: int = 8) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    print("=" * 80)
    print(f"RUNNING IMAGE-ONLY EVALUATION: {condition_name}")
    print(f"  Adapter Path : {adapter_path or 'None (Pretrained Base Zero-Shot)'}")
    print("=" * 80)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    checkpoint_file = os.path.join(OUTPUT_DIR, f"progress_{condition_name}.json")
    
    with open(TEST_JSON_PATH, "r", encoding="utf-8") as f:
        test_cases = json.load(f)
        
    records = []
    processed_ids = set()
    if os.path.exists(checkpoint_file):
        try:
            with open(checkpoint_file, "r", encoding="utf-8") as cf:
                records = json.load(cf)
            processed_ids = {r["case_id"] for r in records}
            print(f"[RESUME] Found {len(records)} existing evaluated cases in checkpoint.")
        except Exception:
            records = []
            processed_ids = set()
            
    remaining_cases = [c for c in test_cases if c["case_id"] not in processed_ids]
    print(f"Cases to evaluate: {len(remaining_cases)} (Completed: {len(records)})")
    
    if remaining_cases:
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
            print(f"Attaching LoRA adapter from: {adapter_path}")
            model = PeftModel.from_pretrained(base_model, adapter_path)
        else:
            print("Evaluating Base Model zero-shot (No adapter).")
            model = base_model
            
        model.eval()
        
        for batch_idx in range(0, len(remaining_cases), batch_size):
            batch_slice = remaining_cases[batch_idx: batch_idx + batch_size]
            b_prompts = []
            b_images = []
            b_metas = []
            
            for item in batch_slice:
                case_id = int(item["case_id"])
                gt = item["classification"]
                img_path = os.path.join(IMAGE_BASE_DIR, item["image_path"])
                image = Image.open(img_path).convert("RGB")
                prompt_text = f"USER: <image>\n{item['prompt']}\nASSISTANT: "
                
                b_prompts.append(prompt_text)
                b_images.append(image)
                b_metas.append({"case_id": case_id, "ground_truth": gt})
                
            inputs = processor(text=b_prompts, images=b_images, padding=True, return_tensors="pt").to("cuda")
            
            t0 = time.perf_counter()
            with torch.inference_mode():
                output_ids = model.generate(
                    **inputs,
                    max_new_tokens=128,
                    do_sample=False,
                    pad_token_id=processor.tokenizer.pad_token_id or processor.tokenizer.eos_token_id
                )
            batch_latency = (time.perf_counter() - t0) * 1000.0
            per_item_latency = batch_latency / len(batch_slice)
            
            in_len = inputs["input_ids"].shape[1]
            for i, meta in enumerate(b_metas):
                gen_text = processor.decode(output_ids[i][in_len:], skip_special_tokens=True).strip()
                pred_cls, is_valid_json, parsed_obj = parse_image_only_output(gen_text)
                
                records.append({
                    "case_id": meta["case_id"],
                    "condition": condition_name,
                    "ground_truth": meta["ground_truth"],
                    "prediction": pred_cls,
                    "is_valid_json": is_valid_json,
                    "latency_ms": per_item_latency,
                    "raw_output": gen_text
                })
                
            with open(checkpoint_file + ".tmp", "w", encoding="utf-8") as cf:
                json.dump(records, cf, indent=2)
            if os.path.exists(checkpoint_file):
                os.remove(checkpoint_file)
            os.rename(checkpoint_file + ".tmp", checkpoint_file)
            
            done = len(records)
            print(f"  [{condition_name}] Processed {done}/{len(test_cases)} ({done/len(test_cases)*100:.1f}%) | Latency: {per_item_latency:.1f}ms/case", flush=True)

        # Cleanup GPU model to free memory for subsequent condition
        del model
        del base_model
        del processor
        torch.cuda.empty_cache()

    # Sort in test case order
    case_order = {int(c["case_id"]): i for i, c in enumerate(test_cases)}
    df = pd.DataFrame(records)
    df["sort_key"] = df["case_id"].map(case_order)
    df = df.sort_values("sort_key").drop(columns=["sort_key"]).reset_index(drop=True)
    records = df.to_dict(orient="records")
    
    y_true = df["ground_truth"].tolist()
    y_pred = df["prediction"].tolist()
    lats = df["latency_ms"].tolist() if "latency_ms" in df.columns else None
    metrics = compute_metrics(y_true, y_pred, lats)
    
    print(f"\n--- {condition_name} Results (N={len(records)}) ---")
    print(f"  TP={metrics['True Positives (TP)']}, TN={metrics['True Negatives (TN)']}, FP={metrics['False Positives (FP)']}, FN={metrics['False Negatives (FN)']}")
    print(f"  Accuracy: {metrics['Accuracy']*100:.2f}% | Sensitivity: {metrics['Sensitivity / Recall (Abnormal)']*100:.2f}% | Specificity: {metrics['Specificity (Normal)']*100:.2f}% | MCC: {metrics['Matthews Correlation Coefficient (MCC)']:+.4f}")
    
    # Save individual condition predictions CSV
    cond_csv = os.path.join(OUTPUT_DIR, f"{condition_name}_test_predictions.csv")
    df.to_csv(cond_csv, index=False)
    print(f"Saved {condition_name} predictions to: {cond_csv}")

    # Update or append to unified image_only_test_predictions.csv
    unified_csv = os.path.join(OUTPUT_DIR, "image_only_test_predictions.csv")
    if os.path.exists(unified_csv):
        try:
            unified_df = pd.read_csv(unified_csv)
            unified_df = unified_df[unified_df["condition"] != condition_name]
            unified_df = pd.concat([unified_df, df], ignore_index=True)
        except Exception:
            unified_df = df
    else:
        unified_df = df
    unified_df.to_csv(unified_csv, index=False)
    print(f"Updated unified predictions at: {unified_csv} (Total records: {len(unified_df)})")

    return records, metrics

def evaluate_all(batch_size: int = 8):
    from reports.export_image_only_artifacts import export_all
    
    conditions = [
        ("checkpoints_llava_image_only/final_adapter", "llava_image_only"),
        (None, "llava_base_zeroshot"),
        ("checkpoints_llava/final_adapter", "llava_text_adapter_ablation")
    ]
    
    print("\n" + "=" * 80)
    print("MASTER IMAGE-ONLY BENCHMARK: EVALUATING ALL CONDITIONS ON 422 CASES")
    print("=" * 80)
    
    for adapter_path, cond_name in conditions:
        print(f"\n>>> Starting Condition: {cond_name}")
        run_evaluation(adapter_path, cond_name, batch_size)
        
    print("\n>>> All conditions evaluated! Exporting IEEE research artifacts...")
    export_all()
    print("\n" + "=" * 80)
    print("MASTER IMAGE-ONLY BENCHMARK COMPLETED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Image-Only Evaluation CLI")
    parser.add_argument("--adapter-path", type=str, default=None, help="LoRA adapter path (None for zero-shot base)")
    parser.add_argument("--condition", type=str, default="llava_image_only", help="Condition name (e.g., llava_image_only, llava_base_zeroshot, llava_text_adapter_ablation)")
    parser.add_argument("--batch-size", type=int, default=8, help="Batch size")
    parser.add_argument("--all", action="store_true", help="Evaluate all 3 conditions sequentially and export IEEE artifacts.")
    args = parser.parse_args()
    
    if args.all:
        evaluate_all(batch_size=args.batch_size)
    else:
        records, metrics = run_evaluation(args.adapter_path, args.condition, args.batch_size)
        from reports.export_image_only_artifacts import export_all
        export_all()

