import os
from PIL import Image
from transformers import AutoProcessor

os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"
processor = AutoProcessor.from_pretrained("llava-hf/llava-1.5-7b-hf", cache_dir=r"S:\anvesh_ml_cache")

print("Tokenizer pad token:", processor.tokenizer.pad_token, processor.tokenizer.pad_token_id)
print("Tokenizer padding side:", processor.tokenizer.padding_side)

prompt = "USER: <image>\nDetermine if normal or abnormal.\nASSISTANT: "
target = '{"classification": "normal"}'
full_text = prompt + target + processor.tokenizer.eos_token

img = Image.new("RGB", (224, 224), color=(128, 128, 128))

inputs = processor(text=[full_text], images=[img], padding=True, return_tensors="pt")
prompt_inputs = processor(text=[prompt], images=[img], padding=True, return_tensors="pt")

print("inputs input_ids shape:", inputs["input_ids"].shape)
print("prompt_inputs input_ids shape:", prompt_inputs["input_ids"].shape)
prompt_len = prompt_inputs["input_ids"][0].shape[0]
print("prompt_len:", prompt_len)
print("full len:", inputs["input_ids"].shape[1])
labels = inputs["input_ids"].clone()
labels[0, :prompt_len] = -100

print("Labels after masking:", labels)
unmasked_ids = labels[0][labels[0] != -100].tolist()
print("Unmasked tokens decoded:", processor.tokenizer.decode(unmasked_ids))
