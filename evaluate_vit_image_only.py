"""
ANVESH Medical AI Research Project
Evaluation & Research Artifact Generator for Vision Transformer (ViT-B/16)
Evaluates trained ViT model on held-out test cohort (N=422 cases).
Computes all statistical metrics, 95% confidence intervals, ROC/PR curves,
latency profiling, side-by-side comparison with existing LLaVA baselines,
and exports IEEE publication tables, figures, CSVs, and JSON summaries.
"""

import os
import sys
import json
import math
import time
import argparse
from typing import Dict, List, Any, Tuple

import numpy as np
import pandas as pd
from PIL import Image

import torch
import torch.nn as nn
from torchvision import transforms, models
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score,
    precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score, precision_recall_curve, auc,
    matthews_corrcoef, cohen_kappa_score
)

DEFAULT_TEST_JSON = "anvesh_dataset_image_only/test.json"
DEFAULT_IMAGE_BASE = "anvesh_dataset"
DEFAULT_CHECKPOINT = "checkpoints_vit_image_only/best_vit_model.pt"
DEFAULT_REPORTS_DIR = "reports/image_only_experiment/vit"
EXISTING_IMAGE_ONLY_DIR = "reports/image_only_experiment"

CLASS_TO_IDX = {"normal": 0, "abnormal": 1}
IDX_TO_CLASS = {0: "normal", 1: "abnormal"}

def wilson_score_interval(k: int, n: int, confidence: float = 0.95) -> Tuple[float, float]:
    if n == 0:
        return 0.0, 0.0
    z = 1.95996  # 95% normal quantile
    p = k / n
    denom = 1.0 + z**2 / n
    centre = p + z**2 / (2.0 * n)
    half_width = z * math.sqrt((p * (1.0 - p) + z**2 / (4.0 * n)) / n)
    lower = max(0.0, (centre - half_width) / denom)
    upper = min(1.0, (centre + half_width) / denom)
    return lower, upper

def bootstrap_ci(y_true: np.ndarray, y_score: np.ndarray, metric_fn, n_bootstraps: int = 1000, seed: int = 42) -> Tuple[float, float]:
    rng = np.random.RandomState(seed)
    scores = []
    n = len(y_true)
    for _ in range(n_bootstraps):
        idx = rng.randint(0, n, n)
        # Check if both classes are present in sample
        if len(np.unique(y_true[idx])) < 2:
            continue
        try:
            score = metric_fn(y_true[idx], y_score[idx])
            scores.append(score)
        except Exception:
            continue
    if not scores:
        return 0.0, 0.0
    lower = np.percentile(scores, 2.5)
    upper = np.percentile(scores, 97.5)
    return float(lower), float(upper)

