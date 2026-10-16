import os
import sys
import torch
from PIL import Image
from transformers import AutoProcessor

if os.path.exists(r"S:\anvesh_ml_cache"):
    os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

processor = AutoProcessor.from_pretrained("llava-hf/llava-1.5-7b-hf", cache_dir=os.environ.get("HF_HOME"))

# Create dummy batch of 2 samples
img1 = Image.new("RGB", (224, 224), color="red")
img2 = Image.new("RGB", (224, 224), color="blue")

prompt1 = "USER: <image>\nAnalyze this radiograph.\nASSISTANT: "
prompt2 = "USER: <image>\nAnalyze this chest radiograph carefully.\nASSISTANT: "

target1 = '{"classification": "normal"}'
target2 = '{"classification": "abnormal"}'

batch = [
    {"image": img1, "prompt_text": prompt1, "target_text": target1},
    {"image": img2, "prompt_text": prompt2, "target_text": target2},
]

images = [b["image"] for b in batch]
full_texts = [b["prompt_text"] + b["target_text"] + processor.tokenizer.eos_token for b in batch]
prompt_texts = [b["prompt_text"] for b in batch]

inputs = processor(text=full_texts, images=images, padding=True, return_tensors="pt")
prompt_inputs = processor(text=prompt_texts, images=images, padding=True, return_tensors="pt")

print("inputs['input_ids'].shape:", inputs["input_ids"].shape)
print("prompt_inputs['input_ids'].shape:", prompt_inputs["input_ids"].shape)

for i in range(len(batch)):
    p_shape_0 = prompt_inputs["input_ids"][i].shape[0]
    print(f"Sample {i}: prompt_inputs['input_ids'][{i}].shape[0] = {p_shape_0}")

# Let's inspect what tokens are unmasked (i.e. != -100)
labels = inputs["input_ids"].clone()
for i in range(len(batch)):
    p_len = prompt_inputs["input_ids"][i].shape[0]
    labels[i, :p_len] = -100

print("\n--- WHAT TOKENS WERE TRAINED ON (NOT -100)? ---")
for i in range(len(batch)):
    unmasked_indices = (labels[i] != -100).nonzero(as_tuple=True)[0]
    unmasked_tokens = inputs["input_ids"][i][unmasked_indices]
    print(f"Sample {i} unmasked token count: {len(unmasked_tokens)}")
    print(f"Sample {i} unmasked tokens: {unmasked_tokens.tolist()}")
    print(f"Sample {i} unmasked decoded: '{processor.tokenizer.decode(unmasked_tokens)}'")
