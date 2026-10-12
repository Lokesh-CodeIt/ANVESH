# Phase 1 Audit Report: Canonical Inference Result Schema & Format Comparison

**Project:** MedAuth-VLM  
**Audit Date:** 2026-10-11  
**Scope:** Phase 1 — Inspect and Define Canonical Schema  
**Target:** Standardize Batches 4–6 against verified Batches 1–3 pipeline  

---

## 1. Inventory of Result Files in `precomputed_evidence/`

| Batch | File Name | Total Records | File Size | Format Style |
|:---:|---|:---:|:---:|---|
| **Batch 1** | `evidence_cleaned.json` | 150 | 276,009 bytes | Standalone batch array |
| **Batch 2** | `evidence_batch_2.json` | 400 | 735,212 bytes | Standalone batch array |
| **Batch 3** | `evidence_batch_3.json` | 400 | 739,764 bytes | Standalone batch array |
| **Batches 4–6** | `evidence_results.json` | 1,157 | 1,994,790 bytes | Combined array (B4: 400, B5: 357, B6: 400) |

*Batches 1, 2, and 3 are stored in **separate files** per batch. Batches 4, 5, and 6 are currently co-located in a single combined file (`evidence_results.json`).*

---

## 2. Representative Record Analysis Across Batches 1–3

Across all 950 records in `evidence_cleaned.json`, `evidence_batch_2.json`, and `evidence_batch_3.json`:
- **Top-level keys:** Uniformly and strictly `['case_id', 'evidence', 'raw_model_output']` (100% identical signature).
- **`case_id` data type:** `int` (native integer, e.g. `67`, `8`, `1`).
- **`evidence` object structure:** `dict` containing exactly three child dictionaries:
  1. `image_evidence`:
     - `modality`: `str` (e.g., `"Chest X-ray"`)
     - `body_part`: `str` (e.g., `"chest"`)
     - `findings`: `list[str]`
     - `abnormalities`: `list[str]`
     - `impression_summary`: `str`
  2. `text_image_consistency`:
     - `consistent`: `bool` (`True` or `False`)
     - `notes`: `str`
  3. `clinical_support`:
     - `supported`: `bool` (`True` or `False`)
     - `reason`: `str`
- **`raw_model_output` data type:** `str` (contains the exact raw model output markdown string returned by MedGemma 4B, e.g. ````json\n{\n...````).

---

## 3. Comparison with Batch 4–6 Records in `evidence_results.json`

The 1,157 records in `evidence_results.json` exhibit two distinct structural variations:

### Variation A: Batch 4 (records 0–399) and Batch 5 (records 400–756)
- **Top-level keys:** `['case_id', 'evidence', 'raw_model_output']`
- **`case_id`:** `int`
- **`evidence`:** Exact match with Batches 1–3 canonical structure (3 sub-dictionaries, boolean consistency/support).
- **`raw_model_output`:** `str` (contains genuine markdown-fenced MedGemma 4B generation).
- **Schema Conformity:** **100% compliant** with the Canonical Batch 1–3 schema.

### Variation B: Batch 6 (records 757–1156)
- **Top-level keys:** `['batch', 'case_id', 'clinical_indication', 'evidence', 'image_path', 'processed_at', 'radiologist_findings', 'radiologist_impression']`
- **`case_id`:** `str` (e.g. `'5'`, `'3989'`) instead of `int`.
- **`evidence`:** Exact match with canonical structure (all 3 sub-dictionaries valid and complete).
- **`raw_model_output`:** **MISSING** (the key was not recorded by the Batch 6 Colab script).
- **Extra provenance metadata:** Contains `'batch': 6`, clinical text, local Colab image path, and ISO datetime `processed_at`.
- **Schema Conformity:** **Divergent** in `case_id` type and missing `raw_model_output`.

---

## 4. Definition of the Canonical Target Schema

Derived directly from the working database pipeline (`models.py`, `seed_database.py`, `seed_batch_2.py`, and `seed_batch_3.py`):

```json
{
  "case_id": 1,
  "evidence": {
    "image_evidence": {
      "modality": "Chest X-ray",
      "body_part": "chest",
      "findings": [
        "Cardiac silhouette and mediastinum size are within normal limits."
      ],
      "abnormalities": [],
      "impression_summary": "Normal chest x-ray."
    },
    "text_image_consistency": {
      "consistent": true,
      "notes": ""
    },
    "clinical_support": {
      "supported": true,
      "reason": "Findings align with clinical indication."
    }
  },
  "raw_model_output": "```json\n{\n  \"image_evidence\": ...\n}```"
}
```

### Database Ingestion Compatibility Matrix
In PostgreSQL table `evidence` (`models.py`):
- `case_id`: `Integer, ForeignKey("cases.case_id"), unique=True, nullable=False`
- `image_evidence`: `JSONB, nullable=False`
- `text_image_consistency`: `JSONB, nullable=False`
- `clinical_support`: `JSONB, nullable=False`
- `raw_model_output`: `Text, nullable=True`

---

## 5. Field-by-Field Mapping Specification

| Target Canonical Field | Source in Batch 4 (400 cases) | Source in Batch 5 (357 cases) | Source in Batch 6 (400 cases) | Transformation / Conversion Rule |
|---|---|---|---|---|
| `case_id` | `record["case_id"]` (`int`) | `record["case_id"]` (`int`) | `record["case_id"]` (`str`) | Cast `int(record["case_id"])` |
| `evidence` | `record["evidence"]` (`dict`) | `record["evidence"]` (`dict`) | `record["evidence"]` (`dict`) | Direct pass-through (already 100% compliant) |
| `raw_model_output` | `record["raw_model_output"]` (`str`) | `record["raw_model_output"]` (`str`) | Not present in JSON | Preserve genuine text for B4/B5. For B6, search logs/checkpoints (Phase 4). If unrecoverable, explicitly set to `null` (`None`). Never fabricate. |

### Handling of Non-Canonical Extra Fields in Batch 6
The extra fields in Batch 6 (`batch`, `clinical_indication`, `radiologist_findings`, `radiologist_impression`, `image_path`, `processed_at`):
1. **Must NOT be injected into the canonical evidence JSON**, as they violate the canonical schema used across Batches 1–3 and the database seeder expectations.
2. **Must NOT be discarded:** They must be preserved in a separate **provenance manifest** (`provenance_batch_6.json`) to retain all processing timestamps and run metadata without compromising schema standardization.

---

## 6. Phase 1 Safety Confirmation

- Existing result files (`evidence_cleaned.json`, `evidence_batch_2.json`, `evidence_batch_3.json`, `evidence_results.json`) were **NOT modified**.
- No database tables or records were modified.
- No inference was executed.
- Ready to proceed to **Phase 2 (Verify Manifests and Case Coverage)**.
