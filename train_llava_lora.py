"""
ANVESH Medical AI Research Project
Local LLaVA-1.5-7B QLoRA Fine-Tuning Pipeline (Windows / RTX 4090)
Author: Medical AI Systems Laboratory / Pair-Programming
Date: October 2026
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

# Set Hugging Face cache to large storage drive
os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

MODEL_ID = "llava-hf/llava-1.5-7b-hf"
DATASET_DIR = "anvesh_dataset"
OUTPUT_DIR = "checkpoints_llava"

class CXRDataset(Dataset):
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

        # Process full input (image + text)
        inputs = processor(text=full_texts, images=images, padding=True, return_tensors="pt")
        
        # Tokenize prompt only to know prefix length for label masking
        prompt_inputs = processor(text=prompt_texts, images=images, padding=True, return_tensors="pt")
        
        input_ids = inputs["input_ids"]
        labels = input_ids.clone()
        
        # Mask out prompt tokens so loss is computed only on target generation
        for i in range(len(batch)):
            prompt_len = prompt_inputs["input_ids"][i].shape[0]
            labels[i, :prompt_len] = -100

        # Replace padding token ids with -100 in labels
        if processor.tokenizer.pad_token_id is not None:
            labels[labels == processor.tokenizer.pad_token_id] = -100

        inputs["labels"] = labels
        return inputs
    return collate_fn

def train(args):
    print("=" * 70)
    print("ANVESH: LLaVA-1.5-7B LOCAL QLoRA TRAINING ON NVIDIA RTX 4090")
    print("=" * 70)

    # 1. Hardware Guard
    if not torch.cuda.is_available():
        raise RuntimeError(
            "[CRITICAL HARDWARE ERROR] CUDA is not available! "
            "Refusing to execute on CPU per strict project requirements."
        )

    device_name = torch.cuda.get_device_name(0)
    total_vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
    print(f"  [OK] GPU Detected      : {device_name}")
    print(f"  [OK] Dedicated VRAM    : {total_vram_gb:.2f} GB")
    print(f"  [OK] PyTorch Version   : {torch.__version__}")
    print(f"  [OK] Random Seed       : {args.seed}")
    
    set_seed(args.seed)
    os.makedirs(args.output_dir, exist_ok=True)

    # 2. Dataset Setup (Patient-Level Separation)
    train_path = os.path.join(DATASET_DIR, "train.json")
    val_path = os.path.join(DATASET_DIR, "val.json")
    
    if not os.path.exists(train_path) or not os.path.exists(val_path):
        raise FileNotFoundError(f"Missing dataset splits in '{DATASET_DIR}'. Run prepare_llava_dataset.py first.")

    train_dataset = CXRDataset(train_path, DATASET_DIR)
    val_dataset = CXRDataset(val_path, DATASET_DIR)
    
    print(f"  [OK] Training Split    : {len(train_dataset)} cases (Strict patient separation)")
    print(f"  [OK] Validation Split  : {len(val_dataset)} cases")

    # 3. Load Processor
    print(f"\n[Step 1/5] Loading AutoProcessor for {MODEL_ID}...")
    processor = AutoProcessor.from_pretrained(MODEL_ID, cache_dir=os.environ["HF_HOME"])
    
    # 4. Load 4-bit Quantized Base Model
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

    # 5. Attach LoRA Adapters
    print("\n[Step 3/5] Attaching LoRA adapters to attention and MLP projections...")
    lora_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout=args.lora_dropout,
        bias="none",
        task_type="CAUSAL_LM"
    )

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # Enable gradient checkpointing for minimal VRAM footprint
    model.gradient_checkpointing_enable()

    # 6. Optimizer & Scheduler
    import bitsandbytes as bnb
    optimizer = bnb.optim.PagedAdamW8bit(
        model.parameters(),
        lr=args.lr,
        weight_decay=0.01
    )

    # Calculate steps
    grad_accum_steps = args.gradient_accumulation_steps
    steps_per_epoch = (len(train_dataset) + grad_accum_steps - 1) // grad_accum_steps
    total_training_steps = steps_per_epoch * args.epochs
    
    lr_scheduler = get_cosine_schedule_with_warmup(
        optimizer=optimizer,
        num_warmup_steps=args.warmup_steps,
        num_training_steps=total_training_steps
    )

    # 7. Checkpoint / Resume Handling
    start_step = 0
    start_epoch = 0
    state_file = os.path.join(args.output_dir, "training_state.json")
    
    if args.resume and os.path.exists(state_file):
        with open(state_file, "r") as f:
            state = json.load(f)
        start_step = state.get("step", 0)
        start_epoch = state.get("epoch", 0)
        latest_ckpt = os.path.join(args.output_dir, f"checkpoint-{start_step}")
        if os.path.exists(latest_ckpt):
            print(f"\n[RESUME] Found existing checkpoint at {latest_ckpt}. Resuming from step {start_step}...")
            from peft import PeftModel
            model = PeftModel.from_pretrained(model.base_model.model, latest_ckpt, is_trainable=True)

    collate_fn = collate_fn_builder(processor)
    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        collate_fn=collate_fn
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        collate_fn=collate_fn
    )

    # 8. Training Loop
    print(f"\n[Step 4/5] Beginning QLoRA Fine-Tuning across {args.epochs} epoch(s)...")
    print(f"  Total Training Samples : {len(train_dataset)}")
    print(f"  Gradient Accumulation  : {grad_accum_steps}")
    print(f"  Effective Batch Size   : {args.batch_size * grad_accum_steps}")
    print(f"  Total Update Steps     : {total_training_steps}")
    print("-" * 70)

    model.train()
    global_step = start_step
    accumulated_loss = 0.0
    start_time = time.time()

    for epoch in range(start_epoch, args.epochs):
        print(f"\n>>> Epoch {epoch + 1}/{args.epochs}")
        optimizer.zero_grad()

        for step, batch in enumerate(train_loader):
            # Move batch tensors to GPU
            batch = {k: v.to("cuda") for k, v in batch.items()}

            outputs = model(**batch)
            loss = outputs.loss / grad_accum_steps
            loss.backward()
            
            accumulated_loss += loss.item() * grad_accum_steps

            if (step + 1) % grad_accum_steps == 0 or (step + 1) == len(train_loader):
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()
                lr_scheduler.step()
                optimizer.zero_grad()
                global_step += 1

                # Logging
                if global_step % args.logging_steps == 0:
                    current_lr = lr_scheduler.get_last_lr()[0]
                    vram_used = torch.cuda.memory_allocated() / (1024**3)
                    elapsed = time.time() - start_time
                    samples_per_sec = (global_step * grad_accum_steps) / max(elapsed, 1.0)
                    print(
                        f"Step {global_step:4d}/{total_training_steps} | "
                        f"Loss: {accumulated_loss / grad_accum_steps:.4f} | "
                        f"LR: {current_lr:.2e} | "
                        f"VRAM: {vram_used:.2f}GB | "
                        f"Throughput: {samples_per_sec:.2f} samples/s"
                    )
                    accumulated_loss = 0.0

                # Checkpoint saving & Validation
                if global_step % args.save_steps == 0 or global_step == total_training_steps:
                    ckpt_dir = os.path.join(args.output_dir, f"checkpoint-{global_step}")
                    print(f"\n[CHECKPOINT] Saving model adapter checkpoint to {ckpt_dir}...")
                    model.save_pretrained(ckpt_dir)
                    processor.save_pretrained(ckpt_dir)
                    
                    # Save state
                    with open(state_file, "w") as f:
                        json.dump({
                            "step": global_step,
                            "epoch": epoch,
                            "timestamp": time.time(),
                            "model_id": MODEL_ID
                        }, f, indent=2)

                    # Validation loss check
                    if args.eval_on_save:
                        print("[VALIDATION] Running validation split evaluation...")
                        model.eval()
                        val_loss = 0.0
                        val_batches = 0
                        with torch.no_grad():
                            for val_batch in val_loader:
                                val_batch = {k: v.to("cuda") for k, v in val_batch.items()}
                                val_out = model(**val_batch)
                                val_loss += val_out.loss.item()
                                val_batches += 1
                                if val_batches >= 30: # evaluate on 30 batches for speed
                                    break
                        mean_val_loss = val_loss / max(val_batches, 1)
                        print(f"[VALIDATION] Step {global_step} Validation Loss: {mean_val_loss:.4f}\n")
                        model.train()

                if args.max_steps and global_step >= args.max_steps:
                    print(f"\n[STOP] Reached requested max_steps={args.max_steps}.")
                    break

        if args.max_steps and global_step >= args.max_steps:
            break

    # 9. Save Final Adapter
    final_adapter_dir = os.path.join(args.output_dir, "final_adapter")
    print("\n[Step 5/5] Training finished. Saving final adapter weights...")
    model.save_pretrained(final_adapter_dir)
    processor.save_pretrained(final_adapter_dir)
    print(f"  [SUCCESS] Final adapter saved at: {final_adapter_dir}")
    print("=" * 70)

def main():
    parser = argparse.ArgumentParser(description="Fine-tune LLaVA-1.5-7B with QLoRA locally.")
    parser.add_argument("--epochs", type=int, default=1, help="Number of full training epochs.")
    parser.add_argument("--batch-size", type=int, default=1, help="Per-device batch size.")
    parser.add_argument("--gradient-accumulation-steps", type=int, default=8, help="Gradient accumulation steps.")
    parser.add_argument("--lr", type=float, default=2e-4, help="Peak learning rate.")
    parser.add_argument("--lora-r", type=int, default=16, help="LoRA rank.")
    parser.add_argument("--lora-alpha", type=int, default=32, help="LoRA alpha.")
    parser.add_argument("--lora-dropout", type=float, default=0.05, help="LoRA dropout.")
    parser.add_argument("--warmup-steps", type=int, default=10, help="Linear warmup steps.")
    parser.add_argument("--logging-steps", type=int, default=10, help="Logging steps.")
    parser.add_argument("--save-steps", type=int, default=50, help="Checkpoint save steps.")
    parser.add_argument("--max-steps", type=int, default=None, help="Optional max update steps.")
    parser.add_argument("--output-dir", type=str, default=OUTPUT_DIR, help="Checkpoint output folder.")
    parser.add_argument("--resume", action="store_true", help="Resume from latest checkpoint.")
    parser.add_argument("--eval-on-save", action="store_true", default=True, help="Compute validation loss upon saving.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed.")
    
    args = parser.parse_args()
    train(args)

if __name__ == "__main__":
    main()
