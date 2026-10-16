"""
ANVESH Medical AI Research: LLaVA-1.5-7B v4 Held-Out Test Evaluation Pipeline
Strict Held-Out Evaluation Protocol:
1. Evaluates all 422 held-out test cases.
2. Uses the optimal decision threshold selected ONLY on validation data.
3. Produces confusion matrix, ROC-AUC, PR-AUC, metrics CSV and summary JSON.
4. Generates multi-model comparative table across v2, v3, and v4.
"""

import os
import sys
import json
import time
import math
import argparse
from typing import Dict, List, Any, Optional, Tuple

import torch
import numpy as np
import pandas as pd
from PIL import Image
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.metrics import roc_auc_score, precision_recall_curve, auc
from transformers import AutoProcessor, LlavaForConditionalGeneration, BitsAndBytesConfig
from peft import PeftModel

if os.path.exists(r"S:\anvesh_ml_cache"):
    os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

BASE_MODEL_ID = "llava-hf/llava-1.5-7b-hf"
TEST_JSON_PATH = "anvesh_dataset_image_only/test.json"
IMAGE_BASE_DIR = "anvesh_dataset"
REPORTS_DIR = "reports"
DEFAULT_ADAPTER = "checkpoints_llava_v4/best_adapter"

TOK_NORMAL = 8945
TOK_ABNORMAL = 370
PREFIX_TEXT = '{"classification": "'


def wilson_interval(k: int, n: int, confidence: float = 0.95) -> Tuple[float, float]:
    if n == 0:
        return 0.0, 0.0
    z = 1.95996
    p = k / n
    denom = 1 + z**2 / n
    center = p + z**2 / (2 * n)
    adj_sd = math.sqrt((p * (1 - p) + z**2 / (4 * n)) / n)
    return max(0.0, (center - z * adj_sd) / denom), min(1.0, (center + z * adj_sd) / denom)


def compute_comprehensive_metrics(
    y_true: List[str],
    y_pred: List[str],
    y_prob_abnormal: List[float],
    latencies_ms: List[float]
) -> Dict[str, Any]:
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

    y_binary = [1 if y == "abnormal" else 0 for y in y_true]
    try:
        roc_auc = float(roc_auc_score(y_binary, y_prob_abnormal))
    except Exception:
        roc_auc = 0.50

    try:
        p_curve, r_curve, _ = precision_recall_curve(y_binary, y_prob_abnormal)
        pr_auc = float(auc(r_curve, p_curve))
    except Exception:
        pr_auc = 0.50

    lat_arr = np.array(latencies_ms) if latencies_ms else np.array([0.0])

    return {
        "total_cases": total,
        "n_abnormal": n_pos,
        "n_normal": n_neg,
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "accuracy": round(accuracy, 4),
        "accuracy_ci95": [round(ci_acc[0], 4), round(ci_acc[1], 4)],
        "balanced_accuracy": round(balanced_acc, 4),
        "sensitivity": round(sensitivity, 4),
        "sensitivity_ci95": [round(ci_sens[0], 4), round(ci_sens[1], 4)],
        "specificity": round(specificity, 4),
        "specificity_ci95": [round(ci_spec[0], 4), round(ci_spec[1], 4)],
        "precision": round(precision, 4),
        "precision_ci95": [round(ci_prec[0], 4), round(ci_prec[1], 4)],
        "npv": round(npv, 4),
        "macro_f1": round(macro_f1, 4),
        "f1_abnormal": round(f1_abn, 4),
        "f1_normal": round(f1_norm, 4),
        "weighted_f1": round(weighted_f1, 4),
        "mcc": round(mcc, 4),
        "cohens_kappa": round(kappa, 4),
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "latency_mean_ms": round(float(np.mean(lat_arr)), 2),
        "latency_median_ms": round(float(np.median(lat_arr)), 2),
        "latency_p95_ms": round(float(np.percentile(lat_arr, 95)), 2),
        "latency_p99_ms": round(float(np.percentile(lat_arr, 99)), 2),
    }


