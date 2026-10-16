import os
import json
import time
import torch
from transformers import AutoProcessor, LlavaForConditionalGeneration, BitsAndBytesConfig
from PIL import Image

os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

processor = AutoProcessor.from_pretrained("llava-hf/llava-1.5-7b-hf", cache_dir=r"S:\anvesh_ml_cache")

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True
)

model = LlavaForConditionalGeneration.from_pretrained(
    "llava-hf/llava-1.5-7b-hf",
    quantization_config=bnb_config,
    torch_dtype=torch.bfloat16,
    device_map={"": 0},
    cache_dir=r"S:\anvesh_ml_cache"
)
model.eval()

with open("anvesh_dataset_image_only/val.json", "r") as f:
    val_data = json.load(f)[:4]

images = [Image.open(os.path.join("anvesh_dataset", x["image_path"])).convert("RGB") for x in val_data]
prompts = [f"USER: <image>\n{x['prompt']}\nASSISTANT: " for x in val_data]

inputs = processor(text=prompts, images=images, padding=True, return_tensors="pt").to("cuda")

t0 = time.time()
with torch.inference_mode():
    outputs = model.generate(
        **inputs,
        max_new_tokens=32,
        do_sample=False,
        pad_token_id=processor.tokenizer.pad_token_id
    )
t1 = time.time()

print(f"Validation batch of 4 generated in {t1 - t0:.2f}s!")
for i, x in enumerate(val_data):
    input_len = inputs["input_ids"][i].shape[0]
    gen_text = processor.tokenizer.decode(outputs[i][input_len:], skip_special_tokens=True)
    print(f"Case {x['case_id']} (GT: {x['classification']}): {repr(gen_text)}")
