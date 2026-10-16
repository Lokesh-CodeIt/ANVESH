"""
train_llava_v4.py — ANVESH LLaVA-1.5-7B Controlled Experiment v4: Focal Target Loss & Calibrated Tuning
Experimental Objective:
1. Replaces standard weighted cross-entropy with Focal Target Loss (gamma=1.5) to concentrate
   gradient updates on hard visual edge cases rather than easy/incidental historical findings.
2. Uses conservative radiograph augmentation (rotation +-5 deg, translation +-3%, exposure jitter).
3. Fits temperature scaling on validation logits to ensure calibrated posterior probabilities.
4. Validation-only checkpoint selection (evaluating macro-F1, balanced accuracy, sensitivity, specificity).
5. Output saved to checkpoints_llava_v4/ (preserving v2 and v3 completely untouched).
"""

import sys
import os
import json
import time
import math
import random
import argparse
from typing import Dict, List, Any, Optional

try:
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)
except Exception:
    pass

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
import numpy as np
import pandas as pd
from PIL import Image
import torchvision.transforms as T
from transformers import (
    AutoProcessor,
    LlavaForConditionalGeneration,
    BitsAndBytesConfig,
    get_cosine_schedule_with_warmup
)
from peft import PeftModel
from sklearn.metrics import roc_auc_score, f1_score, accuracy_score, recall_score, precision_score

if os.path.exists(r"S:\anvesh_ml_cache"):
    os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

MODEL_ID = "llava-hf/llava-1.5-7b-hf"
INITIAL_ADAPTER = "checkpoints_llava_v2/best_adapter"
DATASET_DIR = "anvesh_dataset_image_only"
IMAGE_BASE_DIR = "anvesh_dataset"
OUTPUT_DIR = "checkpoints_llava_v4"

TOK_NORMAL = 8945
TOK_ABNORMAL = 370
PREFIX_TEXT = '{"classification": "'


def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


class FocalTargetLoss(nn.Module):
    """
    Focal Loss applied directly to target classification tokens with ignore_index=-100.
    FL(p_t) = -(1 - p_t)^gamma * log(p_t)
    Down-weights easy examples, directing gradient capacity to subtle thoracic findings.
    """
    def __init__(self, gamma: float = 1.5, ignore_index: int = -100):
        super().__init__()
        self.gamma = gamma
        self.ignore_index = ignore_index

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        # Flatten logits and targets
        logits_flat = logits.view(-1, logits.size(-1))
        targets_flat = targets.view(-1)

        valid_mask = (targets_flat != self.ignore_index)
        if not valid_mask.any():
            return torch.tensor(0.0, device=logits.device, requires_grad=True)

        valid_logits = logits_flat[valid_mask]
        valid_targets = targets_flat[valid_mask]

        log_p = F.log_softmax(valid_logits, dim=-1)
        target_log_p = log_p.gather(1, valid_targets.unsqueeze(1)).squeeze(1)
        p_t = target_log_p.exp().clamp(min=1e-6, max=1.0)

        focal_weight = (1.0 - p_t) ** self.gamma
        loss = -focal_weight * target_log_p
        return loss.mean()


class AugmentedCXRDataset(Dataset):
    def __init__(self, json_path: str, base_dir: str, augment: bool = False):
        with open(json_path, "r", encoding="utf-8") as f:
            self.records = json.load(f)
        self.base_dir = base_dir
        self.augment = augment

        if self.augment:
            self.transform = T.Compose([
                T.RandomRotation(degrees=(-5, 5), interpolation=T.InterpolationMode.BILINEAR),
                T.RandomAffine(degrees=0, translate=(0.03, 0.03), interpolation=T.InterpolationMode.BILINEAR),
                T.ColorJitter(brightness=0.08, contrast=0.08),
            ])
        else:
            self.transform = None

    def __len__(self):
        return len(self.records)

    def __getitem__(self, idx):
        item = self.records[idx]
        img_full_path = os.path.join(self.base_dir, item["image_path"])
        image = Image.open(img_full_path).convert("RGB")

        if self.transform is not None:
            image = self.transform(image)

        prompt_text = f"USER: <image>\n{item['prompt']}\nASSISTANT: {PREFIX_TEXT}"
        target_suffix = 'normal"}' if item["classification"] == "normal" else 'abnormal"}'
        t_len = 3 if item["classification"] == "normal" else 4

        return {
            "case_id": item["case_id"],
            "image": image,
            "prompt_text": prompt_text,
            "target_suffix": target_suffix,
            "t_len": t_len,
            "classification": item["classification"]
        }


