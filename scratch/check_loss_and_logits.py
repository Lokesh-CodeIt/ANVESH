"""
Examine forward loss and logits for normal vs abnormal targets on validation cases.
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

def main():
    with open(VAL_JSON_PATH, "r", encoding="utf-8") as f:
        val_cases = json.load(f)
        
    normal_case = next(c for c in val_cases if c["classification"] == "normal")
    abnormal_case = next(c for c in val_cases if c["classification"] == "abnormal")
    
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
    model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
    model.eval()

    def evaluate_case(case, name):
        img = Image.open(os.path.join(IMAGE_BASE_DIR, case["image_path"])).convert("RGB")
        prompt = f"USER: <image>\n{case['prompt']}\nASSISTANT: "
        
        # Test generation
        inputs = processor(text=prompt, images=img, return_tensors="pt").to("cuda")
        with torch.inference_mode():
            out_ids = model.generate(
                **inputs,
                max_new_tokens=64,
                do_sample=False,
                pad_token_id=processor.tokenizer.pad_token_id or processor.tokenizer.eos_token_id
            )
        in_len = inputs["input_ids"].shape[1]
        gen_text = processor.decode(out_ids[0][in_len:], skip_special_tokens=True).strip()
        
        # Also compute loss under TRUE target vs FALSE target
        true_target = case["target"]
        false_target = (
            '{"classification": "normal", "findings": ["Clear lung fields, normal cardiothoracic ratio, no acute abnormality."], "confidence": "high"}'
            if case["classification"] == "abnormal" else
            '{"classification": "abnormal", "findings": ["Radiographic evidence of thoracic or cardiopulmonary abnormality."], "confidence": "high"}'
        )
        
        def get_loss(tgt):
            full_text = prompt + tgt + processor.tokenizer.eos_token
            p_inputs = processor(text=prompt, images=img, return_tensors="pt")
            f_inputs = processor(text=full_text, images=img, return_tensors="pt")
            p_len = p_inputs["input_ids"].shape[1]
            labels = f_inputs["input_ids"].clone()
            labels[0, :p_len] = -100
            f_inputs["labels"] = labels
            f_inputs = {k: v.to("cuda") for k, v in f_inputs.items()}
            with torch.inference_mode():
                out = model(**f_inputs)
            return out.loss.item()

        loss_true = get_loss(true_target)
        loss_false = get_loss(false_target)
        loss_abnormal_str = get_loss('{"classification": "abnormal", "findings": ["Radiographic evidence of thoracic or cardiopulmonary abnormality."], "confidence": "high"}')
        loss_normal_str = get_loss('{"classification": "normal", "findings": ["Clear lung fields, normal cardiothoracic ratio, no acute abnormality."], "confidence": "high"}')
        
        print(f"\n[{name}] Case ID: {case['case_id']} | Ground Truth: {case['classification'].upper()}")
        print(f"  Generated Output: {gen_text}")
        print(f"  Loss with Abnormal Target: {loss_abnormal_str:.4f}")
        print(f"  Loss with Normal Target  : {loss_normal_str:.4f}")

    evaluate_case(normal_case, "TEST 1: Normal CXR Case")
    evaluate_case(abnormal_case, "TEST 2: Abnormal CXR Case")

if __name__ == "__main__":
    main()
