# MedAuth-VLM: Official Database Import & Verification Report

**Project:** MedAuth-VLM  
**Execution Timestamp:** 2026-10-11T17:41:02+05:30  
**Database Target:** PostgreSQL (`medauth_vlm` on `localhost:5432`)  
**Schema:** `public`  
**Final Status:** **IMPORT SUCCESSFUL**  

---

## 1. Database Connection Target (Non-Secret)

| Parameter | Value |
|---|---|
| **RDBMS Engine** | PostgreSQL (`postgresql+psycopg2`) |
| **Host** | `localhost` |
| **Port** | `5432` |
| **Database Name** | `medauth_vlm` |
| **User Role** | `postgres` |
| **Security Mode** | Parameterized connection via `.env` (No plain-text credentials stored or exposed) |

---

## 2. Pre-Import Backup Verification

Prior to executing any live writes to the database, a full, clean, recoverable PostgreSQL backup was generated and verified:

| Attribute | Detail |
|---|---|
| **Backup Tool** | PostgreSQL 18 native `pg_dump.exe` |
| **Backup File Path** | `backups/medauth_vlm_pre_import_20261011_174043.sql` |
| **File Size** | `1,996,604 bytes` (1.90 MB) |
| **SHA-256 Checksum** | `2fd744e28e05ac3c79bf306a93626009de9644ae1b194310a4d9b677cbf48f6a` |
| **Verification Result** | **PASSED** (Full DDL for all 5 tables and `COPY` data blocks verified) |
| **Metadata Record** | `backups/medauth_vlm_pre_import_20261011_174043.sql.meta.json` |

---

## 3. Before-and-After Database Row Counts

Independent SQL queries executed against the live PostgreSQL database before and after the import confirm exact record reconciliation:

| Table Name | Pre-Import Count | Newly Inserted | Post-Import Count | Expected Post-Import | Delta Status |
|---|:---:|:---:|:---:|:---:|:---:|
| `public.cases` | 950 | +1,157 | **2,107** | 2,107 | Exact Match |
| `public.case_images` | 1,839 | +2,254 | **4,093** | 4,093 | Exact Match |
| `public.evidence` | 950 | +1,157 | **2,107** | 2,107 | Exact Match |
| `public.policies` | 100 | 0 | **100** | 100 | Unchanged |
| `public.reviews` | 3 | 0 | **3** | 3 | Unchanged |

---

## 4. Ingestion Record Breakdown by Batch

All imported records were staged through `import_batches_db.py --apply` inside an atomic transaction:

| Batch Identifier | Manifest Cases | Evidence Records | Cases Inserted | Images Inserted | Evidence Inserted | Skips (Identical) | Collisions / Quarantined |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Batch 4** | 400 | 400 | 400 | 782 | 400 | 0 | 0 |
| **Batch 5** | 400 | 357 | 357 | 702 | 357 | 0 | 0 |
| **Batch 6** | 400 | 400 | 400 | 770 | 400 | 0 | 0 |
| **Total** | **1,200** | **1,157** | **1,157** | **2,254** | **1,157** | **0** | **0** |

---

## 5. Post-Import Validation and Integrity Checks

An independent query suite (`verify_post_import.py`) confirmed:

1. **Batch 1–3 Preservation (950 Cases):**
   - 100% of the 950 legacy cases across Batches 1–3 remain completely intact in both `cases` and `evidence` tables.
   - Zero records were modified, overwritten, or dropped.
2. **Batch 4 Integrity (400 Cases):**
   - All 400 cases have corresponding 1-to-1 rows in table `evidence`.
   - All 400 evidence rows possess genuine, non-null `raw_model_output` markdown strings.
3. **Batch 5 Integrity (357 Cases Inserted, 43 Cases Absent):**
   - Exactly 357 cases were inserted with valid evidence and genuine `raw_model_output`.
   - Exactly 43 uncomputed case IDs (`[3524, 3545, ... 3993]`) were verified **absent** from the database (0 rows in `cases`, 0 rows in `evidence`).
   - Zero placeholder or synthetic records were fabricated.
4. **Batch 6 Integrity (400 Cases Inserted, NULL Raw Output):**
   - All 400 string case IDs were converted to integers and exist in `cases` and `evidence`.
   - All 400 Batch 6 evidence rows have `raw_model_output IS NULL` (400/400 verified).
   - Rich clinical provenance metadata remains preserved in `normalized_for_db/provenance_batch_6.json`.
5. **Relational Consistency & Orphan Audit:**
   - Orphaned case images (`case_images` without matching `cases`): **0**
   - Orphaned evidence (`evidence` without matching `cases`): **0**
   - Cases without evidence (`cases` missing `evidence`): **0**
   - Cases without images (`cases` missing images): **0**
6. **JSONB NOT NULL Constraint Verification:**
   - 100% of 2,107 rows in table `evidence` contain valid, non-empty JSONB payloads for `image_evidence`, `text_image_consistency`, and `clinical_support`.
7. **Regression Test Suite:**
   - Executed `python -m pytest test_models.py test_backend.py test_no_source.py`: **15 passed in 2.24s**.

---

## 6. Documented Limitations & Known Status

1. **Batch 5 43 Missing Cases:**
   - Case IDs: `[3524, 3545, 3548, 3553, 3556, 3572, 3577, 3582, 3588, 3608, 3610, 3611, 3618, 3629, 3630, 3647, 3660, 3678, 3685, 3693, 3698, 3724, 3734, 3735, 3738, 3763, 3766, 3769, 3772, 3778, 3786, 3789, 3791, 3799, 3802, 3818, 3865, 3867, 3922, 3947, 3957, 3988, 3993]`.
   - Reason: Colab inference run was interrupted before these cases completed.
   - Status: Intentionally left absent in database to preserve authentic clinical evidence integrity. If recovery inference is executed later, they can be imported incrementally via `import_batches_db.py`.
2. **Batch 6 Missing Raw Model Outputs:**
   - Status: `raw_model_output` is `NULL` for all 400 Batch 6 records. Permitted by database schema (`Column(Text, nullable=True)`).
   - Provenance: Non-canonical generation metadata is retained in `normalized_for_db/provenance_batch_6.json`.

---

## 7. Final Assessment

**STATUS: IMPORT SUCCESSFUL**

The database is fully verified, structurally consistent, referentially sound, and prepared for subsequent backend API and frontend development.
