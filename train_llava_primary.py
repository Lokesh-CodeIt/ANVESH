"""
ANVESH Medical AI Research Project
train_llava_primary.py — Primary LLaVA-1.5-7B QLoRA Fine-Tuning Pipeline
Trained strictly on chest radiograph images with multimodal projector adaptation.
Checkpoints saved to: checkpoints_llava_primary/
"""

import os
import sys
import json
import time
import math
import argparse
from typing import Dict, List, Optional, Tuple, Any

import torch
from torch.utils.data import Dataset, DataLoader
from PIL import Image
import numpy as np
import pandas as pd
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
OUTPUT_DIR = "checkpoints_llava_primary"

# Vicuna token IDs after prefix '{"classification": "'
TOK_NORMAL = 8945    # "normal"
TOK_ABNORMAL = 370   # "ab" (first token of "abnormal")
PREFIX_TEXT = '{"classification": "'


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
            "target_text": target_text,
            "classification": item["classification"]
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
            p_len = prompt_inputs["input_ids"][i].shape[0]
            labels[i, :p_len] = -100

        if processor.tokenizer.pad_token_id is not None:
            labels[labels == processor.tokenizer.pad_token_id] = -100

        inputs["labels"] = labels
        inputs["case_ids"] = [b["case_id"] for b in batch]
        inputs["classifications"] = [b["classification"] for b in batch]
        return inputs
    return collate_fn


def evaluate_validation(
    model,
    processor,
    val_dataset: ImageOnlyCXRDataset,
    batch_size: int = 4
) -> Dict[str, Any]:
    """
    Evaluates validation loss and decision-boundary classification metrics across val_dataset.
    """
    model.eval()
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        collate_fn=collate_fn_builder(processor),
        num_workers=0
    )

    total_loss = 0.0
    total_samples = 0
    y_true = []
    y_pred = []
    prob_abnormal_list = []

    prefix_prompt_suffix = PREFIX_TEXT

    record_map = {r["case_id"]: r for r in val_dataset.records}

    with torch.no_grad():
        for batch in val_loader:
            case_ids = batch.pop("case_ids")
            classes = batch.pop("classifications")
            labels = batch["labels"]
            batch_gpu = {k: v.to("cuda") for k, v in batch.items()}

            outputs = model(**batch_gpu)
            loss = outputs.loss
            b_size = len(case_ids)
            total_loss += loss.item() * b_size
            total_samples += b_size

            # Evaluate logits at decision point for each sample in batch
            # Forward pass with prefix: USER: <image>\n{prompt}\nASSISTANT: {"classification": "
            images = [Image.open(os.path.join(val_dataset.base_dir, record_map[cid]["image_path"])).convert("RGB") for cid in case_ids]
            prefix_prompts = [f"USER: <image>\n{record_map[cid]['prompt']}\nASSISTANT: {prefix_prompt_suffix}" for cid in case_ids]

            prefix_inputs = processor(text=prefix_prompts, images=images, padding=True, return_tensors="pt").to("cuda")
            prefix_outputs = model(**prefix_inputs)
            last_logits = prefix_outputs.logits[:, -1, :]  # (batch, vocab)

            logit_norm = last_logits[:, TOK_NORMAL].cpu().float().numpy()
            logit_abn = last_logits[:, TOK_ABNORMAL].cpu().float().numpy()

            for i in range(b_size):
                gt = classes[i]
                ln = logit_norm[i]
                la = logit_abn[i]

                # Softmax probability for abnormal
                p_abn = float(np.exp(la) / (np.exp(la) + np.exp(ln) + 1e-12))
                pred = "abnormal" if p_abn >= 0.50 else "normal"

                y_true.append(gt)
                y_pred.append(pred)
                prob_abnormal_list.append(p_abn)

    avg_loss = total_loss / max(total_samples, 1)

    # Compute metrics
    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "abnormal" and yp == "abnormal")
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "normal" and yp == "normal")
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "normal" and yp == "abnormal")
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "abnormal" and yp == "normal")

    n_pos = tp + fn
    n_neg = tn + fp
    total = len(y_true)

    accuracy = (tp + tn) / max(total, 1)
    sensitivity = tp / max(n_pos, 1) if n_pos > 0 else 0.0
    specificity = tn / max(n_neg, 1) if n_neg > 0 else 0.0
    precision = tp / max(tp + fp, 1) if (tp + fp) > 0 else 0.0
    balanced_acc = (sensitivity + specificity) / 2.0

    f1_abn = (2 * precision * sensitivity) / max(precision + sensitivity, 1e-9) if (precision + sensitivity) > 0 else 0.0
    npv = tn / max(tn + fn, 1) if (tn + fn) > 0 else 0.0
    f1_norm = (2 * npv * specificity) / max(npv + specificity, 1e-9) if (npv + specificity) > 0 else 0.0
    macro_f1 = (f1_abn + f1_norm) / 2.0

    # ROC AUC from continuous probability
    try:
        from sklearn.metrics import roc_auc_score
        y_binary = [1 if y == "abnormal" else 0 for y in y_true]
        val_auc = float(roc_auc_score(y_binary, prob_abnormal_list))
    except Exception:
        val_auc = 0.50

    return {
        "val_loss": round(avg_loss, 4),
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "total": total,
        "accuracy": round(accuracy, 4),
        "sensitivity": round(sensitivity, 4),
        "specificity": round(specificity, 4),
        "precision": round(precision, 4),
        "balanced_accuracy": round(balanced_acc, 4),
        "macro_f1": round(macro_f1, 4),
        "roc_auc": round(val_auc, 4),
    }


