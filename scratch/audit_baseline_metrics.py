import pandas as pd
import numpy as np
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score, roc_auc_score,
    f1_score, confusion_matrix, precision_score, recall_score,
    matthews_corrcoef, cohen_kappa_score, precision_recall_curve, auc
)

df = pd.read_csv('reports/v2_llava_test_predictions.csv')
print(f"Total test cases: {len(df)}")
y_true = (df['ground_truth'] == 'abnormal').astype(int).values
y_pred = (df['prediction'] == 'abnormal').astype(int).values
probs = df['p_abnormal'].values

cm = confusion_matrix(y_true, y_pred)
tn, fp, fn, tp = cm.ravel()
acc = accuracy_score(y_true, y_pred)
bacc = balanced_accuracy_score(y_true, y_pred)
sens = recall_score(y_true, y_pred)
spec = tn / (tn + fp)
prec = precision_score(y_true, y_pred)
npv = tn / (tn + fn)
f1_abn = f1_score(y_true, y_pred, pos_label=1)
f1_norm = f1_score(y_true, y_pred, pos_label=0)
mf1 = (f1_abn + f1_norm) / 2.0
wf1 = f1_score(y_true, y_pred, average='weighted')
mcc = matthews_corrcoef(y_true, y_pred)
kappa = cohen_kappa_score(y_true, y_pred)
roc_auc = roc_auc_score(y_true, probs)
prec_c, rec_c, _ = precision_recall_curve(y_true, probs)
pr_auc = auc(rec_c, prec_c)

print("\n--- INDEPENDENT RECALCULATION FROM SAVED TEST PREDICTIONS ---")
print(f"Confusion Matrix: TP={tp}, TN={tn}, FP={fp}, FN={fn} | Sum={tp+tn+fp+fn}")
print(f"Accuracy         : {acc:.4f} ({acc*100:.2f}%)")
print(f"Balanced Accuracy: {bacc:.4f} ({bacc*100:.2f}%)")
print(f"Sensitivity      : {sens:.4f} ({sens*100:.2f}%)")
print(f"Specificity      : {spec:.4f} ({spec*100:.2f}%)")
print(f"Precision (PPV)  : {prec:.4f} ({prec*100:.2f}%)")
print(f"NPV              : {npv:.4f} ({npv*100:.2f}%)")
print(f"F1 (Abnormal)    : {f1_abn:.4f}")
print(f"F1 (Normal)      : {f1_norm:.4f}")
print(f"Macro F1         : {mf1:.4f} ({mf1*100:.2f}%)")
print(f"Weighted F1      : {wf1:.4f}")
print(f"MCC              : {mcc:.4f}")
print(f"Cohen's Kappa    : {kappa:.4f}")
print(f"ROC-AUC          : {roc_auc:.4f}")
print(f"PR-AUC           : {pr_auc:.4f}")
