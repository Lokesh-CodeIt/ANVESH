# Phase 2 Audit Report: Manifests and Case Coverage Verification

**Project:** MedAuth-VLM  
**Audit Date:** 2026-10-11  
**Scope:** Phase 2 — Verify Manifests and Case Coverage  

---

## 1. Manifest Counts, Duplicates, and Cross-Batch Isolation

Independent inspection of `case_batch_4.json`, `case_batch_5.json`, `case_batch_6.json` (and their corresponding `.zip` archives):

| Batch | Expected Cases | Unique Case IDs | Duplicate IDs | Cross-Batch Overlaps | Archive Manifest Sync |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **Batch 4** | 400 | 400 | 0 | 0 with Batches 1–6 | 100% Identical |
| **Batch 5** | 400 | 400 | 0 | 0 with Batches 1–6 | 100% Identical |
| **Batch 6** | 400 | 400 | 0 | 0 with Batches 1–6 | 100% Identical |
| **Total** | **1,200** | **1,200** | **0** | **0** | **Verified** |

---

## 2. Source Image Availability

Every case in each manifest references image filenames. The filesystem was verified for image availability:

- **Batch 4:** 782 images required $\rightarrow$ 0 missing in `archive (7)/images_normalized/`, 0 missing in `colab_upload/images_batch_4/`.
- **Batch 5:** 785 images required $\rightarrow$ 0 missing in `archive (7)/images_normalized/`, 0 missing in `colab_upload/images_batch_5/`.
- **Batch 6:** 770 images required $\rightarrow$ 0 missing in `archive (7)/images_normalized/`, 0 missing in `colab_upload/images_batch_6/`.
- **Image Integrity:** **100% of all required source images exist locally**.

---

## 3. Independent Recomputation of `evidence_results.json` Coverage

Comparison of `evidence_results.json` (1,157 records) against the manifests:

| Batch | Expected Cases | Matched Result Cases | Missing Cases | Match Rate |
|:---:|:---:|:---:|:---:|:---:|
| **Batch 4** | 400 | 400 | 0 | **100.0%** |
| **Batch 5** | 400 | 357 | 43 | **89.25%** |
| **Batch 6** | 400 | 400 | 0 | **100.0%** |
| **Total** | **1,200** | **1,157** | **43** | **96.42%** |

---

## 4. Recomputed List of Missing Batch 5 Cases

The 43 cases were verified by set subtraction `manifests[5] - set(evidence_results.json_cids)`. They represent the final 43 sequential cases of `case_batch_5.json`:

```json
[
  3524, 3545, 3548, 3553, 3556, 3572, 3577, 3582, 3588, 3608,
  3610, 3611, 3618, 3629, 3630, 3647, 3660, 3678, 3685, 3693,
  3698, 3724, 3734, 3735, 3738, 3763, 3766, 3769, 3772, 3778,
  3786, 3789, 3791, 3799, 3802, 3818, 3865, 3867, 3922, 3947,
  3957, 3988, 3993
]
```

* **Source Image Availability for Missing Cases:** All 85 associated images for these 43 cases are verified present in `AI_PORJECT_DATASET/archive (7)/images/images_normalized/` and `AI_PORJECT_DATASET/colab_upload/images_batch_5/`.
* **Empty-Source Cases:** None of the 43 missing cases have empty clinical text (all 3 empty-source cases in Batch 5 are already in the 357 completed records).

---

## 5. Phase 2 Safety Confirmation

- All manifests are mutually consistent and non-conflicting.
- Case ID mapping is 100% unambiguous.
- Ready to proceed to **Phase 3 (Recover Missing Batch 5 Cases)**.
