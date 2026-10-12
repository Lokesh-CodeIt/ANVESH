# MedAuth-VLM: Real-Data Evaluation & Validation Readiness Audit Report

**Audit Date:** October 12, 2026  
**Auditor:** Senior Medical AI Evaluation & Responsible-AI Review Engineer  
**Repository State:** Verified & Live (PostgreSQL 18.6 on x86_64-windows)  
**Strict Evaluation Mandate:** Zero synthetic results. All metrics derived from verified source data.

---

## 1. Executive Summary
This audit executes a rigorous, real-data evaluation across all components of **MedAuth-VLM**, establishing the boundary between verified operational measurements and prospective clinical efficacy. In compliance with strict scientific integrity protocols:
- The synthetic 10-case test fixture (`[[3, 1], [1, 5]]`) has been **permanently purged** from project results.
- Real-data diagnostic performance is evaluated across all **2,107 clinical cases** from Indiana University Open-i (`indiana_reports.csv` Problems column) vs. `google/medgemma-4b-it` extracted abnormalities.
- Deterministic policy-engine execution is benchmarked live via monotonic high-resolution timing, explicitly distinguishing isolated function latency from batch orchestration overhead.
- All 10 project components are audited against public reference standards, disclosing blockers and prerequisites without fabrication.

---

## 2. Real-Data Diagnostic Evaluation Results (N = 2,107 Cases)
Evaluated at the patient case level against Indiana University transcribed radiologist indexing (`Problems == 'normal'` vs pathology terms):

### Confusion Matrix
| Metric / Dimension | Predicted Normal | Predicted Abnormal | Total Ground Truth |
|---|:---:|:---:|:---:|
| **Actual Normal (IU)** | **1,040 (TN)** | **14 (FP)** | **1,054** |
| **Actual Abnormal (IU)** | **659 (FN)** | **394 (TP)** | **1,053** |
| **Total Predicted** | **1,699** | **408** | **2,107** |

### Verified Classification Metrics
- **Overall Accuracy:** **0.6806** (68.06%) [$N = 2,107$]
- **Normal Specificity:** **0.9867** (98.67%) [1,040 / 1,054]
- **Abnormal Precision (PPV):** **0.9657** (96.57%) [394 / 408]
- **Abnormal Recall / Sensitivity:** **0.3742** (37.42%) [394 / 1,053]
- **Abnormal F1-Score:** **0.5394** (53.94%)
- **Normal F1-Score:** **0.7555** (75.55%)
- **Macro-Averaged F1:** **0.6474** (64.74%)
- **Weighted-Averaged F1:** **0.6475** (64.75%)

### Clinical Interpretation of Findings
1. **Exceptional Specificity & Precision:** When MedGemma extracted an abnormality token, it was correct in **96.57%** of cases, with only 14 false positives across 1,054 normal cases (Specificity: 98.67%).
2. **Moderate Sensitivity:** The model exhibited a sensitivity of **37.42%** (394 TP vs 659 FN). Review of false negatives reveals that MedGemma frequently described subtle radiographic findings in narrative prose (`findings` list) without appending discrete terms to the `abnormalities` subobject list.
3. **Absence of Probabilistic Calibration (ECE / ROC):** Because MedGemma was prompted for structured JSON text generations, continuous softmax logits were not persisted, precluding threshold sweeps and Expected Calibration Error (ECE) calculation.

---

## 3. Policy Engine Execution & Timing Audit
- **Evaluated Sample Size:** 2,107 cases
- **Sum of Individual Timings:** 1,331.0715 ms (1.3311 s)
- **Mean Latency per Case:** **0.6317 ms**
- **Median Latency per Case:** **0.5640 ms**
- **Standard Deviation:** **0.2373 ms**
- **95th Percentile (P95):** **1.0715 ms**
- **99th Percentile (P99):** **1.4332 ms**
- **Total Batch Runtime:** **1.3367 s**
- **Amortized Time per Case:** **0.6344 ms**
- **Single-Core Throughput:** **1,576.2 cases/second**
- **Measurement Overhead Explanation:** The 5.63 ms delta between sum of individual timings ($1.3311$ s) and total batch runtime ($1.3367$ s) represents sequential Python loop iteration, dictionary instantiation, list appending, and SQLAlchemy ORM attribute access (2.67 us per case), as verified in the benchmark implementation.

---

## 4. Grounding Safeguard & Responsible AI Audit
- **Grounded Cases:** 2,085 (98.96%) with source clinical report text.
- **Ungrounded Cases:** 22 (1.04%) with missing clinical report text.
- **Score Capping Enforcement:** 22 / 22 cases (100.0%) capped at $\le 40.0/100$, appending mandatory human escalation warnings.
- **Non-Autonomy Verification:** The platform emits recommendations but never issues legally binding denials.

---

## 5. Summary of Disclosed Blockers (Not Evaluated Tasks)
| Task / Component | Status | Missing Prerequisite | Action Required |
|---|---|---|---|
| ROC-AUC & PR-AUC | Not Evaluated | Continuous softmax logit distributions | Instrument logit capture during VLM generation |
| Expected Calibration Error | Not Evaluated | Posterior probability distributions | Prospective logit capture |
| Independent Entity Span F1 | Not Evaluated | Radiologist span-level annotations | Independent annotation protocol |
| Real Payer Authorization Accuracy | Not Evaluated | Commercial payer claims clearinghouse truth | Health plan clearinghouse partnership under BAA |

