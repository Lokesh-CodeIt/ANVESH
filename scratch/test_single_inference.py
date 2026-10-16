import os
import sys

if os.path.exists(r"S:\anvesh_ml_cache"):
    os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

import time
import math
import torch
from PIL import Image
from transformers import AutoProcessor, LlavaForConditionalGeneration, BitsAndBytesConfig
from peft import PeftModel

BASE_MODEL_ID = "llava-hf/llava-1.5-7b-hf"
PRIMARY_ADAPTER_DIR = "checkpoints_llava_primary/best_adapter"

print("Initializing processor...")
processor = AutoProcessor.from_pretrained(BASE_MODEL_ID, cache_dir=os.environ.get("HF_HOME"))

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True
)

print("Loading base model...")
base_model = LlavaForConditionalGeneration.from_pretrained(
    BASE_MODEL_ID,
    quantization_config=bnb_config,
    torch_dtype=torch.bfloat16,
    device_map={"": 0},
    cache_dir=os.environ.get("HF_HOME")
)

print("Attaching adapter...")
model = PeftModel.from_pretrained(base_model, PRIMARY_ADAPTER_DIR)
model.eval()

img_path = os.path.join("anvesh_dataset", "images", "cxr_248.jpg")
if not os.path.exists(img_path):
    # Try finding any existing test image
    import glob
    candidates = glob.glob("anvesh_dataset/images/*.jpg")
    img_path = candidates[0] if candidates else "images/cxr_248.jpg"

print(f"Reading image from: {img_path}")
image = Image.open(img_path).convert("RGB")
prompt = (
    "A chat between a curious human and an artificial intelligence assistant. "
    "The assistant gives helpful, detailed, and polite answers to the human's questions. "
    "USER: <image>\nAnalyze this chest radiograph carefully. Classify the radiograph as either 'normal' or 'abnormal'. "
    "Respond ONLY with a valid JSON object matching this schema: {\"classification\": \"normal\" | \"abnormal\"}. "
    "Do not include any other text.\nASSISTANT: {\"classification\": \""
)

inputs = processor(text=prompt, images=image, return_tensors="pt")
inputs = {k: v.to("cuda") for k, v in inputs.items()}

tok_abnormal = processor.tokenizer.convert_tokens_to_ids("abnormal")
tok_normal = processor.tokenizer.convert_tokens_to_ids("normal")

t0 = time.perf_counter()
with torch.inference_mode():
    outputs = model(**inputs)
    logits = outputs.logits[:, -1, :]
    l_abn = float(logits[0, tok_abnormal].item())
    l_norm = float(logits[0, tok_normal].item())
    logit_diff = l_abn - l_norm
    p_abn = 1.0 / (1.0 + math.exp(-logit_diff))
    p_norm = 1.0 - p_abn
    pred_label = "abnormal" if logit_diff >= 0 else "normal"
    conf = max(p_abn, p_norm)

dt = (time.perf_counter() - t0) * 1000
print(f"SUCCESS: Inference latency: {dt:.2f} ms")
print(f"Logits: abnormal={l_abn:.3f}, normal={l_norm:.3f}, diff={logit_diff:.3f}")
print(f"Probabilities: abnormal={p_abn:.4f}, normal={p_norm:.4f}")
print(f"Predicted class: {pred_label} (confidence: {conf:.1%})")
