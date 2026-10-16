import pandas as pd

data = [
    {
        "Model Architecture": "Base LLaVA-1.5-7B (Zero-Shot)",
        "Input Modality": "Pure Image",
        "Parameters": "7.06 B",
        "Test Cohort N": 422,
        "Accuracy (%)": "50.00%",
        "Sensitivity (%)": "0.00%",
        "Specificity (%)": "100.00%",
        "Macro F1 (%)": "33.33%",
        "MCC": "0.0000",
        "ROC-AUC": "0.5547",
        "Inference Device": "CUDA (RTX 4090)",
        "Latency (ms)": "145.20",
        "Status / Failure Mode": "Single-class collapse (Normal only)"
    },
    {
        "Model Architecture": "Prior LLaVA-1.5-7B v1 (Step 184)",
        "Input Modality": "Pure Image",
        "Parameters": "7.08 B (19.9M LoRA)",
        "Test Cohort N": 422,
        "Accuracy (%)": "50.24%",
        "Sensitivity (%)": "0.00%",
        "Specificity (%)": "100.00%",
        "Macro F1 (%)": "33.44%",
        "MCC": "0.0000",
        "ROC-AUC": "0.5500",
        "Inference Device": "CUDA (RTX 4090)",
        "Latency (ms)": "419.58",
        "Status / Failure Mode": "Defective loss masking (3% gradient) & token bug"
    },
    {
        "Model Architecture": "Vision Transformer (ViT-B/16 Baseline)",
        "Input Modality": "Pure Image",
        "Parameters": "85.8 M",
        "Test Cohort N": 422,
        "Accuracy (%)": "65.40%",
        "Sensitivity (%)": "66.35%",
        "Specificity (%)": "64.45%",
        "Macro F1 (%)": "65.39%",
        "MCC": "+0.3081",
        "ROC-AUC": "0.7062",
        "Inference Device": "CPU",
        "Latency (ms)": "17.25",
        "Status / Failure Mode": "Balanced baseline, lower specificity & AUC"
    },
    {
        "Model Architecture": "Fine-Tuned LLaVA-1.5-7B v2 (Primary Ours)",
        "Input Modality": "Pure Image",
        "Parameters": "7.08 B (20.5M LoRA + Projector)",
        "Test Cohort N": 422,
        "Accuracy (%)": "67.54%",
        "Sensitivity (%)": "62.09%",
        "Specificity (%)": "72.99%",
        "Macro F1 (%)": "67.44%",
        "MCC": "+0.3528",
        "ROC-AUC": "0.7481",
        "Inference Device": "CUDA (RTX 4090)",
        "Latency (ms)": "141.14",
        "Status / Failure Mode": "Primary Model: Best Accuracy, Specificity, MCC & AUC"
    }
]

df = pd.DataFrame(data)
df.to_csv("reports/comprehensive_model_comparison.csv", index=False)

headers = list(df.columns)
lines = [
    "# ANVESH Comprehensive Image-Only Model Benchmark Comparison\n",
    "| " + " | ".join(headers) + " |",
    "| " + " | ".join(["---"] * len(headers)) + " |"
]
for _, row in df.iterrows():
    lines.append("| " + " | ".join(str(row[h]) for h in headers) + " |")

with open("reports/comprehensive_model_comparison.md", "w") as f:
    f.write("\n".join(lines) + "\n")

print("Generated reports/comprehensive_model_comparison.csv and reports/comprehensive_model_comparison.md successfully.")
