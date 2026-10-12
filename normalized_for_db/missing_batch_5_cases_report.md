# MedAuth-VLM: Missing Batch 5 Cases Audit Report

**Project:** MedAuth-VLM  
**Scope:** Verification and explicit identification of absent Batch 5 cases  
**Date:** 2026-10-11  

---

## 1. Summary of Reconciliation

- **Expected Cases in Batch 5 Manifest (`case_batch_5.json`):** 400 cases
- **Persisted Inference Records in `evidence_results.json` (Slice 400–756):** 357 cases
- **Missing / Absent Cases:** 43 cases (10.75%)
- **Data Integrity Policy:** Zero fabrication. Missing records are intentionally left absent from `evidence_batch_5.json`. No placeholder records, mock scores, or synthetic outputs have been generated.

---

## 2. Explicit List of Absent Batch 5 Case IDs

The following 43 case IDs are present in the source manifest `case_batch_5.json` but were never completed during inference run:

```json
[
  3524, 3545, 3548, 3553, 3556, 3572, 3577, 3582, 3588, 3608,
  3610, 3611, 3618, 3629, 3630, 3647, 3660, 3678, 3685, 3693,
  3698, 3724, 3734, 3735, 3738, 3763, 3766, 3769, 3772, 3778,
  3786, 3789, 3791, 3799, 3802, 3818, 3865, 3867, 3922, 3947,
  3957, 3988, 3993
]
```

### Analysis of the Missing Range
- All 43 cases correspond to the tail partition of the sequential Batch 5 batch run in Colab (case indices 357 to 399 of the manifest).
- None of these 43 cases have empty source text in `case_batch_5.json`.
- All associated source images (85 image files) exist locally in `AI_PORJECT_DATASET/archive (7)/images/images_normalized` and `AI_PORJECT_DATASET/colab_upload/images_batch_5`.
- A dedicated targeted recovery manifest exists at `AI_PORJECT_DATASET/colab_upload/case_batch_5_recovery_43.json` for future inference recovery if scheduled.

---

## 3. Database Ingestion Handling

- When importing Batch 5 into PostgreSQL, the importer strictly processes only the 357 completed cases.
- The 43 uncomputed case IDs are excluded from insertion into `cases`, `case_images`, and `evidence`.
- This ensures that every row in table `evidence` contains authentic MedGemma-evaluated clinical evidence, maintaining strict database consistency and clinical veracity.
