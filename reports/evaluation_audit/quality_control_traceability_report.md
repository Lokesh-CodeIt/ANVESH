# MedAuth-VLM: Quality Control & Source-to-Table Traceability Report

**Audit Authority:** Senior Healthcare AI Evaluation & Data Auditor  
**Date:** October 2026  
**Repository State:** Verified Live (PostgreSQL 18.6 on x86_64-windows)  
**Mandate:** Zero Synthetic Results. Complete Traceability from Verified Source Records to Deliverable Tables.

---

## 1. Traceability Matrix for the 23 Deliverable Tables

| Table ID & Name | Purpose | Primary Data Source | Cohort / Unit | Denominator | Method | Status |
|---|---|---|---|---|---|:---:|
| **Table 1: Dataset Inventory** | Complete census of database entities | Live PostgreSQL 18 tables | Cases, Images, Evidence, Policies | All ingested records | `COUNT(*)` via SQLAlchemy | **Evaluated** |
| **Table 2: Provenance & Licensing** | Legal, institutional, and ethical provenance | Official dataset documentation | IU Open-i, CMS PUF, MedGemma | 3 primary assets | Bibliographic & license audit | **Evaluated** |
| **Table 3: Cohort Reconciliation** | Batch-wise accounting across Batches 1 to 6 | Ingestion manifests & recovery files | 6 ingestion batches | 2,107 cases, 4,093 images | Manifest & database reconciliation | **Evaluated** |
| **Table 4: Class Distribution** | Evaluate ground-truth class balance | `cases.classification` & IU Reports | 2,107 cases | 1,054 norm, 1,053 abnorm | SQL `GROUP BY classification` | **Evaluated** |
| **Table 5: Split & Leakage Audit** | Disclose cohort partitioning & patient overlap | Case study identifiers & Colab manifests | 2,107 cases | Zero patient cross-leakage | Retrospective single-cohort audit | **Evaluated** |
| **Table 6: Prediction Coverage** | Audit evidence extraction & missing outputs | `evidence` table & raw_model_output | 2,107 evidence records | 1,707 with raw, 400 NULL | Nullability & coverage scan | **Evaluated** |
| **Table 7: Component Readiness** | 10-component validation readiness matrix | Evaluation plan across system tiers | 10 functional components | All architecture tiers | Systematic gap analysis | **Evaluated** |
| **Table 8: Confusion Matrix** | Empirical 2x2 diagnostic classification matrix | IU `Problems` vs. Model `abnormalities` | 2,107 live cases | TN=1040, FP=14, FN=659, TP=394 | `sklearn.metrics.confusion_matrix` | **Evaluated** |
| **Table 9: Cross-Tabulation** | Granular clinical breakdown of matrix quadrants | Real confusion matrix outputs | 2,107 live cases | Proportions over N=2,107 | Cross-tabulation frequency | **Evaluated** |
| **Table 10: Per-Class Report** | Per-class Precision, Recall, F1 for Normal/Abnormal | Indiana University ground truth | 2,107 live cases | 1,054 norm, 1,053 abnorm | `sklearn.metrics.classification_report` | **Evaluated** |
| **Table 11: Overall Metrics** | Overall Accuracy, Specificity, Macro/Weighted F1 | Indiana University ground truth | 2,107 live cases | Accuracy=68.06%, Spec=98.67% | Symbolic metric calculation | **Evaluated** |
| **Table 12: ROC / PR Disclosure** | Disclose absence of continuous probability scores | MedGemma generation format | 2,107 cases | Softmax logits unpersisted | Methodological disclosure | **Not Evaluated** |
| **Table 13: Calibration Disclosure** | Disclose absence of ECE and Brier scores | Model logit distribution | 2,107 cases | Probabilities unpersisted | Methodological disclosure | **Not Evaluated** |
| **Table 14: Evidence Completeness** | Verify completeness of 3-subobject JSON schema | `evidence` table JSONB columns | 2,107 evidence records | 100% field population | Schema field inspection | **Evaluated** |
| **Table 15: Consistency Audit** | Audit model-asserted text-image consistency | `text_image_consistency.consistent` | 2,107 cases | 100% self-asserted True | Field value aggregation | **Evaluated** |
| **Table 16: Policy Retrieval** | Exact primary key indexing of CMS policies | `policies` table | 100 CMS plans | 100% exact key match | Primary key lookup audit | **Evaluated** |
| **Table 17: Policy Rule Execution** | Deterministic score distribution under CMS policies | `policy_engine.py` execution | 2,107 cases | 2,085 score=100, 22 score=40 | Full-cohort policy execution | **Evaluated** |
| **Table 18: Safety Controls** | Verify hard score capping on ungrounded cases | `cases.has_source_text` & review routing | 22 ungrounded cases | 22/22 (100.0%) capped at <= 40 | Policy engine safeguard test | **Evaluated** |
| **Table 19: Schema & Integrity** | Verify relational constraints & SHA-256 hashes | PostgreSQL DDL & checksum files | Database tables & JSON files | 100% constraint conformity | SHA-256 hash & DDL audit | **Evaluated** |
| **Table 20: Performance Benchmark** | Single-core latency, throughput, & Colab baseline | `time.perf_counter()` observations | 2,107 live runs | Mean 0.6317 ms, 1,576.2 c/s | High-resolution monotonic timing | **Evaluated** |
| **Table 21: Failure Analysis** | Categorize false negatives and logging gaps | Case records & error logs | 659 FN, 22 ungrounded, 400 B6 | Detailed error breakdown | Clinical error audit | **Evaluated** |
| **Table 22: Reproducibility** | Automated test suite execution results | Pytest test suite (29 tests) | 29 test fixtures | 29 passed in 9.74s (100%) | `pytest -v` live execution | **Evaluated** |
| **Table 23: Limitations & Roadmap** | Roadmap for prospective clinical validation | Prospective clinical requirements | Radiologist panel & payer truth | 4 primary clinical prerequisites | Methodological synthesis | **Evaluated** |

