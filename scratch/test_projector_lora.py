import os
import torch
from transformers import LlavaForConditionalGeneration, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"
bnb_config = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.bfloat16)
model = LlavaForConditionalGeneration.from_pretrained(
    "llava-hf/llava-1.5-7b-hf",
    quantization_config=bnb_config,
    torch_dtype=torch.bfloat16,
    device_map={"": 0},
    cache_dir=r"S:\anvesh_ml_cache"
)
model = prepare_model_for_kbit_training(model)

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
print("LoRA successfully configured with target_modules:", target_modules)
model.print_trainable_parameters()
for name, param in model.named_parameters():
    if "projector" in name and param.requires_grad:
        print("  Trainable projector param:", name, param.shape)
