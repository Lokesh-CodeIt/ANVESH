# IEEE Conference & Transactions Submission Checklist

---

### 1. Paper Title & Metadata
- [x] **Title:** Clearly reflects the scientific contribution without hype or unsupported clinical claims.
- [x] **Author Block:** Configured with standard placeholders for student, advisor, and institutional affiliation.
- [x] **Abstract:** Structured within the conventional 150–250 word limit; states problem, methodology, key quantitative results, and conclusions.
- [x] **Index Terms:** 5–7 authoritative IEEE taxonomy terms included.

---

### 2. Methodological & Scientific Integrity
- [x] **Baseline Consistency:** All baseline models (Zero-Shot LLaVA, LLaVA v1, ViT-B/16, LLaVA v2, MedGemma) evaluated on the **exact same 422-case held-out test split**.
- [x] **Modality Clarity:** Pure image-only classification explicitly distinguished from multimodal (report-assisted) evidence structuring.
- [x] **Zero Test Leakage:** Verified $\text{Train} \cap \text{Test} = \emptyset$ and zero duplicate SHA-256 image collisions across partitions.
- [x] **Confidence Intervals:** 95% Wilson score confidence intervals computed and documented for all primary performance metrics.
- [x] **Statistical Testing:** McNemar's paired test computed for paired model comparisons ($\chi^2 = 0.4129, p = 0.5205$).
- [x] **Negative / Failure Cases Documented:** Base LLaVA single-class collapse, early loss dilution defects, and false-negative subtle nodules explicitly analyzed.
- [x] **No Unsupported Claims:** No claim of FDA clearance, autonomous clinical readiness, or unmeasured external cross-center generalization.

---

### 3. LaTeX & Formatting Compliance
- [x] **IEEEtran Class Compatibility:** Valid standard `\documentclass[conference]{IEEEtran}` syntax.
- [x] **Table Formatting:** Two-column tables formatted using `table*` environment and `booktabs` rules (`\toprule`, `\midrule`, `\bottomrule`).
- [x] **Mathematical Typography:** Equations numbered and formatted in standard AMS math environments.
- [x] **Bibliography:** Citations resolve to authentic, verified BibTeX entries in `references.bib`.

---

### 4. Ethics, Reproducibility & Open Science
- [x] **Dataset Provenance:** Indiana University Open-i de-identified collection cited and attributed to NLM/NIH.
- [x] **Human-in-the-Loop Safeguards:** Software prohibition of autonomous denials explicitly stated.
- [x] **Reproducibility Instructions:** Checkpoint locations, hyperparameters, random seeds ($42$), and CLI commands documented.
- [x] **Zero Secret Exposure:** Zero API keys, passwords, or private tokens contained in submission files.
