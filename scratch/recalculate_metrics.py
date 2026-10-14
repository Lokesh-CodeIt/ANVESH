import pandas as pd
import numpy as np
import math

df = pd.read_csv("reports/llava_vs_medgemma_test_predictions.csv")
y_true = df["ground_truth"].tolist()

def wilson_interval(k, n, z=1.95996):
    if n == 0:
        return 0.0, 0.0
    p = k / n
    denom = 1 + z**2 / n
    center = p + z**2 / (2 * n)
    adj_sd = math.sqrt((p * (1 - p) + z**2 / (4 * n)) / n)
    return max(0.0, (center - z * adj_sd) / denom), min(1.0, (center + z * adj_sd) / denom)

def compute_all(y_t, y_p):
    tp = sum(1 for t, p in zip(y_t, y_p) if t == "abnormal" and p == "abnormal")
    tn = sum(1 for t, p in zip(y_t, y_p) if t == "normal" and p == "normal")
    fp = sum(1 for t, p in zip(y_t, y_p) if t == "normal" and p == "abnormal")
    fn = sum(1 for t, p in zip(y_t, y_p) if t == "abnormal" and p == "normal")
    total = len(y_t)
    n_pos = tp + fn
    n_neg = tn + fp
    acc = (tp + tn) / total
    sens = tp / n_pos if n_pos > 0 else 0.0
    spec = tn / n_neg if n_neg > 0 else 0.0
    prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    npv = tn / (tn + fn) if (tn + fn) > 0 else 0.0
    bal_acc = (sens + spec) / 2.0
    f1_abn = (2 * prec * sens) / (prec + sens) if (prec + sens) > 0 else 0.0
    f1_norm = (2 * npv * spec) / (npv + spec) if (npv + spec) > 0 else 0.0
    macro_f1 = (f1_abn + f1_norm) / 2.0
    weighted_f1 = (n_pos * f1_abn + n_neg * f1_norm) / total
    mcc_num = (tp * tn) - (fp * fn)
    mcc_den = math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn))
    mcc = mcc_num / mcc_den if mcc_den > 0 else 0.0
    po = acc
    pe = ((tp + fn) * (tp + fp) + (tn + fp) * (tn + fn)) / (total * total)
    kappa = (po - pe) / (1 - pe) if (1 - pe) > 0 else 0.0
    return {
        "total": total, "tp": tp, "tn": tn, "fp": fp, "fn": fn,
        "acc": acc, "ci_acc": wilson_interval(tp+tn, total),
        "bal_acc": bal_acc,
        "sens": sens, "ci_sens": wilson_interval(tp, n_pos),
        "spec": spec, "ci_spec": wilson_interval(tn, n_neg),
        "prec": prec, "ci_prec": wilson_interval(tp, tp+fp),
        "npv": npv, "f1_abn": f1_abn, "f1_norm": f1_norm,
        "macro_f1": macro_f1, "weighted_f1": weighted_f1,
        "mcc": mcc, "kappa": kappa
    }

m_mg = compute_all(y_true, df["medgemma_pred"].tolist())
m_ll = compute_all(y_true, df["llava_pred"].tolist())

print("=== INDEPENDENT METRICS RECALCULATION (N=422) ===")
for name, m in [("MedGemma-4B (Pretrained)", m_mg), ("LLaVA-1.5-7B (Fine-Tuned)", m_ll)]:
    print(f"\n*** {name} ***")
    print(f"  TP={m['tp']}, TN={m['tn']}, FP={m['fp']}, FN={m['fn']}")
    print(f"  Accuracy: {m['acc']*100:.2f}% [{m['ci_acc'][0]*100:.1f}%, {m['ci_acc'][1]*100:.1f}%]")
    print(f"  Balanced Accuracy: {m['bal_acc']*100:.2f}%")
    print(f"  Sensitivity / Recall: {m['sens']*100:.2f}% [{m['ci_sens'][0]*100:.1f}%, {m['ci_sens'][1]*100:.1f}%]")
    print(f"  Specificity: {m['spec']*100:.2f}% [{m['ci_spec'][0]*100:.1f}%, {m['ci_spec'][1]*100:.1f}%]")
    print(f"  Precision: {m['prec']*100:.2f}% [{m['ci_prec'][0]*100:.1f}%, {m['ci_prec'][1]*100:.1f}%]")
    print(f"  NPV: {m['npv']*100:.2f}%")
    print(f"  Abnormal F1: {m['f1_abn']*100:.2f}%")
    print(f"  Normal F1: {m['f1_norm']*100:.2f}%")
    print(f"  Macro F1: {m['macro_f1']*100:.2f}%")
    print(f"  Weighted F1: {m['weighted_f1']*100:.2f}%")
    print(f"  MCC: {m['mcc']:+.4f}")
    print(f"  Kappa: {m['kappa']:+.4f}")
