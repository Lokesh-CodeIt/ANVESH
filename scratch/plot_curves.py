import os
import pandas as pd
import matplotlib.pyplot as plt

history_path = "checkpoints_llava_v2/training_history.csv"
output_plot = "reports/v2_llava_training_curves.png"
os.makedirs("reports", exist_ok=True)

df = pd.read_csv(history_path)

fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# 1. Validation Loss vs Steps
axes[0, 0].plot(df["step"], df["val_loss"], marker='o', color='#2563eb', linewidth=2, label="Validation Loss")
axes[0, 0].set_title("Validation Loss Curve", fontsize=12, fontweight='bold')
axes[0, 0].set_xlabel("Optimizer Step")
axes[0, 0].set_ylabel("Cross-Entropy Loss")
axes[0, 0].grid(True, linestyle="--", alpha=0.6)
axes[0, 0].legend()

# 2. Accuracy & Balanced Accuracy
axes[0, 1].plot(df["step"], df["accuracy"] * 100, marker='s', color='#10b981', linewidth=2, label="Accuracy (%)")
axes[0, 1].plot(df["step"], df["balanced_accuracy"] * 100, marker='^', color='#f59e0b', linewidth=2, label="Balanced Acc (%)")
axes[0, 1].set_title("Accuracy & Balanced Accuracy", fontsize=12, fontweight='bold')
axes[0, 1].set_xlabel("Optimizer Step")
axes[0, 1].set_ylabel("Percentage (%)")
axes[0, 1].grid(True, linestyle="--", alpha=0.6)
axes[0, 1].legend()

# 3. Sensitivity & Specificity
axes[1, 0].plot(df["step"], df["sensitivity"] * 100, marker='o', color='#ef4444', linewidth=2, label="Sensitivity (%)")
axes[1, 0].plot(df["step"], df["specificity"] * 100, marker='D', color='#8b5cf6', linewidth=2, label="Specificity (%)")
axes[1, 0].set_title("Sensitivity vs. Specificity", fontsize=12, fontweight='bold')
axes[1, 0].set_xlabel("Optimizer Step")
axes[1, 0].set_ylabel("Percentage (%)")
axes[1, 0].grid(True, linestyle="--", alpha=0.6)
axes[1, 0].legend()

# 4. Macro-F1 & ROC-AUC
axes[1, 1].plot(df["step"], df["macro_f1"] * 100, marker='*', color='#06b6d4', linewidth=2, markersize=8, label="Macro-F1 (%)")
axes[1, 1].plot(df["step"], df["roc_auc"] * 100, marker='p', color='#ec4899', linewidth=2, label="ROC-AUC (%)")
axes[1, 1].set_title("Macro-F1 & ROC-AUC Discrimination", fontsize=12, fontweight='bold')
axes[1, 1].set_xlabel("Optimizer Step")
axes[1, 1].set_ylabel("Score (%)")
axes[1, 1].grid(True, linestyle="--", alpha=0.6)
axes[1, 1].legend()

plt.tight_layout()
plt.savefig(output_plot, dpi=300)
print(f"Plot saved successfully to: {output_plot}")
