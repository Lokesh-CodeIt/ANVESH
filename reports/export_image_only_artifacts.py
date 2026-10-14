"""
ANVESH Medical AI Research: Image-Only IEEE Research Artifact Exporter
Generates LaTeX tables, CSV summaries, JSON benchmarks, and 300 DPI figures
for the pure image-only diagnostic evaluation (zero clinical text in prompts).
"""

import os
import sys
import json
import math
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

OUTPUT_DIR = "reports/image_only_experiment"
PREDICTIONS_CSV = os.path.join(OUTPUT_DIR, "image_only_test_predictions.csv")

def wilson_score_interval(k: int, n: int, confidence: float = 0.95):
    if n == 0:
        return 0.0, 0.0
    z = 1.95996
    p = k / n
    denominator = 1 + z**2 / n
    centre = p + z**2 / (2 * n)
    adj_sd = math.sqrt((p * (1 - p) + z**2 / (4 * n)) / n)
    lower = max(0.0, (centre - z * adj_sd) / denominator)
    upper = min(1.0, (centre + z * adj_sd) / denominator)
    return lower, upper

def compute_metrics(y_true, y_pred, latency_series=None):
    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "abnormal" and yp == "abnormal")
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "normal" and yp == "normal")
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "normal" and yp == "abnormal")
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "abnormal" and yp == "normal")
    
    total = len(y_true)
    n_pos = tp + fn
    n_neg = tn + fp
    
    accuracy = (tp + tn) / max(total, 1)
    error_rate = 1.0 - accuracy
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
    
    ci_acc = wilson_score_interval(tp + tn, total)
    ci_sens = wilson_score_interval(tp, n_pos)
    ci_spec = wilson_score_interval(tn, n_neg)
    ci_prec = wilson_score_interval(tp, tp + fp) if (tp + fp) > 0 else (0.0, 0.0)
    
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
        "Error Rate": error_rate,
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
    
    if latency_series is not None and len(latency_series) > 0:
        res["Mean Latency (ms)"] = float(latency_series.mean())
        res["Median Latency (ms)"] = float(latency_series.median())
        res["P95 Latency (ms)"] = float(latency_series.quantile(0.95))
        
    return res

