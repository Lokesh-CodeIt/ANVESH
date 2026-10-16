import os
import torch
from PIL import Image
from transformers import AutoProcessor, LlavaForConditionalGeneration, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
import json

if os.path.exists(r"S:\anvesh_ml_cache"):
    os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

MODEL_ID = "llava-hf/llava-1.5-7b-hf"
IMAGE_BASE_DIR = "anvesh_dataset"

print("--- TESTING FORWARD, BACKWARD, GRADIENT FLOW, AND OVERFIT ---")

processor = AutoProcessor.from_pretrained(MODEL_ID, cache_dir=os.environ.get("HF_HOME"))
processor.tokenizer.padding_side = "left"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True
)

model = LlavaForConditionalGeneration.from_pretrained(
    MODEL_ID,
    quantization_config=bnb_config,
    torch_dtype=torch.bfloat16,
    device_map={"": 0},
    cache_dir=os.environ.get("HF_HOME")
)
model = prepare_model_for_kbit_training(model)
model.gradient_checkpointing_enable()

target_modules = [
    "q_proj", "k_proj", "v_proj", "o_proj",
    "gate_proj", "up_proj", "down_proj",
    "linear_1", "linear_2"
]
peft_config = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=target_modules,
    bias="none",
    task_type="CAUSAL_LM"
)
model = get_peft_model(model, peft_config)

# Check trainable parameters
print("\n--- TRAINABLE PARAMETERS ---")
projector_trainable = []
llm_trainable = []
for name, param in model.named_parameters():
    if param.requires_grad:
        if "multi_modal_projector" in name or "linear_" in name:
            projector_trainable.append(name)
        else:
            llm_trainable.append(name)

print(f"Projector trainable params count: {len(projector_trainable)}")
for p in projector_trainable:
    print(f"  Projector LoRA: {p}")
print(f"LLM trainable params count: {len(llm_trainable)}")
assert len(projector_trainable) > 0, "No trainable parameters in projector!"
assert len(llm_trainable) > 0, "No trainable parameters in LLM!"

# Load 4 training samples (2 normal, 2 abnormal)
with open("anvesh_dataset_image_only/train.json", "r") as f:
    train_data = json.load(f)

normals = [x for x in train_data if x["classification"] == "normal"][:2]
abnormals = [x for x in train_data if x["classification"] == "abnormal"][:2]
sample_batch = normals + abnormals

prefix = 'USER: <image>\nYou are a thoracic radiology AI assistant. Analyze this chest radiograph carefully.\nDetermine whether this radiograph shows any cardiopulmonary or thoracic abnormality, or if it is normal.\nRespond ONLY with a valid JSON object matching this schema:\n{\n  "classification": "normal" or "abnormal",\n  "findings": ["visual findings observed in the image"],\n  "confidence": "high" or "medium" or "low"\n}\nASSISTANT: {"classification": "'

tok = processor.tokenizer
images = [Image.open(os.path.join(IMAGE_BASE_DIR, x["image_path"])).convert("RGB") for x in sample_batch]
targets = ['normal"}' if x["classification"] == "normal" else 'abnormal"}' for x in sample_batch]
full_texts = [prefix + t + tok.eos_token for t in targets]

inputs = processor(text=full_texts, images=images, padding=True, return_tensors="pt")
labels = inputs["input_ids"].clone()

for i, x in enumerate(sample_batch):
    t_len = 3 if x["classification"] == "normal" else 4
    labels[i, :-t_len] = -100

inputs["labels"] = labels
inputs = {k: v.to("cuda") for k, v in inputs.items()}

optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=1e-4)

# Overfit test over 5 iterations
print("\n--- OVERFIT TEST (5 STEPS) ---")
model.train()
for it in range(5):
    optimizer.zero_grad()
    outputs = model(**inputs)
    loss = outputs.loss
    loss.backward()

    # Check gradients on iteration 0
    if it == 0:
        proj_grads = [p.grad.abs().sum().item() for name, p in model.named_parameters() if ("linear_1" in name or "linear_2" in name) and p.grad is not None]
        llm_grads = [p.grad.abs().sum().item() for name, p in model.named_parameters() if "q_proj" in name and p.grad is not None]
        print(f"Step 0 Projector gradients (A has 0 grad initially because B=0 in LoRA init, B grad): {proj_grads[:2]}")
        print(f"Step 0 LLM gradients (A has 0 grad initially, B grad): {llm_grads[:2]}")
        assert proj_grads[1] > 0, "Projector lora_B grad should be non-zero!"
        assert llm_grads[1] > 0, "LLM lora_B grad should be non-zero!"

    optimizer.step()
    print(f"Iteration {it+1}: Loss = {loss.item():.4f}")

    if it == 1:
        # Check that after step 1, lora_A now has non-zero gradients because B is now non-zero!
        proj_grads_step1 = [p.grad.abs().sum().item() for name, p in model.named_parameters() if ("linear_1" in name or "linear_2" in name) and p.grad is not None]
        print(f"Step 1 Projector gradients (both A and B): {proj_grads_step1[:2]}")
        assert all(g > 0 for g in proj_grads_step1), "After step 1, both lora_A and lora_B must have non-zero gradients!"
        print("GRADIENT FLOW FULLY VERIFIED: Both lora_A and lora_B in multimodal projector receive non-zero gradients!")


print("\n--- TEST COMPLETED SUCCESSFULLY ---")
