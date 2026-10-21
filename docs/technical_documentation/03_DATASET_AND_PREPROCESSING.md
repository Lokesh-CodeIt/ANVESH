# ANVESH: Automated Prior-Authorization Verification & Radiographic Grounding Engine
## Technical Documentation — Document 3: Dataset Provenance, Splitting & Preprocessing

---

### 1. Dataset Provenance & Source Collection

The primary clinical imaging and report corpus utilized throughout ANVESH is derived from the **Indiana University (IU) Hospital Chest Radiograph Collection**, made publicly available through the National Library of Medicine (NLM) **Open-i** multimodal biomedical information research service:

- **Primary Source:** Indiana University School of Medicine & National Library of Medicine (NLM / NIH).
- **Collection Identifier:** IU Chest X-Ray Collection (Open-i).
- **Clinical Modality:** Diagnostic Chest Radiography (Posteroanterior [PA], Anteroposterior [AP], and Lateral projections).
- **Clinical Metadata:** Paired dictated radiologist narrative reports containing:
  - `Indication`: Clinical reason for the study (e.g., "Shortness of breath", "Pre-op clearance", "Cough").
  - `Findings`: Discrete radiologist anatomical observations (e.g., "The lungs are clear without focal consolidation.").
  - `Impression`: Final diagnostic summary (e.g., "No acute cardiopulmonary abnormality.").
  - `Problems`: MeSH-indexed diagnostic tag strings (e.g., `normal`, `Cardiomegaly`, `Effusion`).

---

### 2. Dataset Licensing & Usage Restrictions

The Indiana University Open-i chest radiograph collection is distributed by the National Library of Medicine under open research access guidelines:
- **De-Identification Standard:** Fully de-identified in compliance with HIPAA Safe Harbor regulations. All direct Protected Health Information (PHI)—including patient names, medical record numbers (MRNs), dates of birth, and social security numbers—has been stripped and replaced with anonymous study identifiers (`uid`).
- **Research Permissibility:** The dataset is designated for academic, scientific, and open biomedical machine learning benchmarking. Redistribution and derivative benchmark splits (such as `anvesh_dataset` and `anvesh_dataset_image_only`) are permissible under academic fair use with proper citation of the NLM Open-i repository.

---

### 3. Cohort Assembly & The Balanced 2,107-Case Benchmark

#### 3.1 Selection & Artificial Stratification
The raw Indiana University Open-i collection contains 3,955 clinical study reports and 7,470 chest radiographs. In its natural clinical distribution, the prevalence of findings is asymmetric: approximately **35.81% normal** and **64.19% abnormal**.

To construct a balanced benchmark for prior-authorization research and model evaluation, a curated cohort of **$N = 2,107$ cases** (comprising 4,093 radiograph images) was assembled:
- **1,054 Normal Studies (50.02%)**
- **1,053 Abnormal Studies (49.98%)**

> [!IMPORTANT]
> **Clinical Prevalence Caveat:** The artificial 50/50 balance ensures symmetric training gradients and simplifies zero-shot baseline comparison. However, as documented in our independent claims audit, real-world clinical radiology encounters have varying disease prevalence, which directly alters Positive Predictive Value (PPV) and Negative Predictive Value (NPV) in production clinical practice.

---

### 4. Ground-Truth Label Generation Methodology

The reference ground-truth classification (`normal` vs. `abnormal`) was derived from the MeSH-indexed `Problems` metadata and dictated narrative reports:

$$\text{Label} = \begin{cases} \text{normal}, & \text{if } \text{Problems} = \text{"normal"} \land \text{"no acute abnormality"} \in \text{Impression} \\ \text{abnormal}, & \text{if } \text{Problems} \neq \text{"normal"} \lor \text{Pathology keywords detected} \end{cases}$$

#### Known Ground-Truth Heuristic Limitations:
1. **Text Heuristic Noise:** The ground truth was generated using automated text extraction rules without secondary, multi-radiologist panel over-reads.
2. **"No Indexing" Edge Case:** An audit of the cohort revealed that 39 cases in the Indiana University dataset had `Problems == "No Indexing"`. The automated ingestion script defaulted these cases to `abnormal`, even when the dictated narrative text indicated a normal radiograph. This introduces a minor label noise factor of $\approx 1.85\%$ in the ground-truth annotations.

---

### 5. Partitioning & Leakage Prevention Strategy

The $2,107$-case cohort was partitioned into strict training, validation, and held-out test splits using a **70% / 10% / 20%** stratified split:

| Partition | Cases ($N$) | Normal Cases | Abnormal Cases | Percentage | SHA-256 Manifest Checksum |
|---|:---:|:---:|:---:|:---:|---|
| **Training Split** (`train.json`) | **1,474** | 737 (50.0%) | 737 (50.0%) | 69.96% | `c849f51e2a6fd859aa6d6a91d48714d2d93dca91e77400e55e5920ccac712b28` |
| **Validation Split** (`val.json`) | **211** | 106 (50.2%) | 105 (49.8%) | 10.01% | `a98f1040b7c88546617de79a2e06280f61bd2bf6b9c78fd5623dd6844fe6a4c5` |
| **Held-Out Test Split** (`test.json`) | **422** | 211 (50.0%) | 211 (50.0%) | 20.03% | `73ebfaa78d7765bb3b53a94e1b2e2cccf8868f621f0b82270e5a67a1442c685b` |
| **Total Benchmark Cohort** | **2,107** | **1,054** | **1,053** | **100.0%** | `ac767c4540d3353e913da7bb296369365291de38d709799f2e31f7dc132bc9a7` |

