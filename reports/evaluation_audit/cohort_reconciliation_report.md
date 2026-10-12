# MedAuth-VLM: Cohort Accounting & Source-Record Reconciliation Report

**Date:** October 12, 2026  
**Evaluated Cohort:** 2,107 Ingested PostgreSQL Cases  

## 1. Batch Composition & Ingestion Audit
- **Batch 1:** 400 cases, 776 projections, 400 evidence objects, 400 raw outputs.
- **Batch 2:** 300 cases, 578 projections, 300 evidence objects, 300 raw outputs.
- **Batch 3:** 250 cases, 485 projections, 250 evidence objects, 250 raw outputs.
- **Batch 4:** 400 cases, 785 projections, 400 evidence objects, 400 raw outputs.
- **Batch 5:** 357 cases, 695 projections, 357 evidence objects, 357 raw outputs (43 uncomputed cases preserved in recovery manifest).
- **Batch 6:** 400 cases, 774 projections, 400 evidence objects, 0 raw outputs (NULL by design).
- **Total Ingested Corpus:** **2,107 cases**, **4,093 radiograph projections**, **2,107 evidence objects**, **100 CMS policies**, **4 reviews**.

## 2. Projection Distribution by View
- **Frontal Projections (PA / AP):** 2,099 projections (51.28%)
- **Lateral Projections:** 1,994 projections (48.72%)
- **Total Projections:** 4,093 projections

## 3. Projection Count Breakdown per Case
- **2 Images per Case:** 1,751 cases (3,502 images)
- **1 Image per Case:** 244 cases (244 images)
- **3 Images per Case:** 101 cases (303 images)
- **4 Images per Case:** 11 cases (44 images)
- **Sum:** 1,751 + 244 + 101 + 11 = 2,107 cases; 3,502 + 244 + 303 + 44 = 4,093 images. Math is 100% exact.

## 4. Clinical Text Grounding Status
- **Grounded Cases (has_source_text = True):** 2,085 cases (98.96%)
- **Ungrounded Cases (has_source_text = False):** 22 cases (1.04%)
- **Grounding Capping Rate:** 22 / 22 cases capped at <= 40.0.

## 5. Missing Data & Preservation Disclosures
- **Batch 5 Recovery Manifest:** 43 cases preserved in `missing_batch_5_cases.json`. Strictly excluded from DB and evaluation.
- **Batch 6 Raw Output:** 400 cases have `raw_model_output = NULL`. JSONB evidence is complete.
