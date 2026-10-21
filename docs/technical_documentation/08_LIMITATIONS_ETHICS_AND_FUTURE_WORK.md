# ANVESH: Automated Prior-Authorization Verification & Radiographic Grounding Engine
## Technical Documentation — Document 8: Scientific Limitations, Ethical Considerations & Future Work

---

### 1. Dataset & Ground-Truth Limitations

#### 1.1 Single-Institution Cohort Bias
The empirical evaluation in ANVESH relies exclusively on the **Indiana University Hospital Chest X-ray collection (Open-i)**:
- **Demographic Bias:** Indiana University Hospital serves a predominantly Midwestern adult outpatient and emergency population. Pediatric patients, neonates, acute ICU portable radiographs, and international populations with high endemic tuberculosis prevalence are underrepresented.
- **Acquisition Bias:** Images were captured on specific digital radiography detectors with institutional radiographic exposure parameters, grid ratios, and collimation habits.

#### 1.2 Patient De-Identification & Longitudinal Leakage
The NLM Open-i dataset strips all patient Medical Record Numbers (MRNs) and assigns independent identifiers (`uid`) to clinical studies. Consequently:
- **Longitudinal Follow-Up Blindness:** It is impossible to determine whether a baseline study in the training set and a follow-up study (e.g., 6 months post-treatment) in the test set belong to the same patient.
- While study-level and image-hash separation is 100% verified ($\text{Train} \cap \text{Test} = \emptyset$), patient-level independence cannot be mathematically guaranteed due to underlying public data anonymization constraints.

#### 1.3 Ground-Truth Label Noise & Text Heuristics
- **Automated Text Derivation:** Ground-truth classification was derived via automated regex parsing of radiologist reports rather than independent panel over-reads.
- **"No Indexing" Defect:** In 39 cases, the Indiana University dataset contained `Problems == "No Indexing"`. The text ingestion pipeline classified these as `abnormal`, despite dictated impressions indicating normal radiographs. This introduces an audited ground-truth label noise factor of $\approx 1.85\%$.

#### 1.4 Artificial 50/50 Class Prevalence
- While artificial 50/50 balancing eliminates majority-class training bias, it distorts clinical Bayesian statistics. In routine primary care or occupational health screenings, disease prevalence is significantly lower ($\approx 10\% - 20\%$). In real-world deployment, lower disease prevalence shifts the Positive Predictive Value (PPV) downward and increases the proportion of False Positives.

---

### 2. Generative VLM Hallucination & Cognitive Biases

#### 2.1 The "Sycophantic Text Prior" Hazard
In our audit of zero-shot MedGemma and early LLaVA experiments, the models exhibited a strong language-prior bias:
- When prompted to evaluate text-image consistency (`"consistent": true/false`), the model returned `true` in **100.0% of cases (2,107 / 2,107)**, even in 22 edge cases where the source clinical report was completely blank.
- Generative language decoders naturally favor affirmative tokens (`"yes"`, `"true"`, `"supported"`). Uncalibrated token generation must **never be treated as independent medical verification**.

#### 2.2 Lack of Spatial Bounding-Box Grounding
- Current generative VLM predictions output textual disease labels and impressions. They do not generate spatial coordinates (`[ymin, xmin, ymax, xmax]`), segmentation contours, or attention heatmaps.
- A model might correctly predict "cardiomegaly" while internally attending to an unrelated cardiac pacemaker wire or spinal osteophyte, a phenomenon known as "shortcut learning."

---

### 3. Clinical Safety Architecture & Responsible AI Standards

To safely deploy AI in healthcare administration, ANVESH enforces six non-negotiable software guardrails:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ANVESH CLINICAL SAFETY GUARANTEES                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Mandatory Human Determination: Software-level prohibition of autonomous claim       │
│    denials. Only licensed human medical reviewers can record final decisions.          │
│                                                                                        │
│ 2. Grounding Score Capping: If clinical report text is missing, evidence score is      │
│    mathematically capped at <= 40/100, forcing manual clinical over-read.              │
│                                                                                        │
│ 3. Transparent Source Auditing: Every prediction records ai_source (REMOTE_LLAVA,      │
│    LOCAL_VIT, RULE_ENGINE). The system never pretends an offline model ran.           │
│                                                                                        │
│ 4. Native Grayscale Raster: Medical viewer forbids false-color colormaps that could     │
│    distort subtle alveolar consolidation or pneumothorax lines.                        │
│                                                                                        │
│ 5. Session Isolation: Strict RBAC cookie sessions prevent patients or unauthorized     │
│    providers from viewing other patients' clinical imaging records.                    │
│                                                                                        │
│ 6. Cryptographic File Verification: Magic-byte inspection prevents executable code or │
│    malicious polyglots from breaching healthcare intranet perimeters.                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 4. Regulatory & Intended-Use Statements

> [!CAUTION]
> **RESEARCH PROTOTYPE NOTICE & CLINICAL DISCLAIMER:**
> ANVESH (MedAuth-VLM) is an academic clinical informatics research prototype. It has **not** been cleared or approved by the U.S. Food and Drug Administration (FDA) as a Software as a Medical Device (SaMD), nor does it hold CE Mark certification under the European Medical Device Regulation (EU MDR 2017/745). It is strictly not intended for primary diagnostic interpretation, acute triage, or autonomous clinical decision-making.

---

### 5. Future Engineering & Research Roadmap

1. **CheXlocalize Spatial Grounding Integration:**
   - Integrate the Stanford CheXlocalize benchmark to supervise spatial bounding-box coordinates for 10 common cardiopulmonary findings, providing pixel-level evidence grounding.
2. **Cross-Institutional Generalization Testing:**
   - Evaluate the fine-tuned LLaVA v2 and ViT-B/16 checkpoints on external multicenter benchmarks:
     - **MIMIC-CXR** (Beth Israel Deaconess Medical Center, Boston, MA - 377,110 images)
     - **CheXpert** (Stanford Hospital, CA - 224,316 images)
     - **PadChest** (Hospital Universitario San Juan, Spain - European demographic cohort)
3. **Multi-View Dual-Stream Fusion:**
   - Develop a joint frontal-lateral fusion transformer that simultaneously processes PA and Lateral radiographs, capturing retrocardiac and posterior costophrenic abnormalities hidden on single-view frontal projections.
4. **Standardized Healthcare Interoperability (HL7 FHIR & X12 278):**
   - Implement native HL7 FHIR `Claim` and `ClaimResponse` resource mappings.
   - Support standard ANSI ASC X12 278 Electronic Data Interchange (EDI) prior-authorization transactions for seamless integration with enterprise Electronic Health Record (EHR) systems (Epic, Cerner) and payer clearinghouses.
