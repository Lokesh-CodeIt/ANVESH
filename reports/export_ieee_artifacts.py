"""
ANVESH Medical AI Research Evaluation — IEEE Artifact Exporter
Generates all IEEE research paper tables, LaTeX sources, CSVs, JSON summaries, and high-resolution confusion matrix figures.
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

OUTPUT_DIR = "reports"
PREDICTIONS_CSV = os.path.join(OUTPUT_DIR, "llava_vs_medgemma_full_test_predictions.csv")

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
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "normal" and yp == "abnormal")
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "normal" and yp == "normal")
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "abnormal" and yp == "normal")
    
    total = tp + fp + tn + fn
    accuracy = (tp + tn) / max(total, 1)
    error_rate = 1.0 - accuracy
    
    precision = tp / max(tp + fp, 1) if (tp + fp) > 0 else 0.0
    sensitivity = tp / max(tp + fn, 1) if (tp + fn) > 0 else 0.0
    specificity = tn / max(tn + fp, 1) if (tn + fp) > 0 else 0.0
    npv = tn / max(tn + fn, 1) if (tn + fn) > 0 else 0.0
    
    f1_abn = (2 * precision * sensitivity) / max(precision + sensitivity, 1e-9) if (precision + sensitivity) > 0 else 0.0
    prec_norm = npv
    rec_norm = specificity
    f1_norm = (2 * prec_norm * rec_norm) / max(prec_norm + rec_norm, 1e-9) if (prec_norm + rec_norm) > 0 else 0.0
    
    balanced_acc = (sensitivity + specificity) / 2.0
    macro_f1 = (f1_abn + f1_norm) / 2.0
    weighted_f1 = ((tp + fn) * f1_abn + (tn + fp) * f1_norm) / max(total, 1)
    
    # MCC
    mcc_num = (tp * tn) - (fp * fn)
    mcc_den = math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn)) if (tp + fp) * (tp + fn) * (tn + fp) * (tn + fn) > 0 else 1.0
    mcc = mcc_num / mcc_den if mcc_den != 0 else 0.0
    
    # Kappa
    po = accuracy
    pe = ((tp + fn) * (tp + fp) + (tn + fp) * (tn + fn)) / max(total * total, 1)
    kappa = (po - pe) / max(1.0 - pe, 1e-9) if (1.0 - pe) > 0 else 0.0
    
    ci_acc = wilson_score_interval(tp + tn, total)
    ci_sens = wilson_score_interval(tp, tp + fn)
    ci_spec = wilson_score_interval(tn, tn + fp)
    ci_prec = wilson_score_interval(tp, tp + fp) if (tp + fp) > 0 else (0.0, 0.0)
    
    res = {
        "Total Cases (N)": total,
        "Ground Truth Positives (Abnormal)": tp + fn,
        "Ground Truth Negatives (Normal)": tn + fp,
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
        print(f"Predictions CSV not found at {PREDICTIONS_CSV}. Cannot export.")
        return

    df = pd.read_csv(PREDICTIONS_CSV)
    print(f"Loaded predictions: {len(df)} cases.")
    
    y_true = df["ground_truth"].tolist()
    y_mg = df["medgemma_pred"].tolist()
    y_llava = df["llava_pred"].tolist()
    latencies = df["latency_ms"] if "latency_ms" in df.columns else None
    
    m_mg = compute_metrics(y_true, y_mg)
    m_llava = compute_metrics(y_true, y_llava, latencies)
    
    # 1. Standalone LLaVA CSV
    llava_rows = [{"Metric": k, "LLaVA_1_5_7B_FineTuned": f"{v*100:.2f}%" if isinstance(v, float) and "Latency" not in k and "Coefficient" not in k and "Kappa" not in k else (f"{v:.4f}" if isinstance(v, float) else str(v))} for k, v in m_llava.items()]
    df_llava = pd.DataFrame(llava_rows)
    df_llava.to_csv(os.path.join(OUTPUT_DIR, "llava_standalone_metrics.csv"), index=False)
    
    # 2. Standalone MedGemma CSV
    mg_rows = [{"Metric": k, "MedGemma_4B_Pretrained": f"{v*100:.2f}%" if isinstance(v, float) and "Latency" not in k and "Coefficient" not in k and "Kappa" not in k else (f"{v:.4f}" if isinstance(v, float) else str(v))} for k, v in m_mg.items()]
    df_mg = pd.DataFrame(mg_rows)
    df_mg.to_csv(os.path.join(OUTPUT_DIR, "medgemma_standalone_metrics.csv"), index=False)
    
    # 3. Side-by-Side Comparison CSV
    side_by_side = []
    for k in m_llava.keys():
        v_mg = m_mg.get(k, "N/A")
        v_ll = m_llava.get(k, "N/A")
        
        # Format strings
        str_mg = f"{v_mg*100:.2f}%" if isinstance(v_mg, float) and "Latency" not in k and "Coefficient" not in k and "Kappa" not in k else (f"{v_mg:.4f}" if isinstance(v_mg, float) else str(v_mg))
        str_ll = f"{v_ll*100:.2f}%" if isinstance(v_ll, float) and "Latency" not in k and "Coefficient" not in k and "Kappa" not in k else (f"{v_ll:.4f}" if isinstance(v_ll, float) else str(v_ll))
        
        delta_str = ""
        if isinstance(v_mg, float) and isinstance(v_ll, float):
            delta = v_ll - v_mg
            delta_str = f"{delta*100:+.2f}%" if "Latency" not in k and "Coefficient" not in k and "Kappa" not in k else f"{delta:+.4f}"
            
        side_by_side.append({
            "Metric": k,
            "MedGemma_4B_Pretrained": str_mg,
            "LLaVA_1_5_7B_FineTuned": str_ll,
            "Delta_LLaVA_minus_MedGemma": delta_str
        })
    df_side = pd.DataFrame(side_by_side)
    df_side.to_csv(os.path.join(OUTPUT_DIR, "llava_vs_medgemma_side_by_side.csv"), index=False)
    
    # 4. Confusion Matrix Counts CSV
    cm_counts = [
        {"Condition": "MedGemma-4B (Pretrained)", "TP": m_mg["True Positives (TP)"], "TN": m_mg["True Negatives (TN)"], "FP": m_mg["False Positives (FP)"], "FN": m_mg["False Negatives (FN)"], "Total": m_mg["Total Cases (N)"]},
        {"Condition": "LLaVA-1.5-7B (Fine-Tuned)", "TP": m_llava["True Positives (TP)"], "TN": m_llava["True Negatives (TN)"], "FP": m_llava["False Positives (FP)"], "FN": m_llava["False Negatives (FN)"], "Total": m_llava["Total Cases (N)"]}
    ]
    df_cm = pd.DataFrame(cm_counts)
    df_cm.to_csv(os.path.join(OUTPUT_DIR, "confusion_matrix_counts.csv"), index=False)
    
    # 5. Full JSON Summary
    summary_json = {
        "benchmark_metadata": {
            "date": "October 2026",
            "hardware_llava": "NVIDIA GeForce RTX 4090 24GB",
            "hardware_medgemma": "Google Colab T4 (Historical precomputed baseline)",
            "dataset": "Indiana University Open-i Chest X-Ray Collection",
            "split": "Held-Out Patient-Level Test Split (N=422)",
            "cross_dataset_evaluation": "Unavailable locally (No external CXR dataset present on system)"
        },
        "medgemma_4b_pretrained": m_mg,
        "llava_1_5_7b_finetuned": m_llava
    }
    with open(os.path.join(OUTPUT_DIR, "benchmark_summary.json"), "w", encoding="utf-8") as jf:
        json.dump(summary_json, jf, indent=2)
        
    # 6. Plot Confusion Matrices
    fig, axes = plt.subplots(1, 2, figsize=(11, 5), dpi=300)
    
    def plot_cm(ax, tp, fp, fn, tn, title):
        cm = np.array([[tn, fp], [fn, tp]])
        cax = ax.matshow(cm, cmap="Blues", alpha=0.8)
        for i in range(2):
            for j in range(2):
                val = cm[i, j]
                ax.text(j, i, f"{val}\n({val/len(y_true)*100:.1f}%)", ha="center", va="center", fontsize=12, fontweight="bold")
        ax.set_xticks([0, 1])
        ax.set_yticks([0, 1])
        ax.set_xticklabels(["Pred Normal", "Pred Abnormal"], fontsize=10)
        ax.set_yticklabels(["True Normal", "True Abnormal"], fontsize=10)
        ax.set_title(title, fontsize=12, pad=15, fontweight="bold")
        ax.tick_params(top=False, bottom=True, labeltop=False, labelbottom=True)
        return cax

    plot_cm(axes[0], m_mg["True Positives (TP)"], m_mg["False Positives (FP)"], m_mg["False Negatives (FN)"], m_mg["True Negatives (TN)"], "MedGemma-4B (Pretrained)")
    plot_cm(axes[1], m_llava["True Positives (TP)"], m_llava["False Positives (FP)"], m_llava["False Negatives (FN)"], m_llava["True Negatives (TN)"], "LLaVA-1.5-7B (Fine-Tuned)")
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "confusion_matrices_side_by_side.png"), bbox_inches="tight")
    plt.close()

    # Individual LLaVA CM
    fig, ax = plt.subplots(figsize=(6, 5), dpi=300)
    plot_cm(ax, m_llava["True Positives (TP)"], m_llava["False Positives (FP)"], m_llava["False Negatives (FN)"], m_llava["True Negatives (TN)"], "LLaVA-1.5-7B (Fine-Tuned Adapter)\nIndiana University Held-Out Test Cohort (N=422)")
    plt.savefig(os.path.join(OUTPUT_DIR, "confusion_matrix_llava.png"), bbox_inches="tight")
    plt.close()

    # Individual MedGemma CM
    fig, ax = plt.subplots(figsize=(6, 5), dpi=300)
    plot_cm(ax, m_mg["True Positives (TP)"], m_mg["False Positives (FP)"], m_mg["False Negatives (FN)"], m_mg["True Negatives (TN)"], "MedGemma-4B (Pretrained Baseline)\nIndiana University Held-Out Test Cohort (N=422)")
    plt.savefig(os.path.join(OUTPUT_DIR, "confusion_matrix_medgemma.png"), bbox_inches="tight")
    plt.close()

    # 7. Generate IEEE LaTeX Source
    latex_content = generate_latex_source(m_mg, m_llava)
    with open(os.path.join(OUTPUT_DIR, "ieee_tables.tex"), "w", encoding="utf-8") as tf:
        tf.write(latex_content)
        
    # 8. Generate Markdown Preview
    md_content = generate_markdown_tables(m_mg, m_llava)
    with open(os.path.join(OUTPUT_DIR, "ieee_tables.md"), "w", encoding="utf-8") as mf:
        mf.write(md_content)

    print("Successfully exported all IEEE tables, CSVs, JSON summaries, and PNG figures!")

def generate_latex_source(m_mg, m_llava):
    mg_kappa = m_mg.get("Cohen's Kappa", 0.0)
    llava_kappa = m_llava.get("Cohen's Kappa", 0.0)
    delta_kappa = llava_kappa - mg_kappa
    return r"""% ==============================================================================
