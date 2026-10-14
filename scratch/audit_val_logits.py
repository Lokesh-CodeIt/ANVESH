"""
Measure logits for 'normal' vs 'abnormal' at the classification decision point across all 211 validation cases.
"""
import os
import json
import torch
import numpy as np
from PIL import Image
from transformers import AutoProcessor, LlavaForConditionalGeneration, BitsAndBytesConfig
from peft import PeftModel

os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"
BASE_MODEL_ID = "llava-hf/llava-1.5-7b-hf"
ADAPTER_PATH = "checkpoints_llava_image_only/final_adapter"
VAL_JSON_PATH = "anvesh_dataset_image_only/val.json"
IMAGE_BASE_DIR = "anvesh_dataset"

def main():
    with open(VAL_JSON_PATH, "r", encoding="utf-8") as f:
        val_cases = json.load(f)
        
    print(f"Auditing logits across {len(val_cases)} validation cases...")
    
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True
    )
    processor = AutoProcessor.from_pretrained(BASE_MODEL_ID, cache_dir=os.environ["HF_HOME"])
    base_model = LlavaForConditionalGeneration.from_pretrained(
        BASE_MODEL_ID,
        quantization_config=bnb_config,
        torch_dtype=torch.bfloat16,
        device_map={"": 0},
        cache_dir=os.environ["HF_HOME"]
    )
    model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
    model.eval()

    # Find token IDs for 'normal' and 'abnormal'
    # In Vicuna tokenizer:
    # "normal" vs "abnormal" or " normal" vs " abnormal"
    tok_normal = processor.tokenizer.encode("normal", add_special_tokens=False)[0]
    tok_abnormal = processor.tokenizer.encode("abnormal", add_special_tokens=False)[0]
    print(f"Token ID for 'normal': {tok_normal} ({processor.tokenizer.decode([tok_normal])})")
    print(f"Token ID for 'abnormal': {tok_abnormal} ({processor.tokenizer.decode([tok_abnormal])})")

    # In target JSON, the prefix is:
    # '{"classification": "'
    prefix = '{"classification": "'
    
    diffs_normal_gt = []
    diffs_abnormal_gt = []
    
    for idx, case in enumerate(val_cases):
        gt = case["classification"]
        img = Image.open(os.path.join(IMAGE_BASE_DIR, case["image_path"])).convert("RGB")
        full_prompt = f"USER: <image>\n{case['prompt']}\nASSISTANT: {prefix}"
        
        inputs = processor(text=full_prompt, images=img, return_tensors="pt").to("cuda")
        with torch.inference_mode():
            outputs = model(**inputs)
            
        # Logits at the very last token (which predicts the next token: normal vs abnormal)
        last_logits = outputs.logits[0, -1, :]
        l_norm = float(last_logits[tok_normal].item())
        l_abn = float(last_logits[tok_abnormal].item())
        diff = l_abn - l_norm
        
        if gt == "normal":
            diffs_normal_gt.append(diff)
        else:
            diffs_abnormal_gt.append(diff)
            
        if (idx + 1) % 50 == 0 or (idx + 1) == len(val_cases):
            print(f"  Processed {idx+1}/{len(val_cases)} cases...")

    diffs_norm = np.array(diffs_normal_gt)
    diffs_abn = np.array(diffs_abnormal_gt)
    
    print("\n" + "=" * 60)
    print("LOGIT AUDIT RESULTS (Logit[abnormal] - Logit[normal]):")
    print("=" * 60)
    print(f"Ground Truth NORMAL cases (N={len(diffs_norm)}):")
    print(f"  Mean diff   : {diffs_norm.mean():.4f}")
    print(f"  Median diff : {np.median(diffs_norm):.4f}")
    print(f"  Std diff    : {diffs_norm.std():.4f}")
    print(f"  Min / Max   : {diffs_norm.min():.4f} / {diffs_norm.max():.4f}")
    print(f"  Count diff > 0 (predicts abnormal): {(diffs_norm > 0).sum()} / {len(diffs_norm)} ({(diffs_norm > 0).mean()*100:.1f}%)")

    print(f"\nGround Truth ABNORMAL cases (N={len(diffs_abn)}):")
    print(f"  Mean diff   : {diffs_abn.mean():.4f}")
    print(f"  Median diff : {np.median(diffs_abn):.4f}")
    print(f"  Std diff    : {diffs_abn.std():.4f}")
    print(f"  Min / Max   : {diffs_abn.min():.4f} / {diffs_abn.max():.4f}")
    print(f"  Count diff > 0 (predicts abnormal): {(diffs_abn > 0).sum()} / {len(diffs_abn)} ({(diffs_abn > 0).mean()*100:.1f}%)")

    # Separation test: Wilcoxon / Mann-Whitney U or simple AUC
    from scipy.stats import mannwhitneyu
    stat, pval = mannwhitneyu(diffs_abn, diffs_norm, alternative="greater")
    print(f"\nMann-Whitney U Test (Abnormal diff > Normal diff):")
    print(f"  U-statistic: {stat:.2f}, p-value: {pval:.4e}")

    # Empirical ROC-AUC of the continuous logit diff on validation set
    from sklearn.metrics import roc_auc_score
    y_true_binary = [0]*len(diffs_norm) + [1]*len(diffs_abn)
    y_scores = list(diffs_norm) + list(diffs_abn)
    auc = roc_auc_score(y_true_binary, y_scores)
    print(f"Validation Logit Difference ROC-AUC: {auc:.4f}")

if __name__ == "__main__":
    main()
