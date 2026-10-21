# ANVESH IEEE Research Paper: Figure Manifest & Publication Standards

---

### 1. Publication Figure Standards

In accordance with IEEE Transactions and Conference author guidelines:
- **Vector Graphics:** Diagrams, workflows, and schematics must be provided in vector formats (PDF/SVG) with embedded fonts.
- **Raster Visualizations:** Radiographs, confusion matrices, and training curves must be rendered at a minimum of **300 DPI** (600 DPI preferred for clinical radiographic rasters).
- **Color Space:** CMYK or RGB color palettes with high-contrast accessibility (accessible to red-green color-blind readers).

---

### 2. Itemized Figure Inventory

| Fig # | Figure Title | Source Data / Code | Format | Resolution | Description & Caption |
|:---:|---|---|:---:|:---:|---|
| **Fig. 1** | **ANVESH System Architecture** | `02_SYSTEM_ARCHITECTURE.md` (Mermaid vector) | SVG / PDF | Vector | Three-tier architecture showing React 19 workstation, FastAPI backend, SQLite/Postgres database, and stratified AI dispatch tier. |
| **Fig. 2** | **Projector-Augmented QLoRA Architecture** | `train_llava_v2.py` / `MODEL_CARD.md` | SVG / PDF | Vector | Detailed schematic of CLIP-ViT patch encoder, adapted linear projection layers (`linear_1`, `linear_2`), and 4-bit Vicuna decoder with target-only loss masking. |
| **Fig. 3** | **LLaVA v2 Training & Validation Curves** | `reports/v2_llava_training_curves.png` | PNG | 300 DPI | Cross-entropy training loss vs. 12 periodic validation evaluations (loss, accuracy, macro-$F_1$, ROC-AUC) over 552 gradient steps. |
| **Fig. 4** | **ViT-B/16 Training & Convergence History** | `reports/image_only_experiment/vit/vit_training_curves.png` | PNG | 300 DPI | 15-epoch loss progression, validation accuracy, and ROC-AUC for the 85.8M Vision Transformer classifier. |
| **Fig. 5** | **Side-by-Side Confusion Matrices** | `reports/confusion_matrices_side_by_side.png` | PNG | 300 DPI | Head-to-head confusion matrices on the 422-case held-out test cohort comparing Base LLaVA, ViT-B/16, LLaVA v2, and MedGemma. |
| **Fig. 6** | **ROC & PR Characteristic Curves** | Derived from `v2_llava_test_predictions.csv` and `vit_test_predictions.csv` | SVG / PDF | Vector | Receiver Operating Characteristic (ROC) curves showing LLaVA v2 (AUC = 0.7481) vs. ViT-B/16 (AUC = 0.7062). |
| **Fig. 7** | **Deterministic Policy Compliance Workflow** | `policy_engine.py` / `HowItWorksPage.tsx` | SVG / PDF | Vector | 5-point verification checklist, score calculation ($S \in [0, 100]$), score-capping safeguard ($S \le 40$), and rule precedence trees. |
| **Fig. 8** | **Clinical Reviewer Adjudication Interface** | `InsuranceWorkspacePage.tsx` / `MedicalImageViewer.tsx` | PNG | 300 DPI | Screenshot of the production clinical workstation showing native grayscale radiograph viewer, policy comparison, and decision stamping modal. |

---

### 3. Source Verification Notes
All figures in this manifest are directly derived from reproducible repository artifacts located in `reports/` and source code modules in `frontend/src/` and `services/`. Zero figures are based on fabricated data or speculative mockups.