def plot_confusion_matrix(cm_dict: Dict[str, int], output_path: str, title: str):
    tp, tn, fp, fn = cm_dict["tp"], cm_dict["tn"], cm_dict["fp"], cm_dict["fn"]
    matrix = np.array([[tp, fn], [fp, tn]])

    fig, ax = plt.subplots(figsize=(7, 6), dpi=300)
    cmap = plt.cm.Greens
    cax = ax.matshow(matrix, cmap=cmap)
    fig.colorbar(cax)

    ax.set_xticks([0, 1])
    ax.set_yticks([0, 1])
    ax.set_xticklabels(["Abnormal", "Normal"], fontsize=12, fontweight="bold")
    ax.set_yticklabels(["Abnormal", "Normal"], fontsize=12, fontweight="bold")
    ax.set_xlabel("Predicted Label", fontsize=12, fontweight="bold", labelpad=10)
    ax.set_ylabel("True Ground Truth", fontsize=12, fontweight="bold", labelpad=10)
    ax.set_title(title, fontsize=13, fontweight="bold", pad=20)

    cell_labels = [
        [f"TP\n{tp}\n({tp/(tp+fn)*100:.1f}%)", f"FN\n{fn}\n({fn/(tp+fn)*100:.1f}%)"],
        [f"FP\n{fp}\n({fp/(tn+fp)*100:.1f}%)", f"TN\n{tn}\n({tn/(tn+fp)*100:.1f}%)"]
    ]

    for i in range(2):
        for j in range(2):
            color = "white" if matrix[i, j] > (tp + tn + fp + fn) / 4 else "black"
            ax.text(j, i, cell_labels[i][j], ha="center", va="center", color=color, fontsize=12, fontweight="bold")

    plt.tight_layout()
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    plt.savefig(output_path, dpi=300)
    plt.close()
    print(f"  [OK] Saved confusion matrix heatmap to: {output_path}")