def export_all():
    if not os.path.exists(PREDICTIONS_CSV):
        print(f"Predictions CSV not found at: {PREDICTIONS_CSV}")
        return

    df = pd.read_csv(PREDICTIONS_CSV)
    print(f"Loaded predictions: {len(df)} rows across conditions.")
    
    conditions = df["condition"].unique().tolist()
    print("Detected conditions:", conditions)
    
    metrics_by_cond = {}
    for cond in conditions:
        cdf = df[df["condition"] == cond].copy()
        y_true = cdf["ground_truth"].tolist()
        y_pred = cdf["prediction"].tolist()
        lats = cdf["latency_ms"] if "latency_ms" in cdf.columns else None
        metrics_by_cond[cond] = compute_metrics(y_true, y_pred, lats)
        
        # Save standalone CSV
        rows = [{"Metric": k, cond: f"{v*100:.2f}%" if isinstance(v, float) and "Latency" not in k and "Coefficient" not in k and "Kappa" not in k else (f"{v:.4f}" if isinstance(v, float) else str(v))} for k, v in metrics_by_cond[cond].items()]
        pd.DataFrame(rows).to_csv(os.path.join(OUTPUT_DIR, f"{cond}_metrics.csv"), index=False)

    # Side-by-side comparison CSV
    base_cond = "llava_image_only" if "llava_image_only" in metrics_by_cond else conditions[0]
    side_rows = []
    for k in metrics_by_cond[base_cond].keys():
        row = {"Metric": k}
        for cond in conditions:
            v = metrics_by_cond[cond].get(k, "N/A")
            row[cond] = f"{v*100:.2f}%" if isinstance(v, float) and "Latency" not in k and "Coefficient" not in k and "Kappa" not in k else (f"{v:.4f}" if isinstance(v, float) else str(v))
        side_rows.append(row)
    pd.DataFrame(side_rows).to_csv(os.path.join(OUTPUT_DIR, "image_only_side_by_side.csv"), index=False)

    # Confusion matrix counts CSV
    cm_rows = []
    for cond in conditions:
        m = metrics_by_cond[cond]
        cm_rows.append({
            "Condition": cond,
            "TP": m["True Positives (TP)"],
            "TN": m["True Negatives (TN)"],
            "FP": m["False Positives (FP)"],
            "FN": m["False Negatives (FN)"],
            "Total": m["Total Cases (N)"]
        })
    pd.DataFrame(cm_rows).to_csv(os.path.join(OUTPUT_DIR, "image_only_confusion_matrix_counts.csv"), index=False)

    # Summary JSON
    summary_json = {
        "benchmark_metadata": {
            "experiment": "ANVESH Pure Image-Only Radiographic Classification",
            "date": "October 2026",
            "prompt_text_leakage": "NONE (Zero findings, impressions, or clinical text in prompts)",
            "input_modality": "Frontal/lateral radiograph pixel image + standardized clinical prompt only",
            "cohort": "Indiana University Open-i Held-Out Test Cohort (N=422)",
            "medgemma_status": "Blocked (Authentication required for gated model, no local credentials provisioned)"
        },
        "results": metrics_by_cond
    }
    with open(os.path.join(OUTPUT_DIR, "image_only_benchmark_summary.json"), "w", encoding="utf-8") as jf:
        json.dump(summary_json, jf, indent=2)

    # Plots
    def plot_cm(ax, tp, fp, fn, tn, title, total):
        cm = np.array([[tn, fp], [fn, tp]])
        ax.matshow(cm, cmap="Blues", alpha=0.8)
        for i in range(2):
            for j in range(2):
                val = cm[i, j]
                ax.text(j, i, f"{val}\n({val/total*100:.1f}%)", ha="center", va="center", fontsize=11, fontweight="bold")
        ax.set_xticks([0, 1])
        ax.set_yticks([0, 1])
        ax.set_xticklabels(["Pred Normal", "Pred Abnormal"], fontsize=9)
        ax.set_yticklabels(["True Normal", "True Abnormal"], fontsize=9)
        ax.set_title(title, fontsize=11, pad=12, fontweight="bold")
        ax.tick_params(top=False, bottom=True, labeltop=False, labelbottom=True)

    for cond in conditions:
        fig, ax = plt.subplots(figsize=(5.5, 4.8), dpi=300)
        m = metrics_by_cond[cond]
        plot_cm(ax, m["True Positives (TP)"], m["False Positives (FP)"], m["False Negatives (FN)"], m["True Negatives (TN)"], f"{cond}\nImage-Only Test Cohort (N={m['Total Cases (N)']})", m["Total Cases (N)"])
        plt.tight_layout()
        plt.savefig(os.path.join(OUTPUT_DIR, f"confusion_matrix_{cond}.png"), bbox_inches="tight")
        plt.close()

    # Multi-condition side-by-side figure
    n_cond = len(conditions)
    fig, axes = plt.subplots(1, n_cond, figsize=(5.5 * n_cond, 4.8), dpi=300)
    if n_cond == 1:
        axes = [axes]
    for idx, cond in enumerate(conditions):
        m = metrics_by_cond[cond]
        plot_cm(axes[idx], m["True Positives (TP)"], m["False Positives (FP)"], m["False Negatives (FN)"], m["True Negatives (TN)"], f"{cond}", m["Total Cases (N)"])
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "confusion_matrices_side_by_side.png"), bbox_inches="tight")
    plt.close()

    # Generate Markdown Table Set
    md_content = generate_markdown(metrics_by_cond)
    with open(os.path.join(OUTPUT_DIR, "ieee_image_only_tables.md"), "w", encoding="utf-8") as mf:
        mf.write(md_content)

    # Generate LaTeX Table Set
    tex_content = generate_latex(metrics_by_cond)
    with open(os.path.join(OUTPUT_DIR, "ieee_image_only_tables.tex"), "w", encoding="utf-8") as tf:
        tf.write(tex_content)

    print("Successfully exported all Image-Only IEEE artifacts!")

