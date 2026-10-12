# MedAuth-VLM: Quarantine Audit Report

**Project:** MedAuth-VLM  
**Scope:** Batches 4, 5, and 6 Normalization and Import Pipeline  
**Date:** 2026-10-11  

---

## 1. Quarantine Criteria

Under the MedAuth-VLM Data Governance Protocol, a record must be quarantined (rather than invented, coerced, or discarded) if it exhibits any of the following flaws:
1. Missing or unparseable `case_id`.
2. Duplicate `case_id` within the batch.
3. Missing top-level `evidence` object or non-dictionary type.
4. Missing required subobjects (`image_evidence`, `text_image_consistency`, `clinical_support`).
5. Invalid child fields (e.g. non-string `modality`/`body_part`, non-list `findings`/`abnormalities`, non-bool `consistent`/`supported`).
6. ID collision with conflicting attributes against existing database records.

---

## 2. Audit Results

| Dataset | Total Records Evaluated | Valid Canonical Records | Quarantined Records | Reason / Issues |
|---|---|---|---|---|
| **Batch 4** | 400 | 400 | **0** | All records valid and complete |
| **Batch 5** | 357 | 357 | **0** | All records valid and complete |
| **Batch 6** | 400 | 400 | **0** | All records valid and complete |
| **Total** | **1,157** | **1,157** | **0** | **0 Quarantine Exceptions** |

---

## 3. Database Dry-Run Quarantine Findings

During the transaction-safe database dry run against live PostgreSQL table constraints:
- **Foreign Key Violations:** 0
- **Not-Null Constraint Violations:** 0
- **Type Casting Violations (JSONB / Integer):** 0
- **Existing Row Conflicts:** 0
- **Quarantined on Import:** **0 records**

---

## 4. Policy for Future Runs

Should future batches encounter corrupt or truncated evidence records, the importer will automatically isolate the suspect record into `quarantine_report.json` with its exact index, raw payload, and failure diagnostics, aborting write for that record without interrupting compliant records.
