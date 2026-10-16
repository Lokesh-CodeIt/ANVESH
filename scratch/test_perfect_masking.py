import os
import torch
from PIL import Image
from transformers import AutoProcessor

if os.path.exists(r"S:\anvesh_ml_cache"):
    os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

processor = AutoProcessor.from_pretrained("llava-hf/llava-1.5-7b-hf", cache_dir=os.environ.get("HF_HOME"))
tok = processor.tokenizer
tok.padding_side = "left"

prompt1 = "USER: <image>\nAnalyze this radiograph.\nASSISTANT: {\"classification\": \""
prompt2 = "USER: <image>\nAnalyze this chest radiograph carefully. Classify as normal or abnormal.\nASSISTANT: {\"classification\": \""

target1 = 'normal"}'
target2 = 'abnormal"}'

batch = [
    {"image": Image.new("RGB", (224, 224), "red"), "prompt": prompt1, "target": target1},
    {"image": Image.new("RGB", (224, 224), "blue"), "prompt": prompt2, "target": target2},
]

full_texts = [b["prompt"] + b["target"] + tok.eos_token for b in batch]
images = [b["image"] for b in batch]

inputs = processor(text=full_texts, images=images, padding=True, return_tensors="pt")
input_ids = inputs["input_ids"]
labels = input_ids.clone()

print("Full input shape:", input_ids.shape)

for i in range(len(batch)):
    target_tokens = tok.encode(batch[i]["target"] + tok.eos_token, add_special_tokens=False)
    t_len = len(target_tokens)
    # Mask all tokens except the last t_len tokens
    labels[i, :-t_len] = -100

print("\n--- VERIFICATION OF EXACT TARGET MASKING ---")
for i in range(len(batch)):
    unmasked_idx = (labels[i] != -100).nonzero(as_tuple=True)[0]
    unmasked = input_ids[i][unmasked_idx]
    print(f"Sample {i} target text: '{batch[i]['target']}'")
    print(f"Sample {i} unmasked tokens ({len(unmasked)} tokens): {unmasked.tolist()}")
    print(f"Sample {i} decoded: '{tok.decode(unmasked)}'")
    assert tok.decode(unmasked) == batch[i]["target"] + tok.eos_token, "Mismatch in decoded target!"

print("\nALL SAMPLES HAVE 100% PERFECT TARGET-ONLY LOSS MASKING!")
