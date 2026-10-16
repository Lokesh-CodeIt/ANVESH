import json
import torch
import numpy as np
import pandas as pd
from transformers import AutoProcessor, LlavaForConditionalGeneration, BitsAndBytesConfig
from peft import PeftModel
from sklearn.metrics import accuracy_score, roc_auc_score, f1_score, recall_score, precision_score
import os

if os.path.exists(r"S:\anvesh_ml_cache"):
    os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

val_data = json.load(open("anvesh_dataset_image_only/val.json"))
print(f"Loaded {len(val_data)} validation cases.")

# Check the training history CSV of v2 and v3
print("\n--- v3 Training History Summary ---")
df_v3_hist = pd.read_csv("checkpoints_llava_v3/training_history.csv")
print(df_v3_hist[["step", "epoch", "val_loss", "accuracy", "sensitivity", "specificity", "macro_f1", "roc_auc", "optimal_threshold"]])

if os.path.exists("checkpoints_llava_v2/training_history.csv"):
    print("\n--- v2 Training History Summary ---")
    df_v2_hist = pd.read_csv("checkpoints_llava_v2/training_history.csv")
    print(df_v2_hist[["step", "epoch", "val_loss", "accuracy", "sensitivity", "specificity", "macro_f1", "roc_auc", "optimal_threshold"]])