% IEEE RESEARCH PAPER TABLES: ANVESH MULTIMODAL CXR BENCHMARK
% Head-to-Head Comparative Study: Fine-Tuned LLaVA-1.5-7B vs. Pretrained MedGemma-4B
% ==============================================================================

\documentclass{IEEEtran}
\usepackage{booktabs}
\usepackage{amsmath}
\usepackage{graphicx}
\usepackage{multirow}

\begin{document}

% ------------------------------------------------------------------------------
% TABLE I: Head-to-Head Performance Comparison
% ------------------------------------------------------------------------------
\begin{table*}[t]
\centering
\caption{Comparative Diagnostic Performance: Pretrained MedGemma-4B vs. Fine-Tuned LLaVA-1.5-7B on Indiana University Held-Out Test Cohort ($N = 422$)}
\label{tab:cxr_comparison}
\begin{tabular}{lcccc}
\toprule
\textbf{Metric / Evaluation Dimension} & \textbf{MedGemma-4B (Pretrained)} & \textbf{LLaVA-1.5-7B (Fine-Tuned)} & \textbf{Absolute Delta ($\Delta$)} & \textbf{Statistical 95\% CI / Note} \\
\midrule
Evaluation Cohort Size ($N$)           & 422 & 422 & 0 & Patient-separated split \\
Ground Truth Abnormal ($P$)            & 211 & 211 & 0 & Indiana University Open-i \\
Ground Truth Normal ($N$)              & 211 & 211 & 0 & Indiana University Open-i \\
\midrule
True Positives ($TP$)                  & """ + str(m_mg["True Positives (TP)"]) + r""" & """ + str(m_llava["True Positives (TP)"]) + r""" & """ + f"{m_llava['True Positives (TP)'] - m_mg['True Positives (TP)']:+d}" + r""" & Correctly detected abnormal \\
True Negatives ($TN$)                  & """ + str(m_mg["True Negatives (TN)"]) + r""" & """ + str(m_llava["True Negatives (TN)"]) + r""" & """ + f"{m_llava['True Negatives (TN)'] - m_mg['True Negatives (TN)']:+d}" + r""" & Correctly detected normal \\
False Positives ($FP$)                 & """ + str(m_mg["False Positives (FP)"]) + r""" & """ + str(m_llava["False Positives (FP)"]) + r""" & """ + f"{m_llava['False Positives (FP)'] - m_mg['False Positives (FP)']:+d}" + r""" & Type I errors \\
False Negatives ($FN$)                 & """ + str(m_mg["False Negatives (FN)"]) + r""" & """ + str(m_llava["False Negatives (FN)"]) + r""" & """ + f"{m_llava['False Negatives (FN)'] - m_mg['False Negatives (FN)']:+d}" + r""" & Type II errors (Missed pathology) \\
\midrule
Standard Accuracy                      & """ + f"{m_mg['Accuracy']*100:.2f}\\%" + r""" & """ + f"{m_llava['Accuracy']*100:.2f}\\%" + r""" & """ + f"{(m_llava['Accuracy'] - m_mg['Accuracy'])*100:+.2f}\\%" + r""" & Wilson CI: """ + m_llava['Accuracy 95% CI'] + r""" \\
Balanced Accuracy                      & """ + f"{m_mg['Balanced Accuracy']*100:.2f}\\%" + r""" & """ + f"{m_llava['Balanced Accuracy']*100:.2f}\\%" + r""" & """ + f"{(m_llava['Balanced Accuracy'] - m_mg['Balanced Accuracy'])*100:+.2f}\\%" + r""" & Mean of sensitivity and specificity \\
Sensitivity / Recall (Abnormal)        & """ + f"{m_mg['Sensitivity / Recall (Abnormal)']*100:.2f}\\%" + r""" & """ + f"{m_llava['Sensitivity / Recall (Abnormal)']*100:.2f}\\%" + r""" & """ + f"{(m_llava['Sensitivity / Recall (Abnormal)'] - m_mg['Sensitivity / Recall (Abnormal)'])*100:+.2f}\\%" + r""" & Wilson CI: """ + m_llava['Sensitivity 95% CI'] + r""" \\
Specificity (Normal)                   & """ + f"{m_mg['Specificity (Normal)']*100:.2f}\\%" + r""" & """ + f"{m_llava['Specificity (Normal)']*100:.2f}\\%" + r""" & """ + f"{(m_llava['Specificity (Normal)'] - m_mg['Specificity (Normal)'])*100:+.2f}\\%" + r""" & Wilson CI: """ + m_llava['Specificity 95% CI'] + r""" \\
Precision (PPV - Abnormal)             & """ + f"{m_mg['Precision (PPV - Abnormal)']*100:.2f}\\%" + r""" & """ + f"{m_llava['Precision (PPV - Abnormal)']*100:.2f}\\%" + r""" & """ + f"{(m_llava['Precision (PPV - Abnormal)'] - m_mg['Precision (PPV - Abnormal)'])*100:+.2f}\\%" + r""" & Wilson CI: """ + m_llava['Precision 95% CI'] + r""" \\
Negative Predictive Value (NPV)        & """ + f"{m_mg['Negative Predictive Value (NPV)']*100:.2f}\\%" + r""" & """ + f"{m_llava['Negative Predictive Value (NPV)']*100:.2f}\\%" + r""" & """ + f"{(m_llava['Negative Predictive Value (NPV)'] - m_mg['Negative Predictive Value (NPV)'])*100:+.2f}\\%" + r""" & Precision of normal class \\
Abnormal $F_1$-Score                   & """ + f"{m_mg['F1-Score (Abnormal)']*100:.2f}\\%" + r""" & """ + f"{m_llava['F1-Score (Abnormal)']*100:.2f}\\%" + r""" & """ + f"{(m_llava['F1-Score (Abnormal)'] - m_mg['F1-Score (Abnormal)'])*100:+.2f}\\%" + r""" & Harmonic mean of PPV and Recall \\
Normal $F_1$-Score                     & """ + f"{m_mg['F1-Score (Normal)']*100:.2f}\\%" + r""" & """ + f"{m_llava['F1-Score (Normal)']*100:.2f}\\%" + r""" & """ + f"{(m_llava['F1-Score (Normal)'] - m_mg['F1-Score (Normal)'])*100:+.2f}\\%" + r""" & Harmonic mean of NPV and Specificity \\
Macro-Averaged $F_1$                   & """ + f"{m_mg['Macro F1-Score']*100:.2f}\\%" + r""" & """ + f"{m_llava['Macro F1-Score']*100:.2f}\\%" + r""" & """ + f"{(m_llava['Macro F1-Score'] - m_mg['Macro F1-Score'])*100:+.2f}\\%" + r""" & Unweighted class mean \\
Weighted $F_1$-Score                   & """ + f"{m_mg['Weighted F1-Score']*100:.2f}\\%" + r""" & """ + f"{m_llava['Weighted F1-Score']*100:.2f}\\%" + r""" & """ + f"{(m_llava['Weighted F1-Score'] - m_mg['Weighted F1-Score'])*100:+.2f}\\%" + r""" & Class-prevalence weighted \\
Matthews Correlation Coeff. (MCC)      & """ + f"{m_mg['Matthews Correlation Coefficient (MCC)']:+.4f}" + r""" & """ + f"{m_llava['Matthews Correlation Coefficient (MCC)']:+.4f}" + r""" & """ + f"{m_llava['Matthews Correlation Coefficient (MCC)'] - m_mg['Matthews Correlation Coefficient (MCC)']:+.4f}" + r""" & Range: $[-1.0, +1.0]$ \\
Cohen's Kappa ($\kappa$)               & """ + f"{mg_kappa:+.4f}" + r""" & """ + f"{llava_kappa:+.4f}" + r""" & """ + f"{delta_kappa:+.4f}" + r""" & Inter-annotator agreement \\
\midrule
Mean Inference Latency                 & $\sim$8,500 ms (Colab T4) & """ + f"{m_llava.get('Mean Latency (ms)', 0.0):.1f} ms" + r""" & --- & RTX 4090 batch throughput: """ + f"{1000.0/max(m_llava.get('Mean Latency (ms)', 1.0), 0.1):.2f}" + r""" cases/s \\
\bottomrule
\end{tabular}
\end{table*}

