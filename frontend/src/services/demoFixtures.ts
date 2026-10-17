/**
 * ANVESH Isolated Synthetic Demonstration Fixtures
 * 
 * STRICT COMPLIANCE RULE:
 * In development design-preview mode, the application uses solely synthetic demonstration data
 * with fictitious identifiers (DEMO-CXR-001, DEMO-CXR-002, DEMO-CXR-003). No real confidential
 * patient records or live model inference are invoked.
 * 
 * Images are safely loaded from the de-identified Indiana University CXR demo dataset (/demo_dataset).
 * All mutations (review decisions, submissions, uploads) in preview mode remain isolated local demo staging.
 */

import type { CaseRecord, CaseDetail, CaseImage, EvidenceRecord, PolicyRecord, ReviewRecord, SummaryData } from './api.ts';

export const DEMO_SUMMARY: SummaryData = {
  status: 'demonstration_preview',
  total_cases: 3,
  total_case_images: 3,
  total_evidence: 3,
  total_policies: 3,
  total_reviews: 2,
  classifications: {
    abnormal: 2,
    normal: 1
  },
  has_source_text: {
    present: 3,
    absent: 0
  },
  raw_model_output: {
    present: 3,
    null: 0
  },
  batch_coverage: {
    demo_batch: { cases: 3, status: 'synthetic_demonstration_isolated' }
  }
};

export const DEMO_CASES: CaseRecord[] = [
  {
    case_id: 'DEMO-CXR-001',
    patient_id: 'DEMO-MEM-0042',
    classification: 'abnormal',
    indication: 'Progressive exertional dyspnea x 3 weeks. Rule out cardiomegaly or pleural effusion.',
    requested_procedure: 'Chest Radiography (2 Views PA/LAT)',
    service_type: 'Chest Radiography (2 Views PA/LAT)',
    has_source_text: true,
    created_at: '2026-10-01T09:15:00Z'
  },
  {
    case_id: 'DEMO-CXR-002',
    patient_id: 'DEMO-MEM-0089',
    classification: 'abnormal',
    indication: 'Productive cough, fever up to 38.6°C, and pleuritic chest pain x 4 days. Evaluate for pneumonia.',
    requested_procedure: 'Chest Radiography (Single View Frontal)',
    service_type: 'Chest Radiography (Single View Frontal)',
    has_source_text: true,
    created_at: '2026-10-02T11:30:00Z'
  },
  {
    case_id: 'DEMO-CXR-003',
    patient_id: 'DEMO-MEM-0120',
    classification: 'normal',
    indication: 'Pre-operative pulmonary clearance evaluation for elective knee replacement.',
    requested_procedure: 'Chest Radiography (2 Views PA/LAT)',
    service_type: 'Chest Radiography (2 Views PA/LAT)',
    has_source_text: true,
    created_at: '2026-10-03T14:45:00Z'
  },
  // Backward compatibility alias for any existing reference
  {
    case_id: 'DEMO-CASE-101',
    patient_id: 'DEMO-MEM-0042',
    classification: 'abnormal',
    indication: 'Progressive exertional dyspnea x 3 weeks. Rule out cardiomegaly or pleural effusion.',
    requested_procedure: 'Chest Radiography (2 Views PA/LAT)',
    service_type: 'Chest Radiography (2 Views PA/LAT)',
    has_source_text: true,
    created_at: '2026-10-01T09:15:00Z'
  }
];

