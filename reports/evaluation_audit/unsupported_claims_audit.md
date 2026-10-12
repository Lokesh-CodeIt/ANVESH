# MedAuth-VLM: Independent Audit of Claims and Evidence Status

**Audit Date:** October 11, 2026  
**Auditor:** Independent AI Evaluation & Responsible-AI Review  
**Evaluated Cohort:** N = 2,107 patient cases (PostgreSQL `medauth_vlm`)  
**Status Standard:** Claims are classified strictly into:
- **VALIDATED**: Computationally and empirically verified against raw files, database records, and code artifacts.
- **PARTIALLY VALIDATED**: Validated at software/procedural level, but subject to stated clinical or dataset constraints.
- **NOT VALIDATED**: Unverified, self-reported, lacking external reference standard, or missing empirical instrumentation.

---

## 1. System-Wide Claims Audit Matrix

| Dimension / Claim | Reported Stated Claim | Audited Reality & Provenance | Status | Technical Explanation & Blocker |
|---|---|---|:---:|---|
| **Ground Truth Label Independence** | `Case.classification` is an independent reference ground truth. | Derived via automated text rule: `Problems == 'normal'` vs abnormal terms. | **PARTIALLY VALIDATED** | Ground truth was created independently of model predictions, but it is an unadjudicated text heuristic. 39 cases with `Problems == 'No Indexing'` were labeled abnormal despite normal radiology text. No secondary radiologist over-read was performed. |
| **Cohort Representativeness** | 2,107 cases represent clinical population distribution. | Cohort was artificially balanced (1,054 normal, 1,053 abnormal = 50.02% / 49.98%). | **NOT VALIDATED** | Cohort selection bias: Natural prevalence in Indiana University Open-i is 35.81% normal, 64.19% abnormal. The artificial 50/50 balance skews PPV and NPV relative to real-world clinical practice. |
| **Patient Leakage Prevention** | Zero patient leakage between training and evaluation. | IU Open-i dataset contains study `uid`s only; all patient MRNs/IDs were removed during de-identification. | **NOT VALIDATED** (Unverifiable Limitation) | Without patient identifiers, longitudinal multi-study patient overlap cannot be computed or excluded. Multi-study follow-ups could belong to the same patient. |
| **Live VLM GPU Inference** | Live multimodal VLM inference occurred during system runtime. | Model outputs were generated offline in Google Colab using `google/medgemma-4b-it` and imported via JSON. | **NOT VALIDATED** | No GPU inference scripts, model weights, or live inference execution logs exist in the local project environment. All VLM outputs are precomputed JSON artifacts. |
| **Model Abnormality Extraction Provenance** | `image_evidence.abnormalities` contains valid model extractions. | Traced to original Colab JSON exports; strings parsed directly from MedGemma generations. | **VALIDATED** | Traced through `evidence_cleaned.json`, `evidence_batch_2.json`, `evidence_batch_3.json`, and `evidence_results.json`. Batch 6 has `raw_model_output = NULL` (400 cases) due to Colab export omission, but JSON evidence is verified. |
| **Self-Reported Image-Text Consistency** | MedGemma verified image-text consistency (`consistent: true`). | 2,107 / 2,107 cases (100.0%) report `consistent: true`, even in 22 cases where source text was completely missing. | **NOT VALIDATED** | Self-reported output token from zero-shot prompting. Cannot be treated as independent proof of clinical image-text agreement without paired radiologist discordant over-reads. |
| **Self-Reported Clinical Support** | MedGemma verified clinical indication support (`supported: true`). | 2,107 / 2,107 cases (100.0%) report `supported: true`, even in 22 cases where source text was completely missing. | **NOT VALIDATED** | Self-reported output token without independent clinical justification reference standard. |
| **Policy Recommendation Accuracy** | Policy engine accurately determines clinical prior authorization approvals/denials. | Engine evaluates deterministic Python rules over 100 CMS PUF plans (`is_covered = 'Covered'`, `exclusions = None`). | **NOT VALIDATED** | No paired dataset of real payer prior authorization clearinghouse adjudications (approvals, denials, clinical guideline criteria) exists in the project. Database lookup success is not clinical authorization accuracy. |
| **Spatial Bounding-Box Grounding** | Model outputs are grounded to image pathology regions. | MedGemma was prompted for text JSON; no spatial bounding boxes, heatmaps, or coordinate masks were generated. | **NOT VALIDATED** | Model does not produce spatial coordinates. However, software grounding safeguard (score capping at $\le 40/100$ when text is missing) is validated in code for 22/22 cases. |
| **End-to-End Sub-Second Latency** | System achieves sub-second total clinical turnaround time. | 0.63 ms is strictly Python policy engine rule evaluation on CPU; does not include VLM image tokenization and inference. | **PARTIALLY VALIDATED** | Policy engine latency (mean 0.6317 ms, throughput 1,576 cases/sec) is verified from 2,107 recorded observations in `recorded_latencies.csv`. However, claims of end-to-end sub-second turnaround must explicitly exclude VLM GPU inference. |
| **Diagnostic Sensitivity & Specificity** | Specificity 98.67%, Sensitivity 37.42%, Accuracy 68.06%. | Recomputed directly from case-level manifest `audit_case_manifest.csv` (TP=394, FP=14, FN=659, TN=1,040). | **VALIDATED** | Exact match with verified dataset. 95% Wilson score confidence intervals calculated: Accuracy [66.04%, 70.02%], Sensitivity [34.54%, 40.38%], Specificity [97.78%, 99.21%]. |
| **Database Schema & Key Integrity** | 2,107 cases and 4,093 images match Indiana University Open-i source. | 2,107 / 2,107 `case_id` match IU `uid` (100.0%). 4,093 / 4,093 image filenames and views match IU projections (100.0%). | **VALIDATED** | Zero key mismatches, zero duplicate mappings, zero dangling foreign keys across PostgreSQL tables. |

