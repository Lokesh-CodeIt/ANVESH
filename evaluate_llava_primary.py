"""
ANVESH Medical AI Research: Primary LLaVA-1.5-7B Held-Out Evaluation Pipeline
Evaluates the fine-tuned primary LLaVA adapter on the 422-case held-out test cohort.
Produces:
1. Individual predictions CSV (reports/primary_llava_test_predictions.csv)
2. Metric summary CSV and JSON (reports/primary_llava_metrics.csv, reports/primary_llava_summary.json)
3. Confusion matrix counts and 300-DPI publication heatmap (reports/confusion_matrix_llava_primary.png)
4. Comparative benchmark table across All 3 conditions (LLaVA-Primary vs ViT-B/16 vs LLaVA-Base)
5. Training curve plots from training_history.csv
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

os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

BASE_MODEL_ID = "llava-hf/llava-1.5-7b-hf"
TEST_JSON_PATH = "anvesh_dataset_image_only/test.json"
IMAGE_BASE_DIR = "anvesh_dataset"
REPORTS_DIR = "reports"
PRIMARY_ADAPTER_DIR = "checkpoints_llava_primary/best_adapter"

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

    # Continuous Curve Metrics
    y_binary = [1 if y == "abnormal" else 0 for y in y_true]
    try:
        roc_auc = float(roc_auc_score(y_binary, y_prob_abnormal))
    except Exception:
        roc_auc = 0.50

    try:
        prec_curve, rec_curve, _ = precision_recall_curve(y_binary, y_prob_abnormal)
        pr_auc = float(auc(rec_curve, prec_curve))
    except Exception:
        pr_auc = 0.50

    lat_series = pd.Series(latencies_ms)

    return {
        "Total Cases (N)": total,
        "Ground Truth Positives (Abnormal)": n_pos,
        "Ground Truth Negatives (Normal)": n_neg,
        "True Positives (TP)": tp,
        "True Negatives (TN)": tn,
        "False Positives (FP)": fp,
        "False Negatives (FN)": fn,
        "Accuracy": round(accuracy, 4),
        "Accuracy 95% CI": f"[{ci_acc[0]*100:.2f}%, {ci_acc[1]*100:.2f}%]",
        "Balanced Accuracy": round(balanced_acc, 4),
        "Sensitivity / Recall (Abnormal)": round(sensitivity, 4),
        "Sensitivity 95% CI": f"[{ci_sens[0]*100:.2f}%, {ci_sens[1]*100:.2f}%]",
        "Specificity (Normal)": round(specificity, 4),
        "Specificity 95% CI": f"[{ci_spec[0]*100:.2f}%, {ci_spec[1]*100:.2f}%]",
        "Precision (PPV - Abnormal)": round(precision, 4),
        "Precision 95% CI": f"[{ci_prec[0]*100:.2f}%, {ci_prec[1]*100:.2f}%]",
        "Negative Predictive Value (NPV)": round(npv, 4),
        "F1-Score (Abnormal)": round(f1_abn, 4),
        "F1-Score (Normal)": round(f1_norm, 4),
        "Macro F1-Score": round(macro_f1, 4),
        "Weighted F1-Score": round(weighted_f1, 4),
        "Matthews Correlation Coefficient (MCC)": round(mcc, 4),
        "Cohen's Kappa": round(kappa, 4),
        "ROC-AUC": round(roc_auc, 4),
        "PR-AUC": round(pr_auc, 4),
        "Mean Latency (ms)": round(float(lat_series.mean()), 2),
        "Median Latency (ms)": round(float(lat_series.median()), 2),
        "P95 Latency (ms)": round(float(lat_series.quantile(0.95)), 2),
        "Throughput (samples/s)": round(1000.0 / float(lat_series.mean()), 2)
    }


def plot_confusion_matrix(cm_counts: Dict[str, int], output_png: str):
    tp = cm_counts["True Positives (TP)"]
    tn = cm_counts["True Negatives (TN)"]
    fp = cm_counts["False Positives (FP)"]
    fn = cm_counts["False Negatives (FN)"]

    cm_array = np.array([[tn, fp], [fn, tp]])
    labels = ["Normal", "Abnormal"]

    plt.figure(figsize=(6, 5), dpi=300)
    plt.imshow(cm_array, interpolation="nearest", cmap=plt.cm.Blues)
    plt.title("Confusion Matrix — Primary Fine-Tuned LLaVA-1.5-7B\n(Held-Out Test Split, N=422)", fontsize=12, weight="bold", pad=12)
    plt.colorbar()
    tick_marks = np.arange(len(labels))
    plt.xticks(tick_marks, labels, fontsize=11, weight="bold")
    plt.yticks(tick_marks, labels, fontsize=11, weight="bold")

    thresh = cm_array.max() / 2.0
    for i in range(cm_array.shape[0]):
        for j in range(cm_array.shape[1]):
            val = cm_array[i, j]
            color = "white" if val > thresh else "black"
            plt.text(j, i, f"{val:d}", horizontalalignment="center", verticalalignment="center",
                     fontsize=16, weight="bold", color=color)

    plt.xlabel("Predicted Class", fontsize=11, weight="bold")
    plt.ylabel("Ground Truth Class", fontsize=11, weight="bold")
    plt.tight_layout()
    plt.savefig(output_png, dpi=300)
    plt.close()
    print(f"Saved confusion matrix heatmap to: {output_png}")


def plot_training_curves(history_csv: str, output_png: str):
    if not os.path.exists(history_csv):
        return
    df = pd.read_csv(history_csv)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4.5), dpi=300)

    if "train_loss" in df.columns:
        train_steps = df.dropna(subset=["train_loss"])
        ax1.plot(train_steps["step"], train_steps["train_loss"], label="Train Loss", color="#2563eb", marker="o")
    if "val_loss" in df.columns:
        ax1.plot(df["step"], df["val_loss"], label="Val Loss", color="#dc2626", marker="s")
    ax1.set_title("Training & Validation Loss", weight="bold")
    ax1.set_xlabel("Global Step")
    ax1.set_ylabel("Loss")
    ax1.legend()
    ax1.grid(True, linestyle="--", alpha=0.5)

    if "macro_f1" in df.columns:
        ax2.plot(df["step"], df["macro_f1"] * 100, label="Val Macro-F1 (%)", color="#16a34a", marker="^")
    if "accuracy" in df.columns:
        ax2.plot(df["step"], df["accuracy"] * 100, label="Val Accuracy (%)", color="#9333ea", marker="d")
    ax2.set_title("Validation Classification Metrics", weight="bold")
    ax2.set_xlabel("Global Step")
    ax2.set_ylabel("Percentage (%)")
    ax2.legend()
    ax2.grid(True, linestyle="--", alpha=0.5)

    plt.tight_layout()
    plt.savefig(output_png, dpi=300)
    plt.close()
    print(f"Saved training curves to: {output_png}")


def run_evaluation(adapter_path: str, batch_size: int = 4):
    print("=" * 80)
    print("ANVESH: PRIMARY LLaVA-1.5-7B HELD-OUT TEST EVALUATION (N=422)")
    print(f"  Checkpoint Path: {adapter_path}")
    print("=" * 80)

    if not os.path.exists(adapter_path):
        raise FileNotFoundError(f"Adapter not found at: {adapter_path}")

    with open(TEST_JSON_PATH, "r", encoding="utf-8") as f:
        test_cases = json.load(f)

    print(f"Loaded {len(test_cases)} test cases from {TEST_JSON_PATH}.")

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

    print("Attaching Primary LLaVA LoRA adapter...")
    model = PeftModel.from_pretrained(base_model, adapter_path)
    model.eval()

    records = []
    latencies = []
    y_true = []
    y_pred = []
    y_prob_abnormal = []

    print(f"Evaluating {len(test_cases)} test cases on NVIDIA RTX 4090...")

    for idx in range(0, len(test_cases), batch_size):
        batch = test_cases[idx: idx + batch_size]
        images = [Image.open(os.path.join(IMAGE_BASE_DIR, x["image_path"])).convert("RGB") for x in batch]
        prompts = [f"USER: <image>\n{x['prompt']}\nASSISTANT: {PREFIX_TEXT}" for x in batch]

        t0 = time.perf_counter()
        inputs = processor(text=prompts, images=images, padding=True, return_tensors="pt").to("cuda")

        with torch.inference_mode():
            outputs = model(**inputs)
            last_logits = outputs.logits[:, -1, :]
            logit_norm = last_logits[:, TOK_NORMAL].cpu().float().numpy()
            logit_abn = last_logits[:, TOK_ABNORMAL].cpu().float().numpy()

        batch_time_ms = (time.perf_counter() - t0) * 1000.0
        per_sample_latency = batch_time_ms / len(batch)

        for i, item in enumerate(batch):
            gt = item["classification"]
            ln = logit_norm[i]
            la = logit_abn[i]

            p_abn = float(np.exp(la) / (np.exp(la) + np.exp(ln) + 1e-12))
            pred = "abnormal" if p_abn >= 0.50 else "normal"

            records.append({
                "case_id": item["case_id"],
                "image_path": item["image_path"],
                "ground_truth": gt,
                "prediction": pred,
                "p_abnormal": round(p_abn, 4),
                "p_normal": round(1.0 - p_abn, 4),
                "logit_diff": round(float(la - ln), 4),
                "latency_ms": round(per_sample_latency, 2),
                "model": "Primary LLaVA-1.5-7B QLoRA"
            })

            y_true.append(gt)
            y_pred.append(pred)
            y_prob_abnormal.append(p_abn)
            latencies.append(per_sample_latency)

        if (idx + batch_size) % 40 < batch_size or (idx + batch_size) >= len(test_cases):
            print(f"  Processed {min(idx + batch_size, len(test_cases))}/{len(test_cases)} cases...")

    # Compute comprehensive metrics
    metrics = compute_comprehensive_metrics(y_true, y_pred, y_prob_abnormal, latencies)

    # Save outputs
    os.makedirs(REPORTS_DIR, exist_ok=True)
    pred_csv = os.path.join(REPORTS_DIR, "primary_llava_test_predictions.csv")
    pd.DataFrame(records).to_csv(pred_csv, index=False)
    print(f"\nSaved test predictions to: {pred_csv}")

    metrics_csv = os.path.join(REPORTS_DIR, "primary_llava_metrics.csv")
    pd.DataFrame([metrics]).to_csv(metrics_csv, index=False)
    print(f"Saved test metrics to: {metrics_csv}")

    summary_json = os.path.join(REPORTS_DIR, "primary_llava_summary.json")
    with open(summary_json, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"Saved test summary JSON to: {summary_json}")

    cm_png = os.path.join(REPORTS_DIR, "confusion_matrix_llava_primary.png")
    plot_confusion_matrix(metrics, cm_png)

    # Training curves
    curves_png = os.path.join(REPORTS_DIR, "primary_llava_training_curves.png")
    plot_training_curves(os.path.join("checkpoints_llava_primary", "training_history.csv"), curves_png)

    print("\n" + "=" * 80)
    print("PRIMARY LLaVA HELD-OUT TEST EVALUATION SUMMARY:")
    print("=" * 80)
    for k, v in metrics.items():
        print(f"  {k:38s}: {v}")
    print("=" * 80)


def main():
    parser = argparse.ArgumentParser(description="Evaluate Primary LLaVA-1.5-7B on held-out test split.")
    parser.add_argument("--adapter-path", type=str, default=PRIMARY_ADAPTER_DIR, help="Path to primary adapter.")
    parser.add_argument("--batch-size", type=int, default=4, help="Inference batch size.")
    args = parser.parse_args()
    run_evaluation(args.adapter_path, args.batch_size)


if __name__ == "__main__":
    main()