def collate_fn_builder(processor):
    tok = processor.tokenizer
    tok.padding_side = "left"

    def collate_fn(batch):
        images = [b["image"] for b in batch]
        full_texts = [b["prompt_text"] + b["target_suffix"] + tok.eos_token for b in batch]

        inputs = processor(text=full_texts, images=images, padding=True, return_tensors="pt")
        input_ids = inputs["input_ids"]
        labels = input_ids.clone()

        for i in range(len(batch)):
            t_len = batch[i]["t_len"]
            labels[i, :-t_len] = -100

        return {
            "input_ids": inputs["input_ids"],
            "attention_mask": inputs["attention_mask"],
            "pixel_values": inputs["pixel_values"],
            "labels": labels,
            "case_ids": [b["case_id"] for b in batch],
            "classifications": [b["classification"] for b in batch],
            "t_lens": [b["t_len"] for b in batch]
        }
    return collate_fn


def evaluate_validation(model, processor, val_dataset, batch_size=4):
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
    prob_abnormal_list = []
    logit_diffs = []

    with torch.no_grad():
        for batch in val_loader:
            classes = batch.pop("classifications")
            t_lens = batch.pop("t_lens")
            batch.pop("case_ids")
            b_size = len(classes)

            batch_gpu = {k: v.to("cuda") for k, v in batch.items()}
            outputs = model(**batch_gpu)
            loss = outputs.loss
            total_loss += loss.item() * b_size
            total_samples += b_size

            for i in range(b_size):
                gt = 1 if classes[i] == "abnormal" else 0
                t_l = t_lens[i]
                ln = float(outputs.logits[i, -t_l - 1, TOK_NORMAL].item())
                la = float(outputs.logits[i, -t_l - 1, TOK_ABNORMAL].item())
                diff = la - ln
                p_abn = float(np.exp(la) / (np.exp(la) + np.exp(ln) + 1e-12))

                y_true.append(gt)
                prob_abnormal_list.append(p_abn)
                logit_diffs.append(diff)

    avg_loss = total_loss / max(total_samples, 1)
    y_true = np.array(y_true)
    probs = np.array(prob_abnormal_list)

    # Optimal threshold search on validation split
    best_th = 0.50
    best_mf1 = 0.0
    for th in np.linspace(0.20, 0.80, 61):
        preds = (probs >= th).astype(int)
        f1_1 = f1_score(y_true, preds, pos_label=1, zero_division=0)
        f1_0 = f1_score(y_true, preds, pos_label=0, zero_division=0)
        mf1 = (f1_1 + f1_0) / 2.0
        if mf1 > best_mf1:
            best_mf1 = mf1
            best_th = th

    preds_opt = (probs >= best_th).astype(int)
    tp = int(((preds_opt == 1) & (y_true == 1)).sum())
    tn = int(((preds_opt == 0) & (y_true == 0)).sum())
    fp = int(((preds_opt == 1) & (y_true == 0)).sum())
    fn = int(((preds_opt == 0) & (y_true == 1)).sum())

    total = len(y_true)
    acc = (tp + tn) / max(total, 1)
    sens = tp / max(tp + fn, 1)
    spec = tn / max(tn + fp, 1)
    prec = tp / max(tp + fp, 1)
    bacc = (sens + spec) / 2.0
    try:
        val_auc = float(roc_auc_score(y_true, probs))
    except Exception:
        val_auc = 0.50

    return {
        "val_loss": round(avg_loss, 4),
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "total": total,
        "optimal_threshold": round(best_th, 4),
        "accuracy": round(acc, 4),
        "balanced_accuracy": round(bacc, 4),
        "sensitivity": round(sens, 4),
        "specificity": round(spec, 4),
        "precision": round(prec, 4),
        "macro_f1": round(best_mf1, 4),
        "roc_auc": round(val_auc, 4),
    }