#### Leakage Prevention Guarantees:
1. **Zero Partition Case Overlap:** Verified across all three splits:
   $$\text{Train} \cap \text{Val} = \emptyset, \quad \text{Train} \cap \text{Test} = \emptyset, \quad \text{Val} \cap \text{Test} = \emptyset$$
2. **Zero SHA-256 Image Collisions:** Across the 4,093 images, duplicate image content between splits was verified to be exactly **zero**.
3. **Immutability of the Test Cohort:** The $N = 422$ test split was locked during model hyperparameter tuning and decision threshold optimization. Threshold tuning ($\theta^* = 0.5100$) was performed exclusively on the $211$-case validation set.
4. **Patient-Level Separation Limitation:** Because IU Open-i de-identified all patient hospital MRNs and provided only study-level `uid` identifiers, it is impossible to mathematically rule out that longitudinal multi-study follow-ups (e.g., pre-op and post-op studies) belonging to the same patient could exist in both train and test splits. This represents an unresolvable limitation of the underlying public dataset provenance.

---

### 6. Distinguishing Multimodal vs. Pure Image-Only Dataset Representations

The repository contains two distinct dataset directory structures designed for completely different experimental tasks:

#### 6.1 `anvesh_dataset/` (Multimodal / Report-Assisted Conditioning)
- **Task:** Multimodal Prior-Authorization Evidence Extraction & Structuring.
- **Input Content:** Frontal/lateral chest radiograph image **AND** the full dictated radiologist report text (`indication`, `findings`, `impression`).
- **Prompt Architecture:**
  ```text
  You are a radiology assistant. You are given a chest X-ray image AND the radiologist's actual 
  dictated findings/impression below. Your job is to structure this information, not to independently 
  diagnose from the image alone. Base your "image_evidence" on the radiologist's findings...
  ```
- **Role:** Evaluates the VLM's ability to act as a structured extraction agent, compiling unstructured clinical text into verified prior-authorization JSON records.

#### 6.2 `anvesh_dataset_image_only/` (Pure Image-Only Radiographic Classification)
- **Task:** Autonomous Computer Vision Abnormality Detection (Zero Text Leakage).
- **Input Content:** Frontal/lateral chest radiograph pixel array **ONLY**. Zero clinical notes, zero findings, zero indications.
- **Prompt Architecture:**
  ```text
  You are a thoracic radiology AI assistant. Analyze this chest radiograph carefully.
  Determine whether this radiograph shows any cardiopulmonary or thoracic abnormality, or if it is normal.
  Respond ONLY with a valid JSON object: {"classification": "normal" | "abnormal", "findings": [...]}
  ```
- **Role:** Evaluates whether deep neural representations can discern disease directly from pixel contrast without prompt-leaked textual cues.

---

### 7. Image Preprocessing & Augmentation Pipelines

#### 7.1 Vision Transformer (ViT-B/16) Preprocessing (`train_vit_image_only.py`)
- **Spatial Resizing:** Grayscale PNG/JPG images loaded via PIL, converted to 3-channel RGB. Resized to $224 \times 224$ pixels using bilinear interpolation.
- **Normalization:** Standard ImageNet channel-wise normalization:
  $$\mu = [0.485, 0.456, 0.406], \quad \sigma = [0.229, 0.224, 0.225]$$
- **Training Augmentations:** Restrained to preserve anatomical thoracic symmetry:
  - `RandomResizedCrop(224, scale=(0.85, 1.0))`
  - `RandomRotation(degrees=7)` (slight patient rotation modeling)
  - `ColorJitter(brightness=0.1, contrast=0.1)` (scanner exposure variation)
  - *Strict Rule:* No vertical flips (`RandomVerticalFlip` omitted; lungs must remain superior to diaphragm).
- **Validation / Test Preprocessing:** Deterministic `Resize(224, 224)` followed by `CenterCrop(224)` and channel normalization.

#### 7.2 LLaVA-1.5-7B Preprocessing (`train_llava_v2.py`)
- **Vision Encoder Backbone:** CLIP-ViT-L/14-336px.
- **Spatial Resizing:** Processed via `AutoProcessor` with high-resolution patch projection at $336 \times 336$ pixels using bicubic interpolation.
- **Tokenization:** Vicuna BPE tokenizer with subword token mapping:
  - `TOK_ABNORMAL = 370` (`"ab"`)
  - `TOK_NORMAL = 8945` (`"normal"`)
  - Left-padding enforced for batch collation on causal language modeling.

---

### 8. Physical Storage & Missing-Image Audit

- **Full Raw Dataset Storage:** The complete collection of 4,093 raw PNG/JPG image files resided on local scratch storage (`S:\anvesh_ml_cache`) and Google Colab cloud drives during the primary model training runs.
- **Local Repository Inventory:** To maintain a lightweight Git repository footprint, the local workspace houses:
  - Complete JSON split manifests: `anvesh_dataset/{train,val,test}.json` (100% complete, 2,107 entries).
  - Pure image-only manifests: `anvesh_dataset_image_only/{train,val,test}.json` (100% complete, 2,107 entries).
  - Curated demo cohort: `demo_dataset/` (6 sample radiographs in PNG format with clinical notes).
  - Live uploads directory: `uploads/` (47 uploaded PNG radiographs and 9 clinical PDF attachments).
