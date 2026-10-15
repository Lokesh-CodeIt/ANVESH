"""
ANVESH Medical AI Research Project
Vision Transformer (ViT-B/16) Image-Only Normal vs Abnormal CXR Classification Pipeline
Trains a vision-only classifier directly on chest radiograph pixels.
Zero clinical text, radiologist notes, findings, or impressions are used as input.

Architecture: torchvision.models.vit_b_16 (ImageNet-1k pretrained weights)
Head: Replaced with 2-class linear classifier (0: normal, 1: abnormal)
Output checkpoints: checkpoints_vit_image_only/
"""

import os
import sys
import json
import time
import random
import argparse
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from sklearn.metrics import accuracy_score, f1_score, balanced_accuracy_score, roc_auc_score

# Configuration defaults
DEFAULT_DATA_DIR = "anvesh_dataset_image_only"
DEFAULT_IMAGE_BASE = "anvesh_dataset"
DEFAULT_CHECKPOINT_DIR = "checkpoints_vit_image_only"
SEED = 42

CLASS_TO_IDX = {"normal": 0, "abnormal": 1}
IDX_TO_CLASS = {0: "normal", 1: "abnormal"}

def set_all_seeds(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

class CXRImageDataset(Dataset):
    def __init__(self, json_path: str, image_base_dir: str, transform=None):
        with open(json_path, "r", encoding="utf-8") as f:
            self.records = json.load(f)
        self.image_base_dir = image_base_dir
        self.transform = transform

    def __len__(self):
        return len(self.records)

    def __getitem__(self, idx):
        item = self.records[idx]
        img_path = os.path.join(self.image_base_dir, item["image_path"])
        image = Image.open(img_path).convert("RGB")
        
        if self.transform is not None:
            image = self.transform(image)
            
        label_str = item["classification"]
        label_idx = CLASS_TO_IDX[label_str]
        
        return {
            "image": image,
            "label": label_idx,
            "case_id": item["case_id"],
            "image_path": item["image_path"],
            "label_str": label_str
        }

def get_transforms():
    # Conservative augmentations on training set; strictly preserves thoracic orientation
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomResizedCrop(224, scale=(0.85, 1.0)),
        transforms.RandomRotation(degrees=7),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    return train_transform, val_transform

def build_vit_classifier(num_classes: int = 2, pretrained: bool = True) -> nn.Module:
    if pretrained:
        weights = models.ViT_B_16_Weights.DEFAULT
        model = models.vit_b_16(weights=weights)
    else:
        model = models.vit_b_16(weights=None)
        
    in_features = model.heads.head.in_features
    model.heads.head = nn.Linear(in_features, num_classes)
    return model

def evaluate(model: nn.Module, data_loader: DataLoader, criterion: nn.Module, device: torch.device):
    model.eval()
    total_loss = 0.0
    all_preds = []
    all_targets = []
    all_probs = []
    
    with torch.no_grad():
        for batch in data_loader:
            images = batch["image"].to(device)
            labels = batch["label"].to(device)
            
            outputs = model(images)
            loss = criterion(outputs, labels)
            total_loss += loss.item() * images.size(0)
            
            probs = torch.softmax(outputs, dim=-1)
            preds = torch.argmax(probs, dim=-1)
            
            all_preds.extend(preds.cpu().numpy().tolist())
            all_targets.extend(labels.cpu().numpy().tolist())
            all_probs.extend(probs[:, 1].cpu().numpy().tolist())  # prob of abnormal
            
    avg_loss = total_loss / len(data_loader.dataset)
    acc = accuracy_score(all_targets, all_preds)
    bal_acc = balanced_accuracy_score(all_targets, all_preds)
    macro_f1 = f1_score(all_targets, all_preds, average="macro", zero_division=0)
    
    try:
        auc = roc_auc_score(all_targets, all_probs)
    except Exception:
        auc = 0.5
        
    return {
        "loss": avg_loss,
        "accuracy": acc,
        "balanced_accuracy": bal_acc,
        "macro_f1": macro_f1,
        "roc_auc": auc
    }

def train_pipeline(args):
    set_all_seeds(args.seed)
    os.makedirs(args.checkpoint_dir, exist_ok=True)
    
    device = torch.device("cuda" if torch.cuda.is_available() and not args.cpu else "cpu")
    print(f"Using device: {device}")
    if device.type == "cuda":
        print(f"Device name: {torch.cuda.get_device_name(0)}")
        print(f"Total VRAM: {torch.cuda.get_device_properties(0).total_memory / (1024**3):.2f} GB")
        
    train_transform, val_transform = get_transforms()
    
    train_json = os.path.join(args.data_dir, "train.json")
    val_json = os.path.join(args.data_dir, "val.json")
    
    train_dataset = CXRImageDataset(train_json, args.image_base, transform=train_transform)
    val_dataset = CXRImageDataset(val_json, args.image_base, transform=val_transform)
    
    print(f"Loaded Train cases: {len(train_dataset)}")
    print(f"Loaded Validation cases: {len(val_dataset)}")
    
    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        pin_memory=(device.type == "cuda")
    )
    
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        pin_memory=(device.type == "cuda")
    )
    
    print("Initializing Vision Transformer (ViT-B/16)...")
    model = build_vit_classifier(num_classes=2, pretrained=True)
    model.to(device)
    
    # Differential learning rate: lower on pretrained backbone, higher on newly initialized head
    backbone_params = []
    head_params = []
    for name, param in model.named_parameters():
        if "heads" in name:
            head_params.append(param)
        else:
            backbone_params.append(param)
            
    optimizer = torch.optim.AdamW([
        {"params": backbone_params, "lr": args.backbone_lr, "weight_decay": args.weight_decay},
        {"params": head_params, "lr": args.head_lr, "weight_decay": args.weight_decay}
    ])
    
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=args.epochs, eta_min=1e-6
    )
    
    criterion = nn.CrossEntropyLoss()
    
    start_epoch = 1
    best_val_loss = float("inf")
    best_val_macro_f1 = 0.0
    history = []
    
    # Resume if requested
    last_ckpt_path = os.path.join(args.checkpoint_dir, "checkpoint_last.pt")
    if args.resume and os.path.exists(last_ckpt_path):
        print(f"Resuming from checkpoint: {last_ckpt_path}")
        checkpoint = torch.load(last_ckpt_path, map_location=device, weights_only=False)
        model.load_state_dict(checkpoint["model_state_dict"])
        optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
        scheduler.load_state_dict(checkpoint["scheduler_state_dict"])
        start_epoch = checkpoint["epoch"] + 1
        best_val_loss = checkpoint.get("best_val_loss", float("inf"))
        best_val_macro_f1 = checkpoint.get("best_val_macro_f1", 0.0)
        history = checkpoint.get("history", [])
        print(f"Resumed at epoch {start_epoch} (Best Val Loss: {best_val_loss:.4f}, Best Val Macro-F1: {best_val_macro_f1:.4f})")
        
    config = {
        "architecture": "vit_b_16",
        "pretrained_weights": "ViT_B_16_Weights.IMAGENET1K_V1",
        "num_classes": 2,
        "class_mapping": CLASS_TO_IDX,
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "backbone_lr": args.backbone_lr,
        "head_lr": args.head_lr,
        "weight_decay": args.weight_decay,
        "seed": args.seed,
        "device": str(device),
        "train_samples": len(train_dataset),
        "val_samples": len(val_dataset),
        "torch_version": torch.__version__,
        "torchvision_version": models.__version__ if hasattr(models, "__version__") else "0.21.0"
    }
    with open(os.path.join(args.checkpoint_dir, "vit_config.json"), "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)
        
    print(f"\n--- Commencing Training: {args.epochs} Epochs ---")
    start_time = time.time()
    
    for epoch in range(start_epoch, args.epochs + 1):
        epoch_start = time.time()
        model.train()
        train_loss = 0.0
        train_preds = []
        train_targets = []
        
        for batch in train_loader:
            images = batch["image"].to(device)
            labels = batch["label"].to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            
            # Gradient clipping for training stability
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            
            train_loss += loss.item() * images.size(0)
            preds = torch.argmax(outputs, dim=-1)
            train_preds.extend(preds.cpu().numpy().tolist())
            train_targets.extend(labels.cpu().numpy().tolist())
            
        scheduler.step()
        epoch_duration = time.time() - epoch_start
        
        train_avg_loss = train_loss / len(train_dataset)
        train_acc = accuracy_score(train_targets, train_preds)
        train_f1 = f1_score(train_targets, train_preds, average="macro", zero_division=0)
        
        val_metrics = evaluate(model, val_loader, criterion, device)
        
        current_lr = optimizer.param_groups[0]["lr"]
        
        print(f"Epoch [{epoch:02d}/{args.epochs:02d}] ({epoch_duration:.1f}s) | "
              f"Train Loss: {train_avg_loss:.4f}, Acc: {train_acc*100:.2f}%, F1: {train_f1*100:.2f}% | "
              f"Val Loss: {val_metrics['loss']:.4f}, Acc: {val_metrics['accuracy']*100:.2f}%, "
              f"BalAcc: {val_metrics['balanced_accuracy']*100:.2f}%, F1: {val_metrics['macro_f1']*100:.2f}%, "
              f"AUC: {val_metrics['roc_auc']:.4f} | LR: {current_lr:.2e}")
        
        record = {
            "epoch": epoch,
            "train_loss": train_avg_loss,
            "train_acc": train_acc,
            "train_macro_f1": train_f1,
            "val_loss": val_metrics["loss"],
            "val_acc": val_metrics["accuracy"],
            "val_balanced_acc": val_metrics["balanced_accuracy"],
            "val_macro_f1": val_metrics["macro_f1"],
            "val_roc_auc": val_metrics["roc_auc"],
            "lr": current_lr,
            "epoch_duration_sec": epoch_duration
        }
        history.append(record)
        
        # Save last checkpoint
        checkpoint_state = {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "scheduler_state_dict": scheduler.state_dict(),
            "best_val_loss": best_val_loss,
            "best_val_macro_f1": best_val_macro_f1,
            "history": history,
            "config": config
        }
        torch.save(checkpoint_state, last_ckpt_path)
        
        # Save best model based on validation loss / macro-F1
        # Primary criterion: val_loss; secondary: val_macro_f1
        if val_metrics["loss"] < best_val_loss:
            best_val_loss = val_metrics["loss"]
            best_val_macro_f1 = val_metrics["macro_f1"]
            best_ckpt_path = os.path.join(args.checkpoint_dir, "best_vit_model.pt")
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "val_metrics": val_metrics,
                "config": config,
                "class_mapping": CLASS_TO_IDX
            }, best_ckpt_path)
            print(f"  --> Saved new best model checkpoint to {best_ckpt_path} (Val Loss: {best_val_loss:.4f})")
            
    total_time = time.time() - start_time
    print(f"\nTraining completed in {total_time:.2f} seconds.")
    print(f"Best Validation Loss: {best_val_loss:.4f}")
    
    # Save training history CSV
    history_df = pd.DataFrame(history)
    history_csv = os.path.join(args.checkpoint_dir, "vit_training_history.csv")
    history_df.to_csv(history_csv, index=False)
    print(f"Saved training history to: {history_csv}")
    
    return history

def main():
    parser = argparse.ArgumentParser(description="Train Vision Transformer on Image-Only CXR Dataset")
    parser.add_argument("--data-dir", type=str, default=DEFAULT_DATA_DIR, help="Path to dataset splits")
    parser.add_argument("--image-base", type=str, default=DEFAULT_IMAGE_BASE, help="Base path for CXR images")
    parser.add_argument("--checkpoint-dir", type=str, default=DEFAULT_CHECKPOINT_DIR, help="Directory to save checkpoints")
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--backbone-lr", type=float, default=2e-5, help="Learning rate for transformer backbone")
    parser.add_argument("--head-lr", type=float, default=2e-4, help="Learning rate for classification head")
    parser.add_argument("--weight-decay", type=float, default=0.01, help="Weight decay for AdamW")
    parser.add_argument("--num-workers", type=int, default=0, help="DataLoader num_workers (0 for Windows stability)")
    parser.add_argument("--seed", type=int, default=SEED, help="Random seed")
    parser.add_argument("--resume", action="store_true", help="Resume from last checkpoint if available")
    parser.add_argument("--cpu", action="store_true", help="Force CPU execution")
    
    args = parser.parse_args()
    train_pipeline(args)

if __name__ == "__main__":
    main()