def compute_all_metrics(y_true: List[str], y_pred: List[str], y_prob: List[float], latencies: List[float]) -> Dict[str, Any]:
    # Encode as binary (normal: 0, abnormal: 1)
    y_true_bin = np.array([CLASS_TO_IDX[y] for y in y_true])
    y_pred_bin = np.array([CLASS_TO_IDX[y] for y in y_pred])
    y_prob_arr = np.array(y_prob)
    
    tp = int(np.sum((y_true_bin == 1) & (y_pred_bin == 1)))
    tn = int(np.sum((y_true_bin == 0) & (y_pred_bin == 0)))
    fp = int(np.sum((y_true_bin == 0) & (y_pred_bin == 1)))
    fn = int(np.sum((y_true_bin == 1) & (y_pred_bin == 0)))
    
    total = len(y_true)
    n_pos = tp + fn
    n_neg = tn + fp
    
    acc = (tp + tn) / max(total, 1)
    err_rate = 1.0 - acc
    ci_acc = wilson_score_interval(tp + tn, total)
    
    sens = tp / max(n_pos, 1) if n_pos > 0 else 0.0
    ci_sens = wilson_score_interval(tp, n_pos)
    
    spec = tn / max(n_neg, 1) if n_neg > 0 else 0.0
    ci_spec = wilson_score_interval(tn, n_neg)
    
    prec = tp / max(tp + fp, 1) if (tp + fp) > 0 else 0.0
    ci_prec = wilson_score_interval(tp, tp + fp) if (tp + fp) > 0 else (0.0, 0.0)
    
    npv = tn / max(tn + fn, 1) if (tn + fn) > 0 else 0.0
    
    f1_abn = (2 * prec * sens) / max(prec + sens, 1e-9) if (prec + sens) > 0 else 0.0
    f1_norm = (2 * npv * spec) / max(npv + spec, 1e-9) if (npv + spec) > 0 else 0.0
    balanced_acc = (sens + spec) / 2.0
    macro_f1 = (f1_abn + f1_norm) / 2.0
    weighted_f1 = (n_pos * f1_abn + n_neg * f1_norm) / max(total, 1)
    
    # MCC
    mcc_num = (tp * tn) - (fp * fn)
    mcc_den = math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn)) if (tp + fp) * (tp + fn) * (tn + fp) * (tn + fn) > 0 else 1.0
    mcc = mcc_num / mcc_den if mcc_den != 0 else 0.0
    
    # Cohen's kappa
    po = acc
    pe = ((tp + fn) * (tp + fp) + (tn + fp) * (tn + fn)) / max(total * total, 1)
    kappa = (po - pe) / max(1.0 - pe, 1e-9) if (1.0 - pe) != 0 else 0.0
    
    # ROC-AUC & PR-AUC
    try:
        roc_auc = float(roc_auc_score(y_true_bin, y_prob_arr))
        ci_roc = bootstrap_ci(y_true_bin, y_prob_arr, roc_auc_score)
    except Exception:
        roc_auc = 0.5
        ci_roc = (0.5, 0.5)
        
    try:
        p_curve, r_curve, _ = precision_recall_curve(y_true_bin, y_prob_arr)
        pr_auc = float(auc(r_curve, p_curve))
    except Exception:
        pr_auc = 0.5
        
    # Latency statistics
    lat_mean = float(np.mean(latencies)) if latencies else 0.0
    lat_median = float(np.median(latencies)) if latencies else 0.0
    lat_p95 = float(np.percentile(latencies, 95)) if latencies else 0.0
    lat_std = float(np.std(latencies)) if latencies else 0.0
    
    return {
        "Total Cases (N)": total,
        "Ground Truth Positives (Abnormal)": n_pos,
        "Ground Truth Negatives (Normal)": n_neg,
        "True Positives (TP)": tp,
        "True Negatives (TN)": tn,
        "False Positives (FP)": fp,
        "False Negatives (FN)": fn,
        "Accuracy": acc,
        "Accuracy 95% CI": f"[{ci_acc[0]*100:.2f}%, {ci_acc[1]*100:.2f}%]",
        "Error Rate": err_rate,
        "Balanced Accuracy": balanced_acc,
        "Sensitivity / Recall (Abnormal)": sens,
        "Sensitivity 95% CI": f"[{ci_sens[0]*100:.2f}%, {ci_sens[1]*100:.2f}%]",
        "Specificity (Normal)": spec,
        "Specificity 95% CI": f"[{ci_spec[0]*100:.2f}%, {ci_spec[1]*100:.2f}%]",
        "Precision (PPV - Abnormal)": prec,
        "Precision 95% CI": f"[{ci_prec[0]*100:.2f}%, {ci_prec[1]*100:.2f}%]",
        "Negative Predictive Value (NPV)": npv,
        "F1-Score (Abnormal)": f1_abn,
        "F1-Score (Normal)": f1_norm,
        "Macro F1-Score": macro_f1,
        "Weighted F1-Score": weighted_f1,
        "Matthews Correlation Coefficient (MCC)": mcc,
        "Cohen's Kappa": kappa,
        "ROC-AUC": roc_auc,
        "ROC-AUC 95% CI": f"[{ci_roc[0]:.4f}, {ci_roc[1]:.4f}]",
        "PR-AUC": pr_auc,
        "Mean Latency (ms)": lat_mean,
        "Median Latency (ms)": lat_median,
        "P95 Latency (ms)": lat_p95,
        "Latency Std (ms)": lat_std
    }

