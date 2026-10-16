import os
import torch
from transformers import AutoProcessor, LlavaForConditionalGeneration, BitsAndBytesConfig
from peft import PeftModel

if os.path.exists(r"S:\anvesh_ml_cache"):
    os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16
)
print("Loading base model...")
base = LlavaForConditionalGeneration.from_pretrained(
    "llava-hf/llava-1.5-7b-hf",
    quantization_config=bnb_config,
    torch_dtype=torch.bfloat16,
    device_map={"": 0},
    cache_dir=os.environ.get("HF_HOME")
)
print("Loading PeftModel with is_trainable=True...")
model = PeftModel.from_pretrained(base, "checkpoints_llava_v2/best_adapter", is_trainable=True)
model.print_trainable_parameters()

# Test one optimizer step
opt = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=1e-5)
print("Optimizer created successfully with parameter count:", sum(p.numel() for p in model.parameters() if p.requires_grad))