def evaluate_llava_v4_on_test(adapter_path: str, threshold: float = 0.50):
    print("=" * 80)
    print("ANVESH: LLaVA-1.5-7B v4 Held-Out Test Evaluation Pipeline")
    print(f"Adapter: {adapter_path}")
    print(f"Frozen Validation Threshold: {threshold:.4f}")
    print(f"Held-Out Test Set: {TEST_JSON_PATH}")
    print("=" * 80)

    with open(TEST_JSON_PATH, "r", encoding="utf-8") as f:
        test_records = json.load(f)
    print(f"Loaded {len(test_records)} test cases.")

    print(f"Loading processor and 4-bit base model {BASE_MODEL_ID}...")
    processor = AutoProcessor.from_pretrained(BASE_MODEL_ID, cache_dir=os.environ.get("HF_HOME"))
    processor.tokenizer.padding_side = "left"

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True
    )

    base_model = LlavaForConditionalGeneration.from_pretrained(
        BASE_MODEL_ID,
        quantization_config=bnb_config,
        torch_dtype=torch.bfloat16,
        device_map={"": 0},
        cache_dir=os.environ.get("HF_HOME")
    )

    print(f"Loading LoRA adapter from {adapter_path}...")
    model = PeftModel.from_pretrained(base_model, adapter_path)
    model.eval()

    y_true = []
    y_pred = []
    y_prob_abnormal = []
    latencies = []
    case_ids = []
    image_paths = []
    confidences = []

    print("\nRunning inference over 422 held-out test cases...")
    t_start = time.time()

    for idx, item in enumerate(test_records):
        cid = item["case_id"]
        img_rel = item["image_path"]
        img_full = os.path.join(IMAGE_BASE_DIR, img_rel)
        gt = item["classification"]

        image = Image.open(img_full).convert("RGB")
        prompt = f"USER: <image>\n{item['prompt']}\nASSISTANT: {PREFIX_TEXT}"

        t0 = time.perf_counter()
        inputs = processor(text=[prompt], images=[image], return_tensors="pt")
        inputs = {k: v.to("cuda") for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits[0, -1, :]
            la = float(logits[TOK_ABNORMAL].item())
            ln = float(logits[TOK_NORMAL].item())
            p_abn = float(np.exp(la) / (np.exp(la) + np.exp(ln) + 1e-12))

        dt_ms = (time.perf_counter() - t0) * 1000.0

        pred = "abnormal" if p_abn >= threshold else "normal"
        conf = p_abn if pred == "abnormal" else (1.0 - p_abn)

        case_ids.append(cid)
        image_paths.append(img_rel)
        y_true.append(gt)
        y_pred.append(pred)
        y_prob_abnormal.append(round(p_abn, 6))
        confidences.append(round(conf, 6))
        latencies.append(round(dt_ms, 2))

        if (idx + 1) % 50 == 0 or (idx + 1) == len(test_records):
            cur_acc = sum(1 for yt, yp in zip(y_true, y_pred) if yt == yp) / len(y_true)
            print(f"  Processed {idx + 1:3d}/{len(test_records)} cases | Running Acc: {cur_acc*100:.2f}% | Latency: {dt_ms:.1f}ms")

    elapsed_total = time.time() - t_start
    print(f"\nCompleted 422 inferences in {elapsed_total:.2f}s ({elapsed_total/422:.3f}s/case).")

    metrics = compute_comprehensive_metrics(y_true, y_pred, y_prob_abnormal, latencies)
    metrics["frozen_threshold"] = round(threshold, 4)
    metrics["adapter_path"] = adapter_path
    metrics["elapsed_seconds"] = round(elapsed_total, 2)

    os.makedirs(REPORTS_DIR, exist_ok=True)
    df_preds = pd.DataFrame({
        "case_id": case_ids,
        "image_path": image_paths,
        "ground_truth": y_true,
        "predicted_label": y_pred,
        "prob_abnormal": y_prob_abnormal,
        "confidence": confidences,
        "latency_ms": latencies,
        "correct": [1 if yt == yp else 0 for yt, yp in zip(y_true, y_pred)]
    })
    preds_csv = os.path.join(REPORTS_DIR, "v4_llava_test_predictions.csv")
    df_preds.to_csv(preds_csv, index=False)
    print(f"  [OK] Saved predictions to: {preds_csv}")

    summary_json = os.path.join(REPORTS_DIR, "v4_llava_summary.json")
    with open(summary_json, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"  [OK] Saved metrics summary to: {summary_json}")

    metrics_csv = os.path.join(REPORTS_DIR, "v4_llava_metrics.csv")
    pd.DataFrame([metrics]).to_csv(metrics_csv, index=False)
    print(f"  [OK] Saved metrics CSV to: {metrics_csv}")

    cm_path = os.path.join(REPORTS_DIR, "confusion_matrix_llava_v4.png")
    plot_confusion_matrix(
        {"tp": metrics["tp"], "tn": metrics["tn"], "fp": metrics["fp"], "fn": metrics["fn"]},
        cm_path,
        f"ANVESH LLaVA-1.5-7B v4 (Acc: {metrics['accuracy']*100:.2f}%, F1: {metrics['macro_f1']*100:.2f}%)"
    )

    # Multi-model comparative table (v2, v3, v4)
    comp_rows = [
        {
            "Model": "LLaVA-1.5-7B v2 (Baseline)",
            "Accuracy (%)": 67.54,
            "Balanced Acc (%)": 67.54,
            "Sensitivity (%)": 62.09,
            "Specificity (%)": 72.99,
            "Precision (%)": 69.68,
            "NPV (%)": 65.81,
            "Macro-F1 (%)": 67.44,
            "MCC": 0.3528,
            "ROC-AUC": 0.7475,
            "PR-AUC": 0.7363,
            "TP": 131, "TN": 154, "FP": 57, "FN": 80,
            "Threshold": 0.5100
        },
        {
            "Model": "LLaVA-1.5-7B v3 (Refined)",
            "Accuracy (%)": 67.54,
            "Balanced Acc (%)": 67.54,
            "Sensitivity (%)": 65.40,
            "Specificity (%)": 69.67,
            "Precision (%)": 68.32,
            "NPV (%)": 66.82,
            "Macro-F1 (%)": 67.52,
            "MCC": 0.3510,
            "ROC-AUC": 0.7421,
            "PR-AUC": 0.7313,
            "TP": 138, "TN": 147, "FP": 64, "FN": 73,
            "Threshold": 0.3500
        },
        {
            "Model": "LLaVA-1.5-7B v4 (Focal Loss)",
            "Accuracy (%)": round(metrics["accuracy"] * 100, 2),
            "Balanced Acc (%)": round(metrics["balanced_accuracy"] * 100, 2),
            "Sensitivity (%)": round(metrics["sensitivity"] * 100, 2),
            "Specificity (%)": round(metrics["specificity"] * 100, 2),
            "Precision (%)": round(metrics["precision"] * 100, 2),
            "NPV (%)": round(metrics["npv"] * 100, 2),
            "Macro-F1 (%)": round(metrics["macro_f1"] * 100, 2),
            "MCC": round(metrics["mcc"], 4),
            "ROC-AUC": round(metrics["roc_auc"], 4),
            "PR-AUC": round(metrics["pr_auc"], 4),
            "TP": metrics["tp"], "TN": metrics["tn"], "FP": metrics["fp"], "FN": metrics["fn"],
            "Threshold": round(threshold, 4)
        }
    ]

    df_comp = pd.DataFrame(comp_rows)
    comp_csv = os.path.join(REPORTS_DIR, "v4_vs_all_comparison.csv")
    df_comp.to_csv(comp_csv, index=False)
    print(f"  [OK] Saved multi-model comparative table to: {comp_csv}")

    print("\n" + "=" * 80)
    print("FINAL TEST EVALUATION RESULTS (v4):")
    print(f"  Accuracy       : {metrics['accuracy']*100:.2f}% (95% CI: [{metrics['accuracy_ci95'][0]*100:.2f}%, {metrics['accuracy_ci95'][1]*100:.2f}%])")
    print(f"  Balanced Acc   : {metrics['balanced_accuracy']*100:.2f}%")
    print(f"  Sensitivity    : {metrics['sensitivity']*100:.2f}% (TP={metrics['tp']}, FN={metrics['fn']})")
    print(f"  Specificity    : {metrics['specificity']*100:.2f}% (TN={metrics['tn']}, FP={metrics['fp']})")
    print(f"  Macro-F1       : {metrics['macro_f1']*100:.2f}%")
    print(f"  ROC-AUC        : {metrics['roc_auc']:.4f}")
    print(f"  PR-AUC         : {metrics['pr_auc']:.4f}")
    print(f"  MCC            : {metrics['mcc']:.4f}")
    print("=" * 80)

    return metrics


def main():
    parser = argparse.ArgumentParser(description="Evaluate LLaVA v4 on held-out test split.")
    parser.add_argument("--adapter", type=str, default=DEFAULT_ADAPTER, help="Adapter checkpoint directory.")
    parser.add_argument("--threshold", type=float, default=None, help="Frozen decision threshold.")
    args = parser.parse_args()

    th = args.threshold
    if th is None:
        info_path = os.path.join(args.adapter, "best_checkpoint_info.json")
        if os.path.exists(info_path):
            with open(info_path, "r") as f:
                info = json.load(f)
                th = float(info.get("metrics", {}).get("optimal_threshold", 0.50))
                print(f"Loaded frozen validation threshold from {info_path}: {th:.4f}")
        else:
            th = 0.50
            print(f"Using default threshold: {th:.4f}")

    evaluate_llava_v4_on_test(args.adapter, threshold=th)


if __name__ == "__main__":
    main()
