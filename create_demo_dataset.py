import os
import shutil
import json

base_dir = os.path.dirname(os.path.abspath(__file__))
demo_dir = os.path.join(base_dir, 'demo_dataset')
cases_dir = os.path.join(demo_dir, 'cases')

os.makedirs(cases_dir, exist_ok=True)

src_images_dir = os.path.join(base_dir, 'AI_PORJECT_DATASET', 'archive (7)', 'images', 'images_normalized')

demo_cases = [
    {
        'id': 'DEMO-CXR-001',
        'src_img': '100_IM-0002-1001.dcm.png',
        'dest_img_name': 'cxr_frontal_pa.png',
        'patient_ref': 'DEMO-MEM-0042',
        'policy_ref': 'POL-CARDIO-2026-X',
        'procedure': 'Chest Radiography (2 Views PA/LAT)',
        'indication': 'Progressive exertional dyspnea x 3 weeks. Rule out cardiomegaly or pleural effusion.',
        'clinical_report': """================================================================================
ANVESH CLINICAL RADIOLOGY REPORT — DEMONSTRATION RECORD
IDENTIFIER: DEMO-CXR-001 | PATIENT REF: DEMO-MEM-0042
DATE OF EXAMINATION: 2026-10-01 09:15 UTC
PROCEDURE: Chest Radiography (2 Views PA/LAT)
SOURCE: Indiana University Chest X-ray Research Benchmark (Open-i NIH)
NOTE: SYNTHETIC DEMO EXAMPLE — NOT LIVE MODEL INFERENCE — NOT CLINICALLY VALIDATED.
================================================================================

CLINICAL INDICATION:
Progressive exertional dyspnea for 3 weeks in a 58-year-old patient. Clinical team requests
evaluation for cardiomegaly, interstitial edema, or pleural effusion prior to elective cardioversion.

TECHNIQUE:
Frontal (PA) and lateral chest radiographs obtained in upright position.

FINDINGS:
Cardiac silhouette is mildly enlarged with a cardiothoracic ratio of approximately 0.56.
Pulmonary vascularity is within normal limits without frank cephalization or pulmonary edema.
Mild blunting of the left costophrenic angle is noted, suspicious for a trace pleural effusion.
Right lung field is clear without focal parenchymal consolidation, pneumothorax, or acute airspace disease.
Bony thorax and osseous structures appear intact.

IMPRESSION:
1. Mild cardiomegaly.
2. Trace left-sided pleural effusion; clinical correlation with volume status advised.
3. No acute focal pneumonia or pneumothorax.

REVIEWER GUIDANCE:
Requires licensed human review. Cross-reference clinical documentation for prior heart failure diagnosis.
""",
        'policy_context': {
            'policy_id': 'POL-CARDIO-2026-X',
            'plan_name': 'Commercial Comprehensive Health Plan - Specialty Cardiac Diagnostic Guidelines',
            'category': 'Cardiopulmonary Diagnostic Imaging',
            'effective_date': '2026-01-01',
            'status': 'active',
            'covered_indications': [
                'New-onset or progressive dyspnea of suspected cardiac etiology',
                'Evaluation of suspected cardiomegaly, pulmonary edema, or pleural effusion',
                'Pre-procedure cardiothoracic clearance'
            ],
            'clinical_criteria': [
                {'code': 'CRIT-01', 'description': 'Documented physical examination noting dyspnea, edema, or rales', 'status': 'MET'},
                {'code': 'CRIT-02', 'description': 'Initial frontline plain radiography indicated prior to advanced cross-sectional imaging', 'status': 'MET'},
                {'code': 'CRIT-03', 'description': 'No duplicate chest radiograph performed within preceding 7 days without acute clinical change', 'status': 'MET'}
            ],
            'exclusions': [
                'Routine screening in asymptomatic non-surgical patients',
                'Standalone experimental or investigational unvalidated automated diagnostic software'
            ],
            'adjudication_rule': 'COVERED_SUBJECT_TO_HUMAN_REVIEW',
            'requires_licensed_physician_review': True,
            'statutory_notice': 'ANVESH evidence outputs are assistive decision-support tools. Final authorization requires explicit licensed human review.'
        },
        'evidence_output': {
            'case_id': 'DEMO-CXR-001',
            'provenance': {
                'model_architecture': 'MedGemma-Multimodal-VLM (Precomputed Offline Research Artifact)',
                'batch_id': 'demo_synthetic_batch_01',
                'execution_environment': 'Google Colab A100 (Preserved Static Outputs)',
                'timestamp': '2026-10-01T09:20:00Z',
                'disclaimer': 'SYNTHETIC DEMO EXAMPLE — NOT LIVE MODEL INFERENCE — NOT CLINICALLY VALIDATED.'
            },
            'image_evidence': {
                'modality': 'DX / CR',
                'view': 'Frontal PA',
                'anatomical_body_part': 'Chest / Thorax',
                'cardiac_silhouette': 'Mildly enlarged (cardiothoracic ratio > 0.55)',
                'lung_fields': 'Clear bilaterally; left costophrenic angle blunting noted',
                'findings': [
                    'Cardiomegaly noted on frontal projection',
                    'Blunting of left costophrenic sulcus',
                    'No pneumothorax',
                    'No consolidated lobar infiltrate'
                ]
            },
            'consistency_evaluation': {
                'text_image_consistency': True,
                'clinical_consistency_score': 0.88,
                'source_text_grounding': 'present',
                'confidence_tier': 'HIGH_CONCORDANCE',
                'discrepancy_flags': []
            },
            'precomputed_recommendation': {
                'ai_pre_screen_outcome': 'ACTIONABLE_REVIEW_READY',
                'policy_concordance': 'SUPPORTED_BY_EVIDENCE',
                'human_review_mandate': 'REQUIRED'
            }
        }
    },
    {
        'id': 'DEMO-CXR-002',
        'src_img': '1001_IM-0004-1001.dcm.png',
        'dest_img_name': 'cxr_frontal_pa.png',
        'patient_ref': 'DEMO-MEM-0089',
        'policy_ref': 'POL-PULM-2026-B',
        'procedure': 'Chest Radiography (Single View)',
        'indication': 'Persistent dry cough and subacute low-grade fever. Exclude pneumonia.',
        'clinical_report': """================================================================================
ANVESH CLINICAL RADIOLOGY REPORT — DEMONSTRATION RECORD
IDENTIFIER: DEMO-CXR-002 | PATIENT REF: DEMO-MEM-0089
DATE OF EXAMINATION: 2026-10-02 11:30 UTC
PROCEDURE: Chest Radiography (Single View Frontal)
SOURCE: Indiana University Chest X-ray Research Benchmark (Open-i NIH)
NOTE: SYNTHETIC DEMO EXAMPLE — NOT LIVE MODEL INFERENCE — NOT CLINICALLY VALIDATED.
================================================================================

CLINICAL INDICATION:
42-year-old adult presenting with 10-day history of dry cough and low-grade fevers.
Evaluate for bronchopneumonia, focal consolidation, or reactive adenopathy.

TECHNIQUE:
Single view upright PA chest radiograph.

FINDINGS:
Lungs are well-expanded. Patchy airspace opacities are present within the right lower lobe,
most pronounced in the posterior basal segment. No pleural effusion or pneumothorax is identified.
The cardiomediastinal contour is normal in size and configuration. The trachea is midline.
Hilar contours are unremarkable without discrete adenopathy.

IMPRESSION:
1. Right lower lobe patchy airspace opacity, concerning for focal bronchopneumonia in the appropriate clinical setting.
2. Recommend follow-up radiograph in 6-8 weeks following antibiotic therapy to confirm resolution.

REVIEWER GUIDANCE:
Missing clinical record: Baseline sputum culture documentation not attached in initial submission.
""",
        'policy_context': {
            'policy_id': 'POL-PULM-2026-B',
            'plan_name': 'Commercial Standard HMO - Respiratory Infectious Disease Clinical Policy',
            'category': 'Pulmonary Diagnostic Evaluation',
            'effective_date': '2026-01-01',
            'status': 'active',
            'covered_indications': [
                'Suspected community-acquired pneumonia with fever or abnormal auscultatory findings',
                'Persistent unresolved lower respiratory symptoms exceeding 7 days duration'
            ],
            'clinical_criteria': [
                {'code': 'CRIT-PULM-01', 'description': 'Documented clinical signs of lower respiratory tract infection', 'status': 'MET'},
                {'code': 'CRIT-PULM-02', 'description': 'Radiographic imaging confirms anatomical site of consolidation', 'status': 'MET'},
                {'code': 'CRIT-PULM-03', 'description': 'Staging notes clarify antimicrobial treatment plan', 'status': 'PENDING_DOCUMENTATION'}
            ],
            'exclusions': [
                'Routine annual employment clearance screening'
            ],
            'adjudication_rule': 'MORE_INFORMATION_REQUIRED',
            'requires_licensed_physician_review': True,
            'statutory_notice': 'ANVESH evidence outputs are assistive decision-support tools. Final authorization requires explicit licensed human review.'
        },
        'evidence_output': {
            'case_id': 'DEMO-CXR-002',
            'provenance': {
                'model_architecture': 'MedGemma-Multimodal-VLM (Precomputed Offline Research Artifact)',
                'batch_id': 'demo_synthetic_batch_01',
                'execution_environment': 'Google Colab A100 (Preserved Static Outputs)',
                'timestamp': '2026-10-02T11:35:00Z',
                'disclaimer': 'SYNTHETIC DEMO EXAMPLE — NOT LIVE MODEL INFERENCE — NOT CLINICALLY VALIDATED.'
            },
            'image_evidence': {
                'modality': 'DX / CR',
                'view': 'Frontal PA',
                'anatomical_body_part': 'Chest / Thorax',
                'cardiac_silhouette': 'Normal size',
                'lung_fields': 'Focal airspace opacity in right lower lobe',
                'findings': [
                    'Patchy right basilar infiltrate',
                    'No pneumothorax',
                    'No pleural effusion'
                ]
            },
            'consistency_evaluation': {
                'text_image_consistency': True,
                'clinical_consistency_score': 0.84,
                'source_text_grounding': 'present',
                'confidence_tier': 'HIGH_CONCORDANCE',
                'discrepancy_flags': ['MISSING_SECONDARY_MICROBIOLOGY_REPORT']
            },
            'precomputed_recommendation': {
                'ai_pre_screen_outcome': 'ADDITIONAL_INFO_REQUESTED',
                'policy_concordance': 'PARTIALLY_SATISFIED',
                'human_review_mandate': 'REQUIRED'
            }
        }
    },
    {
        'id': 'DEMO-CXR-003',
        'src_img': '1002_IM-0004-1001.dcm.png',
        'dest_img_name': 'cxr_frontal_pa.png',
        'patient_ref': 'DEMO-MEM-0120',
        'policy_ref': 'POL-GEN-2026-PREOP',
        'procedure': 'Chest Radiography (2 Views PA/LAT)',
        'indication': 'Pre-operative pulmonary clearance for elective total knee arthroplasty in 64yo.',
        'clinical_report': """================================================================================
ANVESH CLINICAL RADIOLOGY REPORT — DEMONSTRATION RECORD
IDENTIFIER: DEMO-CXR-003 | PATIENT REF: DEMO-MEM-0120
DATE OF EXAMINATION: 2026-10-03 14:45 UTC
PROCEDURE: Chest Radiography (2 Views PA/LAT)
SOURCE: Indiana University Chest X-ray Research Benchmark (Open-i NIH)
NOTE: SYNTHETIC DEMO EXAMPLE — NOT LIVE MODEL INFERENCE — NOT CLINICALLY VALIDATED.
================================================================================

CLINICAL INDICATION:
64-year-old patient undergoing elective orthopedic knee reconstruction.
Pre-operative medical risk stratification.

TECHNIQUE:
PA and lateral chest radiographs.

FINDINGS:
Lungs are clear bilaterally without active infiltrate, focal consolidation, or acute interstitial edema.
Heart size and cardiomediastinal contours are normal.
Costophrenic angles are sharp without evidence of pleural effusion.
No acute osseous abnormality or pneumothorax is identified.

IMPRESSION:
Normal chest radiographic examination. No acute cardiopulmonary disease demonstrated.

REVIEWER GUIDANCE:
Demonstrates non-pathologic negative baseline findings. Evaluate pre-operative policy coverage terms.
""",
        'policy_context': {
            'policy_id': 'POL-GEN-2026-PREOP',
            'plan_name': 'Medicare Advantage Standard Evidence-Based Pre-Surgical Diagnostic Policy',
            'category': 'Pre-Operative Clearance Diagnostic Services',
            'effective_date': '2026-01-01',
            'status': 'active',
            'covered_indications': [
                'Pre-operative evaluation in patients with documented cardiopulmonary history or high surgical risk index'
            ],
            'clinical_criteria': [
                {'code': 'CRIT-PREOP-01', 'description': 'Documented American Society of Anesthesiologists (ASA) class score II or greater', 'status': 'MET'},
                {'code': 'CRIT-PREOP-02', 'description': 'Absence of prior unexpired chest radiograph within past 90 days', 'status': 'MET'}
            ],
            'exclusions': [
                'Unconditional routine screening in asymptomatic ASA Class I patients without cardiac/pulmonary comorbidities'
            ],
            'adjudication_rule': 'COVERED_NORMAL_EXAM',
            'requires_licensed_physician_review': True,
            'statutory_notice': 'ANVESH evidence outputs are assistive decision-support tools. Final authorization requires explicit licensed human review.'
        },
        'evidence_output': {
            'case_id': 'DEMO-CXR-003',
            'provenance': {
                'model_architecture': 'MedGemma-Multimodal-VLM (Precomputed Offline Research Artifact)',
                'batch_id': 'demo_synthetic_batch_01',
                'execution_environment': 'Google Colab A100 (Preserved Static Outputs)',
                'timestamp': '2026-10-03T14:50:00Z',
                'disclaimer': 'SYNTHETIC DEMO EXAMPLE — NOT LIVE MODEL INFERENCE — NOT CLINICALLY VALIDATED.'
            },
            'image_evidence': {
                'modality': 'DX / CR',
                'view': 'Frontal PA',
                'anatomical_body_part': 'Chest / Thorax',
                'cardiac_silhouette': 'Within normal limits',
                'lung_fields': 'Clear bilaterally',
                'findings': [
                    'Normal cardiopulmonary baseline',
                    'No active focal consolidation',
                    'No effusion',
                    'No pneumothorax'
                ]
            },
            'consistency_evaluation': {
                'text_image_consistency': True,
                'clinical_consistency_score': 0.94,
                'source_text_grounding': 'present',
                'confidence_tier': 'HIGH_CONCORDANCE',
                'discrepancy_flags': []
            },
            'precomputed_recommendation': {
                'ai_pre_screen_outcome': 'ACTIONABLE_REVIEW_READY',
                'policy_concordance': 'COVERED_BY_CRITERIA',
                'human_review_mandate': 'REQUIRED'
            }
        }
    }
]