% ------------------------------------------------------------------------------
% TABLE II: Confusion Matrix Breakdown
% ------------------------------------------------------------------------------
\begin{table}[h]
\centering
\caption{Confusion Matrix Contingency Table: Normal vs. Abnormal Radiograph Studies ($N=422$)}
\label{tab:cm_contingency}
\begin{tabular}{lcccc}
\toprule
& \multicolumn{2}{c}{\textbf{MedGemma-4B (Pretrained)}} & \multicolumn{2}{c}{\textbf{LLaVA-1.5-7B (Fine-Tuned)}} \\
\cmidrule(lr){2-3} \cmidrule(lr){4-5}
\textbf{Ground Truth} & \textbf{Pred. Normal} & \textbf{Pred. Abnormal} & \textbf{Pred. Normal} & \textbf{Pred. Abnormal} \\
\midrule
Actual Normal ($n=211$)   & """ + str(m_mg["True Negatives (TN)"]) + r""" (TN) & """ + str(m_mg["False Positives (FP)"]) + r""" (FP) & """ + str(m_llava["True Negatives (TN)"]) + r""" (TN) & """ + str(m_llava["False Positives (FP)"]) + r""" (FP) \\
Actual Abnormal ($n=211$) & """ + str(m_mg["False Negatives (FN)"]) + r""" (FN) & """ + str(m_mg["True Positives (TP)"]) + r""" (TP) & """ + str(m_llava["False Negatives (FN)"]) + r""" (FN) & """ + str(m_llava["True Positives (TP)"]) + r""" (TP) \\
\bottomrule
\end{tabular}
\end{table}

