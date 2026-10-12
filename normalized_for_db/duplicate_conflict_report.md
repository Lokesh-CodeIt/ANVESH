# MedAuth-VLM: Duplicate & Collision Audit Report

**Project:** MedAuth-VLM  
**Target:** Batches 4, 5, and 6 vs Batches 1–3 and Live PostgreSQL Database  
**Date:** 2026-10-11  

---

## 1. Executive Summary

An exhaustive duplicate and collision audit was conducted across all datasets and live database tables:
- **Internal Duplicates (within Batch 4, 5, or 6):** **0 duplicates**
- **Cross-Batch Collisions (B4, B5, B6 pairwise):** **0 collisions**
- **Collision with Verified Batches 1–3:** **0 collisions**
- **Collision with Live PostgreSQL Database (950 cases):** **0 collisions**

All 1,157 cases scheduled across Batches 4, 5, and 6 represent unique, non-overlapping clinical cases.

---

## 2. Detailed Collision Matrix

| Comparison Pair | Dataset A Count | Dataset B Count | Overlapping Case IDs | Overlap Status |
|---|---|---|---|---|
| **Batch 4 vs Batch 5** | 400 | 357 | 0 | Clean (Isolated) |
| **Batch 4 vs Batch 6** | 400 | 400 | 0 | Clean (Isolated) |
| **Batch 5 vs Batch 6** | 357 | 400 | 0 | Clean (Isolated) |
| **Batch 4 vs DB (Batches 1–3)** | 400 | 950 | 0 | Clean (Append-ready) |
| **Batch 5 vs DB (Batches 1–3)** | 357 | 950 | 0 | Clean (Append-ready) |
| **Batch 6 vs DB (Batches 1–3)** | 400 | 950 | 0 | Clean (Append-ready) |

---

## 3. String-to-Integer Collision Audit in Batch 6

Batch 6 contained string `case_id` values (e.g. `"5"`, `"3989"`). The conversion process was audited:
- **Total records:** 400
- **Valid pure-digit strings:** 400 (100.0%)
- **Ambiguous or non-numeric identifiers:** 0
- **Post-conversion unique integer IDs:** 400 (0 duplicates)
- **Manifest match:** Converted set matches `case_batch_6.json` 100%.

---

## 4. Live Database Protection Policy

The live PostgreSQL table `cases` currently contains 950 rows, and `evidence` contains 950 rows (Batches 1–3).
The importer guarantees:
1. Existing rows are never modified, overwritten, or deleted.
2. In the event an ID match occurs, identical rows will be skipped, and conflicting rows will be quarantined to `quarantine_import_conflicts.json`.
3. Because overlap count is exactly 0, all 1,157 new cases can be appended safely without touching existing records.
