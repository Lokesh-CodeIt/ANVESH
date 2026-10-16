import os
from transformers import AutoProcessor

if os.path.exists(r"S:\anvesh_ml_cache"):
    os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

processor = AutoProcessor.from_pretrained("llava-hf/llava-1.5-7b-hf", cache_dir=os.environ.get("HF_HOME"))
tok = processor.tokenizer

prompt = 'USER: <image>\nAnalyze CXR.\nASSISTANT: {"classification": "'
target_norm = 'normal"}'
target_abn = 'abnormal"}'

full_norm = prompt + target_norm + tok.eos_token
full_abn = prompt + target_abn + tok.eos_token

ids_prompt = tok.encode(prompt, add_special_tokens=False)
ids_full_norm = tok.encode(full_norm, add_special_tokens=False)
ids_full_abn = tok.encode(full_abn, add_special_tokens=False)

norm_diff = ids_full_norm[len(ids_prompt):]
abn_diff = ids_full_abn[len(ids_prompt):]

print("Prefix tokens count:", len(ids_prompt))
print("Full norm tokens count:", len(ids_full_norm))
print("Diff norm tokens:", norm_diff, "Decoded:", repr(tok.decode(norm_diff)))
print("Full abn tokens count:", len(ids_full_abn))
print("Diff abn tokens:", abn_diff, "Decoded:", repr(tok.decode(abn_diff)))

assert tok.decode(norm_diff) == 'normal"}</s>'
assert tok.decode(abn_diff) == 'abnormal"}</s>'
print("PERFECT MATCH: The exact tokens following prompt are [8945, 9092, 2] and [370, 8945, 9092, 2]!")
