import os
import torch
from PIL import Image
from transformers import AutoProcessor, LlavaForConditionalGeneration, BitsAndBytesConfig

if os.path.exists(r"S:\anvesh_ml_cache"):
    os.environ["HF_HOME"] = r"S:\anvesh_ml_cache"

MODEL_ID = "llava-hf/llava-1.5-7b-hf"

processor = AutoProcessor.from_pretrained(MODEL_ID, cache_dir=os.environ.get("HF_HOME"))
processor.tokenizer.padding_side = "left"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16
)
model = LlavaForConditionalGeneration.from_pretrained(
    MODEL_ID,
    quantization_config=bnb_config,
    torch_dtype=torch.bfloat16,
    device_map={"": 0},
    cache_dir=os.environ.get("HF_HOME")
)
model.eval()

img = Image.new("RGB", (224, 224), "gray")
prompt = 'USER: <image>\nAnalyze CXR.\nASSISTANT: {"classification": "'
target = 'normal"}'
t_len = 3  # [8945, 9092, 2]

full = prompt + target + processor.tokenizer.eos_token

inp_full = processor(text=[full], images=[img], return_tensors="pt").to("cuda")
inp_prefix = processor(text=[prompt], images=[img], return_tensors="pt").to("cuda")

with torch.no_grad():
    out_full = model(**inp_full)
    out_prefix = model(**inp_prefix)

logit_from_full = out_full.logits[0, -t_len - 1, [8945, 370]].cpu().float()
logit_from_prefix = out_prefix.logits[0, -1, [8945, 370]].cpu().float()

print("Full seq shape:", out_full.logits.shape)
print("Prefix seq shape:", out_prefix.logits.shape)
print("Logits at -t_len-1 from full:", logit_from_full)
print("Logits at -1 from prefix:", logit_from_prefix)
diff = (logit_from_full - logit_from_prefix).abs().max().item()
print("Absolute difference:", diff)
assert diff < 1e-2, "Logits do not match!"
print("EXACT CAUSAL MATCH CONFIRMED!")
