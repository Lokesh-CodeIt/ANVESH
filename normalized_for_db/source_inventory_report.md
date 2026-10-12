# MedAuth-VLM: Source File Inventory & Immutability Verification Report

**Project:** MedAuth-VLM  
**Scope:** Verification of Source File Hashes Before and After Processing  
**Date:** 2026-10-11  

---

## 1. Source Inventory and SHA-256 Checksums

All source files were inventoried and hashed using SHA-256 prior to pipeline execution and re-verified immediately after output generation. No source files were modified, moved, or deleted.

| File Location | Size (Bytes) | SHA-256 Checksum | Immutability Status |
|---|:---:|---|:---:|
| `precomputed_evidence/evidence_cleaned.json` | 276,009 | `e7ac860b776ee46682406c6940d5389433e111aeb0ef0cd03e0f97d85f299909` | **VERIFIED UNCHANGED** |
| `precomputed_evidence/evidence_batch_2.json` | 735,212 | `276a3fc4faf8bae21ff6bdcaee74e06355dda8449309dacec81b5dc3f41df6e3` | **VERIFIED UNCHANGED** |
| `precomputed_evidence/evidence_batch_3.json` | 739,764 | `06859f0078b4b898eb7ee8fd144a5bba3c384aa66d373c691efbb25b4bfdaef5` | **VERIFIED UNCHANGED** |
| `precomputed_evidence/evidence_results.json` | 1,994,790 | `2173676619f7a90657ec90f354f250718bea80399fea15e235fcf87f0402521a` | **VERIFIED UNCHANGED** |
| `precomputed_evidence/flagged_for_review.json` | 8,944 | `43c143b95dcb5c37c9f6cf2cc207b10b1ac79eed36d91b6522a74c0490928243` | **VERIFIED UNCHANGED** |
| `precomputed_evidence/flagged_for_review_batch_2.json` | 29,874 | `c0950a3cbe43be29e68d835105b913b6449bf2d30b999c4e7a26f72438cec646` | **VERIFIED UNCHANGED** |
| `colab_upload/case_batch.json` | 125,713 | `fdbe2391182e481088b14931a522f039c7605048360b0944a5c6de0f9f5f3736` | **VERIFIED UNCHANGED** |
| `colab_upload/case_batch_2.json` | 341,003 | `3f72bcd3cd6b256234e3222bf5edf1a977d17703a22450ae98fed1b81b6fd9e5` | **VERIFIED UNCHANGED** |
| `colab_upload/case_batch_3.json` | 353,196 | `e76b6981890ded123ad5c704bd06c76bec00544dc8c2ece66941e7b2d4c2d4ea` | **VERIFIED UNCHANGED** |
| `colab_upload/case_batch_4.json` | 349,012 | `480b055ce03aabaa3b1f0c1389266947b41bbb641c2f5caf7671ca7b0a7400e1` | **VERIFIED UNCHANGED** |
| `colab_upload/case_batch_5.json` | 348,063 | `7f76b12ec0350c1d0a6cb656f0d8d3e19f6789bbcb7285cc3ec748a54891f8c4` | **VERIFIED UNCHANGED** |
| `colab_upload/case_batch_5_recovery_43.json` | 37,446 | `4560aec7d8240bf7bdb57e594fb1e2acb7516368bc130c8f46a209b58e222377` | **VERIFIED UNCHANGED** |
| `colab_upload/case_batch_6.json` | 346,969 | `9ce2e118be361f075f63552839ee1fd88ef6feb1d7f8ff2ab371a6517095ae11` | **VERIFIED UNCHANGED** |

---

## 2. Directory Isolation Confirmation

All pipeline outputs are strictly contained inside `normalized_for_db/`:
- `evidence_batch_4.json`
- `evidence_batch_5.json`
- `evidence_batch_6.json`
- `provenance_batch_6.json`
- `normalization_manifest.json`
- `source_inventory.json`
- `missing_batch_5_cases.json`
- `quarantine_report.json`
- `validation_report.json`
- `database_import_readiness.json`
- `import_dry_run_summary.json`

No original files in `precomputed_evidence/` or `colab_upload/` were touched.