def train_primary_llava(args):
    print("=" * 80)
    print("ANVESH: PRIMARY LLaVA-1.5-7B PROJECTOR-AUGMENTED QLoRA FINE-TUNING")
    print("Target Device: NVIDIA RTX 4090 24GB | Task: Image-Only CXR Classification")
    print("=" * 80)

    if not torch.cuda.is_available():
        raise RuntimeError("[ERROR] CUDA is strictly required.")

    set_seed(args.seed)
    os.makedirs(args.output_dir, exist_ok=True)

    # 1. Dataset Verification
    train_path = os.path.join(args.dataset_dir, "train.json")
    val_path = os.path.join(args.dataset_dir, "val.json")

    train_dataset = ImageOnlyCXRDataset(train_path, IMAGE_BASE_DIR)
    val_dataset = ImageOnlyCXRDataset(val_path, IMAGE_BASE_DIR)

    print(f"  [OK] Training Split    : {len(train_dataset)} cases (Zero clinical text in prompts)")
    print(f"  [OK] Validation Split  : {len(val_dataset)} cases")
    print(f"  [OK] Output Directory  : {args.output_dir}")

    # 2. Processor
    print(f"\n[Step 1/5] Loading AutoProcessor for {MODEL_ID}...")
    processor = AutoProcessor.from_pretrained(MODEL_ID, cache_dir=os.environ["HF_HOME"])

    # 3. 4-bit Base Model
    print("\n[Step 2/5] Loading 4-bit NF4 quantized base model onto RTX 4090...")
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
    model.gradient_checkpointing_enable()

    # 4. LoRA Setup with Multimodal Projector Adaptation
    print("\n[Step 3/5] Configuring LoRA adapters for LLM and Multimodal Projector...")
    target_modules = [
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
        "linear_1", "linear_2"
    ]
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

    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.lr,
        weight_decay=0.01,
        betas=(0.9, 0.999)
    )

    grad_accum_steps = args.gradient_accumulation_steps
    steps_per_epoch = len(train_loader) // grad_accum_steps
    total_training_steps = steps_per_epoch * args.epochs

    scheduler = get_cosine_schedule_with_warmup(
        optimizer,
        num_warmup_steps=args.warmup_steps,
        num_training_steps=total_training_steps
    )

    # Save training configuration
    config_dict = {
        "model_id": MODEL_ID,
        "lora_r": args.lora_r,
        "lora_alpha": args.lora_alpha,
        "lora_dropout": args.lora_dropout,
        "target_modules": target_modules,
        "batch_size": args.batch_size,
        "gradient_accumulation_steps": grad_accum_steps,
        "effective_batch_size": args.batch_size * grad_accum_steps,
        "lr": args.lr,
        "epochs": args.epochs,
        "warmup_steps": args.warmup_steps,
        "eval_every_steps": args.eval_every_steps,
        "seed": args.seed,
        "dataset_train_count": len(train_dataset),
        "dataset_val_count": len(val_dataset),
        "timestamp": time.time()
    }
    with open(os.path.join(args.output_dir, "training_config.json"), "w") as f:
        json.dump(config_dict, f, indent=2)

    print(f"\n[Step 4/5] Starting Primary LLaVA Training Loop...")
    print(f"  - Total Epochs              : {args.epochs}")
    print(f"  - Per-Device Batch Size     : {args.batch_size}")
    print(f"  - Gradient Accumulation     : {grad_accum_steps}")
    print(f"  - Effective Batch Size      : {args.batch_size * grad_accum_steps}")
    print(f"  - Total Gradient Updates    : {total_training_steps}")
    print(f"  - Evaluation Interval       : Every {args.eval_every_steps} update steps")

    # Initial Zero-Shot Validation Baseline
    print("\n--- Running Baseline Zero-Shot Validation Evaluation ---")
    base_val = evaluate_validation(model, processor, val_dataset, batch_size=args.batch_size)
    print(f"  Baseline Val Loss: {base_val['val_loss']} | Acc: {base_val['accuracy']*100:.2f}% | "
          f"Sens: {base_val['sensitivity']*100:.2f}% | Spec: {base_val['specificity']*100:.2f}% | "
          f"Macro-F1: {base_val['macro_f1']*100:.2f}% | AUC: {base_val['roc_auc']:.4f}")
    print(f"  Counts: TP={base_val['tp']}, TN={base_val['tn']}, FP={base_val['fp']}, FN={base_val['fn']}")

    best_val_macro_f1 = base_val["macro_f1"]
    best_step = 0
    best_epoch = 0
    training_history = []

    training_history.append({
        "step": 0,
        "epoch": 0.0,
        "train_loss": None,
        "learning_rate": args.lr,
        **base_val
    })

    global_step = 0
    accumulated_loss = 0.0
    start_time = time.time()
    best_adapter_dir = os.path.join(args.output_dir, "best_adapter")

    model.train()

    for epoch in range(args.epochs):
        print(f"\n>>> Starting Epoch {epoch + 1}/{args.epochs}")
        for step, batch in enumerate(train_loader):
            model.train()
            batch.pop("case_ids", None)
            batch.pop("classifications", None)
            batch = {k: v.to("cuda") for k, v in batch.items()}

            outputs = model(**batch)
            loss = outputs.loss / grad_accum_steps
            loss.backward()

            accumulated_loss += loss.item() * grad_accum_steps

            if (step + 1) % grad_accum_steps == 0 or (step + 1) == len(train_loader):
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()
                scheduler.step()
                optimizer.zero_grad()
                global_step += 1

                current_lr = scheduler.get_last_lr()[0]
                train_loss_val = accumulated_loss / grad_accum_steps
                accumulated_loss = 0.0

                if global_step % args.logging_steps == 0 or global_step == 1:
                    vram_used = torch.cuda.memory_allocated(0) / (1024**3)
                    elapsed = time.time() - start_time
                    speed = (global_step * args.batch_size * grad_accum_steps) / max(elapsed, 0.01)
                    print(
                        f"Epoch {epoch+1}/{args.epochs} | "
                        f"Step {global_step:3d}/{total_training_steps} | "
                        f"Train Loss: {train_loss_val:.4f} | "
                        f"LR: {current_lr:.2e} | "
                        f"VRAM: {vram_used:.2f}GB | "
                        f"Speed: {speed:.1f} samples/s"
                    )

                # Periodic Validation Evaluation
                if global_step % args.eval_every_steps == 0 or global_step == total_training_steps:
                    print(f"\n--- Validation Evaluation @ Step {global_step} (Epoch {epoch + 1}) ---")
                    val_metrics = evaluate_validation(model, processor, val_dataset, batch_size=args.batch_size)
                    print(f"  Val Loss: {val_metrics['val_loss']} | Acc: {val_metrics['accuracy']*100:.2f}% | "
                          f"Sens: {val_metrics['sensitivity']*100:.2f}% | Spec: {val_metrics['specificity']*100:.2f}% | "
                          f"Macro-F1: {val_metrics['macro_f1']*100:.2f}% | AUC: {val_metrics['roc_auc']:.4f}")
                    print(f"  Confusion: TP={val_metrics['tp']}, TN={val_metrics['tn']}, FP={val_metrics['fp']}, FN={val_metrics['fn']}")

                    epoch_progress = round(epoch + (step + 1) / len(train_loader), 2)
                    record = {
                        "step": global_step,
                        "epoch": epoch_progress,
                        "train_loss": round(train_loss_val, 4),
                        "learning_rate": current_lr,
                        **val_metrics
                    }
                    training_history.append(record)

                    # Save history to disk after every evaluation
                    with open(os.path.join(args.output_dir, "training_history.json"), "w") as f:
                        json.dump(training_history, f, indent=2)
                    pd.DataFrame(training_history).to_csv(os.path.join(args.output_dir, "training_history.csv"), index=False)

                    # Model selection: check for improvement
                    # Require balanced predictions (both TP > 0 and TN > 0) to avoid collapsing
                    is_balanced = (val_metrics["tp"] > 0 and val_metrics["tn"] > 0)
                    if (val_metrics["macro_f1"] > best_val_macro_f1) or (is_balanced and best_val_macro_f1 <= 0.35):
                        best_val_macro_f1 = val_metrics["macro_f1"]
                        best_step = global_step
                        best_epoch = epoch + 1
                        print(f"  >>> NEW BEST MODEL FOUND (Macro-F1: {best_val_macro_f1*100:.2f}%)! Saving to {best_adapter_dir}...")
                        model.save_pretrained(best_adapter_dir)
                        processor.save_pretrained(best_adapter_dir)
                        with open(os.path.join(best_adapter_dir, "best_checkpoint_info.json"), "w") as f:
                            json.dump({
                                "best_step": best_step,
                                "best_epoch": best_epoch,
                                "best_macro_f1": best_val_macro_f1,
                                "metrics": val_metrics
                            }, f, indent=2)

    # Save final adapter
    final_adapter_dir = os.path.join(args.output_dir, "final_adapter")
    print(f"\n[Step 5/5] Saving final adapter to: {final_adapter_dir}")
    model.save_pretrained(final_adapter_dir)
    processor.save_pretrained(final_adapter_dir)

    print("\n" + "=" * 80)
    print("PRIMARY LLaVA TRAINING COMPLETE!")
    print(f"Best Validation Macro-F1: {best_val_macro_f1*100:.2f}% at Step {best_step} (Epoch {best_epoch})")
    print(f"Best Adapter Checkpoint : {best_adapter_dir}")
    print(f"Final Adapter Checkpoint: {final_adapter_dir}")
    print("=" * 80)


