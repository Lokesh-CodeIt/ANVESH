import json
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, roc_auc_score, f1_score, recall_score, precision_score, brier_score_loss

# Load predictions
df_v2 = pd.read_csv("reports/v2_llava_test_predictions.csv")
df_v3 = pd.read_csv("reports/v3_llava_test_predictions.csv")

print(f"Loaded v2: {len(df_v2)} rows, v3: {len(df_v3)} rows")

# Merge on case_id
df = pd.merge(df_v2, df_v3, on="case_id", suffixes=("_v2", "_v3"))
print(f"Merged cases: {len(df)}")

# Check ground truth match
assert (df["ground_truth_v2"] == df["ground_truth_v3"]).all()
y_true = (df["ground_truth_v2"] == "abnormal").astype(int)

p_v2 = df["p_abnormal"].values
p_v3 = df["prob_abnormal"].values

print("\n--- Summary Statistics of Predicted Probabilities ---")
print(f"v2 Mean P(abnormal): {p_v2.mean():.4f} +/- {p_v2.std():.4f} (Median: {np.median(p_v2):.4f})")
print(f"v3 Mean P(abnormal): {p_v3.mean():.4f} +/- {p_v3.std():.4f} (Median: {np.median(p_v3):.4f})")

print("\n--- By Ground Truth Subgroup ---")
print(f"v2 Normal Cases:   Mean P(abnormal) = {p_v2[y_true == 0].mean():.4f} +/- {p_v2[y_true == 0].std():.4f}")
print(f"v3 Normal Cases:   Mean P(abnormal) = {p_v3[y_true == 0].mean():.4f} +/- {p_v3[y_true == 0].std():.4f}")
print(f"v2 Abnormal Cases: Mean P(abnormal) = {p_v2[y_true == 1].mean():.4f} +/- {p_v2[y_true == 1].std():.4f}")
print(f"v3 Abnormal Cases: Mean P(abnormal) = {p_v3[y_true == 1].mean():.4f} +/- {p_v3[y_true == 1].std():.4f}")

# Threshold sweeps on Test
print("\n--- Test Set Threshold Sweeps (Empirical Maxima) ---")
best_acc_v2, best_th_v2 = 0, 0
best_acc_v3, best_th_v3 = 0, 0
best_f1_v2, best_f1th_v2 = 0, 0
best_f1_v3, best_f1th_v3 = 0, 0

for th in np.linspace(0.10, 0.90, 81):
    pred2 = (p_v2 >= th).astype(int)
    acc2 = accuracy_score(y_true, pred2)
    f1_2 = f1_score(y_true, pred2, average="macro")
    if acc2 > best_acc_v2:
        best_acc_v2, best_th_v2 = acc2, th
    if f1_2 > best_f1_v2:
        best_f1_v2, best_f1th_v2 = f1_2, th

    pred3 = (p_v3 >= th).astype(int)
    acc3 = accuracy_score(y_true, pred3)
    f1_3 = f1_score(y_true, pred3, average="macro")
    if acc3 > best_acc_v3:
        best_acc_v3, best_th_v3 = acc3, th
    if f1_3 > best_f1_v3:
        best_f1_v3, best_f1th_v3 = f1_3, th

print(f"v2 Peak Test Accuracy: {best_acc_v2*100:.2f}% at threshold {best_th_v2:.4f} (Peak Macro-F1: {best_f1_v2*100:.2f}% at {best_f1th_v2:.4f})")
print(f"v3 Peak Test Accuracy: {best_acc_v3*100:.2f}% at threshold {best_th_v3:.4f} (Peak Macro-F1: {best_f1_v3*100:.2f}% at {best_f1th_v3:.4f})")

# Agreement / Flipping Analysis
pred_v2_at_51 = (p_v2 >= 0.51).astype(int)
pred_v3_at_35 = (p_v3 >= 0.35).astype(int)
pred_v3_at_51 = (p_v3 >= 0.51).astype(int)

print("\n--- Decision Agreement ---")
agree = (pred_v2_at_51 == pred_v3_at_35).sum()
print(f"Agreement between v2 (th=0.51) and v3 (th=0.35): {agree}/422 ({agree/422*100:.2f}%)")

# What about v3 at threshold 0.51?
acc_v3_at_51 = accuracy_score(y_true, pred_v3_at_51)
print(f"v3 at original threshold 0.51: Acc={acc_v3_at_51*100:.2f}%, TP={(pred_v3_at_51 & y_true).sum()}, TN={((pred_v3_at_51==0) & (y_true==0)).sum()}, FP={(pred_v3_at_51 & (y_true==0)).sum()}, FN={((pred_v3_at_51==0) & y_true).sum()}")

# Cases that flipped
flipped_to_pos = (pred_v2_at_51 == 0) & (pred_v3_at_35 == 1)
flipped_to_neg = (pred_v2_at_51 == 1) & (pred_v3_at_35 == 0)

print(f"\nCases that flipped from 0 (in v2) to 1 (in v3): {flipped_to_pos.sum()}")
print(f"  Of which were True Positives (correctly abnormal): {(flipped_to_pos & (y_true == 1)).sum()}")
print(f"  Of which were False Positives (incorrectly normal): {(flipped_to_pos & (y_true == 0)).sum()}")

print(f"\nCases that flipped from 1 (in v2) to 0 (in v3): {flipped_to_neg.sum()}")
print(f"  Of which were True Negatives (correctly normal): {(flipped_to_neg & (y_true == 0)).sum()}")
print(f"  Of which were False Negatives (incorrectly abnormal): {(flipped_to_neg & (y_true == 1)).sum()}")

# Calibration & Brier score
brier_v2 = brier_score_loss(y_true, p_v2)
brier_v3 = brier_score_loss(y_true, p_v3)
print(f"\nBrier Score (lower is better): v2 = {brier_v2:.4f}, v3 = {brier_v3:.4f}")

# Correlation of probabilities
corr = np.corrcoef(p_v2, p_v3)[0, 1]
print(f"Pearson Correlation between v2 and v3 probabilities: {corr:.4f}")
