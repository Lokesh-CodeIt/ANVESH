# ANVESH Complete Technical Documentation Suite

Welcome to the comprehensive technical documentation and research repository for **ANVESH (MedAuth-VLM)** — an automated prior-authorization verification and radiographic grounding engine.

This documentation suite provides a complete, scientifically audited, and reproducible reference for engineering students, academic researchers, and software engineers.

---

### Documentation Suite Navigation

| Document File | Purpose & Scope | Target Audience |
|---|---|---|
| [**ANVESH_MASTER_DOCUMENTATION.md**](./ANVESH_MASTER_DOCUMENTATION.md) | **Unified Master Technical Reference:** Full architecture, dataset, 88.86% multimodal model, benchmark metrics suite, REST API, and setup guide in a single comprehensive markdown document. | **All Stakeholders, Reviewers, Examiners** |
| [**01_PROJECT_OVERVIEW.md**](./01_PROJECT_OVERVIEW.md) | Project abstract, problem statement, objectives, stakeholder personas, functional requirements, and implementation status. | Evaluators, Reviewers, Students |
| [**02_SYSTEM_ARCHITECTURE.md**](./02_SYSTEM_ARCHITECTURE.md) | Three-tier architecture, React 19 frontend, FastAPI REST layer, Mermaid diagrams, database schemas, and image intake pipelines. | Software Architects, Developers |
| [**03_DATASET_AND_PREPROCESSING.md**](./03_DATASET_AND_PREPROCESSING.md) | Indiana University Open-i corpus, 2,107-case partition audit, SHA-256 checksums, leakage checks, and multimodal vs. image-only distinction. | Data Scientists, ML Engineers |
| [**04_MODEL_METHODOLOGY.md**](./04_MODEL_METHODOLOGY.md) | LLaVA-1.5-7B v2 QLoRA, target-only loss masking, Vision Transformer (ViT-B/16), MedGemma baseline, mathematical equations. | AI Researchers, ML Engineers |
| [**05_EXPERIMENTAL_EVALUATION.md**](./05_EXPERIMENTAL_EVALUATION.md) | 422-case held-out benchmark results, 95% Wilson confidence intervals, confusion matrices, McNemar's test, and latency profiling. | Academic Reviewers, Evaluators |
| [**06_FRONTEND_BACKEND_API.md**](./06_FRONTEND_BACKEND_API.md) | Complete reference for all 60 FastAPI endpoints, Pydantic v2 schemas, session security, magic-byte upload validation, and models. | Backend Engineers, API Clients |
| [**07_INSTALLATION_AND_REPRODUCIBILITY.md**](./07_INSTALLATION_AND_REPRODUCIBILITY.md) | Step-by-step Windows setup guide, virtual environments, SQLite database init, test execution, and hardware budgets. | Reproducing Researchers |
| [**08_LIMITATIONS_ETHICS_AND_FUTURE_WORK.md**](./08_LIMITATIONS_ETHICS_AND_FUTURE_WORK.md) | Single-center bias, unadjudicated text labels, lack of spatial grounding, safety guardrails, and regulatory disclaimers. | Ethics Committees, Clinicians |
| [**09_PROJECT_FILE_REFERENCE.md**](./09_PROJECT_FILE_REFERENCE.md) | Complete annotated file inventory of every important script, model checkpoint, manifest, and component in the repository. | Maintainers, Contributors |
| [**ANVESH_COLLEGE_PROJECT_REPORT.md**](./ANVESH_COLLEGE_PROJECT_REPORT.md) | Full 22-chapter academic final-year engineering project report prepared for degree submission and oral viva defense. | University Examination Committee |
| [**DOCUMENTATION_AUDIT.md**](./DOCUMENTATION_AUDIT.md) | Independent verification audit confirming mathematical concordance, zero test leakage, and empirical fact-checking. | Technical Auditors |

---

### IEEE Conference Paper Package (`ieee_paper/`)

The [ieee_paper/](./ieee_paper/) directory contains publication-ready materials for submission to IEEE conferences or transactions:
- [**ieee_manuscript.md**](./ieee_paper/ieee_manuscript.md): Full markdown manuscript formatted in IEEE conference structure.
- [**ieee_manuscript.tex**](./ieee_paper/ieee_manuscript.tex): Publication-ready LaTeX file formatted for `IEEEtran.cls`.
- [**references.bib**](./ieee_paper/references.bib): BibTeX bibliography with verified citations for CheXNet, ViT, LLaVA, QLoRA, Open-i, etc.
- [**ieee_tables.tex**](./ieee_paper/ieee_tables.tex): Standalone LaTeX `booktabs` tables.
- [**figure_manifest.md**](./ieee_paper/figure_manifest.md): DPI specifications, figure captions, and vector sources.
- [**ieee_submission_checklist.md**](./ieee_paper/ieee_submission_checklist.md): Pre-flight checklist for IEEE author submission portals.