% ------------------------------------------------------------------------------
% TABLE III: Cross-Dataset Generalization Status
% ------------------------------------------------------------------------------
\begin{table}[h]
\centering
\caption{Cross-Dataset Generalization Audit}
\label{tab:cross_dataset}
\begin{tabular}{lccc}
\toprule
\textbf{Dataset} & \textbf{Evaluated Cases} & \textbf{Status} & \textbf{Limitation} \\
\midrule
Indiana University Open-i & 422 & Completed & In-distribution held-out \\
External CXR Cohort & 0 & NOT COMPLETED & Unavailable on local hardware \\
\bottomrule
\end{tabular}
\end{table}

\end{document}
"""

def generate_markdown_tables(m_mg, m_llava):
    mg_kappa = m_mg.get("Cohen's Kappa", 0.0)
    llava_kappa = m_llava.get("Cohen's Kappa", 0.0)
    delta_kappa = llava_kappa - mg_kappa
    return f"""# ANVESH Multimodal Benchmark: IEEE Research Tables

## Table I: Head-to-Head Comparative Results (Held-Out Test Cohort, N = 422)

| Metric / Dimension | MedGemma-4B (Pretrained) | LLaVA-1.5-7B (Fine-Tuned) | Absolute Delta ($\Delta$) | Statistical 95% CI / Protocol Note |
|---|:---:|:---:|:---:|---|
| **Total Test Cohort ($N$)** | 422 | 422 | 0 | Patient-level separated held-out split |
| **Ground Truth Abnormal ($P$)** | 211 | 211 | 0 | Indiana University Open-i Radiologist Dictation |
| **Ground Truth Normal ($N$)** | 211 | 211 | 0 | Indiana University Open-i Radiologist Dictation |
| **True Positives ($TP$)** | {m_mg['True Positives (TP)']} | {m_llava['True Positives (TP)']} | {m_llava['True Positives (TP)'] - m_mg['True Positives (TP)']:+d} | Correctly detected abnormal studies |
| **True Negatives ($TN$)** | {m_mg['True Negatives (TN)']} | {m_llava['True Negatives (TN)']} | {m_llava['True Negatives (TN)'] - m_mg['True Negatives (TN)']:+d} | Correctly identified normal studies |
| **False Positives ($FP$)** | {m_mg['False Positives (FP)']} | {m_llava['False Positives (FP)']} | {m_llava['False Positives (FP)'] - m_mg['False Positives (FP)']:+d} | Normal studies flagged abnormal |
| **False Negatives ($FN$)** | {m_mg['False Negatives (FN)']} | {m_llava['False Negatives (FN)']} | {m_llava['False Negatives (FN)'] - m_mg['False Negatives (FN)']:+d} | Missed abnormal studies |
| **Standard Accuracy** | {m_mg['Accuracy']*100:.2f}% | {m_llava['Accuracy']*100:.2f}% | {(m_llava['Accuracy'] - m_mg['Accuracy'])*100:+.2f}% | Wilson CI: {m_llava['Accuracy 95% CI']} |
| **Balanced Accuracy** | {m_mg['Balanced Accuracy']*100:.2f}% | {m_llava['Balanced Accuracy']*100:.2f}% | {(m_llava['Balanced Accuracy'] - m_mg['Balanced Accuracy'])*100:+.2f}% | Mean of sensitivity and specificity |
| **Sensitivity / Recall (Abnormal)** | {m_mg['Sensitivity / Recall (Abnormal)']*100:.2f}% | {m_llava['Sensitivity / Recall (Abnormal)']*100:.2f}% | {(m_llava['Sensitivity / Recall (Abnormal)'] - m_mg['Sensitivity / Recall (Abnormal)'])*100:+.2f}% | Wilson CI: {m_llava['Sensitivity 95% CI']} |
| **Specificity (Normal)** | {m_mg['Specificity (Normal)']*100:.2f}% | {m_llava['Specificity (Normal)']*100:.2f}% | {(m_llava['Specificity (Normal)'] - m_mg['Specificity (Normal)'])*100:+.2f}% | Wilson CI: {m_llava['Specificity 95% CI']} |
| **Precision (PPV - Abnormal)** | {m_mg['Precision (PPV - Abnormal)']*100:.2f}% | {m_llava['Precision (PPV - Abnormal)']*100:.2f}% | {(m_llava['Precision (PPV - Abnormal)'] - m_mg['Precision (PPV - Abnormal)'])*100:+.2f}% | Wilson CI: {m_llava['Precision 95% CI']} |
| **Negative Predictive Value (NPV)** | {m_mg['Negative Predictive Value (NPV)']*100:.2f}% | {m_llava['Negative Predictive Value (NPV)']*100:.2f}% | {(m_llava['Negative Predictive Value (NPV)'] - m_mg['Negative Predictive Value (NPV)'])*100:+.2f}% | Precision of normal class |
| **Abnormal $F_1$-Score** | {m_mg['F1-Score (Abnormal)']*100:.2f}% | {m_llava['F1-Score (Abnormal)']*100:.2f}% | {(m_llava['F1-Score (Abnormal)'] - m_mg['F1-Score (Abnormal)'])*100:+.2f}% | Harmonic mean of PPV and sensitivity |
| **Normal $F_1$-Score** | {m_mg['F1-Score (Normal)']*100:.2f}% | {m_llava['F1-Score (Normal)']*100:.2f}% | {(m_llava['F1-Score (Normal)'] - m_mg['F1-Score (Normal)'])*100:+.2f}% | Harmonic mean of NPV and specificity |
| **Macro $F_1$-Score** | {m_mg['Macro F1-Score']*100:.2f}% | {m_llava['Macro F1-Score']*100:.2f}% | {(m_llava['Macro F1-Score'] - m_mg['Macro F1-Score'])*100:+.2f}% | Unweighted class average |
| **Weighted $F_1$-Score** | {m_mg['Weighted F1-Score']*100:.2f}% | {m_llava['Weighted F1-Score']*100:.2f}% | {(m_llava['Weighted F1-Score'] - m_mg['Weighted F1-Score'])*100:+.2f}% | Prevalence-weighted class average |
| **Matthews Corr. Coeff. (MCC)** | {m_mg['Matthews Correlation Coefficient (MCC)']:+.4f} | {m_llava['Matthews Correlation Coefficient (MCC)']:+.4f} | {m_llava['Matthews Correlation Coefficient (MCC)'] - m_mg['Matthews Correlation Coefficient (MCC)']:+.4f} | Pearson correlation for binary classification |
| **Cohen's Kappa ($\kappa$)** | {mg_kappa:+.4f} | {llava_kappa:+.4f} | {delta_kappa:+.4f} | Agreement beyond chance |
| **Inference Latency** | ~8,500 ms (Colab T4) | {m_llava.get('Mean Latency (ms)', 0.0):.1f} ms | Local RTX 4090 | Measured batch execution |

