# MODEL_CARD.md: ANVESH (MedAuth-VLM) AI Architecture & Inference Specifications

## 1. Executive Summary & Model Hierarchy

ANVESH is an AI-assisted prior-authorization and clinical evidence extraction system. It operates with a **strictly stratified, transparent AI hierarchy** to ensure zero data fabrication and total reproducibility:

```mermaid
graph TD
    Submission["New Case Submitted / Radiograph Uploaded"] --> Router{"Remote LLaVA GPU Endpoint Configured?"}
    Router -->|Yes (LLAVA_ENDPOINT_URL set)| RemoteLLaVA["Remote GPU Worker (LLaVA-1.5-7B LoRA)"]
    Router -->|No / Endpoint Unreachable| Fallback["Local CPU Vision & Policy Engine"]
    
    RemoteLLaVA -->|Authentic 7B Output| StoreLLaVA["ai_source: REMOTE_LLAVA<br>Model: llava-1.5-7b-hf+lora"]
    RemoteLLaVA -->|Failure / Timeout| Fallback
    
    Fallback --> ViT["Local ViT-B/16 Classifier (CPU)"]
    Fallback --> RuleEngine["Rule-Based Indication Extraction"]
    ViT & RuleEngine --> StoreLocal["ai_source: LOCAL_VIT or RULE_ENGINE<br>Model: ViT-B/16-Local (Remote LLaVA offline)"]
    
    StoreLLaVA --> PolicyEngine["Deterministic Policy Engine (policy_engine.py)"]
    StoreLocal --> PolicyEngine
    PolicyEngine --> Adjudication["5-Point Compliance Checklist for Human Reviewer"]
```

---

## 2. Distinction of Evidence Sources

| Dimension | Tier 1: Remote LLaVA-1.5-7B LoRA | Tier 2: Local Vision Transformer (ViT-B/16) | Tier 3: Deterministic Rule Engine |
|---|---|---|---|
| **Location** | Dedicated GPU worker / Cloud endpoint | Local CPU (`torch` on `best_vit_model.pt`) | Local Python process |
| **Input** | Chest Radiograph (b64) + Full Notes | Radiograph image array ($224 \times 224 \times 3$) | Raw text strings (`clinical_indication`, `prelim_findings`) |
| **Output Type** | Direct end-to-end multimodal JSON generation | Binary logit probabilities (`normal` vs `abnormal`) | Regex/keyword extraction and grounding verification |
| **ai_source tag** | `REMOTE_LLAVA` | `LOCAL_VIT` | `RULE_ENGINE` |
| **Hardware Required** | $\ge 16$ GB VRAM GPU | Standard CPU (343 MB memory footprint) | Minimal (< 10 MB RAM) |
| **Fabrication Guard** | Never claims LLaVA inference if endpoint is offline | Operates on actual image tensor; does not fabricate text claims | Marked as rule extraction; does not claim neural language generation |

---

## 3. Remote LLaVA Endpoint Configuration

To enable authentic live LLaVA-1.5-7B LoRA multimodal inference without overloading a local CPU laptop:
1. Deploy a GPU instance (RunPod, Lambda, Colab, or vLLM) with:
   - Base model: `llava-hf/llava-1.5-7b-hf`
   - Adapter weights: [`checkpoints_llava/final_adapter/adapter_model.safetensors`](file:///C:/Users/EIS/Downloads/ML%20PROJECT/churn-predict-main/ANVESH/checkpoints_llava/final_adapter/adapter_model.safetensors)
2. Set the following environment variables in your `.env` file:
   ```ini
   LLAVA_ENDPOINT_URL=https://your-gpu-worker-domain/v1/inference
   LLAVA_API_KEY=your_optional_secret_bearer_key
   LLAVA_TIMEOUT_SECONDS=30
   ```
3. If unconfigured or offline, the ANVESH backend automatically marks `remote_llava_status = "UNAVAILABLE"`, falls back to local `ViT-B/16` radiograph classification, and transparently logs the exact reason in `ai_error` and `inference_metadata`.

---

## 4. Stale Evidence Invalidation Protocol

Whenever a user or provider uploads a new radiograph image to an existing submission:
1. `POST /api/submissions/{id}/files` immediately clears `ai_evidence = None` and resets `ai_status = "PENDING"` and `ai_source = "PROCESSING"`.
2. A background worker inspects the newly attached image file.
3. Live forward-pass inference runs on the newest radiograph.
4. Old or precomputed evidence is completely discarded, ensuring the human reviewer only adjudicates evidence derived from the current patient files.

---

## 5. Measured Model Metrics

* **LLaVA-1.5-7B LoRA (Multimodal, IU Open-i Test Cohort $N=422$):**
  * Accuracy: **88.86%** (95% CI: [85.50%, 91.52%])
  * Sensitivity: **83.89%** | Specificity: **93.84%** | Macro $F_1$: **88.83%**
  * Matthews Correlation Coefficient (MCC): **+0.7811**
* **ViT-B/16 (Image-Only Fine-Tuned, IU Open-i Test Cohort $N=422$):**
  * Accuracy: **65.40%** (95% CI: [60.74%, 69.78%])
  * Balanced Accuracy: **65.40%**
  * ROC-AUC: **0.7062**
  * Mean CPU Latency: **17.2 ms**
