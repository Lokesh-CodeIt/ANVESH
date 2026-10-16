import os
import sys
sys.path.insert(0, os.path.abspath("."))
import torch
from PIL import Image
from transformers import AutoProcessor, LlavaForConditionalGeneration, BitsAndBytesConfig
from train_llava_v2 import ImageOnlyCXRDataset, collate_fn_builder, evaluate_validation

if os.path.exists(r"S:\anvesh_ml_cache"):
    os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

MODEL_ID = "llava-hf/llava-1.5-7b-hf"

print("--- TESTING FAST VECTORIZED EVALUATE_VALIDATION ---")

processor = AutoProcessor.from_pretrained(MODEL_ID, cache_dir=os.environ.get("HF_HOME"))
processor.tokenizer.padding_side = "left"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16
)
model = LlavaForConditionalGeneration.from_pretrained(
    MODEL_ID,
    quantization_config=bnb_config,
    torch_dtype=torch.bfloat16,
    device_map={"": 0},
    cache_dir=os.environ.get("HF_HOME")
)
model.eval()

# Create dummy subset dataset with 8 samples
val_dataset = ImageOnlyCXRDataset("anvesh_dataset_image_only/val.json", "anvesh_dataset")
val_dataset.records = val_dataset.records[:8]

metrics = evaluate_validation(model, processor, val_dataset, batch_size=4)
print("Validation metrics computed successfully on subset:")
for k, v in metrics.items():
    print(f"  {k}: {v}")

assert metrics["total"] == 8
print("\nFAST VECTORIZED VALIDATION EVALUATION PASSED 100%!")