export const DEMO_CASE_DETAILS: Record<string, CaseDetail> = {
  'DEMO-CXR-001': {
    case_id: 'DEMO-CXR-001',
    patient_id: 'DEMO-MEM-0042',
    classification: 'abnormal',
    indication: 'Progressive exertional dyspnea x 3 weeks. Rule out cardiomegaly or pleural effusion.',
    findings: 'Cardiomegaly noted with cardiothoracic ratio > 0.54. Blunting of the left costophrenic angle consistent with small pleural effusion. Right lung field clear without focal consolidation.',
    impression: 'Mild cardiomegaly with small left-sided pleural effusion. Clinical correlation advised for congestive heart failure.',
    requested_procedure: 'Chest Radiography (2 Views PA/LAT)',
    service_type: 'Chest Radiography (2 Views PA/LAT)',
    has_source_text: true,
    clinical_notes: 'INDICATION: Progressive exertional dyspnea x 3 weeks. Rule out cardiomegaly or pleural effusion.\n\nFINDINGS: Cardiomegaly noted with cardiothoracic ratio > 0.54. Blunting of left costophrenic angle consistent with small pleural effusion. Right lung field clear without focal consolidation.\n\nIMPRESSION: Mild cardiomegaly with small left-sided pleural effusion. Clinical correlation advised.',
    created_at: '2026-10-01T09:15:00Z',
    images: [
      {
        id: 901,
        case_id: 1,
        filename: 'cxr_frontal_pa.png',
        projection: 'PA',
        file_path: 'cases/DEMO-CXR-001/image/cxr_frontal_pa.png',
        image_url: '/demo_dataset/cases/DEMO-CXR-001/image/cxr_frontal_pa.png'
      }
    ],
    evidence: {
      id: 801,
      case_id: 1,
      image_evidence: {
        modality: 'Radiography',
        body_part: 'Chest',
        findings: ['Cardiomegaly', 'Left pleural effusion'],
        abnormalities: ['Cardiac silhouette enlargement', 'Costophrenic angle blunting'],
        impression_summary: 'Precomputed Research Output: Cardiomegaly with small left pleural effusion.'
      },
      text_image_consistency: {
        consistent: true,
        clinical_consistency_score: 0.94,
        notes: 'High concordance between radiographic findings and preliminary narrative.'
      },
      clinical_support: {
        supported: true,
        clinical_support_score: 0.88,
        reason: 'Radiographic abnormalities directly substantiate stated dyspnea indication.'
      },
      raw_model_output: 'Fine-Tuned LLaVA-1.5-7B (Primary Model)'
    }
  },
  'DEMO-CXR-002': {
    case_id: 'DEMO-CXR-002',
    patient_id: 'DEMO-MEM-0089',
    classification: 'abnormal',
    indication: 'Productive cough, fever up to 38.6°C, and pleuritic chest pain x 4 days. Evaluate for pneumonia.',
    findings: 'Patchy alveolar airspace consolidation noted in the right lower lobe base. Right hemidiaphragm partially obscured. Left lung remains clear without effusion.',
    impression: 'Right lower lobe infiltrate, compatible with bacterial pneumonia.',
    requested_procedure: 'Chest Radiography (Single View Frontal)',
    service_type: 'Chest Radiography (Single View Frontal)',
    has_source_text: true,
    clinical_notes: 'INDICATION: Productive cough, fever up to 38.6°C, and pleuritic chest pain x 4 days.\n\nFINDINGS: Patchy alveolar airspace consolidation in right lower lobe base. Right hemidiaphragm obscured.\n\nIMPRESSION: Right lower lobe infiltrate, compatible with community-acquired pneumonia.',
    created_at: '2026-10-02T11:30:00Z',
    images: [
      {
        id: 902,
        case_id: 2,
        filename: 'cxr_frontal_pa.png',
        projection: 'PA',
        file_path: 'cases/DEMO-CXR-002/image/cxr_frontal_pa.png',
        image_url: '/demo_dataset/cases/DEMO-CXR-002/image/cxr_frontal_pa.png'
      }
    ],
    evidence: {
      id: 802,
      case_id: 2,
      image_evidence: {
        modality: 'Radiography',
        body_part: 'Chest',
        findings: ['Right basilar consolidation', 'Pneumonia infiltrate'],
        abnormalities: ['Right lower lobe airspace opacity', 'Silhouette sign right hemidiaphragm'],
        impression_summary: 'Precomputed Research Output: Patchy alveolar consolidation consistent with pneumonia.'
      },
      text_image_consistency: {
        consistent: true,
        clinical_consistency_score: 0.91,
        notes: 'High concordance with febrile respiratory presentation.'
      },
      clinical_support: {
        supported: true,
        clinical_support_score: 0.85,
        reason: 'Radiographic infiltrate substantiates lower respiratory infectious treatment.'
      },
      raw_model_output: 'Fine-Tuned LLaVA-1.5-7B (Primary Model)'
    }
  },
  'DEMO-CXR-003': {
    case_id: 'DEMO-CXR-003',
    patient_id: 'DEMO-MEM-0120',
    classification: 'normal',
    indication: 'Pre-operative pulmonary clearance evaluation for elective knee replacement.',
    findings: 'Lungs are well-expanded and clear of focal infiltrates, effusions, or pneumothorax. Cardiothoracic ratio is normal (<0.50). Bony thorax intact.',
    impression: 'Normal frontal chest radiograph. No acute cardiopulmonary disease.',
    requested_procedure: 'Chest Radiography (2 Views PA/LAT)',
    service_type: 'Chest Radiography (2 Views PA/LAT)',
    has_source_text: true,
    clinical_notes: 'INDICATION: Pre-operative pulmonary clearance evaluation for elective knee replacement.\n\nFINDINGS: Clear lung fields, normal cardiothoracic ratio, intact thoracic cage.\n\nIMPRESSION: Normal examination. Clear for elective surgical anesthesia.',
    created_at: '2026-10-03T14:45:00Z',
    images: [
      {
        id: 903,
        case_id: 3,
        filename: 'cxr_frontal_pa.png',
        projection: 'PA',
        file_path: 'cases/DEMO-CXR-003/image/cxr_frontal_pa.png',
        image_url: '/demo_dataset/cases/DEMO-CXR-003/image/cxr_frontal_pa.png'
      }
    ],
    evidence: {
      id: 803,
      case_id: 3,
      image_evidence: {
        modality: 'Radiography',
        body_part: 'Chest',
        findings: ['Clear lung fields', 'Normal cardiac silhouette'],
        abnormalities: [],
        impression_summary: 'Precomputed Research Output: Normal baseline study with no acute findings.'
      },
      text_image_consistency: {
        consistent: true,
        clinical_consistency_score: 0.96,
        notes: 'High concordance for unremarkable pre-surgical baseline.'
      },
      clinical_support: {
        supported: true,
        clinical_support_score: 0.90,
        reason: 'Satisfies standard pre-operative clearance protocol.'
      },
      raw_model_output: 'Fine-Tuned LLaVA-1.5-7B (Primary Model)'
    }
  }
};

