# MedAuth-VLM: Comprehensive Record Validation & Reconciliation Report

**Project:** MedAuth-VLM  
**Scope:** Canonical Schema Validation, Data Integrity, Immutability & Security Audit  
**Date:** 2026-10-11  

---

## 1. Executive Summary

All 1,157 records across Batches 4, 5, and 6 underwent 11 rigorous automated validation checks covering schema conformance, data types, cross-batch isolation, source immutability, deterministic repeatability, and secret leakage prevention.

**Final Status:** **READY FOR DATABASE IMPORT** (with documented limitations for absent Batch 5 cases and unrecorded Batch 6 raw model outputs).

---

## 2. Check-by-Check Results

| # | Validation Check | Status | Details |
|:---:|---|:---:|---|
| **1** | Record Count Reconciliation | **PASS** | Source: 1,157 = Normalized (400 + 357 + 400). Quarantined: 0. |
| **2** | Canonical Schema Conformance | **PASS** | 100% of records conform strictly to `{'case_id', 'evidence', 'raw_model_output'}`. |
| **3** | Integer ID Validity & Uniqueness | **PASS** | All IDs are positive integers; 0 internal duplicates in any batch. |
| **4** | Collision Audit (Cross-Batch & DB) | **PASS** | 0 cross-batch overlaps; 0 collisions with live DB (Batches 1–3, 950 cases). |
| **5** | Preservation of Genuine Raw Outputs | **PASS** | 100% of authentic strings in B4 (400) and B5 (357) preserved without alteration. |
| **6** | Absent Batch 5 Cases Verification | **PASS** | Exactly 43 missing cases verified absent; 0 fabricated records. |
| **7** | Batch 6 Missing Raw & Provenance | **PASS** | B6 `raw_model_output` set to `null`; 400 provenance records preserved. |
| **8** | Evidence JSONB & NOT NULL Types | **PASS** | All 3 JSONB subobjects serialize cleanly and satisfy NOT NULL constraints. |
| **9** | Source File Immutability | **PASS** | SHA-256 hashes of all 10 source files match baseline before and after. |
| **10** | Repeatability & Hash Stability | **PASS** | Multiple independent normalization runs yield bit-for-bit identical hashes. |
| **11** | Security & Secret Leakage Audit | **PASS** | 0 database credentials, API keys, or secrets leaked into output files. |

---

## 3. Output Dataset Artifacts

| Dataset File | Record Count | File Size | SHA-256 Checksum |
|---|:---:|:---:|---|
| `evidence_batch_4.json` | 400 | 748,825 bytes | `9f63567d1d2fe4355ecda9e97c6ffef444b00cb36a7a0ec947514a66d03cf94d` |
| `evidence_batch_5.json` | 357 | 671,555 bytes | `47385fe56fa763c3290b02008da684bc5239a5ca0211516dbba8d98d248bc8fc` |
| `evidence_batch_6.json` | 400 | 392,011 bytes | `b214946aaec55768f5c3a443a5951dcfbce53bce7fb4ff23e449a0f4a8e64cbe` |
| `provenance_batch_6.json` | 400 | 253,965 bytes | `eebad11e9fbf91ee1b2f703eebae087a36cb926ec37db7bb14aa35728373eead` |

---

## 4. Documented Limitations

1. **Batch 5 Incomplete Inference:** 43 cases (IDs 3524 through 3993) were not processed during the initial Colab run. These cases are recorded in `missing_batch_5_cases.json` and `missing_batch_5_cases_report.md` and are intentionally omitted from insertion.
2. **Batch 6 Missing Raw Model Output:** The Batch 6 inference script in Colab omitted writing the `raw_model_output` key. In accordance with database schema rules (`raw_model_output` is `nullable=True`), this field is set to `NULL`. Provenance metadata (clinical indication, radiologist findings/impression, image paths, and timestamps) is preserved in `provenance_batch_6.json`.