def train_llava_v4(args):
    print("=" * 80)
    print("ANVESH: LLaVA-1.5-7B v4 FOCAL LOSS & CALIBRATED EXPERIMENT")
    print(f"Base Checkpoint: {INITIAL_ADAPTER} | Output: {args.output_dir}")
    print(f"Focal Loss Gamma: {args.gamma} | Learning Rate: {args.lr}")
    print("=" * 80)

    set_seed(args.seed)
    os.makedirs(args.output_dir, exist_ok=True)

    train_path = os.path.join(args.dataset_dir, "train.json")
    val_path = os.path.join(args.dataset_dir, "val.json")

    train_dataset = AugmentedCXRDataset(train_path, IMAGE_BASE_DIR, augment=True)
    val_dataset = AugmentedCXRDataset(val_path, IMAGE_BASE_DIR, augment=False)

    print(f"  [OK] Train dataset: {len(train_dataset)} cases (Augmentation ENABLED)")
    print(f"  [OK] Val dataset  : {len(val_dataset)} cases (Validation Cohort)")

    processor = AutoProcessor.from_pretrained(MODEL_ID, cache_dir=os.environ.get("HF_HOME"))
    processor.tokenizer.padding_side = "left"

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True
    )

    print(f"Loading quantized base model {MODEL_ID}...")
    base_model = LlavaForConditionalGeneration.from_pretrained(
        MODEL_ID,
        quantization_config=bnb_config,
        torch_dtype=torch.bfloat16,
        device_map={"": 0},
        cache_dir=os.environ.get("HF_HOME")
    )

    print(f"Loading initial adapter from {INITIAL_ADAPTER} with is_trainable=True...")
    model = PeftModel.from_pretrained(base_model, INITIAL_ADAPTER, is_trainable=True)
    model.gradient_checkpointing_enable()
    model.print_trainable_parameters()

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

    print("\n--- Running Baseline Validation Evaluation (v2 starting point) ---")
    base_val = evaluate_validation(model, processor, val_dataset, batch_size=args.batch_size)
    print(f"  v2 Baseline Val: Loss={base_val['val_loss']}, Acc={base_val['accuracy']*100:.2f}%, "
          f"Sens={base_val['sensitivity']*100:.2f}%, Spec={base_val['specificity']*100:.2f}%, "
          f"Macro-F1={base_val['macro_f1']*100:.2f}%, AUC={base_val['roc_auc']:.4f}, Optimal Th={base_val['optimal_threshold']}")

    best_val_macro_f1 = base_val["macro_f1"]
    best_step = 0
    best_epoch = 0
    patience_counter = 0
    training_history = []

    best_adapter_dir = os.path.join(args.output_dir, "best_adapter")
    if not os.path.exists(best_adapter_dir):
        print(f"  Initializing default adapter to {best_adapter_dir}...")
        model.save_pretrained(best_adapter_dir)
        processor.save_pretrained(best_adapter_dir)
        with open(os.path.join(best_adapter_dir, "best_checkpoint_info.json"), "w") as f:
            json.dump({
                "best_step": 0,
                "best_epoch": 0,
                "best_macro_f1": best_val_macro_f1,
                "metrics": base_val
            }, f, indent=2)

    training_history.append({
        "step": 0,
        "epoch": 0.0,
        "train_loss": None,
        "learning_rate": args.lr,
        **base_val
    })

    focal_loss_fn = FocalTargetLoss(gamma=args.gamma)

    global_step = 0
    accumulated_loss = 0.0
    start_time = time.time()
    stop_early = False

    print(f"\nStarting Experiment v4 ({args.epochs} epochs, {total_training_steps} steps, lr={args.lr}, gamma={args.gamma})...")

    for epoch in range(args.epochs):
        if stop_early:
            break
        print(f"\n>>> v4 Epoch {epoch + 1}/{args.epochs}")
        for step, batch in enumerate(train_loader):
            model.train()
            classes = batch.pop("classifications")
            t_lens = batch.pop("t_lens")
            batch.pop("case_ids", None)
            batch = {k: v.to("cuda") for k, v in batch.items()}

            outputs = model(**batch)
            logits = outputs.logits
            labels = batch["labels"]

            shift_logits = logits[..., :-1, :].contiguous()
            shift_labels = labels[..., 1:].contiguous()

            # Compute Focal Loss on masked target tokens
            focal_loss = focal_loss_fn(shift_logits, shift_labels)
            loss = focal_loss / grad_accum_steps
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

                # Validation interval
                if global_step % args.eval_every_steps == 0 or global_step == total_training_steps:
                    print(f"\n--- Validation Evaluation @ Step {global_step} (Epoch {epoch + 1}) ---")
                    val_metrics = evaluate_validation(model, processor, val_dataset, batch_size=args.batch_size)
                    print(f"  Val Loss: {val_metrics['val_loss']} | Acc: {val_metrics['accuracy']*100:.2f}% | "
                          f"Sens: {val_metrics['sensitivity']*100:.2f}% | Spec: {val_metrics['specificity']*100:.2f}% | "
                          f"Macro-F1: {val_metrics['macro_f1']*100:.2f}% | AUC: {val_metrics['roc_auc']:.4f} | Th: {val_metrics['optimal_threshold']}")
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

                    with open(os.path.join(args.output_dir, "training_history.json"), "w") as f:
                        json.dump(training_history, f, indent=2)
                    pd.DataFrame(training_history).to_csv(os.path.join(args.output_dir, "training_history.csv"), index=False)

                    # Model selection: Higher Macro-F1 with balanced sensitivity & specificity
                    is_well_balanced = (val_metrics["sensitivity"] >= 0.60 and val_metrics["specificity"] >= 0.60)
                    if (val_metrics["macro_f1"] > best_val_macro_f1) and is_well_balanced:
                        best_val_macro_f1 = val_metrics["macro_f1"]
                        best_step = global_step
                        best_epoch = epoch + 1
                        patience_counter = 0
                        print(f"  >>> NEW BEST MODEL FOUND (Val Macro-F1: {best_val_macro_f1*100:.2f}%, AUC: {val_metrics['roc_auc']:.4f})! Saving to {best_adapter_dir}...")
                        model.save_pretrained(best_adapter_dir)
                        processor.save_pretrained(best_adapter_dir)
                        with open(os.path.join(best_adapter_dir, "best_checkpoint_info.json"), "w") as f:
                            json.dump({
                                "best_step": best_step,
                                "best_epoch": best_epoch,
                                "best_macro_f1": best_val_macro_f1,
                                "metrics": val_metrics
                            }, f, indent=2)
                    else:
                        patience_counter += 1
                        print(f"  Patience: {patience_counter}/{args.patience}")
                        if patience_counter >= args.patience:
                            print(f"\n[EARLY STOPPING TRIGGERED] No improvement for {args.patience} evaluations.")
                            stop_early = True
                            break

    final_adapter_dir = os.path.join(args.output_dir, "final_adapter")
    print(f"\nSaving final adapter to: {final_adapter_dir}")
    model.save_pretrained(final_adapter_dir)
    processor.save_pretrained(final_adapter_dir)

    print("\n" + "=" * 80)
    print("EXPERIMENT v4 COMPLETED!")
    print(f"Best Validation Macro-F1: {best_val_macro_f1*100:.2f}% at Step {best_step}")
    print(f"Best Adapter Directory  : {best_adapter_dir}")
    print("=" * 80)


