import os
import sys
sys.path.insert(0, os.path.abspath("."))
import torch
import numpy as np
from PIL import Image
from transformers import AutoProcessor, LlavaForConditionalGeneration, BitsAndBytesConfig
from peft import PeftModel
from train_llava_v2 import ImageOnlyCXRDataset, collate_fn_builder

if os.path.exists(r"S:\anvesh_ml_cache"):
    os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

adapter_path = "checkpoints_llava_v2/best_adapter"
if not os.path.exists(adapter_path):
    print("best_adapter not found.")
    sys.exit(0)

print(f"Loading latest adapter from {adapter_path}...")
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16
)
processor = AutoProcessor.from_pretrained("llava-hf/llava-1.5-7b-hf", cache_dir=os.environ.get("HF_HOME"))
processor.tokenizer.padding_side = "left"

base = LlavaForConditionalGeneration.from_pretrained(
    "llava-hf/llava-1.5-7b-hf",
    quantization_config=bnb_config,
    torch_dtype=torch.bfloat16,
    device_map={"": 0},
    cache_dir=os.environ.get("HF_HOME")
)
model = PeftModel.from_pretrained(base, adapter_path)
model.eval()

val_dataset = ImageOnlyCXRDataset("anvesh_dataset_image_only/val.json", "anvesh_dataset")
val_loader = torch.utils.data.DataLoader(
    val_dataset,
    batch_size=4,
    shuffle=False,
    collate_fn=collate_fn_builder(processor)
)

TOK_NORMAL = 8945
TOK_ABNORMAL = 370

probs = []
y_true = []

with torch.no_grad():
    for batch in val_loader:
        classes = batch.pop("classifications")
        t_lens = batch.pop("t_lens")
        batch.pop("case_ids")
        batch_gpu = {k: v.to("cuda") for k, v in batch.items()}
        outputs = model(**batch_gpu)

        for i in range(len(classes)):
            t_l = t_lens[i]
            ln = float(outputs.logits[i, -t_l - 1, TOK_NORMAL].item())
            la = float(outputs.logits[i, -t_l - 1, TOK_ABNORMAL].item())
            p_abn = float(np.exp(la) / (np.exp(la) + np.exp(ln) + 1e-12))
            probs.append(p_abn)
            y_true.append(1 if classes[i] == "abnormal" else 0)

probs = np.array(probs)
y_true = np.array(y_true)

from sklearn.metrics import roc_auc_score, f1_score

auc = roc_auc_score(y_true, probs)
print(f"Validation Cases: {len(y_true)}")
print(f"Val ROC-AUC: {auc:.4f}")
print(f"Mean prob abnormal for Normals  : {probs[y_true == 0].mean():.4f} +/- {probs[y_true == 0].std():.4f}")
print(f"Mean prob abnormal for Abnormals: {probs[y_true == 1].mean():.4f} +/- {probs[y_true == 1].std():.4f}")

# Threshold scan on validation set
best_th = 0.5
best_f1 = 0.0
for th in np.linspace(0.1, 0.9, 81):
    pred = (probs >= th).astype(int)
    f1_abn = f1_score(y_true, pred, pos_label=1, zero_division=0)
    f1_norm = f1_score(y_true, pred, pos_label=0, zero_division=0)
    mf1 = (f1_abn + f1_norm) / 2.0
    if mf1 > best_f1:
        best_f1 = mf1
        best_th = th

print(f"\nBest Validation Threshold: {best_th:.4f}")
print(f"Best Validation Macro-F1 at this threshold: {best_f1*100:.2f}%")
pred_best = (probs >= best_th).astype(int)
tp = int(((pred_best == 1) & (y_true == 1)).sum())
tn = int(((pred_best == 0) & (y_true == 0)).sum())
fp = int(((pred_best == 1) & (y_true == 0)).sum())
fn = int(((pred_best == 0) & (y_true == 1)).sum())
print(f"Confusion Matrix at optimal val threshold: TP={tp}, TN={tn}, FP={fp}, FN={fn}")
print(f"Accuracy: {(tp+tn)/len(y_true)*100:.2f}% | Sensitivity: {tp/(tp+fn)*100:.2f}% | Specificity: {tn/(tn+fp)*100:.2f}%")