def generate_markdown(metrics_by_cond):
    conds = list(metrics_by_cond.keys())
    header = "| Metric / Dimension | " + " | ".join(conds) + " |"
    sep = "|---| " + " | ".join([":---:" for _ in conds]) + " |"
    
    keys = list(metrics_by_cond[conds[0]].keys())
    rows = []
    for k in keys:
        vals = []
        for c in conds:
            v = metrics_by_cond[c].get(k, "N/A")
            s = f"{v*100:.2f}%" if isinstance(v, float) and "Latency" not in k and "Coefficient" not in k and "Kappa" not in k else (f"{v:.4f}" if isinstance(v, float) else str(v))
            vals.append(s)
        rows.append(f"| **{k}** | " + " | ".join(vals) + " |")
        
    return f"""# ANVESH Image-Only Benchmark: Performance Tables

## Table I: Comparative Diagnostic Performance on Pure Radiograph Pixels (N = 422)

> **Protocol Disclosure:** The models evaluated below received strictly the chest radiograph image and task prompt. Zero dictated findings, impressions, or clinical reports were provided.

{header}
{sep}
""" + "\n".join(rows) + """

---

## Table II: Cross-Dataset & Gated Access Audit

| Model / Dataset | Condition | Status | Reason / Limitation |
|---|---|:---:|---|
| **MedGemma-4B-IT** | Pretrained / Fine-Tuned | **NOT COMPLETED (Blocked)** | Gated model access on HuggingFace Hub; no authenticated local credentials (`HF_TOKEN`). |
| **External CXR Cohort** | Cross-Dataset (MIMIC / CheXpert) | **NOT COMPLETED (Unavailable)** | No external CXR dataset provisioned on local hardware storage. |
"""

def generate_latex(metrics_by_cond):
    conds = list(metrics_by_cond.keys())
    col_spec = "l" + "c" * len(conds)
    col_headers = " & ".join([r"\textbf{" + c.replace("_", r"\_") + "}" for c in conds])
    
    keys = [
        "Total Cases (N)", "Ground Truth Positives (Abnormal)", "Ground Truth Negatives (Normal)",
        "True Positives (TP)", "True Negatives (TN)", "False Positives (FP)", "False Negatives (FN)",
        "Accuracy", "Balanced Accuracy", "Sensitivity / Recall (Abnormal)", "Specificity (Normal)",
        "Precision (PPV - Abnormal)", "Negative Predictive Value (NPV)", "F1-Score (Abnormal)",
        "F1-Score (Normal)", "Macro F1-Score", "Weighted F1-Score", "Matthews Correlation Coefficient (MCC)", "Cohen's Kappa"
    ]
    
    tex_rows = []
    for k in keys:
        vals = []
        for c in conds:
            v = metrics_by_cond[c].get(k, "N/A")
            s = f"{v*100:.2f}\\%" if isinstance(v, float) and "Latency" not in k and "Coefficient" not in k and "Kappa" not in k else (f"{v:.4f}" if isinstance(v, float) else str(v))
            vals.append(s)
        tex_rows.append(k.replace("%", r"\%").replace("_", r"\_") + " & " + " & ".join(vals) + r" \\")

    return r"""% ==============================================================================
% IEEE RESEARCH PAPER TABLES: ANVESH IMAGE-ONLY MULTIMODAL CXR BENCHMARK
% Pure Visual Evaluation (Zero Clinical Dictation in Input Prompts)
% ==============================================================================

\documentclass{IEEEtran}
\usepackage{booktabs}
\usepackage{amsmath}
\usepackage{graphicx}
\usepackage{multirow}

\begin{document}

\begin{table*}[t]
\centering
\caption{Comparative Diagnostic Performance on Pure Radiograph Pixels ($N = 422$ Held-Out Cohort)}
\label{tab:image_only_comparison}
\begin{tabular}{""" + col_spec + r"""}
\toprule
\textbf{Metric / Evaluation Dimension} & """ + col_headers + r""" \\
\midrule
""" + "\n".join(tex_rows) + r"""
\bottomrule
\end{tabular}
\end{table*}

\end{document}
"""

if __name__ == "__main__":
    export_all()