// Alias DEMO-CASE-101 to DEMO-CXR-001
DEMO_CASE_DETAILS['DEMO-CASE-101'] = DEMO_CASE_DETAILS['DEMO-CXR-001'];
DEMO_CASE_DETAILS['DEMO-CASE-102'] = DEMO_CASE_DETAILS['DEMO-CXR-002'];
DEMO_CASE_DETAILS['DEMO-CASE-103'] = DEMO_CASE_DETAILS['DEMO-CXR-003'];

export const DEMO_CASE_IMAGES: Record<string, CaseImage[]> = {
  'DEMO-CXR-001': [
    {
      id: 901,
      image_id: 901,
      case_id: 1,
      filename: 'cxr_frontal_pa.png',
      projection: 'Frontal',
      view_type: 'PA Chest (Frontal Projection)',
      file_path: 'cases/DEMO-CXR-001/image/cxr_frontal_pa.png',
      image_url: '/cxr_frontal_pa.png'
    },
    {
      id: 902,
      image_id: 902,
      case_id: 1,
      filename: 'cxr_lateral.png',
      projection: 'Lateral',
      view_type: 'Lateral Chest (Lateral Projection)',
      file_path: 'cases/DEMO-CXR-001/image/cxr_lateral.png',
      image_url: '/cxr_lateral.png'
    }
  ],
  'DEMO-CXR-002': [
    {
      id: 903,
      image_id: 903,
      case_id: 2,
      filename: 'cxr_frontal_pa.png',
      projection: 'Frontal',
      view_type: 'PA Chest (Frontal Projection)',
      file_path: 'cases/DEMO-CXR-002/image/cxr_frontal_pa.png',
      image_url: '/cxr_frontal_pa.png'
    },
    {
      id: 904,
      image_id: 904,
      case_id: 2,
      filename: 'cxr_lateral.png',
      projection: 'Lateral',
      view_type: 'Lateral Chest (Lateral Projection)',
      file_path: 'cases/DEMO-CXR-002/image/cxr_lateral.png',
      image_url: '/cxr_lateral.png'
    }
  ],
  'DEMO-CXR-003': [
    {
      id: 905,
      image_id: 905,
      case_id: 3,
      filename: 'cxr_frontal_pa.png',
      projection: 'Frontal',
      view_type: 'PA Chest (Frontal Projection)',
      file_path: 'cases/DEMO-CXR-003/image/cxr_frontal_pa.png',
      image_url: '/cxr_frontal_pa.png'
    },
    {
      id: 906,
      image_id: 906,
      case_id: 3,
      filename: 'cxr_lateral.png',
      projection: 'Lateral',
      view_type: 'Lateral Chest (Lateral Projection)',
      file_path: 'cases/DEMO-CXR-003/image/cxr_lateral.png',
      image_url: '/cxr_lateral.png'
    }
  ]
};