def main():
    parser = argparse.ArgumentParser(description="Train primary LLaVA-1.5-7B on CXR images with projector LoRA.")
    parser.add_argument("--epochs", type=int, default=2, help="Number of training epochs.")
    parser.add_argument("--batch-size", type=int, default=4, help="Per-device batch size.")
    parser.add_argument("--gradient-accumulation-steps", type=int, default=4, help="Gradient accumulation.")
    parser.add_argument("--lr", type=float, default=5e-5, help="Learning rate.")
    parser.add_argument("--lora-r", type=int, default=16, help="LoRA rank.")
    parser.add_argument("--lora-alpha", type=int, default=32, help="LoRA alpha.")
    parser.add_argument("--lora-dropout", type=float, default=0.05, help="LoRA dropout.")
    parser.add_argument("--warmup-steps", type=int, default=15, help="Warmup steps.")
    parser.add_argument("--logging-steps", type=int, default=10, help="Logging steps.")
    parser.add_argument("--eval-every-steps", type=int, default=46, help="Validation evaluation step interval.")
    parser.add_argument("--output-dir", type=str, default=OUTPUT_DIR, help="Output checkpoint dir.")
    parser.add_argument("--dataset-dir", type=str, default=DATASET_DIR, help="Dataset split dir.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed.")
    args = parser.parse_args()
    train_primary_llava(args)


if __name__ == "__main__":
    main()
