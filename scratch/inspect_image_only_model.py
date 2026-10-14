"""
Scratch script to inspect tokenization, labels, and model generation on validation samples.
"""
import os
import json
import torch
from PIL import Image
from transformers import AutoProcessor, LlavaForConditionalGeneration, BitsAndBytesConfig
from peft import PeftModel

os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"
BASE_MODEL_ID = "llava-hf/llava-1.5-7b-hf"
ADAPTER_PATH = "checkpoints_llava_image_only/final_adapter"
VAL_JSON_PATH = "anvesh_dataset_image_only/val.json"
IMAGE_BASE_DIR = "anvesh_dataset"

def inspect():
    with open(VAL_JSON_PATH, "r", encoding="utf-8") as f:
        val_cases = json.load(f)
        
    normal_cases = [c for c in val_cases if c["classification"] == "normal"][:5]
    abnormal_cases = [c for c in val_cases if c["classification"] == "abnormal"][:5]
    sample_cases = normal_cases + abnormal_cases

    print(f"Loaded {len(sample_cases)} sample validation cases (5 normal, 5 abnormal).")
    
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True
    )
    processor = AutoProcessor.from_pretrained(BASE_MODEL_ID, cache_dir=os.environ["HF_HOME"])
    base_model = LlavaForConditionalGeneration.from_pretrained(
        BASE_MODEL_ID,
        quantization_config=bnb_config,
        torch_dtype=torch.bfloat16,
        device_map={"": 0},
        cache_dir=os.environ["HF_HOME"]
    )
    
    # 1. Test tokenization & labels logic
    c0 = sample_cases[0]
    prompt_text = f"USER: <image>\n{c0['prompt']}\nASSISTANT: "
    target_text = c0['target']
    full_text = prompt_text + target_text + processor.tokenizer.eos_token
    
    img = Image.open(os.path.join(IMAGE_BASE_DIR, c0["image_path"])).convert("RGB")
    inputs = processor(text=[full_text], images=[img], return_tensors="pt")
    prompt_inputs = processor(text=[prompt_text], images=[img], return_tensors="pt")
    
    print("\n--- TOKENIZATION AUDIT ---")
    print("Full input_ids shape:", inputs["input_ids"].shape)
    print("Prompt input_ids shape:", prompt_inputs["input_ids"].shape)
    prompt_len = prompt_inputs["input_ids"].shape[1]
    unmasked_tokens = inputs["input_ids"][0, prompt_len:]
    print("Unmasked target tokens decoded:", processor.tokenizer.decode(unmasked_tokens))
    
    # 2. Test generation with base model vs adapter on 10 samples
    for mode in ["base", "adapter"]:
        if mode == "adapter":
            print(f"\nLoading LoRA adapter from {ADAPTER_PATH}...")
            model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
        else:
            print("\nTesting Base Model (zero-shot)...")
            model = base_model
        model.eval()
        
        print(f"\n--- EVALUATION ON 10 VALIDATION SAMPLES ({mode.upper()}) ---")
        for idx, case in enumerate(sample_cases):
            case_id = case["case_id"]
            gt = case["classification"]
            c_img = Image.open(os.path.join(IMAGE_BASE_DIR, case["image_path"])).convert("RGB")
            c_prompt = f"USER: <image>\n{case['prompt']}\nASSISTANT: "
            
            c_inputs = processor(text=c_prompt, images=c_img, return_tensors="pt").to("cuda")
            with torch.inference_mode():
                out_ids = model.generate(
                    **c_inputs,
                    max_new_tokens=100,
                    do_sample=False,
                    pad_token_id=processor.tokenizer.pad_token_id or processor.tokenizer.eos_token_id
                )
            in_len = c_inputs["input_ids"].shape[1]
            gen_text = processor.decode(out_ids[0][in_len:], skip_special_tokens=True).strip()
            print(f"[{mode.upper()} Case {case_id}] GT: {gt.upper():8s} | Output: {gen_text[:80]}...")

if __name__ == "__main__":
    inspect()
