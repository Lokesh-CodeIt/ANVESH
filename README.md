# ANVESH: Automated Prior-Authorization Verification & Radiographic Grounding Engine

[![FastAPI](https://img.shields.io/badge/FastAPI-0.141.0-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.2.8-61DAFB.svg?style=flat&logo=React&logoColor=black)](https://react.dev)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.6.0-EE4C2C.svg?style=flat&logo=PyTorch&logoColor=white)](https://pytorch.org)
[![Transformers](https://img.shields.io/badge/HuggingFace-Transformers-FFD21E.svg?style=flat&logo=HuggingFace&logoColor=black)](https://huggingface.co)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

ANVESH (MedAuth-VLM) is an enterprise clinical AI and rules engine designed to automate the cross-verification of radiographic imaging studies (Chest X-rays) and clinical indications against health insurance policies (CMS Qualified Health Plan guidelines).

---

## 📚 Complete Technical Documentation & Academic Reports

Complete, audited documentation, academic project reports, and IEEE research paper materials are organized in [`docs/technical_documentation/`](./docs/technical_documentation/):

- **[Unified Master Technical Documentation & Benchmark Report](./docs/technical_documentation/ANVESH_MASTER_DOCUMENTATION.md)**
- **[Technical Documentation Hub & Directory](./docs/technical_documentation/README.md)**
- **[01. Project Overview & Scope](./docs/technical_documentation/01_PROJECT_OVERVIEW.md)**
- **[02. System Architecture & Workflows](./docs/technical_documentation/02_SYSTEM_ARCHITECTURE.md)**
- **[03. Dataset Provenance & Preprocessing](./docs/technical_documentation/03_DATASET_AND_PREPROCESSING.md)**
- **[04. Model Methodology & Loss Engineering](./docs/technical_documentation/04_MODEL_METHODOLOGY.md)**
- **[05. Experimental Evaluation & Benchmark Results](./docs/technical_documentation/05_EXPERIMENTAL_EVALUATION.md)**
- **[06. Frontend, Backend & REST API Reference](./docs/technical_documentation/06_FRONTEND_BACKEND_API.md)**
- **[07. Installation & Reproducibility Guide](./docs/technical_documentation/07_INSTALLATION_AND_REPRODUCIBILITY.md)**
- **[08. Limitations, Ethics & Future Work](./docs/technical_documentation/08_LIMITATIONS_ETHICS_AND_FUTURE_WORK.md)**
- **[09. Project File Reference & Component Inventory](./docs/technical_documentation/09_PROJECT_FILE_REFERENCE.md)**
- **[Final-Year College Engineering Project Report](./docs/technical_documentation/ANVESH_COLLEGE_PROJECT_REPORT.md)**
- **[Documentation Quality & Empirical Audit Report](./docs/technical_documentation/DOCUMENTATION_AUDIT.md)**

### IEEE Conference Paper Suite
- **[IEEE Conference Manuscript (Markdown)](./docs/technical_documentation/ieee_paper/ieee_manuscript.md)**
- **[IEEE Conference Manuscript (LaTeX)](./docs/technical_documentation/ieee_paper/ieee_manuscript.tex)**
- **[BibTeX References Package](./docs/technical_documentation/ieee_paper/references.bib)**
- **[Publication Tables Package (LaTeX)](./docs/technical_documentation/ieee_paper/ieee_tables.tex)**
- **[Figure Manifest & Specifications](./docs/technical_documentation/ieee_paper/figure_manifest.md)**
- **[IEEE Submission Checklist](./docs/technical_documentation/ieee_paper/ieee_submission_checklist.md)**

---

## ⚡ Quick Start

### 1. Backend Service
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt # or install torch, fastapi, transformers, sqlalchemy
python init_sqlite_db.py
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 2. Frontend Workstation
```powershell
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
