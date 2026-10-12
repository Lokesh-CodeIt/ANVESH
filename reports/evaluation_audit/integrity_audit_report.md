# Independent Integrity Audit Report: MedAuth-VLM (N = 2,107 Cohort)

**Audit Date:** October 11, 2026 (Final Independent Pre-Publication Integrity Audit)  
**Auditor:** Independent AI Evaluation & Responsible-AI Review Engineer  
**Repository State:** PostgreSQL 18.6 Live Database (`medauth_vlm`), Windows x86_64  
**Evaluated Cohort Denominator:** Exactly **2,107** patient cases  
**Audit Purpose:** Final independent pre-publication integrity audit of data traceability, model provenance, ground-truth independence, classification metrics, policy engine rules, and engineering claims across all monograph deliverables.

---

## 1. Traceability & Key Matching Audit (Requirement 1)

Every evaluated case in the active PostgreSQL database (`cases` table) was independently traced back to the original Indiana University Open-i source dataset files: `indiana_reports.csv` and `indiana_projections.csv`.

### Key Tracing Summary
- **Case Identifier Mapping:** Exact 1-to-1 matching key: `Case.case_id == indiana_reports.uid` (integer comparison).
- **Total Database Cases Evaluated:** **2,107**
- **Exact Matches Found in `indiana_reports.csv`:** **2,107 / 2,107 (100.0%)**
- **Unmatched Cases:** **0**
- **Duplicate Database Keys:** **0**
- **Ambiguous Mappings:** **0**

### Radiograph Image & Projection Tracing
Every image record in `case_images` was traced against `indiana_projections.csv`:
- **Total Images in PostgreSQL:** **4,093** (Mean: 1.94 images per case)
- **Frontal Projections:** **2,099**
- **Lateral Projections:** **1,994**
- **Exact Filename and Projection Matches in `indiana_projections.csv`:** **4,093 / 4,093 (100.0%)**
- **Projection View Discrepancies:** **0**

### Ground-Truth Creation Mechanism & Flaws
> [!CAUTION]
> `Case.classification` was **not** established as an independent radiologist over-read within this project. It was generated programmatically during batch preparation (`prepare_colab_batch.py` and `prepare_next_batch.py`) via the automated string rule:
> ```python
> is_normal = reports['Problems'].astype(str).str.strip().str.lower() == 'normal'
> classification = 'normal' if is_normal else 'abnormal'
> ```

#### Critical Ground-Truth Label Flaws Discovered:
1. **The "No Indexing" Misclassification:**
   - In Indiana University Open-i, when the automated/manual MeSH annotator did not assign an index code, the field contains `"No Indexing"`.
   - In the evaluated 2,107 cohort, **39 cases** have `Problems == 'No Indexing'`.
   - Because `"no indexing" != "normal"`, all 39 cases were assigned `Case.classification = 'abnormal'`.
   - Audit inspection of the actual radiologist `impression` and `findings` for these cases reveals that several are entirely normal (e.g., UID 125 *"Normal chest"*, UID 150 *"Normal exam"*, UID 179 *"No acute cardiopulmonary disease"*).
2. **Non-Pathological and Incidental Terms in `Problems`:**
   - Indiana University MeSH terms contain anatomical sites (e.g., `Lung` [40 cases], `Spine` [22 cases], `Thoracic Vertebrae` [21 cases]) and incidental structural variations (e.g., `Scoliosis` [15 cases], `Calcinosis` [17 cases], healed `Fractures, Bone` [10 cases]).
   - These cases were uniformly mapped to `abnormal`, even when acute pulmonary parenchymal findings were absent.

---

## 2. Prediction Provenance & Inference Audit (Requirement 2)

Every predicted label was traced back to original JSON inference artifacts exported from Google Colab.