---

## Table II: Confusion Matrix Breakdown (Side-by-Side)

| Actual Ground Truth | MedGemma Pred Normal | MedGemma Pred Abnormal | LLaVA Pred Normal | LLaVA Pred Abnormal | Class Total |
|---|:---:|:---:|:---:|:---:|:---:|
| **Actual Normal** | **{m_mg['True Negatives (TN)']} (TN)** | **{m_mg['False Positives (FP)']} (FP)** | **{m_llava['True Negatives (TN)']} (TN)** | **{m_llava['False Positives (FP)']} (FP)** | 211 |
| **Actual Abnormal** | **{m_mg['False Negatives (FN)']} (FN)** | **{m_mg['True Positives (TP)']} (TP)** | **{m_llava['False Negatives (FN)']} (FN)** | **{m_llava['True Positives (TP)']} (TP)** | 211 |
| **Total Predicted** | **{m_mg['True Negatives (TN)'] + m_mg['False Negatives (FN)']}** | **{m_mg['True Positives (TP)'] + m_mg['False Positives (FP)']}** | **{m_llava['True Negatives (TN)'] + m_llava['False Negatives (FN)']}** | **{m_llava['True Positives (TP)'] + m_llava['False Positives (FP)']}** | 422 |

---

## Table III: Cross-Dataset Generalization Status

| Dataset Name | Source / Institution | Samples Evaluated | Availability Status | Limitation / Note |
|---|---|:---:|:---:|---|
| **Indiana University Open-i** | NIH / Indiana University | 422 held-out | **Completed** | Full in-distribution test split evaluated. |
| **External CXR Cohort** | N/A (MIMIC-CXR / CheXpert / NIH CXR-14) | 0 | **NOT COMPLETED (Unavailable)** | No external CXR dataset provisioned on local hardware. |
"""

if __name__ == "__main__":
    export_all()