---

## 2. Itemized List of Unsupported or Unvalidated Claims

The following specific claims must be flagged, retracted, or recontextualized across project documentation and publications:

1. **CLAIM: "High clinical authorization accuracy across commercial health plans"**
   - **AUDIT VERDICT: NOT VALIDATED**
   - **Reason:** The database contains 100 sample CMS individual market plans where all benefits are listed as "Covered" with no exclusion strings. There is zero ground-truth data from commercial payer claims adjudication systems (e.g., Change Healthcare, Availity, Epic Care-Link). MedAuth-VLM tests internal deterministic rule evaluation, not real payer agreement.

2. **CLAIM: "Multimodal consistency verified in 100% of evaluated cohort"**
   - **AUDIT VERDICT: NOT VALIDATED**
   - **Reason:** The value `consistent: true` is an uncalibrated text token generated by MedGemma under instruction prompting. It was returned as `true` in 100% of cases, including the 22 cases where source clinical notes were empty. Treating this self-reported flag as clinical proof is a scientific validity error.

3. **CLAIM: "Clinical indication support verified in 100% of cases"**
   - **AUDIT VERDICT: NOT VALIDATED**
   - **Reason:** The flag `supported: true` is also a self-reported model token without independent physician over-read.

4. **CLAIM: "Spatial grounding of chest pathologies"**
   - **AUDIT VERDICT: NOT VALIDATED**
   - **Reason:** MedGemma JSON generations contain no bounding boxes, segmentation masks, or coordinate tuples `[ymin, xmin, ymax, xmax]`. The project evaluates text evidence grounding, not spatial image grounding.

5. **CLAIM: "Continuous ROC-AUC, PR-AUC, and ECE Calibration"**
   - **AUDIT VERDICT: NOT VALIDATED (NOT EVALUATED)**
   - **Reason:** Precomputed JSON artifacts stored only discrete text tokens, discarding continuous softmax logits and token probabilities. Threshold sweeps and Expected Calibration Error cannot be computed without re-running inference with logit instrumentation.

6. **CLAIM: "Sub-second end-to-end multimodal turnaround"**
   - **AUDIT VERDICT: PARTIALLY VALIDATED (MISATTRIBUTED SCOPE)**
   - **Reason:** The recorded latency of 0.63 ms / case measures purely in-memory Python policy engine rule evaluation. End-to-end VLM processing on GPU takes 1.5–5.0 seconds per case. The narrative must never claim end-to-end multimodal turnaround occurs in sub-milliseconds.