### Batch-Level Provenance Trace
| Batch | Cohort UID Span | Cases | Source Inference Artifact | Preprocessing & Execution Environment | `raw_model_output` Status |
|---|---|:---:|---|---|:---:|
| **Batch 1** | UIDs 67–3996 | 150 | `AI_PORJECT_DATASET/precomputed_evidence/evidence_cleaned.json` | Google Colab, `google/medgemma-4b-it` (Offline) | Verified Text String |
| **Batch 2** | UIDs 8–3960 | 400 | `AI_PORJECT_DATASET/precomputed_evidence/evidence_batch_2.json` | Google Colab, `google/medgemma-4b-it` (Offline) | Verified Text String |
| **Batch 3** | UIDs 1–3977 | 400 | `AI_PORJECT_DATASET/precomputed_evidence/evidence_batch_3.json` | Google Colab, `google/medgemma-4b-it` (Offline) | Verified Text String |
| **Batch 4** | UIDs 3–3998 | 400 | `normalized_for_db/evidence_batch_4.json` (from `evidence_results.json`) | Google Colab, `google/medgemma-4b-it` (Offline) | Verified Text String |
| **Batch 5** | UIDs 15–3518 | 357 | `normalized_for_db/evidence_batch_5.json` (from `evidence_results.json`) | Google Colab, `google/medgemma-4b-it` (Offline) | Verified Text String (43 uncomputed cases excluded) |
| **Batch 6** | UIDs 5–3989 | 400 | `normalized_for_db/evidence_batch_6.json` (from `evidence_results.json`) | Google Colab, `google/medgemma-4b-it` (Offline) | **NULL (Omitted in Colab Export; 200 normal/200 abnormal, seed=48)** |
| **TOTAL** | — | **2,107** | — | — | **1,707 Verified / 400 NULL** |

### Live Inference Status
- **NO LIVE VLM INFERENCE OCCURRED ON THE LOCAL SYSTEM.**
- The local Windows environment contains zero model weights, zero PyTorch/HuggingFace GPU inference pipelines, and zero live inference logs.
- All MedGemma executions occurred remotely in Google Colab notebooks using zero-shot instruction prompting. The structured JSON outputs were downloaded and normalized.
- Any claim that the local web application or test suite runs live deep learning inference is **REFUTED**.

### Provenance of `image_evidence.abnormalities`
- `image_evidence.abnormalities` contains **actual model-generated strings** parsed from MedGemma's JSON output (e.g., `"Aortic ectasia/tortuosity"`, `"Right basilar atelectasis"`).
- It does **not** contain seeded random data or hand-crafted dummy text.
- **Root Cause of High False Negatives (FN = 659):** In 659 abnormal cases, MedGemma documented abnormal clinical observations inside the narrative `findings` list (e.g., *"mild cardiomegaly"*, *"scattered calcified granulomas"*), but emitted an empty list `[]` for `abnormalities`. Because the binary prediction was defined as:
  ```python
  predicted = 'abnormal' if len(image_evidence['abnormalities']) > 0 else 'normal'
  ```
  these cases were classified as `normal`, producing a low sensitivity of **37.42%**.

---

## 3. Ground-Truth Independence, Cohort Bias, & Leakage (Requirement 3)

### Ground-Truth Independence
- Ground-truth labels (`Case.classification`) were extracted from Indiana University Open-i transcript metadata prior to and completely separate from MedGemma inference. Model predictions did not inform ground-truth label generation.

### Cohort Selection Bias
- **Enforced 50/50 Balance:** Sampling scripts (`prepare_colab_batch.py` and `prepare_next_batch.py`) deliberately enforced a 50/50 balance in each batch.
  - Normal cases evaluated: **1,054 (50.02%)**
  - Abnormal cases evaluated: **1,053 (49.98%)**
- **Natural Population Prevalence:** In the complete Indiana University Open-i archive (3,851 total cases):
  - Normal cases: **1,379 (35.81%)**
  - Abnormal / Unindexed cases: **2,472 (64.19%)**
- **Impact:** Enforcing an artificial 50% prevalence alters clinical Positive Predictive Value (PPV) and Negative Predictive Value (NPV). In the true population (64.2% abnormal), NPV would be lower and PPV higher.

### Patient Leakage & Multi-Study Analysis
- **De-identification Limitation:** The Indiana University Open-i dataset stripped all patient Medical Record Numbers (MRNs) and patient IDs. Only study-level `uid`s are provided.
- **Unverifiable Limitation:** It is scientifically impossible to determine whether separate `uid` records belong to the same patient undergoing follow-up imaging. Cross-study patient leakage cannot be conclusively proved or refuted.

### Missing Clinical Reports
- **22 cases (1.04%)** in the evaluated cohort have `has_source_text == False` (both `findings` and `impression` were empty strings in the raw dataset).
- Despite missing text, MedGemma precomputed outputs for all 22 cases reported `consistent: true` and `supported: true`, underscoring that these self-reported flags are ungrounded model outputs.

---

## 4. Independent Recomputation of Confusion Matrix & Metrics (Requirement 4)