manifest = {
    'dataset_name': 'ANVESH Synthetic Demonstration Dataset',
    'version': '1.0.0',
    'created_date': '2026-10-12',
    'license': 'Open Access Research Benchmark (Indiana University / NIH Open-i collection)',
    'attribution': 'Images derived from the de-identified public Indiana University chest X-ray collection (Demner-Fushman et al., J Am Med Inform Assoc 2016). Associated clinical reports, policy criteria, and evidence outputs are synthetic illustrative prototypes.',
    'clinical_safety_notice': 'SYNTHETIC DEMO EXAMPLE — NOT LIVE MODEL INFERENCE — NOT CLINICALLY VALIDATED. For demonstration, usability testing, and UI workflow verification only.',
    'cases_count': len(demo_cases),
    'cases': []
}

for case in demo_cases:
    case_folder = os.path.join(cases_dir, case['id'])
    img_folder = os.path.join(case_folder, 'image')
    os.makedirs(img_folder, exist_ok=True)
    
    # Copy sample image safely
    src_img_path = os.path.join(src_images_dir, case['src_img'])
    dest_img_path = os.path.join(img_folder, case['dest_img_name'])
    if os.path.exists(src_img_path):
        shutil.copy2(src_img_path, dest_img_path)
        print(f"Copied image for {case['id']}: {src_img_path} -> {dest_img_path}")
    else:
        print(f"Warning: Source image not found: {src_img_path}")

    # Write clinical report
    with open(os.path.join(case_folder, 'clinical_report.txt'), 'w', encoding='utf-8') as f:
        f.write(case['clinical_report'])

    # Write policy context
    with open(os.path.join(case_folder, 'policy_context.json'), 'w', encoding='utf-8') as f:
        json.dump(case['policy_context'], f, indent=2)

    # Write evidence output
    with open(os.path.join(case_folder, 'evidence_output.json'), 'w', encoding='utf-8') as f:
        json.dump(case['evidence_output'], f, indent=2)

    manifest['cases'].append({
        'case_id': case['id'],
        'patient_ref': case['patient_ref'],
        'policy_ref': case['policy_ref'],
        'procedure': case['procedure'],
        'indication': case['indication'],
        'image_file': f"cases/{case['id']}/image/{case['dest_img_name']}",
        'report_file': f"cases/{case['id']}/clinical_report.txt",
        'policy_file': f"cases/{case['id']}/policy_context.json",
        'evidence_file': f"cases/{case['id']}/evidence_output.json"
    })

# Write manifest.json
with open(os.path.join(demo_dir, 'manifest.json'), 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2)

# Write README.md
readme_content = """# ANVESH Synthetic Demonstration Dataset (`demo_dataset/`)

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
"""

with open(os.path.join(demo_dir, 'README.md'), 'w', encoding='utf-8') as f:
    f.write(readme_content)

print("Demo dataset created successfully!")
