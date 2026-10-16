import os
from transformers import AutoProcessor

os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"
processor = AutoProcessor.from_pretrained("llava-hf/llava-1.5-7b-hf", cache_dir=r"S:\anvesh_ml_cache")

t1 = '{"classification": "normal"'
t2 = '{"classification": "abnormal"'
t_prefix = '{"classification": "'

tok1 = processor.tokenizer.encode(t1, add_special_tokens=False)
tok2 = processor.tokenizer.encode(t2, add_special_tokens=False)
tok_pre = processor.tokenizer.encode(t_prefix, add_special_tokens=False)

print("Prefix tokens:", tok_pre, [processor.tokenizer.decode([t]) for t in tok_pre])
print("T1 tokens:", tok1, [processor.tokenizer.decode([t]) for t in tok1])
print("T2 tokens:", tok2, [processor.tokenizer.decode([t]) for t in tok2])
print("First token after prefix for normal:", tok1[len(tok_pre):], processor.tokenizer.decode(tok1[len(tok_pre):]))
print("First token after prefix for abnormal:", tok2[len(tok_pre):], processor.tokenizer.decode(tok2[len(tok_pre):]))
