import os
import time
import torch
from torch.utils.data import DataLoader
from transformers import AutoProcessor, LlavaForConditionalGeneration, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from PIL import Image

os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

print("CUDA available:", torch.cuda.is_available())
device = "cuda:0"

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
model = prepare_model_for_kbit_training(model)
model.gradient_checkpointing_enable()

target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj", "linear_1", "linear_2"]
peft_config = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=target_modules,
    bias="none",
    task_type="CAUSAL_LM"
)
model = get_peft_model(model, peft_config)
model.train()

img = Image.new("RGB", (224, 224), color=(128, 128, 128))
prompt = "USER: <image>\nAnalyze radiograph.\nASSISTANT: "
target = '{"classification": "normal"}'
full_text = prompt + target + processor.tokenizer.eos_token

# Test batch of 2
inputs = processor(text=[full_text, full_text], images=[img, img], padding=True, return_tensors="pt")
prompt_inputs = processor(text=[prompt, prompt], images=[img, img], padding=True, return_tensors="pt")

input_ids = inputs["input_ids"]
labels = input_ids.clone()
for i in range(2):
    p_len = prompt_inputs["input_ids"][i].shape[0]
    labels[i, :p_len] = -100

if processor.tokenizer.pad_token_id is not None:
    labels[labels == processor.tokenizer.pad_token_id] = -100

inputs["labels"] = labels
inputs = {k: v.to("cuda") for k, v in inputs.items()}

optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=5e-5)

t0 = time.time()
outputs = model(**inputs)
loss = outputs.loss
loss.backward()
optimizer.step()
optimizer.zero_grad()
t1 = time.time()

vram_alloc = torch.cuda.memory_allocated(0) / (1024**3)
vram_res = torch.cuda.memory_reserved(0) / (1024**3)
print(f"Step completed in {t1 - t0:.2f}s! Loss: {loss.item():.4f}")
print(f"VRAM Allocated: {vram_alloc:.2f} GB | Reserved: {vram_res:.2f} GB")
print("VERIFICATION SUCCESSFUL!")