DEMO_CASE_IMAGES['DEMO-CASE-101'] = DEMO_CASE_IMAGES['DEMO-CXR-001'];
DEMO_CASE_IMAGES['DEMO-CASE-102'] = DEMO_CASE_IMAGES['DEMO-CXR-002'];
DEMO_CASE_IMAGES['DEMO-CASE-103'] = DEMO_CASE_IMAGES['DEMO-CXR-003'];

export const DEMO_CASE_EVIDENCE: Record<string, EvidenceRecord> = {
  'DEMO-CXR-001': {
    id: 801,
    evidence_id: 801,
    case_id: 1,
    evidence_score: 0.88,
    image_findings: 'Cardiomegaly with blunted left costophrenic angle (Precomputed Research Output).',
    text_image_consistency: 'Consistent (High multimodal agreement 0.94)',
    clinical_support: 'Evidence supports stated clinical indication for diagnostic imaging (Score 0.88)',
    raw_model_output: 'Fine-Tuned LLaVA-1.5-7B (Primary Model)',
    image_evidence: {
      modality: 'Radiography',
      body_part: 'Chest',
      findings: ['Cardiomegaly', 'Left pleural effusion'],
      abnormalities: ['Cardiac silhouette enlargement', 'Costophrenic blunting'],
      impression_summary: 'Cardiomegaly with small left pleural effusion.'
    }
  },
  'DEMO-CXR-002': {
    id: 802,
    evidence_id: 802,
    case_id: 2,
    evidence_score: 0.85,
    image_findings: 'Right lower lobe alveolar infiltrate consistent with acute pneumonia.',
    text_image_consistency: 'Consistent (High multimodal agreement 0.91)',
    clinical_support: 'Evidence supports lower respiratory antimicrobial management (Score 0.85)',
    raw_model_output: 'Fine-Tuned LLaVA-1.5-7B (Primary Model)',
    image_evidence: {
      modality: 'Radiography',
      body_part: 'Chest',
      findings: ['Right basilar consolidation', 'Pneumonia infiltrate'],
      abnormalities: ['Airspace opacity', 'Right hemidiaphragm silhouette'],
      impression_summary: 'Right lower lobe infiltrate, compatible with bacterial pneumonia.'
    }
  },
  'DEMO-CXR-003': {
    id: 803,
    evidence_id: 803,
    case_id: 3,
    evidence_score: 0.90,
    image_findings: 'Unremarkable clear chest radiograph. No acute infiltrates or cardiomegaly.',
    text_image_consistency: 'Consistent (High multimodal agreement 0.96)',
    clinical_support: 'Evidence supports standard pre-operative clearance protocol (Score 0.90)',
    raw_model_output: 'Fine-Tuned LLaVA-1.5-7B (Primary Model)',
    image_evidence: {
      modality: 'Radiography',
      body_part: 'Chest',
      findings: ['Clear lung fields', 'Normal cardiac silhouette'],
      abnormalities: [],
      impression_summary: 'Normal baseline frontal chest study.'
    }
  }
};

DEMO_CASE_EVIDENCE['DEMO-CASE-101'] = DEMO_CASE_EVIDENCE['DEMO-CXR-001'];
DEMO_CASE_EVIDENCE['DEMO-CASE-102'] = DEMO_CASE_EVIDENCE['DEMO-CXR-002'];
DEMO_CASE_EVIDENCE['DEMO-CASE-103'] = DEMO_CASE_EVIDENCE['DEMO-CXR-003'];

