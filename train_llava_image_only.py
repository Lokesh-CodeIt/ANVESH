"""
ANVESH Medical AI Research Project
Dedicated Image-Only LLaVA-1.5-7B QLoRA Fine-Tuning Pipeline (Windows / RTX 4090)
Trains a domain adapter strictly on chest radiograph images and binary labels.
Input prompts contain ZERO clinical findings, impressions, or indications.
Checkpoints saved to: checkpoints_llava_image_only/
"""

import os
import sys
import json
import time
import argparse
from typing import Dict, List, Optional

import torch
from torch.utils.data import Dataset, DataLoader
from PIL import Image
from transformers import (
    AutoProcessor,
    LlavaForConditionalGeneration,
    BitsAndBytesConfig,
    set_seed,
    get_cosine_schedule_with_warmup
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

MODEL_ID = "llava-hf/llava-1.5-7b-hf"
DATASET_DIR = "anvesh_dataset_image_only"
IMAGE_BASE_DIR = "anvesh_dataset"
OUTPUT_DIR = "checkpoints_llava_image_only"

class ImageOnlyCXRDataset(Dataset):
    def __init__(self, json_path: str, base_dir: str):
        with open(json_path, "r", encoding="utf-8") as f:
            self.records = json.load(f)
        self.base_dir = base_dir

    def __len__(self):
        return len(self.records)

    def __getitem__(self, idx):
        item = self.records[idx]
        img_full_path = os.path.join(self.base_dir, item["image_path"])
        image = Image.open(img_full_path).convert("RGB")
        
        prompt_text = f"USER: <image>\n{item['prompt']}\nASSISTANT: "
        target_text = item["target"]
        return {
            "case_id": item["case_id"],
            "image": image,
            "prompt_text": prompt_text,
            "target_text": target_text
        }

def collate_fn_builder(processor):
    def collate_fn(batch):
        images = [b["image"] for b in batch]
        full_texts = [b["prompt_text"] + b["target_text"] + processor.tokenizer.eos_token for b in batch]
        prompt_texts = [b["prompt_text"] for b in batch]

        inputs = processor(text=full_texts, images=images, padding=True, return_tensors="pt")
        prompt_inputs = processor(text=prompt_texts, images=images, padding=True, return_tensors="pt")
        
        input_ids = inputs["input_ids"]
        labels = input_ids.clone()
        
        for i in range(len(batch)):
            prompt_len = prompt_inputs["input_ids"][i].shape[0]
            labels[i, :prompt_len] = -100

        if processor.tokenizer.pad_token_id is not None:
            labels[labels == processor.tokenizer.pad_token_id] = -100

        inputs["labels"] = labels
        return inputs
    return collate_fn

def train(args):
    print("=" * 75)
    print("ANVESH: DEDICATED IMAGE-ONLY LLaVA-1.5-7B QLoRA TRAINING ON RTX 4090")
    print("=" * 75)

    if not torch.cuda.is_available():
        raise RuntimeError("[ERROR] CUDA is required for training on RTX 4090.")

    device_name = torch.cuda.get_device_name(0)
    total_vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
    print(f"  [OK] GPU Detected      : {device_name} ({total_vram_gb:.2f} GB VRAM)")
    print(f"  [OK] Dataset Directory : {args.dataset_dir}")
    print(f"  [OK] Output Directory  : {args.output_dir}")
    print(f"  [OK] Random Seed       : {args.seed}")
    
    set_seed(args.seed)
    os.makedirs(args.output_dir, exist_ok=True)

    # 1. Dataset Setup
    train_path = os.path.join(args.dataset_dir, "train.json")
    val_path = os.path.join(args.dataset_dir, "val.json")
    
    if not os.path.exists(train_path) or not os.path.exists(val_path):
        raise FileNotFoundError(f"Missing dataset splits in '{args.dataset_dir}'.")

    train_dataset = ImageOnlyCXRDataset(train_path, IMAGE_BASE_DIR)
    val_dataset = ImageOnlyCXRDataset(val_path, IMAGE_BASE_DIR)
    
    print(f"  [OK] Training Split    : {len(train_dataset)} cases (Zero clinical text in prompts)")
    print(f"  [OK] Validation Split  : {len(val_dataset)} cases")

    # 2. Processor
    print(f"\n[Step 1/5] Loading AutoProcessor for {MODEL_ID}...")
    processor = AutoProcessor.from_pretrained(MODEL_ID, cache_dir=os.environ["HF_HOME"])
    
    # 3. 4-bit Base Model
    print("\n[Step 2/5] Loading 4-bit NormalFloat base model onto RTX 4090...")
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
        cache_dir=os.environ["HF_HOME"]
    )
    model = prepare_model_for_kbit_training(model)

    # 4. LoRA Setup
    print("\n[Step 3/5] Configuring LoRA adapter (r=16, alpha=32)...")
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
    peft_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        target_modules=target_modules,
        bias="none",
        task_type="CAUSAL_LM"
    )
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # 5. Dataloaders & Optimizer
    collate_fn = collate_fn_builder(processor)
    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        collate_fn=collate_fn,
        num_workers=0,
        pin_memory=True
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        collate_fn=collate_fn,
        num_workers=0
    )

    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.lr,
        weight_decay=0.01,
        betas=(0.9, 0.999)
    )

    grad_accum_steps = args.gradient_accumulation_steps
    total_training_steps = (len(train_loader) // grad_accum_steps) * args.epochs
    scheduler = get_cosine_schedule_with_warmup(
        optimizer,
        num_warmup_steps=args.warmup_steps,
        num_training_steps=total_training_steps
    )

    print(f"\n[Step 4/5] Starting Image-Only Training Loop...")
    print(f"  - Total Epochs              : {args.epochs}")
    print(f"  - Effective Batch Size      : {args.batch_size * grad_accum_steps}")
    print(f"  - Total Gradient Updates    : {total_training_steps}")
    print(f"  - Target Adapter Directory  : {args.output_dir}")

    global_step = 0
    model.train()
    accumulated_loss = 0.0
    start_time = time.time()
    state_file = os.path.join(args.output_dir, "training_state.json")

    for epoch in range(args.epochs):
        for step, batch in enumerate(train_loader):
            batch = {k: v.to("cuda") for k, v in batch.items()}
            outputs = model(**batch)
            loss = outputs.loss / grad_accum_steps
            loss.backward()

            accumulated_loss += loss.item()

            if (step + 1) % grad_accum_steps == 0 or (step + 1) == len(train_loader):
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                scheduler.step()
                optimizer.zero_grad()
                global_step += 1

                if global_step % args.logging_steps == 0 or global_step == 1:
                    current_lr = scheduler.get_last_lr()[0]
                    vram_used = torch.cuda.memory_allocated(0) / (1024**3)
                    elapsed = time.time() - start_time
                    samples_per_sec = (global_step * grad_accum_steps) / max(elapsed, 0.01)
                    print(
                        f"Epoch {epoch+1}/{args.epochs} | "
                        f"Step {global_step:4d}/{total_training_steps} | "
                        f"Loss: {accumulated_loss * grad_accum_steps:.4f} | "
                        f"LR: {current_lr:.2e} | "
                        f"VRAM: {vram_used:.2f}GB | "
                        f"Speed: {samples_per_sec:.2f} samples/s"
                    )
                accumulated_loss = 0.0

                if global_step % args.save_steps == 0 or global_step == total_training_steps:
                    ckpt_dir = os.path.join(args.output_dir, f"checkpoint-{global_step}")
                    print(f"  -> Saving checkpoint to {ckpt_dir}...")
                    model.save_pretrained(ckpt_dir)
                    processor.save_pretrained(ckpt_dir)
                    with open(state_file, "w") as f:
                        json.dump({
                            "step": global_step,
                            "epoch": epoch,
                            "timestamp": time.time(),
                            "model_id": MODEL_ID,
                            "task": "image_only"
                        }, f, indent=2)

    # Save final adapter
    final_adapter_dir = os.path.join(args.output_dir, "final_adapter")
    print(f"\n[Step 5/5] Saving final image-only adapter to: {final_adapter_dir}")
    model.save_pretrained(final_adapter_dir)
    processor.save_pretrained(final_adapter_dir)
    print("Image-only training completed successfully!")

def main():
    parser = argparse.ArgumentParser(description="Fine-tune LLaVA-1.5-7B for image-only CXR classification.")
    parser.add_argument("--epochs", type=int, default=1, help="Number of training epochs.")
    parser.add_argument("--batch-size", type=int, default=1, help="Per-device batch size.")
    parser.add_argument("--gradient-accumulation-steps", type=int, default=8, help="Gradient accumulation.")
    parser.add_argument("--lr", type=float, default=2e-4, help="Learning rate.")
    parser.add_argument("--lora-r", type=int, default=16, help="LoRA rank.")
    parser.add_argument("--lora-alpha", type=int, default=32, help="LoRA alpha.")
    parser.add_argument("--lora-dropout", type=float, default=0.05, help="LoRA dropout.")
    parser.add_argument("--warmup-steps", type=int, default=10, help="Warmup steps.")
    parser.add_argument("--logging-steps", type=int, default=20, help="Logging steps.")
    parser.add_argument("--save-steps", type=int, default=50, help="Checkpoint save steps.")
    parser.add_argument("--output-dir", type=str, default=OUTPUT_DIR, help="Output checkpoint dir.")
    parser.add_argument("--dataset-dir", type=str, default=DATASET_DIR, help="Dataset split dir.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed.")
    args = parser.parse_args()
    train(args)

if __name__ == "__main__":
    main()