---

## 2. Removal of Synthetic Test Fixtures from Results
- The previous draft of Chapter 8 contained Table 12 titled *"Controlled Test Fixture Verification Results for Classification and Calibration Metrics"* displaying an artificial 10-case confusion matrix `[[3, 1], [1, 5]]` with synthetic metrics (Accuracy 0.8000, Precision 0.8333, Recall 0.8333, Specificity 0.7500, Macro-F1 0.7917, ECE 0.0000).
- **Quality-Control Action Taken:** In accordance with the non-negotiable rule against synthetic results, this synthetic 10-case fixture has been **completely excised from Chapter 8 (Results)**.
- In its place, Chapter 8 reports the **real empirical confusion matrix on all 2,107 clinical cases**:
  $$\begin{pmatrix} 1040 & 14 \\ 659 & 394 \end{pmatrix}$$
  demonstrating true Accuracy of 68.06%, Specificity of 98.67%, Abnormal Precision of 96.57%, and Abnormal Recall of 37.42%.
- The software formula tests in `test_results_formulas.py` are documented strictly in Chapter 9 (Software Verification) as unit tests of code logic, never as model performance results.

---

## 3. Disclosed Scientific Boundaries
1. **Diagnostic Claims:** MedAuth-VLM demonstrates high operational database fidelity and high precision (96.57%) in extracting explicit abnormality tokens, but cannot claim prospective diagnostic validation without an independent panel of board-certified thoracic radiologists.
2. **Prior Authorization Claims:** MedAuth-VLM demonstrates deterministic rule execution under CMS guidelines, but cannot claim real-world claims approval accuracy without historical payer claims clearinghouse adjudications.
3. **Calibration Claims:** Continuous calibration (ECE, ROC-AUC) is designated as **Not Evaluated** due to the absence of continuous softmax logits.