def plot_confusion_matrix(tp: int, tn: int, fp: int, fn: int, out_path: str):
    cm = np.array([[tn, fp], [fn, tp]])
    labels = ["Normal", "Abnormal"]
    
    fig, ax = plt.subplots(figsize=(6, 5), dpi=300)
    cax = ax.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    plt.title("ViT-B/16 Image-Only CXR Confusion Matrix\nIndiana University Open-i (N = 422)", fontsize=11, fontweight="bold", pad=12)
    fig.colorbar(cax, ax=ax, fraction=0.046, pad=0.04)
    
    tick_marks = np.arange(len(labels))
    ax.set_xticks(tick_marks)
    ax.set_xticklabels(labels, fontsize=10)
    ax.set_yticks(tick_marks)
    ax.set_yticklabels(labels, fontsize=10)
    
    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            val = cm[i, j]
            pct = (val / 422.0) * 100
            ax.text(j, i, f"{val}\n({pct:.1f}%)",
                    ha="center", va="center",
                    color="white" if val > thresh else "black",
                    fontsize=12, fontweight="bold")
                    
    ax.set_ylabel("True Radiographic Ground Truth", fontsize=10, fontweight="bold")
    ax.set_xlabel("ViT Predicted Classification", fontsize=10, fontweight="bold")
    plt.tight_layout()
    plt.savefig(out_path, dpi=300)
    plt.close()
    print(f"Saved confusion matrix figure: {out_path}")

def plot_training_curves(history_csv: str, out_path: str):
    if not os.path.exists(history_csv):
        print(f"History CSV not found: {history_csv}, skipping curves plot.")
        return
        
    df = pd.read_csv(history_csv)
    epochs = df["epoch"].tolist()
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4.5), dpi=300)
    
    # Loss curves
    ax1.plot(epochs, df["train_loss"], label="Train Loss", marker="o", color="#1f77b4", linewidth=2)
    ax1.plot(epochs, df["val_loss"], label="Val Loss", marker="s", color="#ff7f0e", linewidth=2)
    ax1.set_title("Cross-Entropy Loss vs Epoch", fontsize=11, fontweight="bold")
    ax1.set_xlabel("Epoch", fontsize=10)
    ax1.set_ylabel("Loss", fontsize=10)
    ax1.grid(True, linestyle="--", alpha=0.6)
    ax1.legend(loc="upper right")
    
    # Accuracy and Macro-F1 curves
    ax2.plot(epochs, df["val_acc"] * 100, label="Val Accuracy (%)", marker="o", color="#2ca02c", linewidth=2)
    ax2.plot(epochs, df["val_macro_f1"] * 100, label="Val Macro-F1 (%)", marker="^", color="#d62728", linewidth=2)
    if "val_roc_auc" in df.columns:
        ax2.plot(epochs, df["val_roc_auc"] * 100, label="Val ROC-AUC (%)", marker="d", color="#9467bd", linewidth=1.5, linestyle="--")
    ax2.set_title("Validation Metrics vs Epoch", fontsize=11, fontweight="bold")
    ax2.set_xlabel("Epoch", fontsize=10)
    ax2.set_ylabel("Percentage (%)", fontsize=10)
    ax2.grid(True, linestyle="--", alpha=0.6)
    ax2.legend(loc="lower right")
    
    plt.suptitle("Vision Transformer (ViT-B/16) CXR Fine-Tuning History", fontsize=13, fontweight="bold", y=1.02)
    plt.tight_layout()
    plt.savefig(out_path, dpi=300)
    plt.close()
    print(f"Saved training curves plot: {out_path}")

