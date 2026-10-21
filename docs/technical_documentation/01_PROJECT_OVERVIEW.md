# ANVESH: Automated Prior-Authorization Verification & Radiographic Grounding Engine
## Technical Documentation — Document 1: Project Overview

---

### 1. Project Title & Metadata

- **Project Title:** ANVESH — Multimodal Prior-Authorization Verification and Radiographic Evidence Grounding Engine
- **Academic Domain:** Medical Artificial Intelligence, Computer Vision, Natural Language Processing, Healthcare Informatics, Clinical Decision Support Systems (CDSS)
- **Primary Model Checkpoint:** Fine-Tuned LLaVA-1.5-7B v2 (`checkpoints_llava_v2/best_adapter`, Step 460, Epoch 5)
- **Baseline Models:** Vision Transformer ViT-B/16 (`checkpoints_vit_image_only/best_vit_model.pt`), Base LLaVA-1.5-7B Zero-Shot, and Google MedGemma-4B-IT (Precomputed Baseline)
- **Primary Benchmark Dataset:** Indiana University (IU) Open-i Chest Radiograph Collection ($N = 2,107$ cases, $1,474$ Train / $211$ Val / $422$ Held-Out Test)
- **Software Stack:** React 19 + TypeScript + Vite (Frontend), FastAPI + SQLAlchemy + SQLite/PostgreSQL (Backend), PyTorch + HuggingFace Transformers + PEFT (Deep Learning)
- **Audit & Verification Standard:** Verified empirical benchmark logs, SHA-256 partition manifests, and deterministic rule engine traces.

---

### 2. Abstract

Prior authorization (PA) in healthcare is a critical administrative hurdle requiring clinical providers to demonstrate medical necessity before insurers approve coverage for specialized procedures, including diagnostic chest radiography. Manual adjudication is notoriously inefficient, labor-intensive, and susceptible to administrative backlogs, improper denials, and clinical fraud. 

**ANVESH (MedAuth-VLM)** addresses this challenge by pairing multimodal Vision-Language Models (VLMs) and lightweight Vision Transformers (ViTs) with a deterministic, rule-based clinical policy engine. The system evaluates radiographic studies (DICOM/PNG Chest X-rays) and clinical notes against structured health insurance coverage guidelines (CMS individual market policies). Rather than replacing clinical experts, ANVESH implements an "AI-assisted, human-in-the-loop" architecture that provides transparent 5-point evidence verification: (1) Source clinical report grounding, (2) Plan benefit coverage, (3) Radiologist text-to-image consistency, (4) Clinical indication support, and (5) Policy exclusions cross-matching.

On an audited, held-out test cohort of $N = 422$ chest radiograph studies from the Indiana University Open-i collection, our primary fine-tuned **LLaVA-1.5-7B v2** model achieves **67.54% Accuracy**, **62.09% Sensitivity**, **72.99% Specificity**, **0.6744 Macro $F_1$**, and **0.7481 ROC-AUC** in pure image-only abnormality classification, outperforming both a zero-shot LLaVA-1.5-7B baseline (which collapses to predicting only normal cases, 50.00% accuracy) and an 85.8M-parameter **ViT-B/16** baseline (65.40% accuracy, 0.7062 ROC-AUC). When radiologist report text is available for multimodal structuring, LLaVA-1.5-7B LoRA achieves **88.86% Accuracy** and **+0.7811 Matthews Correlation Coefficient (MCC)**. The accompanying deterministic policy engine executes in a mean latency of $0.63\text{ ms}$ on CPU, providing immediate compliance checklist feedback to human medical directors.

---

### 3. Problem Statement & Motivation

#### 3.1 The Healthcare Administrative Bottleneck
Prior authorization is mandatory for over 80% of diagnostic imaging procedures in the United States and commercial healthcare systems globally. According to the American Medical Association (AMA), physicians complete an average of 43 prior authorization requests per week, consuming over 14 hours of clinical staff time. Furthermore, over 30% of physicians report that PA delays lead to serious adverse clinical events.

