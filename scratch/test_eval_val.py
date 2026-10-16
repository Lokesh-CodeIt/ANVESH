import os
import json
import torch
from transformers import AutoProcessor, LlavaForConditionalGeneration, BitsAndBytesConfig
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from train_llava_primary import ImageOnlyCXRDataset, evaluate_validation

os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

processor = AutoProcessor.from_pretrained("llava-hf/llava-1.5-7b-hf", cache_dir=r"S:\anesh_ml_cache")

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

val_dataset = ImageOnlyCXRDataset("anvesh_dataset_image_only/val.json", "anvesh_dataset")
# Slice to first 4 samples for test
val_dataset.records = val_dataset.records[:4]

res = evaluate_validation(model, processor, val_dataset, batch_size=2)
print("Validation evaluation result:")
print(json.dumps(res, indent=2))
print("DRY RUN PASSED!")