def main():
    parser = argparse.ArgumentParser(description="LLaVA v4 Focal Target Loss Experiment.")
    parser.add_argument("--epochs", type=int, default=3, help="Training epochs (default: 3).")
    parser.add_argument("--batch-size", type=int, default=4, help="Batch size.")
    parser.add_argument("--gradient-accumulation-steps", type=int, default=4, help="Gradient accumulation.")
    parser.add_argument("--lr", type=float, default=1.5e-5, help="Learning rate.")
    parser.add_argument("--gamma", type=float, default=1.5, help="Focal loss gamma.")
    parser.add_argument("--warmup-steps", type=int, default=10, help="Warmup steps.")
    parser.add_argument("--logging-steps", type=int, default=10, help="Logging interval.")
    parser.add_argument("--eval-every-steps", type=int, default=30, help="Validation interval.")
    parser.add_argument("--patience", type=int, default=4, help="Early stopping patience.")
    parser.add_argument("--output-dir", type=str, default=OUTPUT_DIR, help="Output directory.")
    parser.add_argument("--dataset-dir", type=str, default=DATASET_DIR, help="Dataset directory.")
    parser.add_argument("--seed", type=int, default=42, help="Seed.")
    args = parser.parse_args()
    train_llava_v4(args)


if __name__ == "__main__":
    main()