#### 3.2 Failure Modes of Prior Authorization
1. **Administrative Friction & Provider Burnout:** Clinics spend excessive hours assembling paper or PDF records, submitting disparate documents across proprietary payer portals.
2. **Inconsistent and Opaque Denials:** Payer medical directors often review high case volumes with limited time, leading to improper denials based on overlooked report findings.
3. **Fraud, Waste, and Abuse (FWA):** Unscrupulous actors submit generic or copied clinical indications that do not match the attached radiograph, exploiting lack of automated cross-verification.
4. **The "Black-Box" AI Hazard:** Commercial claims automated with deep neural networks frequently face legal and regulatory backlash due to hallucinations, lack of explainability, and silent bias against vulnerable patient populations.

---

### 4. Project Objectives

1. **Multimodal Clinical Evidence Extraction:** Train and evaluate generative Vision-Language Models (LLaVA-1.5-7B) to extract structured clinical findings, impression summaries, and anatomical observations directly from chest radiographs.
2. **Pure Image-Only Radiographic Classification:** Develop a discriminative image-only benchmark (ViT-B/16 and Projector-Augmented QLoRA LLaVA v2) capable of identifying thoracic pathology without relying on potentially biased or leaked textual cues.
3. **Deterministic Policy Compliance Engine:** Implement an open, verifiable Python rules engine that cross-references extracted clinical evidence against health insurance policies (CMS Qualified Health Plan public use files) without black-box hallucination risks.
4. **Full-Stack Clinical Workstation:** Build an enterprise-grade web application with role-based access control (RBAC) supporting three distinct healthcare stakeholders:
   - **Healthcare Providers:** 6-step authorization intake wizard with DICOM/PNG/PDF validation.
   - **Insurance Reviewers:** Interactive adjudication workspace with side-by-side policy criteria, radiographic image viewer, and audited decision stamping.
   - **Patients:** Transparent claim tracking and cost-sharing insight.
5. **Audited Scientific Rigor:** Ensure complete dataset provenance, zero test-set leakage, explicit distinction between multimodal and image-only conditions, and reproducibility.

---

### 5. Scope & Boundary Conditions

#### In-Scope:
- Frontal (PA/AP) and lateral chest radiographs in PNG/JPG/DICOM formats.
- Binary pathology classification: `normal` vs. `abnormal` (cardiopulmonary or thoracic pathology).
- Extraction of discrete abnormalities (e.g., cardiomegaly, pleural effusion, focal consolidation, pneumothorax).
- Policy comparison against 100 structured CMS individual health plan benefits.
- Evaluation of model inference latency on modern CPU and GPU hardware.
- Full session security, HTTP-only cookie authentication, and magic-byte file validation.

#### Out-of-Scope (Explicit Limitations):
- **Not a Diagnostic Medical Device:** ANVESH is a decision-support research prototype; it does not replace qualified radiologists or licensed medical directors.
- **No Autonomous Denials:** Automated rejection of prior authorization is strictly prohibited in software. All determinations require audited human sign-off.
- **No Spatial Pixel Grounding:** The current model generates textual descriptions of abnormalities; it does not produce bounding boxes, segmentation masks, or heatmaps.
- **Restricted Policy Universe:** Policies are derived from CMS PUF public benefit filings; proprietary commercial payer rules (e.g., Optum, Carelon) were not available.

---

### 6. Main Contributions

1. **Projector-Augmented QLoRA Training Pipeline (`train_llava_v2.py`):**
   - Solved the critical "loss dilution" defect in VLM fine-tuning by implementing exact target-only loss masking, focusing 100% of the backward gradient on diagnostic decision tokens.
   - Adapted both the multimodal vision projector (`linear_1`, `linear_2`) and LLM attention layers, yielding a 17.54% accuracy boost over zero-shot base models.
2. **Empirical Benchmarking of Diverse Model Paradigms:**
   - Conducted rigorous, head-to-head evaluation across four model families on identical held-out test splits ($N=422$): Base LLaVA-1.5-7B, LLaVA v1, LLaVA v2, ViT-B/16, and MedGemma-4B-IT.
   - Proven that discriminative ViT models (65.40% acc, 17.25 ms latency) provide a viable, ultra-low-latency CPU alternative to 7B-parameter generative models.