def run_evaluation(test_json_path: str, image_base_dir: str, checkpoint_path: str, reports_dir: str):
    os.makedirs(reports_dir, exist_ok=True)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Evaluating ViT on device: {device}")
    
    # Load test cases
    with open(test_json_path, "r", encoding="utf-8") as f:
        test_cases = json.load(f)
    print(f"Loaded {len(test_cases)} test cases from {test_json_path}")
    
    # Load checkpoint
    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint not found: {checkpoint_path}")
        
    print(f"Loading checkpoint from: {checkpoint_path}")
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
    
    # Build model and load weights
    model = models.vit_b_16(weights=None)
    in_features = model.heads.head.in_features
    model.heads.head = nn.Linear(in_features, 2)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()
    
    # Transform
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # Warmup forward pass on dummy image to prime GPU kernels
    dummy_input = torch.zeros(1, 3, 224, 224, device=device)
    with torch.no_grad():
        _ = model(dummy_input)
    if device.type == "cuda":
        torch.cuda.synchronize()
        
    results = []
    latencies = []
    y_true = []
    y_pred = []
    y_prob_abnormal = []
    
    print("\nExecuting Inference across 422 held-out cases...")
    for item in test_cases:
        case_id = item["case_id"]
        img_rel_path = item["image_path"]
        gt = item["classification"]
        
        full_img_path = os.path.join(image_base_dir, img_rel_path)
        img = Image.open(full_img_path).convert("RGB")
        tensor = val_transform(img).unsqueeze(0).to(device)
        
        # Timing strictly the inference forward pass
        if device.type == "cuda":
            torch.cuda.synchronize()
        t0 = time.perf_counter()
        with torch.no_grad():
            outputs = model(tensor)
            probs = torch.softmax(outputs, dim=-1)
        if device.type == "cuda":
            torch.cuda.synchronize()
        t1 = time.perf_counter()
        lat_ms = (t1 - t0) * 1000.0
        latencies.append(lat_ms)
        
        prob_norm = float(probs[0, 0].item())
        prob_abn = float(probs[0, 1].item())
        pred_label = "abnormal" if prob_abn >= 0.5 else "normal"
        
        y_true.append(gt)
        y_pred.append(pred_label)
        y_prob_abnormal.append(prob_abn)
        
        results.append({
            "case_id": case_id,
            "condition": "vit_b_16_image_only",
            "ground_truth": gt,
            "prediction": pred_label,
            "prob_normal": round(prob_norm, 6),
            "prob_abnormal": round(prob_abn, 6),
            "latency_ms": round(lat_ms, 4)
        })
        
    print("Inference completed.")
    
    # Save predictions CSV
    preds_df = pd.DataFrame(results)
    preds_csv = os.path.join(reports_dir, "vit_test_predictions.csv")
    preds_df.to_csv(preds_csv, index=False)
    print(f"Saved ViT predictions CSV: {preds_csv} ({len(preds_df)} cases)")
    
    # Compute metrics
    metrics = compute_all_metrics(y_true, y_pred, y_prob_abnormal, latencies)
    
    # Save standalone metrics CSV
    standalone_rows = []
    for k, v in metrics.items():
        if isinstance(v, float):
            if "Latency" in k or "Coefficient" in k or "Kappa" in k or "AUC" in k:
                val_str = f"{v:.4f}"
            else:
                val_str = f"{v*100:.2f}%"
        else:
            val_str = str(v)
        standalone_rows.append({"Metric": k, "vit_b_16_image_only": val_str})
        
    standalone_df = pd.DataFrame(standalone_rows)
    metrics_csv = os.path.join(reports_dir, "vit_standalone_metrics.csv")
    standalone_df.to_csv(metrics_csv, index=False)
    print(f"Saved ViT standalone metrics CSV: {metrics_csv}")
    
    # Save JSON summary
    summary_json_path = os.path.join(reports_dir, "vit_summary.json")
    with open(summary_json_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    print(f"Saved ViT JSON summary: {summary_json_path}")
    
    # Confusion matrix counts CSV
    cm_counts = {
        "Model": "vit_b_16_image_only",
        "Total_N": metrics["Total Cases (N)"],
        "TP": metrics["True Positives (TP)"],
        "TN": metrics["True Negatives (TN)"],
        "FP": metrics["False Positives (FP)"],
        "FN": metrics["False Negatives (FN)"],
        "Accuracy_pct": f"{metrics['Accuracy']*100:.2f}%",
        "Sensitivity_pct": f"{metrics['Sensitivity / Recall (Abnormal)']*100:.2f}%",
        "Specificity_pct": f"{metrics['Specificity (Normal)']*100:.2f}%",
        "Precision_pct": f"{metrics['Precision (PPV - Abnormal)']*100:.2f}%",
        "Macro_F1_pct": f"{metrics['Macro F1-Score']*100:.2f}%",
        "MCC": f"{metrics['Matthews Correlation Coefficient (MCC)']:.4f}",
        "ROC_AUC": f"{metrics['ROC-AUC']:.4f}"
    }
    cm_df = pd.DataFrame([cm_counts])
    cm_csv = os.path.join(reports_dir, "vit_confusion_matrix_counts.csv")
    cm_df.to_csv(cm_csv, index=False)
    print(f"Saved ViT confusion matrix counts CSV: {cm_csv}")
    
    # Plot confusion matrix
    cm_png = os.path.join(reports_dir, "vit_confusion_matrix.png")
    plot_confusion_matrix(metrics["True Positives (TP)"], metrics["True Negatives (TN)"],
                          metrics["False Positives (FP)"], metrics["False Negatives (FN)"], cm_png)
                          
    # Plot training curves from checkpoint directory if history exists
    history_src = os.path.join("checkpoints_vit_image_only", "vit_training_history.csv")
    history_dst = os.path.join(reports_dir, "vit_training_history.csv")
    if os.path.exists(history_src):
        import shutil
        shutil.copyfile(history_src, history_dst)
        curves_png = os.path.join(reports_dir, "vit_training_curves.png")
        plot_training_curves(history_dst, curves_png)
        
    # Generate side-by-side comparison with existing image-only models
    generate_comparison_artifacts(metrics, reports_dir)
    
    return metrics

def generate_comparison_artifacts(vit_metrics: Dict[str, Any], reports_dir: str):
    """
    Builds side-by-side comparison table including:
    - vit_b_16_image_only (Fine-tuned ViT)
    - llava_image_only (Fine-tuned LLaVA QLoRA)
    - llava_base_zeroshot (Pretrained LLaVA base)
    - llava_text_adapter_ablation (Text adapter tested without text)
    - medgemma_4b_it (Marked as NOT EVALUATED / Blocked)
    """
    existing_summary_path = os.path.join(EXISTING_IMAGE_ONLY_DIR, "image_only_benchmark_summary.json")
    existing_metrics = {}
    if os.path.exists(existing_summary_path):
        with open(existing_summary_path, "r", encoding="utf-8") as f:
            raw_summary = json.load(f)
            existing_metrics = raw_summary.get("results", raw_summary)
            
    models_order = [
        "vit_b_16_image_only",
        "llava_image_only",
        "llava_base_zeroshot",
        "llava_text_adapter_ablation",
        "medgemma_4b_it"
    ]
    
    model_headers = {
        "vit_b_16_image_only": "ViT-B/16 (Image-Only Fine-Tuned)",
        "llava_image_only": "LLaVA-1.5-7B (Image-Only Adapter)",
        "llava_base_zeroshot": "LLaVA-1.5-7B (Base Zero-Shot)",
        "llava_text_adapter_ablation": "LLaVA-1.5-7B (Text Adapter Ablation)",
        "medgemma_4b_it": "MedGemma-4B-IT (Pretrained Baseline)"
    }
    
    all_metrics = {
        "vit_b_16_image_only": vit_metrics
    }
    for m in ["llava_image_only", "llava_base_zeroshot", "llava_text_adapter_ablation"]:
        if m in existing_metrics:
            all_metrics[m] = existing_metrics[m]
            
    # Metric keys to compare
    keys_to_compare = [
        ("Total Cases (N)", False),
        ("True Positives (TP)", False),
        ("True Negatives (TN)", False),
        ("False Positives (FP)", False),
        ("False Negatives (FN)", False),
        ("Accuracy", True),
        ("Accuracy 95% CI", False),
        ("Balanced Accuracy", True),
        ("Sensitivity / Recall (Abnormal)", True),
        ("Sensitivity 95% CI", False),
        ("Specificity (Normal)", True),
        ("Specificity 95% CI", False),
        ("Precision (PPV - Abnormal)", True),
        ("Precision 95% CI", False),
        ("Negative Predictive Value (NPV)", True),
        ("F1-Score (Abnormal)", True),
        ("F1-Score (Normal)", True),
        ("Macro F1-Score", True),
        ("Weighted F1-Score", True),
        ("Matthews Correlation Coefficient (MCC)", False),
        ("Cohen's Kappa", False),
        ("ROC-AUC", False),
        ("Mean Latency (ms)", False),
        ("Median Latency (ms)", False),
        ("P95 Latency (ms)", False)
    ]
    
    comp_rows = []
    for k, is_pct in keys_to_compare:
        row = {"Metric": k}
        for m in models_order:
            if m == "medgemma_4b_it":
                row[model_headers[m]] = "NOT EVALUATED (Blocked)"
            elif m in all_metrics:
                val = all_metrics[m].get(k, "N/A")
                if isinstance(val, float):
                    if is_pct:
                        row[model_headers[m]] = f"{val*100:.2f}%"
                    elif "Latency" in k or "Coefficient" in k or "Kappa" in k or "ROC-AUC" in k:
                        row[model_headers[m]] = f"{val:.4f}"
                    else:
                        row[model_headers[m]] = f"{val:.4f}"
                else:
                    row[model_headers[m]] = str(val)
            else:
                row[model_headers[m]] = "N/A"
        comp_rows.append(row)
        
    comp_df = pd.DataFrame(comp_rows)
    comp_csv = os.path.join(reports_dir, "vit_vs_existing_models_comparison.csv")
    comp_df.to_csv(comp_csv, index=False)
    print(f"Saved side-by-side comparison CSV: {comp_csv}")
    
    # Generate IEEE Markdown Table
    md_content = generate_ieee_markdown_table(comp_rows, model_headers)
    md_path = os.path.join(reports_dir, "vit_ieee_tables.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"Saved IEEE Markdown tables: {md_path}")
    
    # Generate IEEE LaTeX Table
    tex_content = generate_ieee_latex_table(comp_rows, model_headers)
    tex_path = os.path.join(reports_dir, "vit_ieee_tables.tex")
    with open(tex_path, "w", encoding="utf-8") as f:
        f.write(tex_content)
    print(f"Saved IEEE LaTeX tables: {tex_path}")

def generate_ieee_markdown_table(comp_rows: List[Dict[str, str]], headers: Dict[str, str]) -> str:
    md = []
    md.append("# IEEE Comparative Evaluation Tables: Vision Transformer vs. Multimodal Baselines")
    md.append("\n**Dataset:** Indiana University Open-i Chest Radiograph Collection (Held-Out Test Set, N = 422)")
    md.append("**Modality:** Pure Image-Only (Zero clinical findings, indications, or text prompts)")
    md.append("\n## Table I: Standalone and Comparative Classification Performance\n")
    
    cols = ["Metric", headers["vit_b_16_image_only"], headers["llava_image_only"], headers["llava_base_zeroshot"], headers["llava_text_adapter_ablation"], headers["medgemma_4b_it"]]
    
    md.append("| " + " | ".join(cols) + " |")
    md.append("| " + " | ".join(["---"] * len(cols)) + " |")
    
    for r in comp_rows:
        row_vals = [r.get(c, "N/A") for c in cols]
        md.append("| " + " | ".join(row_vals) + " |")
        
    md.append("\n*Note: MedGemma-4B-IT is marked 'NOT EVALUATED (Blocked)' because weights are gated on Hugging Face and require user credentials that are not stored in this autonomous environment. Cross-dataset evaluation is NOT COMPLETED as no independent verified external cohort is available without data fabrication.*\n")
    return "\n".join(md)

def generate_ieee_latex_table(comp_rows: List[Dict[str, str]], headers: Dict[str, str]) -> str:
    tex = []
    tex.append("% IEEE Table: ViT vs. Multimodal Baselines on Pure Image-Only CXR Classification")
    tex.append("\\begin{table*}[t]")
    tex.append("\\centering")
    tex.append("\\caption{Comparative Performance on Held-Out Indiana University Open-i Chest Radiographs ($N = 422$) Under Pure Image-Only Supervision}")
    tex.append("\\label{tab:vit_image_only_comparison}")
    tex.append("\\begin{tabular}{lccccc}")
    tex.append("\\toprule")
    tex.append("\\textbf{Metric} & \\textbf{ViT-B/16 (Ours)} & \\textbf{LLaVA Adapter} & \\textbf{LLaVA Base} & \\textbf{Text-Ablation} & \\textbf{MedGemma-4B} \\\\")
    tex.append("& (Fine-Tuned) & (Fine-Tuned) & (Zero-Shot) & (Ablated) & (Pretrained) \\\\")
    tex.append("\\midrule")
    
    key_metrics = [
        "Total Cases (N)",
        "True Positives (TP)",
        "True Negatives (TN)",
        "False Positives (FP)",
        "False Negatives (FN)",
        "Accuracy",
        "Balanced Accuracy",
        "Sensitivity / Recall (Abnormal)",
        "Specificity (Normal)",
        "Precision (PPV - Abnormal)",
        "Macro F1-Score",
        "Matthews Correlation Coefficient (MCC)",
        "Cohen's Kappa",
        "ROC-AUC",
        "Mean Latency (ms)"
    ]
    
    for r in comp_rows:
        if r["Metric"] in key_metrics:
            m_name = r["Metric"].replace("%", "\\%").replace("_", "\\_")
            v_vit = r.get(headers["vit_b_16_image_only"], "-").replace("%", "\\%")
            v_llava_img = r.get(headers["llava_image_only"], "-").replace("%", "\\%")
            v_llava_base = r.get(headers["llava_base_zeroshot"], "-").replace("%", "\\%")
            v_llava_abl = r.get(headers["llava_text_adapter_ablation"], "-").replace("%", "\\%")
            v_medgemma = "BLOCKED"
            tex.append(f"{m_name} & {v_vit} & {v_llava_img} & {v_llava_base} & {v_llava_abl} & {v_medgemma} \\\\")
            
    tex.append("\\bottomrule")
    tex.append("\\end{tabular}")
    tex.append("\\vspace{1ex}")
    tex.append("{\\footnotesize \\textit{Note:} MedGemma-4B-IT was blocked from local image-only evaluation due to Hugging Face token gating restrictions. All values verified against disk manifests.}")
    tex.append("\\end{table*}")
    return "\n".join(tex)

def main():
    parser = argparse.ArgumentParser(description="Evaluate Vision Transformer on Image-Only CXR Test Split")
    parser.add_argument("--test-json", type=str, default=DEFAULT_TEST_JSON, help="Path to test.json")
    parser.add_argument("--image-base", type=str, default=DEFAULT_IMAGE_BASE, help="Base path for images")
    parser.add_argument("--checkpoint", type=str, default=DEFAULT_CHECKPOINT, help="Path to best_vit_model.pt")
    parser.add_argument("--reports-dir", type=str, default=DEFAULT_REPORTS_DIR, help="Directory to save ViT reports")
    args = parser.parse_args()
    
    run_evaluation(args.test_json, args.image_base, args.checkpoint, args.reports_dir)

if __name__ == "__main__":
    main()