All classification metrics were recomputed from the verified case-level manifest ([`audit_case_manifest.csv`](file:///C:/Users/NILESH%20MARATHE/OneDrive/Desktop/AI%20PORJECT/reports/evaluation_audit/audit_case_manifest.csv)) containing **2,107 valid rows**.

### Evaluated Denominator & Exclusions
- **Total Database Records:** 2,107 cases
- **Excluded Cases:** Exactly **43 cases** from Batch 5 (UIDs 3601–4000 range) were uncomputed in Colab and were excluded from database ingestion. They are recorded in `normalized_for_db/missing_batch_5_cases.json`.
- **Evaluated Denominator:** **N = 2,107**

### Class Mapping
- **Positive Class:** `abnormal`
- **Negative Class:** `normal`
- **Decision Rule:** `predicted = 'abnormal' if len(abnormalities) > 0 else 'normal'`

### Independent Confusion Matrix
| Reference Class (Indiana University) | Predicted Normal | Predicted Abnormal | Total Ground Truth |
|---|:---:|:---:|:---:|
| **Actual Normal** | **1,040 (TN)** | **14 (FP)** | **1,054** |
| **Actual Abnormal** | **659 (FN)** | **394 (TP)** | **1,053** |
| **Total Predicted** | **1,699** | **408** | **2,107** |

### Verified Classification Metrics & 95% Wilson Score Intervals
| Metric | Formula | Exact Value | Rounded | 95% Wilson Confidence Interval |
|---|---|:---:|:---:|:---:|
| **Standard Accuracy** | $(TP + TN) / N$ | $1,434 / 2,107$ | **68.06%** | [66.04%, 70.02%] |
| **Balanced Accuracy** | $(\text{Sensitivity} + \text{Specificity}) / 2$ | $(0.374169 + 0.986717) / 2$ | **68.04%** | — |
| **Sensitivity (Recall - Abnormal)** | $TP / (TP + FN)$ | $394 / 1,053$ | **37.42%** | [34.54%, 40.38%] |
| **Specificity (Recall - Normal)** | $TN / (TN + FP)$ | $1,040 / 1,054$ | **98.67%** | [97.78%, 99.21%] |
| **Precision (PPV - Abnormal)** | $TP / (TP + FP)$ | $394 / 408$ | **96.57%** | [94.32%, 97.95%] |
| **NPV (Precision - Normal)** | $TN / (TN + FN)$ | $1,040 / 1,699$ | **61.21%** | [58.87%, 63.50%] |
| **F1-Score (Abnormal)** | $2 \cdot TP / (2 \cdot TP + FP + FN)$ | $788 / 1,461$ | **53.94%** | — |
| **F1-Score (Normal)** | $2 \cdot TN / (2 \cdot TN + FP + FN)$ | $2,080 / 2,753$ | **75.55%** | — |
| **Macro-Averaged F1** | $(F1_{\text{abnormal}} + F1_{\text{normal}}) / 2$ | $(0.539357 + 0.755539) / 2$ | **64.74%** | — |
| **Weighted-Averaged F1** | $(N_{\text{abn}} \cdot F1_{\text{abn}} + N_{\text{norm}} \cdot F1_{\text{norm}}) / N$ | $(1053 \cdot 0.5394 + 1054 \cdot 0.7555) / 2107$ | **64.75%** | — |

> [!NOTE]
> **Distinction Between Ordinary and Balanced Accuracy:**
> Ordinary Accuracy ($68.06\%$) and Balanced Accuracy ($68.04\%$) are almost identical because the cohort was artificially balanced ($50.02\%$ normal vs $49.98\%$ abnormal). In an unselected clinical population with $64.2\%$ abnormal prevalence, ordinary accuracy would drop to $\sim 59.4\%$ due to the high false negative rate.

---

## 5. Audit of Other System Claims (Requirement 5)

### 1. Policy-Engine Rule Correctness
- **Finding:** **VALIDATED (AT SOFTWARE LEVEL)**
- The engine (`policy_engine.py`) executes pure deterministic Python rule logic over in-memory and ORM structures.
- Logic verified:
  - Checklist evaluation correctly tests `is_covered`, exclusions regex overlap, and source text presence.
  - Evidence score formula: $\text{Base} = 40 (\text{consistent}) + 40 (\text{supported}) + 20 (\text{covered})$.
  - Grounding safety cap: when `has_source_text == False`, score is deterministically capped at $\le 40.0/100$, and recommendation is overridden to `"Unverified AI evidence — no original clinical report available for grounding. Requires manual review."`

### 2. Policy Retrieval & Recommendation Accuracy
- **Finding:** **NOT VALIDATED**
- The database contains 100 sample policies from CMS Health Insurance Exchange PUFs. All 100 policies have `is_covered = 'Covered'` and `exclusions = None`.
- Database lookup success confirms SQL query execution, but does **not** prove clinical prior authorization recommendation accuracy.
- There is no external reference truth from commercial payer clearinghouses (e.g., Availity, Change Healthcare).

### 3. Spatial Image Grounding
- **Finding:** **NOT VALIDATED**
- MedGemma outputs text strings only. No bounding box coordinates (`[ymin, xmin, ymax, xmax]`), heatmaps, or segmentation masks exist in the database or source files.
- Spatial grounding claims are unvalidated due to absent model coordinates.

### 4. Self-Reported Image-Text Consistency & Support
- **Finding:** **NOT VALIDATED**
- In all 2,107 database cases (100.0%), `text_image_consistency.consistent == True` and `clinical_support.supported == True`.
- Even for the 22 cases with zero clinical text, the model emitted `consistent: True`.
- These are self-reported model outputs under zero-shot generation, not verified clinical ground truth.

### 5. Safety Routing & Non-Autonomy
- **Finding:** **VALIDATED (AT ARCHITECTURE LEVEL)**
- Software architecture enforces strict non-autonomy: system outputs are advisory recommendations only; denials cannot be legally issued by the platform.
- Mandatory human review escalation triggers on all capped or flagged cases.

### 6. Schema Integrity
- **Finding:** **VALIDATED**
- PostgreSQL database integrity confirmed across all 4 core tables: `cases` (2,107), `case_images` (4,093), `evidence` (2,107), `policies` (100).
- Foreign keys, CASCADE constraints, and Alembic migrations fully validated.

### 7. Performance & Latency Benchmarks
- **Finding:** **VALIDATED (POLICY ENGINE ONLY)**
- Recomputed from 2,107 individual observations in `reports/medauth_vlm_results/recorded_latencies.csv`:
  - **Mean Latency per Case:** **0.6317 ms**
  - **Median Latency per Case:** **0.5640 ms**
  - **P95 Latency:** **1.0715 ms**
  - **P99 Latency:** **1.4332 ms**
  - **Total Batch Runtime:** **1.3367 s**
  - **Single-Core Throughput:** **1,576.2 cases/second**
- This benchmark measures local Python policy-engine execution on CPU. It does **not** measure end-to-end multimodal GPU inference.

---

## 6. Final Pre-Publication Domain Verification Summary

Per the final pre-publication integrity audit protocols, system achievements and evaluation outcomes are strictly separated into five distinct analytical domains:

### Domain A: Verified Data Integrity & Cross-Document Consistency
- **Traceability:** 2,107 database cases map 1-to-1 to Indiana University Open-i study UIDs.
- **Image & Projection Counts:** Exactly 4,093 images across 2,107 cases: **2,099 Frontal** and **1,994 Lateral** (verified across PostgreSQL `case_images`, `indiana_projections.csv`, and all tables in MD, DOCX, and PDF).
- **Batch 6 Provenance:** Verified against `prepare_next_batch.py` (lines 74–97; `random_seed = 42 + 6 = 48`) and `case_batch_6.json`: exactly 400 cases (200 normal, 200 abnormal; UID span: 5 to 3989). UIDs are sparsely distributed across the unseeded pool rather than a contiguous slice; exactly six cases fall in the interval 3801–3851: UIDs `[3801, 3804, 3805, 3820, 3827, 3842]` (UID 3829 belongs to Batch 4; UID 3833 belongs to Batch 3).
- **Missingness & Exclusions:** Exactly 43 Batch 5 cases are preserved in `case_batch_5_recovery_43.json` and excluded from the 2,107 evaluated cohort. Exactly 400 Batch 6 cases have `raw_model_output = NULL`. Exactly 22 cases lack report text (`has_source_text == False`; verified UIDs: 16, 614, 673, 894, 1137, 1147, 1293, 1297, 1536, 1566, 1615, 1690, 1761, 1778, 2115, 2601, 2697, 2765, 2881, 3434, 3782, 3973).
- **Deliverable Synchronization:** Markdown, DOCX (641 KB, 15 tables), and PDF (33 pages, 15 tables, 5 embedded figures, 0 empty pages) are 100% synchronized in content, counts, and metrics.

### Domain B: Automated Software Verification (Tests Passed)
- **Test Command:** `python -m pytest -v`
- **Exit Code:** `0` (Success)
- **Result:** **29 passed in 2.15 seconds**
- **Scope:** Software unit and regression tests asserting mathematical formula implementations, ORM models, zero-division safety, and REST endpoint contracts. These software tests assert code correctness and do **not** constitute clinical validation.

### Domain C: Exploratory Retrospective Metrics against Heuristic Labels
- **Reference Cohort:** Indiana University Open-i (`indiana_reports.csv`, $N = 2,107$ cases; 1,054 Normal, 1,053 Abnormal).
- **Reference Label Nature:** Retrospective automated text heuristic (`Problems == 'normal'`), subject to 39 unindexed MeSH cases mapped to abnormal and artificial 50/50 class balancing.
- **Confusion Matrix:** $\text{TP} = 394, \quad \text{FP} = 14, \quad \text{FN} = 659, \quad \text{TN} = 1,040$.
- **Empirical Metrics:**
  - Ordinary Accuracy: **68.06%** ($1,434 / 2,107$) [95% CI: 66.04%, 70.02%]
  - Balanced Accuracy: **68.04%** ($(0.3742 + 0.9867) / 2$)
  - Abnormality Specificity: **98.67%** ($1,040 / 1,054$) [95% CI: 97.78%, 99.21%]
  - Abnormality Sensitivity: **37.42%** ($394 / 1,053$) [95% CI: 34.54%, 40.38%]
  - Abnormality Precision (PPV): **96.57%** ($394 / 408$) [95% CI: 94.32%, 97.95%]
  - Negative Predictive Value (NPV / Normal-Class Precision): **61.21%** ($1,040 / 1,699$) [95% CI: 58.87%, 63.50%]
  - Abnormal F1: **53.94%** ($788 / 1,461$)
  - Normal F1: **75.55%** ($2,080 / 2,753$)
  - Macro-Averaged F1: **64.74%** (calculated from full precision: $(0.5393566 + 0.7555394)/2 = 0.6474480 \rightarrow 64.74\%$)
  - Prevalence-Weighted F1: **64.75%** ($(1053 \cdot 0.5393566 + 1054 \cdot 0.7555394)/2107 = 0.6474993 \rightarrow 64.75\%$)

### Domain D: Modelled Natural-Prevalence Projection
- **Formula:** $\text{Acc}_{\text{projected}} = (394/1053 \times 2472/3851) + (1040/1054 \times 1379/3851) = 0.240183 + 0.353333 = \mathbf{59.35\%}$ ($\sim 59.4\%$).
- **Status:** **Modelled natural-prevalence estimate; NOT observed test-set performance.**
- **Assumptions:** (i) Unselected Indiana University collection prevalence ($64.19\%$ abnormal, $35.81\%$ normal) reflects target population; (ii) sensitivity and specificity remain invariant across prevalence shifts.
- **Constraint:** Balanced-cohort confidence interval ($[66.04\%, 70.02\%]$) must not be applied to this projection.

### Domain E: Clinical & Real-World Performance (NOT VALIDATED)
- **Clinical Diagnostic Efficacy:** **NOT VALIDATED** (no prospective panel over-read).
- **Commercial Payer Adjudication Accuracy:** **NOT VALIDATED** (CMS PUF sample policies only; no clearinghouse ground truth).
- **Self-Reported Model Flags (`consistent`, `supported`):** **NOT VALIDATED** (zero-shot model self-reports; emitted `true` in 100% of cases including missing text).
- **Spatial Bounding-Box Grounding:** **NOT VALIDATED** (no coordinates generated).
- **Continuous Calibration (ECE, ROC-AUC):** **NOT EVALUATED** (softmax logits not persisted).

---

## 7. Audit Artifacts Produced

The following audit deliverables are maintained in `reports/evaluation_audit/`:
1. [`audit_case_manifest.csv`](file:///C:/Users/NILESH%20MARATHE/OneDrive/Desktop/AI%20PORJECT/reports/evaluation_audit/audit_case_manifest.csv): Complete machine-readable case manifest with 2,107 rows linking case_id, IU uid, batch provenance, raw Problem strings, projection counts, model tokens, predictions, and evaluation outcomes.
2. [`integrity_audit_report.md`](file:///C:/Users/NILESH%20MARATHE/OneDrive/Desktop/AI%20PORJECT/reports/evaluation_audit/integrity_audit_report.md): This comprehensive audit document.
3. [`unsupported_claims_audit.md`](file:///C:/Users/NILESH%20MARATHE/OneDrive/Desktop/AI%20PORJECT/reports/evaluation_audit/unsupported_claims_audit.md): Systematic breakdown of validated vs. unvalidated claims.
