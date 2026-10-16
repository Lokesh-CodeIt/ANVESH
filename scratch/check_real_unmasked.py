import os
import json
from PIL import Image
from transformers import AutoProcessor

os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"
processor = AutoProcessor.from_pretrained("llava-hf/llava-1.5-7b-hf", cache_dir=r"S:\anvesh_ml_cache")

with open("anvesh_dataset_image_only/train.json", "r") as f:
    train_data = json.load(f)

for idx in [0, 1, 2, 3]:
    item = train_data[idx]
    img = Image.open(os.path.join("anvesh_dataset", item["image_path"])).convert("RGB")
    prompt_text = f"USER: <image>\n{item['prompt']}\nASSISTANT: "
    target_text = item["target"]
    full_text = prompt_text + target_text + processor.tokenizer.eos_token

    inputs = processor(text=[full_text], images=[img], padding=True, return_tensors="pt")
    prompt_inputs = processor(text=[prompt_text], images=[img], padding=True, return_tensors="pt")

    input_ids = inputs["input_ids"]
    labels = input_ids.clone()
    prompt_len = prompt_inputs["input_ids"][0].shape[0]
    labels[0, :prompt_len] = -100

    unmasked_ids = labels[0][labels[0] != -100].tolist()
    print(f"Sample {idx} (GT: {item['classification']}):")
    print("  Full tokens:", input_ids.shape[1], "Prompt tokens:", prompt_len, "Unmasked tokens count:", len(unmasked_ids))
    print("  Unmasked decoded:", repr(processor.tokenizer.decode(unmasked_ids)))
    print("-" * 60)
