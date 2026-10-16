import os
import sys
from transformers import AutoProcessor

if os.path.exists(r"S:\anvesh_ml_cache"):
    os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

processor = AutoProcessor.from_pretrained("llava-hf/llava-1.5-7b-hf", cache_dir=os.environ.get("HF_HOME"))
tok = processor.tokenizer

print("--- TOKENIZER AUDIT ---")
print("Padding side:", tok.padding_side)
print("Pad token:", tok.pad_token, tok.pad_token_id)
print("EOS token:", tok.eos_token, tok.eos_token_id)
print("BOS token:", tok.bos_token, tok.bos_token_id)

print("\n--- TOKENIZING 'normal' and 'abnormal' ---")
print("encode('normal', add_special_tokens=False):", tok.encode("normal", add_special_tokens=False))
print("encode(' abnormal', add_special_tokens=False):", tok.encode(" abnormal", add_special_tokens=False))
print("encode('normal', add_special_tokens=True):", tok.encode("normal", add_special_tokens=True))
print("convert_tokens_to_ids('normal'):", tok.convert_tokens_to_ids("normal"))
print("convert_tokens_to_ids(' abnormal'):", tok.convert_tokens_to_ids(" abnormal"))
print("convert_tokens_to_ids('abnormal'):", tok.convert_tokens_to_ids("abnormal"))

# Check prefix and what comes next
prefix = '{"classification": "'
enc_prefix = tok.encode(prefix, add_special_tokens=False)
print(f"\nPrefix: {prefix}")
print(f"Prefix tokens: {enc_prefix} -> {[tok.decode([t]) for t in enc_prefix]}")

full_norm = '{"classification": "normal"'
full_abn = '{"classification": "abnormal"'
enc_norm = tok.encode(full_norm, add_special_tokens=False)
enc_abn = tok.encode(full_abn, add_special_tokens=False)

print(f"\nFull normal: {enc_norm} -> {[tok.decode([t]) for t in enc_norm]}")
print(f"Full abnormal: {enc_abn} -> {[tok.decode([t]) for t in enc_abn]}")
print(f"First token after prefix for normal: {enc_norm[len(enc_prefix)]} ('{tok.decode([enc_norm[len(enc_prefix)]])}')")
print(f"First token after prefix for abnormal: {enc_abn[len(enc_prefix)]} ('{tok.decode([enc_abn[len(enc_prefix)]])}')")