export const DEMO_POLICIES: PolicyRecord[] = [
  {
    plan_id: 'DEMO-PLAN-COMMERCIAL-01',
    policy_id: 'DEMO-POL-CARDIO-01',
    state: 'OR',
    plan_name: 'Apex Commercial Cardiac Diagnostic Prior-Auth Guidelines',
    is_covered: true,
    exclusions: ['Frequency limit: Exceeds 1 chest study per 7 days without documented acute clinical change', 'Routine screening in asymptomatic members'],
    copay: '$25.00',
    coinsurance: '10%',
    procedure_code: '71046',
    diagnosis_code: 'R06.02, I50.9',
    status: 'Covered'
  },
  {
    plan_id: 'DEMO-PLAN-MEDICARE-02',
    policy_id: 'DEMO-POL-PULM-02',
    state: 'OR',
    plan_name: 'Apex Medicare Advantage Lower Respiratory Diagnostic Policy',
    is_covered: true,
    exclusions: ['Routine annual employment clearance screening'],
    copay: '$0.00',
    coinsurance: '0%',
    procedure_code: '71045',
    diagnosis_code: 'J18.9, R05.9',
    status: 'Covered'
  },
  {
    plan_id: 'DEMO-PLAN-PREOP-03',
    policy_id: 'DEMO-POL-PREOP-03',
    state: 'OR',
    plan_name: 'Apex Pre-Operative Surgical Clearance Clinical Guidelines',
    is_covered: true,
    exclusions: ['Unconditional routine screening in asymptomatic ASA Class I patients without cardiac/pulmonary comorbidities'],
    copay: '$15.00',
    coinsurance: '10%',
    procedure_code: '71046',
    diagnosis_code: 'Z01.811',
    status: 'Covered'
  }
];

export const DEMO_REVIEWS: ReviewRecord[] = [
  {
    id: 991,
    review_id: 991,
    case_id: 'DEMO-CXR-001',
    plan_id: 'DEMO-PLAN-COMMERCIAL-01',
    evidence_score: 0.88,
    outcome_code: 'COVERED',
    requires_human_review: true,
    recommendation: 'AUTHORIZE',
    status: 'COMPLETED',
    confidence: 0.91,
    conflict_warnings: [],
    missing_information: [],
    risk_factors: [],
    reviewer_id: 'Dr. Elizabeth Thorne, MD (Demo Medical Director)',
    reviewer_decision: 'APPROVE',
    reviewer_notes: 'Demonstration Determination: Clinical indication and radiographic findings align with medical necessity criteria for cardiopulmonary evaluation.',
    final_decision: 'APPROVE',
    rationale: 'Demonstration Determination: Clinical indication and radiographic findings align with medical necessity criteria for cardiopulmonary evaluation.',
    created_at: '2026-10-04T16:00:00Z'
  },
  {
    id: 992,
    review_id: 992,
    case_id: 'DEMO-CXR-002',
    plan_id: 'DEMO-PLAN-MEDICARE-02',
    evidence_score: 0.65,
    outcome_code: 'INSUFFICIENT_INFORMATION',
    requires_human_review: true,
    recommendation: 'REQUEST_ADDITIONAL_INFO',
    status: 'COMPLETED',
    confidence: 0.68,
    conflict_warnings: [],
    missing_information: ['Attending physician progress notes clarifying antimicrobial treatment plan', 'Prior comparative imaging if available'],
    risk_factors: [],
    reviewer_id: 'Dr. Elizabeth Thorne, MD (Demo Medical Director)',
    reviewer_decision: 'REQUEST_MORE_INFO',
    reviewer_notes: 'Demonstration Determination: Requested clarification regarding attending clinical notes and treatment staging.',
    final_decision: 'REQUEST_MORE_INFO',
    rationale: 'Demonstration Determination: Requested clarification regarding attending clinical notes and treatment staging.',
    created_at: '2026-10-04T17:15:00Z'
  }
];

DEMO_REVIEWS.push({
  ...DEMO_REVIEWS[0],
  case_id: 'DEMO-CASE-101'
});

/**
 * Message triggered when an authenticated write action is attempted in development preview mode.
 */
export const PREVIEW_MUTATION_DISABLED_MESSAGE = 
  'ACTION DISABLED IN DEVELOPMENT PREVIEW MODE\n\n' +
  'This operation cannot be executed because ANVESH is currently operating in isolated ' +
  'Development Design Preview mode using synthetic demonstration fixtures.\n\n' +
  'Persisting clinical decisions, creating prior-authorization submissions, or modifying ' +
  'patient records requires an active, authenticated backend session with verified organization credentials.\n\n' +
  'No backend requests were dispatched.';
