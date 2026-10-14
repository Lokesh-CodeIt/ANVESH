import os
import torch
import json
import time
from PIL import Image
from transformers import AutoProcessor, LlavaForConditionalGeneration, BitsAndBytesConfig
from peft import PeftModel

os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"
base_model_id = "llava-hf/llava-1.5-7b-hf"
adapter_path = "checkpoints_llava/final_adapter"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16
)
processor = AutoProcessor.from_pretrained(base_model_id, cache_dir=os.environ["HF_HOME"])
base_model = LlavaForConditionalGeneration.from_pretrained(
    base_model_id,
    quantization_config=bnb_config,
    torch_dtype=torch.bfloat16,
    device_map={"": 0},
    cache_dir=os.environ["HF_HOME"]
)
model = PeftModel.from_pretrained(base_model, adapter_path)
model.eval()

with open("anvesh_dataset/test.json", "r", encoding="utf-8") as f:
    cases = json.load(f)[:8]

prompts = [f"USER: <image>\n{c['prompt']}\nASSISTANT: " for c in cases]
images = [Image.open(os.path.join("anvesh_dataset", c["image_path"])).convert("RGB") for c in cases]

print("Testing batch generation with 8 cases...")
processor.tokenizer.padding_side = "left"
inputs = processor(text=prompts, images=images, padding=True, return_tensors="pt").to("cuda")

t0 = time.perf_counter()
with torch.inference_mode():
    out = model.generate(
        **inputs,
        max_new_tokens=256,
        do_sample=False,
        pad_token_id=processor.tokenizer.pad_token_id or processor.tokenizer.eos_token_id
    )
t1 = time.perf_counter()
vram_gb = torch.cuda.max_memory_allocated() / (1024**3)
print(f"Batch of 8 completed in {t1 - t0:.2f}s ({8 / (t1 - t0):.2f} cases/s) | Peak VRAM: {vram_gb:.2f} GB")
for i in range(8):
    in_len = inputs["input_ids"].shape[1]
    gen = processor.decode(out[i][in_len:], skip_special_tokens=True).strip()
    print(f"Case {cases[i]['case_id']} gen length: {len(gen)}")