3. **Deterministic Human-in-the-Loop Policy Engine:**
   - Designed a 5-point checklist engine featuring a mandatory score-capping safeguard ($S \le 40$) when source clinical notes are missing, preventing ungrounded AI approvals.
4. **Production-Ready Enterprise Workstation:**
   - Delivered a high-contrast clinical interface with sub-millisecond Vanilla CSS rendering, zero layout jitter, and comprehensive audit logging.

---

### 7. Stakeholder User Personas

| Role | Primary User | Portal Views | Key Functional Needs |
|---|---|---|---|
| **Healthcare Provider** | Clinical administrative staff, ordering physician, radiology technologist | Provider Portal (`/portal/provider`) | Rapid 6-step submission, automatic eligibility verification, instant upload validation, clear status tracking. |
| **Insurance Reviewer** | Medical Director, Registered Nurse Reviewer | Insurer Portal (`/portal/insurance`) | Synchronized radiograph viewer, side-by-side policy matching, AI evidence audit trails, single-click decision stamping. |
| **Patient / Member** | Insured policyholder, patient | Patient Portal (`/portal/patient`) | Plain-language authorization tracking, deductible/copay transparency, dispute guidance. |
| **System Admin** | Hospital/Payer IT Administrator | Admin Console (`/portal/insurance/admin`) | User provisioning, RBAC role management, database health monitoring, audit logs. |

---

### 8. Functional & Non-Functional Requirements

#### Functional Requirements (FR):
- **FR-1 (Authentication):** The system must support session-based authentication using cryptographically secure 64-character tokens stored in HTTP-only cookies.
- **FR-2 (File Intake):** The system must accept DICOM, PNG, and JPG images up to 50 MB and PDF clinical reports, validating magic bytes (`89 50 4E 47`, `%PDF`) to reject spoofed files.
- **FR-3 (Automated Pre-Screening):** Upon radiograph upload, the system must trigger asynchronous or on-demand AI inference to extract clinical abnormalities.
- **FR-4 (Policy Evaluation):** The system must compute a 0–100 evidence consistency score and output structured recommendation codes (`OUTCOME_COVERED`, `OUTCOME_EXCLUDED`, etc.).
- **FR-5 (Human Determination):** The system must enforce human authorization verdicts (`APPROVED`, `DENIED`, `PENDING_REVIEW`) with recorded clinical notes.

#### Non-Functional Requirements (NFR):
- **NFR-1 (Latency):** Policy rule evaluation must complete in under $5\text{ ms}$ on standard server hardware.
- **NFR-2 (Reliability):** Absence of GPU workers must trigger graceful fallback to local CPU models without throwing 500 errors or stalling user workflows.
- **NFR-3 (Deterministic Reproducibility):** Repeated evaluation of identical inputs against the policy engine must yield bitwise identical outputs.
- **NFR-4 (Accessibility & Contrast):** UI surfaces must adhere to WCAG AAA contrast ratios ($\ge 4.5:1$ text contrast).

---

### 9. Current Implementation Status

| Component | Implementation Status | Test Coverage | Operational Evidence |
|---|:---:|:---:|---|
| **FastAPI REST Engine** | Complete | 100% (59/59 unit/integration tests) | Serving 60 endpoints on port 8000 |
| **Database Schema** | Complete | Verified on SQLite & PostgreSQL | Populated with 950 cases, 100 policies, 6 users |
| **Deterministic Policy Engine** | Complete | 100% verified across edge cases | Mean latency: $0.63\text{ ms}$ on CPU |
| **ViT-B/16 Classifier** | Complete | Checkpoint verified (`best_vit_model.pt`) | Tested on 422 test cases (Acc: 65.40%) |
| **LLaVA-1.5-7B v2 LoRA** | Complete | Checkpoint verified (`checkpoints_llava_v2`) | Evaluated on 422 test cases (Acc: 67.54%) |
| **React 19 Workstation** | Complete | 100% (10/10 automated UI tests) | Running on Vite port 5173 |
| **MedGemma-4B-IT Local Inference** | Blocked | N/A (Gated weights require HF token) | Precomputed baseline stored in database |
| **Live PACS/DICOM Network Link** | Future Work | Untested (Prototype uses local uploads) | Staged in local `uploads/` directory |
