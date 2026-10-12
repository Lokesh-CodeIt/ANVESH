# ANVESH Synthetic Demonstration Dataset (`demo_dataset/`)

## Clinical Safety Notice
> **SYNTHETIC DEMO EXAMPLE — NOT LIVE MODEL INFERENCE — NOT CLINICALLY VALIDATED.**
> This small demonstration dataset is provided strictly for user interface evaluation, multi-role navigation, and clinical workflow validation in the ANVESH healthcare prior-authorization research prototype. It must not be used for clinical diagnosis, patient management, or machine learning model training/validation.

---

## Directory Structure
```
demo_dataset/
  ├── README.md                 # Provenance, permitted use, and dataset documentation
  ├── manifest.json             # Structured JSON catalog of all demonstration cases
  └── cases/
      ├── DEMO-CXR-001/         # Case 1: Exertional Dyspnea (Mild Cardiomegaly)
      │   ├── image/            # PA Chest Radiograph (cxr_frontal_pa.png)
      │   ├── clinical_report.txt
      │   ├── policy_context.json
      │   └── evidence_output.json
      ├── DEMO-CXR-002/         # Case 2: Subacute Cough (Right Basilar Pneumonia)
      │   ├── image/            # PA Chest Radiograph (cxr_frontal_pa.png)
      │   ├── clinical_report.txt
      │   ├── policy_context.json
      │   └── evidence_output.json
      └── DEMO-CXR-003/         # Case 3: Pre-Operative Orthopedic Clearance (Normal Exam)
          ├── image/            # PA Chest Radiograph (cxr_frontal_pa.png)
          ├── clinical_report.txt
          ├── policy_context.json
          └── evidence_output.json
```

---

## Provenance & Permitted Use
- **Medical Images:** De-identified chest radiographs sourced locally from the open-access Indiana University Chest X-Ray Collection (Demner-Fushman D, et al., *Preparing a collection of radiology examinations for distribution and retrieval*, J Am Med Inform Assoc 2016), distributed through the NIH Open-i service under open research terms.
- **Reports & Policies:** Synthetic, illustrative scenarios formatted to reflect standard hospital requisition orders and payer medical coverage guidelines.
- **Evidence Outputs:** Representative schema outputs illustrating precomputed MedGemma multimodal vision-language representations and policy scoring criteria.

---

## Multi-Portal Demonstration Flow
The same synthetic case reference can be audited seamlessly across all three ANVESH portals:
1. **Hospital / Healthcare Provider Portal:** Stage medical images, view clinical completeness validation, and submit an illustrative demonstration prior-authorization request.
2. **Insurance Company Portal:** Inspect the medical radiograph on a dedicated viewer canvas, analyze precomputed clinical evidence findings, cross-reference policy coverage criteria, and record an authorized human adjudication decision.
3. **Patient / Member Portal:** View plain-language authorization status ("Submitted", "Under review", "More information required", "Decision recorded") and review required-document notifications.

---

## Data Boundary Compliance
Demonstration operations (file staging, review evaluations, and mock decisions) execute entirely within local browser session memory. **No real patient records, medical images, or precomputed PostgreSQL database entries are ever modified or written to during demo mode.**
