import os
import sys
import json
import math
import pandas as pd
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score, precision_score, recall_score,
    f1_score, matthews_corrcoef, cohen_kappa_score, roc_auc_score,
    precision_recall_curve, auc, confusion_matrix
)

def main():
    preds_path = "reports/primary_llava_test_predictions.csv"
    summary_path = "reports/primary_llava_summary.json"
    metrics_csv_path = "reports/primary_llava_metrics.csv"

    print("=" * 80)
    print("PHASE 1 AUDIT: RECALCULATING METRICS DIRECTLY FROM SAVED PREDICTIONS")
    print("=" * 80)

    df = pd.read_csv(preds_path)
    with open(summary_path, "r", encoding="utf-8") as f:
        summary = json.load(f)

    y_true = df["ground_truth"].tolist()
    y_pred = df["prediction"].tolist()
    p_abn = df["p_abnormal"].tolist()

    y_true_bin = [1 if y == "abnormal" else 0 for y in y_true]
    y_pred_bin = [1 if y == "abnormal" else 0 for y in y_pred]

    cm = confusion_matrix(y_true, y_pred, labels=["normal", "abnormal"])
    tn, fp, fn, tp = cm.ravel()

    acc = accuracy_score(y_true_bin, y_pred_bin)
    bal_acc = balanced_accuracy_score(y_true_bin, y_pred_bin)
    sens = recall_score(y_true_bin, y_pred_bin)
    spec = tn / (tn + fp)
    prec = precision_score(y_true_bin, y_pred_bin)
    npv = tn / (tn + fn)
    f1_abn = f1_score(y_true_bin, y_pred_bin)
    f1_norm = f1_score(y_true_bin, y_pred_bin, pos_label=0)
    macro_f1 = f1_score(y_true_bin, y_pred_bin, average="macro")
    weighted_f1 = f1_score(y_true_bin, y_pred_bin, average="weighted")
    mcc = matthews_corrcoef(y_true_bin, y_pred_bin)
    kappa = cohen_kappa_score(y_true_bin, y_pred_bin)
    roc_auc = roc_auc_score(y_true_bin, p_abn)
    pr_prec, pr_rec, _ = precision_recall_curve(y_true_bin, p_abn)
    pr_auc = auc(pr_rec, pr_prec)

    recalculated = {
        "Total Cases (N)": len(df),
        "True Positives (TP)": int(tp),
        "True Negatives (TN)": int(tn),
        "False Positives (FP)": int(fp),
        "False Negatives (FN)": int(fn),
        "Accuracy": round(acc, 4),
        "Balanced Accuracy": round(bal_acc, 4),
        "Sensitivity / Recall (Abnormal)": round(sens, 4),
        "Specificity (Normal)": round(spec, 4),
        "Precision (PPV - Abnormal)": round(prec, 4),
        "Negative Predictive Value (NPV)": round(npv, 4),
        "F1-Score (Abnormal)": round(f1_abn, 4),
        "F1-Score (Normal)": round(f1_norm, 4),
        "Macro F1-Score": round(macro_f1, 4),
        "Weighted F1-Score": round(weighted_f1, 4),
        "Matthews Correlation Coefficient (MCC)": round(mcc, 4),
        "Cohen's Kappa": round(kappa, 4),
        "ROC-AUC": round(roc_auc, 4),
        "PR-AUC": round(pr_auc, 4),
    }

    all_match = True
    for key, calc_val in recalculated.items():
        rep_val = summary.get(key)
        match = (calc_val == rep_val)
        status = "MATCH" if match else f"MISMATCH (Reported: {rep_val})"
        print(f"  {key:<40}: {calc_val} | {status}")
        if not match:
            all_match = False

    print("\nSummary Audit Result:", "PERFECT AGREEMENT" if all_match else "DISCREPANCIES DETECTED")

    # Check distribution of p_abnormal
    print("\nScore Distribution Analysis (p_abnormal):")
    print(df["p_abnormal"].describe())

    # Check unique values of p_abnormal
    unique_scores = df["p_abnormal"].nunique()
    print(f"Number of unique continuous probability values: {unique_scores} / {len(df)}")
    print(f"Top 10 most common scores:")
    print(df["p_abnormal"].value_counts().head(10))

if __name__ == "__main__":
    main()
