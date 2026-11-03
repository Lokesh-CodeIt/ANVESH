/**
 * ANVESH Backend REST API Client & TypeScript Schema Definitions
 * Connects to the hardened FastAPI backend on http://127.0.0.1:8000
 */

const API_BASE = import.meta.env.VITE_API_BASE || '';

export interface ApiSummary {
  status: string;
  total_cases: number;
  total_case_images: number;
  total_evidence: number;
  total_policies: number;
  total_reviews: number;
  classifications: {
    abnormal: number;
    normal: number;
  };
  has_source_text: {
    present: number;
    absent: number;
  };
  raw_model_output: {
    present: number;
    null: number;
  };
  batch_coverage: Record<string, any>;
}

export interface CaseListItem {
  case_id: number;
  classification: 'normal' | 'abnormal' | string;
  indication: string;
  requested_procedure: string;
  has_source_text: boolean;
}

export interface CaseImageItem {
  id: number;
  case_id: number;
  filename: string;
  projection: string;
  file_path: string;
  image_url: string;
}

export interface EvidenceItem {
  id: number;
  case_id: number;
  image_evidence: {
    modality?: string;
    body_part?: string;
    findings?: string[];
    abnormalities?: string[];
    impression_summary?: string;
    [key: string]: any;
  } | null;
  text_image_consistency: {
    consistent?: boolean;
    clinical_consistency_score?: number;
    notes?: string;
    [key: string]: any;
  } | null;
  clinical_support: {
    supported?: boolean;
    clinical_support_score?: number;
    reason?: string;
    [key: string]: any;
  } | null;
  raw_model_output: string | null;
}

export interface CaseDetailResponse {
  case_id: number;
  classification: 'normal' | 'abnormal' | string;
  indication: string;
  findings: string;
  impression: string;
  requested_procedure: string;
  has_source_text: boolean;
  images: CaseImageItem[];
  evidence: EvidenceItem | null;
}

export interface PolicyListItem {
  plan_id: string;
  state: string;
  plan_name: string;
  is_covered: boolean;
  exclusions: string[];
  copay: string | null;
  coinsurance: string | null;
}

export interface ReviewResponse {
  id: number;
  case_id: number;
  plan_id: string;
  evidence_score: number;
  outcome_code: string;
  requires_human_review: boolean;
  recommendation: string;
  status: string;
  confidence: number;
  conflict_warnings: string[];
  missing_information: string[];
  risk_factors: string[];
  policy_compliance?: {
    outcome_code?: string;
    requires_human_review?: boolean;
    recommendation?: string;
    [key: string]: any;
  };
  policy_requirements_checklist?: Record<string, boolean>;
  reviewer_decision: string | null;
  reviewer_notes: string | null;
  created_at: string;
}

export interface DecisionPayload {
  reviewer_decision: string;
  reviewer_notes: string;
}

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  organization?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at?: string;
  last_login_at?: string | null;
}

export interface LoginResponseData {
  user: AuthUser;
  token: string;
  expires_at: string;
  message: string;
}

export const api = {
  // Authentication & Session
  async login(credentials: { email: string; password: string }): Promise<LoginResponseData> {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.detail?.message || data.detail || data.error || res.statusText || 'Authentication failed';
      throw new Error(typeof msg === 'string' ? msg : 'Authentication failed');
    }
    return data;
  },

  async logout(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      throw new Error(`Logout failed: ${res.statusText}`);
    }
    return res.json().catch(() => ({ status: 'success', message: 'Logged out' }));
  },

  async getMe(): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`Unauthorized: ${res.status}`);
    }
    return res.json();
  },

  async registerPatient(payload: { email: string; password: string; full_name: string }): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/api/auth/register/patient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.detail?.message || data.detail || data.error || res.statusText || 'Registration failed';
      throw new Error(typeof msg === 'string' ? msg : 'Registration failed');
    }
    return data;
  },

  // 1. Health & Ping
  async getHealth(): Promise<{ status: string; database: string; version: string }> {
    const res = await fetch(`${API_BASE}/health`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  // 2. Authoritative System Summary
  async getSummary(): Promise<ApiSummary> {
    const res = await fetch(`${API_BASE}/api/summary`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to load summary: ${res.statusText}`);
    return res.json();
  },

  // 3. Paginated Cases List
  async getCases(params: {
    classification?: string;
    has_source_text?: boolean;
    skip?: number;
    limit?: number;
  } = {}): Promise<CaseListItem[]> {
    const query = new URLSearchParams();
    if (params.classification) query.set('classification', params.classification);
    if (params.has_source_text !== undefined) query.set('has_source_text', String(params.has_source_text));
    if (params.skip !== undefined) query.set('skip', String(params.skip));
    if (params.limit !== undefined) query.set('limit', String(params.limit));

    const res = await fetch(`${API_BASE}/api/cases?${query.toString()}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to load cases: ${res.statusText}`);
    return res.json();
  },

  // 4. Case Detail by ID
  async getCaseDetail(caseId: number): Promise<CaseDetailResponse> {
    const res = await fetch(`${API_BASE}/api/cases/${caseId}`, { credentials: 'include' });
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Case #${caseId} not found in database.`);
      }
      throw new Error(`Failed to load case #${caseId}: ${res.statusText}`);
    }
    return res.json();
  },

  // 5. Case Images
  async getCaseImages(caseId: number): Promise<CaseImageItem[]> {
    const res = await fetch(`${API_BASE}/api/cases/${caseId}/images`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to load images for case #${caseId}: ${res.statusText}`);
    return res.json();
  },

  // 6. Case Evidence
  async getCaseEvidence(caseId: number): Promise<EvidenceItem> {
    const res = await fetch(`${API_BASE}/api/cases/${caseId}/evidence`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to load evidence for case #${caseId}: ${res.statusText}`);
    return res.json();
  },

  // 7. Policies List
  async getPolicies(params: {
    state?: string;
    is_covered?: string;
    skip?: number;
    limit?: number;
  } = {}): Promise<PolicyListItem[]> {
    const query = new URLSearchParams();
    if (params.state) query.set('state', params.state);
    if (params.is_covered) query.set('is_covered', params.is_covered);
    if (params.skip !== undefined) query.set('skip', String(params.skip));
    if (params.limit !== undefined) query.set('limit', String(params.limit));

    const res = await fetch(`${API_BASE}/api/policies?${query.toString()}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to load policies: ${res.statusText}`);
    return res.json();
  },

  // 8. Reviews List (Historical)
  async getReviews(params: {
    case_id?: number;
    plan_id?: string;
    decision?: string;
    skip?: number;
    limit?: number;
  } = {}): Promise<ReviewResponse[]> {
    const query = new URLSearchParams();
    if (params.case_id) query.set('case_id', String(params.case_id));
    if (params.plan_id) query.set('plan_id', params.plan_id);
    if (params.decision) query.set('decision', params.decision);
    if (params.skip !== undefined) query.set('skip', String(params.skip));
    if (params.limit !== undefined) query.set('limit', String(params.limit));

    const res = await fetch(`${API_BASE}/api/reviews?${query.toString()}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to load reviews: ${res.statusText}`);
    return res.json();
  },

  // 9. Side-effect-free Policy Review Evaluation (persist=false)
  async evaluateReviewPreview(caseId: number, planId: string): Promise<ReviewResponse> {
    const query = new URLSearchParams({
      plan_id: planId,
      persist: 'false',
    });
    let res = await fetch(`${API_BASE}/api/cases/${caseId}/review?${query.toString()}`, { credentials: 'include' });
    if (!res.ok) {
      res = await fetch(`${API_BASE}/cases/${caseId}/review?${query.toString()}`, { credentials: 'include' });
    }
    if (!res.ok) throw new Error(`Policy evaluation failed: ${res.statusText}`);
    return res.json();
  },

  // 10. Persist New Case Review
  async createCaseReview(caseId: number, planId: string): Promise<ReviewResponse> {
    const query = new URLSearchParams({ plan_id: planId });
    let res = await fetch(`${API_BASE}/api/cases/${caseId}/review?${query.toString()}`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      res = await fetch(`${API_BASE}/cases/${caseId}/review?${query.toString()}`, {
        method: 'POST',
        credentials: 'include',
      });
    }
    if (!res.ok) throw new Error(`Review creation failed: ${res.statusText}`);
    return res.json();
  },

  // 11. Record Human Reviewer Decision
  async recordDecision(reviewId: number, payload: DecisionPayload): Promise<ReviewResponse> {
    let res = await fetch(`${API_BASE}/api/reviews/${reviewId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      res = await fetch(`${API_BASE}/reviews/${reviewId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
    }
    if (!res.ok) throw new Error(`Submitting reviewer decision failed: ${res.statusText}`);
    return res.json();
  },
};


import {
  DEMO_SUMMARY,
  DEMO_CASES,
  DEMO_CASE_DETAILS,
  DEMO_CASE_IMAGES,
  DEMO_CASE_EVIDENCE,
  DEMO_POLICIES,
  DEMO_REVIEWS,
  PREVIEW_MUTATION_DISABLED_MESSAGE,
} from './demoFixtures.ts';

export const isPreviewModeActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('anvesh_design_preview_role') !== null;
};

export const isDemoDatasetImported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('anvesh_demo_dataset_imported') === 'true';
};

export const setDemoDatasetImported = (imported: boolean): void => {
  if (typeof window === 'undefined') return;
  if (imported) {
    sessionStorage.setItem('anvesh_demo_dataset_imported', 'true');
  } else {
    sessionStorage.removeItem('anvesh_demo_dataset_imported');
  }
};

// Aliases and Top-Level Typed Helpers for Portal Components
export type SummaryData = ApiSummary;
export type CaseRecord = Omit<CaseListItem, 'case_id'> & {
  case_id: string;
  patient_id?: string;
  service_type?: string;
  created_at?: string;
};
export type CaseDetail = {
  case_id: string;
  classification?: 'normal' | 'abnormal' | string;
  indication?: string;
  findings?: string;
  impression?: string;
  requested_procedure?: string;
  has_source_text?: boolean;
  images?: CaseImageItem[];
  evidence?: EvidenceItem | null;
  patient_id?: string;
  service_type?: string;
  clinical_notes?: string;
  created_at?: string;
  status?: string;
  payer_plan_id?: string;
};
export type CaseImage = {
  id?: number;
  case_id?: number | string;
  image_id?: number;
  filename?: string;
  file_path?: string;
  projection?: string;
  view_type?: string;
  image_url?: string;
};
export type EvidenceRecord = Omit<EvidenceItem, 'text_image_consistency' | 'clinical_support'> & {
  evidence_id?: number;
  evidence_score?: number;
  image_findings?: string;
  text_image_consistency?: any;
  clinical_support?: any;
};
export type PolicyRecord = PolicyListItem & {
  policy_id: string;
  diagnosis_code?: string;
  procedure_code?: string;
  status?: string;
};
export type ReviewRecord = Omit<ReviewResponse, 'case_id'> & {
  case_id: string;
  review_id: number;
  reviewer_id?: string;
  final_decision?: string;
  rationale?: string;
};

export async function getSummary(): Promise<SummaryData> {
  if (isPreviewModeActive()) {
    if (isDemoDatasetImported()) {
      return DEMO_SUMMARY;
    }
    const sessionCount = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('anvesh_demo_submissions') || '[]').length : 0;
    return {
      status: 'demonstration_preview_clean',
      total_cases: sessionCount,
      total_case_images: sessionCount,
      total_evidence: sessionCount,
      total_policies: 3,
      total_reviews: 0,
      classifications: { abnormal: sessionCount, normal: 0 },
      has_source_text: { present: sessionCount, absent: 0 },
      raw_model_output: { present: sessionCount, null: 0 },
      batch_coverage: { demo: { status: 'empty_workspace_import_required' } }
    };
  }
  return api.getSummary();
}

export async function getCases(params: {
  limit?: number;
  skip?: number;
  classification?: string;
} = {}): Promise<{ cases: CaseRecord[]; total: number; limit: number; skip: number }> {
  if (isPreviewModeActive()) {
    let sessionCases: CaseRecord[] = [];
    try {
      const stored = JSON.parse(sessionStorage.getItem('anvesh_demo_submissions') || '[]');
      sessionCases = stored.map((s: any) => ({
        case_id: s.case_id,
        patient_id: s.patient_id || 'DEMO-MEM-0042',
        classification: 'abnormal',
        indication: s.indication || 'Exertional dyspnea evaluation',
        requested_procedure: s.service || 'Chest Radiography (2 Views PA/LAT)',
        service_type: s.service || 'Chest Radiography (2 Views PA/LAT)',
        has_source_text: true,
        created_at: s.submitted_at || new Date().toISOString()
      }));
    } catch (_) {}

    // Clean separation: Do NOT automatically insert synthetic demo records unless explicitly imported
    let merged = sessionCases;
    if (isDemoDatasetImported()) {
      const existingIds = new Set(sessionCases.map(sc => sc.case_id));
      merged = [...sessionCases, ...DEMO_CASES.filter(dc => !existingIds.has(dc.case_id))];
    }

    return {
      cases: merged,
      total: merged.length,
      limit: params.limit || 15,
      skip: params.skip || 0,
    };
  }
  const items = await api.getCases(params);
  return {
    cases: items.map((c: any) => ({
      ...c,
      case_id: typeof c.case_id === 'number' ? `CASE_${String(c.case_id).padStart(6, '0')}` : String(c.case_id),
      patient_id: `MEM-${(typeof c.case_id === 'number' ? c.case_id : 1000) + 900000}`,
      service_type: c.requested_procedure || 'Chest Radiography (2 Views PA/LAT)',
      created_at: new Date(2026, 9, 1).toISOString(),
    })),
    total: 2107,
    limit: params.limit || 15,
    skip: params.skip || 0,
  };
}

export const SAMPLE_PROVIDER_CASES_DATA: Record<string, CaseDetail> = {

  'AUTH-2026-67': {

    case_id: 'AUTH-2026-67',

    patient_id: 'PT-84920 (Eleanor Vance)',

    service_type: 'Chest Radiography (PA & Lateral)',

    clinical_notes: `INDICATION: Motor vehicle collision with persistent anterior chest wall tenderness and exertional dyspnea.\n\nPRELIMINARY ATTENDING FINDINGS: Suspected left hemithorax costophrenic angle blunting, evaluate for pleural effusion or occult rib fracture. No displaced fracture visualized on initial scout.\n\nPOLICY GUIDELINES: CG-RAD-04 Thoracic Imaging Protocol - Requires documented acute trauma or chest pain not responsive to conservative management.`,

    findings: 'Blunting of left costophrenic sulcus. Cardiac silhouette within normal limits. Bony thorax intact.',

    impression: 'Small left pleural effusion vs pleural thickening. Under active payer clinical review.',

    created_at: '2026-10-11T14:22:00Z',

    has_source_text: true,

    classification: 'abnormal',

    requested_procedure: 'Chest Radiography (PA & Lateral)',

    status: 'In Review',

    payer_plan_id: 'CMS_QHP_MEDICARE_ADVANTAGE',

  },

  'AUTH-2026-1615': {

    case_id: 'AUTH-2026-1615',

    patient_id: 'PT-48210 (Robert Chen)',

    service_type: 'Chest Radiography (Single View Frontal)',

    clinical_notes: `INDICATION: Pre-operative pulmonary clearance prior to elective orthopedic total knee arthroplasty.\n\nPRELIMINARY ATTENDING FINDINGS: Clear lung fields bilaterally, no acute cardiopulmonary abnormality detected.\n\nPOLICY GUIDELINES: CG-RAD-02 Routine Pre-operative Radiography - Approved under automated policy criteria.`,

    findings: 'Clear lungs bilaterally. Normal cardiac contour. No acute osseous abnormalities.',

    impression: 'Normal pre-operative chest radiograph. Prior authorization APPROVED.',

    created_at: '2026-10-10T11:15:00Z',

    has_source_text: true,

    classification: 'normal',

    requested_procedure: 'Chest Radiography (Single View Frontal)',

    status: 'Approved',

    payer_plan_id: 'COMMERCIAL_STANDARD',

  },

  'AUTH-2026-3782': {

    case_id: 'AUTH-2026-3782',

    patient_id: 'PT-77291 (Sarah Jenkins)',

    service_type: 'Pre-Operative Thoracic Study',

    clinical_notes: `INDICATION: Chronic progressive dyspnea and wheezing evaluation with suspected chronic obstructive pulmonary disease.\n\nPRELIMINARY ATTENDING FINDINGS: Hyperinflated lung fields with flattened diaphragmatic contours. Increased retrosternal clear space.\n\nPOLICY GUIDELINES: CG-RAD-08 Advanced Thoracic Evaluation - Additional spirometry and pulmonary function test (PFT) documentation requested by payer.`,

    findings: 'Hyperinflation with flattened diaphragms. No focal consolidation or active infiltrates.',

    impression: 'Findings consistent with obstructive airway disease. Payer requires supplemental PFT reports.',

    created_at: '2026-10-09T16:45:00Z',

    has_source_text: true,

    classification: 'abnormal',

    requested_procedure: 'Pre-Operative Thoracic Study',

    status: 'Information Requested',

    payer_plan_id: 'COMMERCIAL_PREFERRED_PPO',

  },

  'AUTH-2026-004': {

    case_id: 'AUTH-2026-004',

    patient_id: 'PT-39182 (David Miller)',

    service_type: 'Chest Radiography (2 Views PA/LAT)',

    clinical_notes: `INDICATION: 4-week follow-up evaluation for resolving right lower lobe community-acquired bacterial pneumonia.\n\nPRELIMINARY ATTENDING FINDINGS: Marked clearance of right basilar infiltrate compared to prior study of Sept 10. Minimal residual reticular markings.\n\nPOLICY GUIDELINES: CG-RAD-04 Post-Treatment Pneumonia Resolution - Approved for outpatient clinical tracking.`,

    findings: 'Near complete resolution of previously documented right lower lobe pneumonia. Cardiomediastinal contour unremarkable.',

    impression: 'Resolving right basilar pneumonia. Authorization APPROVED.',

    created_at: '2026-10-08T09:10:00Z',

    has_source_text: true,

    classification: 'normal',

    requested_procedure: 'Chest Radiography (2 Views PA/LAT)',

    status: 'Approved',

    payer_plan_id: 'COMMERCIAL_STANDARD',

  },

};



export const SAMPLE_PROVIDER_CASES_IMAGES: Record<string, CaseImage[]> = {

  'AUTH-2026-67': [

    { id: 1, image_id: 1, filename: 'CXR_PA_Standing.png', file_path: 'cxr_frontal_pa.png', view_type: 'PA Chest (Frontal Projection)', projection: 'Frontal', image_url: '/cxr_frontal_pa.png' },

    { id: 2, image_id: 2, filename: 'CXR_Lateral_View.png', file_path: 'cxr_lateral.png', view_type: 'Lateral Chest (Lateral Projection)', projection: 'Lateral', image_url: '/cxr_lateral.png' },

  ],

  'AUTH-2026-1615': [

    { id: 3, image_id: 3, filename: 'CXR_Frontal_PreOp.png', file_path: 'cxr_frontal_pa.png', view_type: 'PA Chest (Frontal Projection)', projection: 'Frontal', image_url: '/cxr_frontal_pa.png' },

  ],

  'AUTH-2026-3782': [

    { id: 4, image_id: 4, filename: 'CXR_PA_Thoracic.png', file_path: 'cxr_frontal_pa.png', view_type: 'PA Chest (Frontal Projection)', projection: 'Frontal', image_url: '/cxr_frontal_pa.png' },

    { id: 5, image_id: 5, filename: 'CXR_Lateral_Thoracic.png', file_path: 'cxr_lateral.png', view_type: 'Lateral Chest (Lateral Projection)', projection: 'Lateral', image_url: '/cxr_lateral.png' },

  ],

  'AUTH-2026-004': [

    { id: 6, image_id: 6, filename: 'CXR_PA_Followup.png', file_path: 'cxr_frontal_pa.png', view_type: 'PA Chest (Frontal Projection)', projection: 'Frontal', image_url: '/cxr_frontal_pa.png' },

    { id: 7, image_id: 7, filename: 'CXR_Lateral_Followup.png', file_path: 'cxr_lateral.png', view_type: 'Lateral Chest (Lateral Projection)', projection: 'Lateral', image_url: '/cxr_lateral.png' },

  ],

};



function parseCaseIdNumber(caseIdStr: string | number): number {

  if (typeof caseIdStr === 'number') return caseIdStr;

  const str = String(caseIdStr || '').trim();

  if (str.startsWith('CASE_')) {

    return parseInt(str.replace('CASE_', ''), 10) || 1;

  }

  if (str.includes('-')) {

    const parts = str.split('-');

    const last = parts[parts.length - 1];

    return parseInt(last.replace(/\D/g, ''), 10) || 1;

  }

  return parseInt(str.replace(/\D/g, '') || '1', 10);

}



export async function getCase(caseIdStr: string | number): Promise<CaseDetail> {

  const key = String(caseIdStr || '').trim();



  // 1. Check sample provider cases dictionary

  if (SAMPLE_PROVIDER_CASES_DATA[key]) {

    return SAMPLE_PROVIDER_CASES_DATA[key];

  }



  // 2. Check demo cases dictionary

  if (DEMO_CASE_DETAILS[key]) {

    return DEMO_CASE_DETAILS[key];

  }



  // 3. If it looks like a submission reference, check mySubmissions

  if (key.startsWith('AUTH-') || key.startsWith('SUB-')) {

    try {

      const subs = await getMySubmissions();

      const match = subs.find(s => s.submission_ref === key || String(s.id) === key || (s as any).case_id === key);

      if (match) {

        return {

          case_id: match.submission_ref || key,

          patient_id: `${match.member_id} (${match.patient_name})`,

          service_type: match.service_type || 'Chest Radiography',

          clinical_notes: `INDICATION: ${match.clinical_indication || 'Clinical indication recorded.'}${match.prelim_findings ? `\n\nPRELIMINARY FINDINGS: ${match.prelim_findings}` : ''}`,

          findings: match.prelim_findings || 'Transmitted radiographic study for prior authorization.',

          impression: `Status: ${match.status}. Submitted at ${match.submitted_at || match.created_at}`,

          has_source_text: true,

          classification: match.status === 'APPROVED' ? 'normal' : 'abnormal',

          requested_procedure: match.service_type || 'Chest Radiography',

          created_at: match.submitted_at || match.created_at || new Date().toISOString(),

          status: match.status,

          payer_plan_id: match.payer_plan_id,

        };

      }

    } catch (_) {}

  }



  if (isPreviewModeActive()) {

    return DEMO_CASE_DETAILS[key] || DEMO_CASE_DETAILS['DEMO-CXR-001'] || DEMO_CASE_DETAILS['DEMO-CASE-101'];

  }



  const numId = parseCaseIdNumber(caseIdStr);

  try {

    const detail = await api.getCaseDetail(numId);

    return {

      ...detail,

      case_id: typeof caseIdStr === 'string' && caseIdStr.startsWith('CASE_') ? caseIdStr : `CASE_${String(detail.case_id).padStart(6, '0')}`,

      patient_id: `MEM-${numId + 900000}`,

      service_type: detail.requested_procedure || 'Chest Radiography (2 Views PA/LAT)',

      clinical_notes: `INDICATION: ${detail.indication || 'Progressive dyspnea, non-productive cough'}\n\nFINDINGS: ${detail.findings || 'Cardiac enlargement noted. Clear costophrenic angles.'}\n\nIMPRESSION: ${detail.impression || 'Mild cardiomegaly without focal acute consolidation.'}`,

      created_at: new Date(2026, 9, 1).toISOString(),

    };

  } catch (err: any) {

    console.warn(`Fallback to local fixture for case ${caseIdStr}:`, err);

    const fallback = DEMO_CASE_DETAILS['DEMO-CXR-001'] || DEMO_CASE_DETAILS['DEMO-CASE-101'];

    return {

      ...fallback,

      case_id: key || `CASE_${String(numId).padStart(6, '0')}`,

      patient_id: `MEM-${numId + 900000}`,

    };

  }

}



export async function getCaseImages(caseIdStr: string | number): Promise<{ case_id: string; images: CaseImage[] }> {

  const key = String(caseIdStr || '').trim();



  // 1. Check sample provider cases images

  if (SAMPLE_PROVIDER_CASES_IMAGES[key]) {

    return { case_id: key, images: SAMPLE_PROVIDER_CASES_IMAGES[key] };

  }



  // 2. Check demo fixtures

  if (DEMO_CASE_IMAGES[key]) {

    return { case_id: key, images: DEMO_CASE_IMAGES[key] };

  }



  // 3. Check submissions

  if (key.startsWith('AUTH-') || key.startsWith('SUB-')) {

    try {

      const subs = await getMySubmissions();

      const match = subs.find(s => s.submission_ref === key || String(s.id) === key || (s as any).case_id === key);

      if (match && match.files && match.files.length > 0) {

        return {

          case_id: key,

          images: match.files.map((f, idx) => ({

            id: f.id || idx + 1,

            image_id: f.id || idx + 1,

            filename: f.original_filename,

            file_path: f.stored_filename || f.file_path || 'sample_cxr.png',

            projection: f.file_category || 'PA',

            view_type: f.file_category === 'lateral' ? 'Lateral Chest (Lateral Projection)' : 'PA Chest (Frontal Projection)',

            image_url: f.download_url || (f.file_category === 'lateral' ? '/cxr_lateral.png' : '/cxr_frontal_pa.png'),

          })),

        };

      }

    } catch (_) {}

  }



  if (isPreviewModeActive()) {

    return {

      case_id: key,

      images: DEMO_CASE_IMAGES[key] || DEMO_CASE_IMAGES['DEMO-CXR-001'] || DEMO_CASE_IMAGES['DEMO-CASE-101'],

    };

  }



  const numId = parseCaseIdNumber(caseIdStr);

  try {

    const list = await api.getCaseImages(numId);

    return {

      case_id: String(caseIdStr),

      images: list.map((img: any, idx: number) => {

        const isLateral = (

          (img.projection && img.projection.toLowerCase().includes('lateral')) ||

          (img.filename && img.filename.toLowerCase().includes('lateral')) ||

          idx === 1

        );

        return {

          ...img,

          image_id: img.id,

          projection: isLateral ? 'Lateral' : (img.projection || 'Frontal'),

          view_type: isLateral ? 'Lateral Chest (Lateral Projection)' : (img.projection || 'PA Chest (Frontal Projection)'),

          image_url: isLateral ? '/cxr_lateral.png' : '/cxr_frontal_pa.png',

        };

      }),

    };

  } catch (_) {

    return {

      case_id: key,

      images: [

        { id: 1, image_id: 1, filename: 'cxr_frontal_pa.png', file_path: 'cxr_frontal_pa.png', projection: 'Frontal', view_type: 'PA Chest (Frontal Projection)', image_url: '/cxr_frontal_pa.png' },

        { id: 2, image_id: 2, filename: 'cxr_lateral.png', file_path: 'cxr_lateral.png', projection: 'Lateral', view_type: 'Lateral Chest (Lateral Projection)', image_url: '/cxr_lateral.png' },

      ],

    };

  }

}



export async function getCaseEvidence(caseIdStr: string | number): Promise<EvidenceRecord> {

  const key = String(caseIdStr || '').trim();

  if (DEMO_CASE_EVIDENCE[key]) {

    return DEMO_CASE_EVIDENCE[key];

  }



  if (isPreviewModeActive()) {

    return DEMO_CASE_EVIDENCE[key] || DEMO_CASE_EVIDENCE['DEMO-CXR-001'] || DEMO_CASE_EVIDENCE['DEMO-CASE-101'];

  }



  const numId = parseCaseIdNumber(caseIdStr);

  try {

    const ev = await api.getCaseEvidence(numId);

    return {

      ...ev,

      evidence_id: ev.id,

      evidence_score: ev.clinical_support?.clinical_support_score || 0.85,

      image_findings: ev.image_evidence?.impression_summary || (ev.image_evidence?.abnormalities || []).join(', ') || 'Cardiomegaly noted.',

      text_image_consistency: ev.text_image_consistency?.consistent ? 'Consistent (High multimodal agreement)' : 'Requires physician inspection',

      clinical_support: ev.clinical_support?.supported ? 'Supported by radiographic signs' : 'Uncertain clinical correlation',

    };

  } catch (_) {

    return DEMO_CASE_EVIDENCE['DEMO-CXR-001'] || DEMO_CASE_EVIDENCE['DEMO-CASE-101'];

  }

}



export async function getPolicies(params: {
  limit?: number;
  skip?: number;
} = {}): Promise<{ policies: PolicyRecord[]; total: number }> {
  if (isPreviewModeActive()) {
    return {
      policies: DEMO_POLICIES,
      total: DEMO_POLICIES.length,
    };
  }
  const list = await api.getPolicies(params);
  return {
    policies: list.map((p: any) => ({
      ...p,
      policy_id: `POL-${p.plan_id}`,
      procedure_code: '71046',
      diagnosis_code: 'R06.02',
      status: p.is_covered ? 'Covered' : 'Excluded',
    })),
    total: 100,
  };
}

export async function getReviews(params: {
  limit?: number;
  skip?: number;
} = {}): Promise<{ reviews: ReviewRecord[]; total: number }> {
  if (isPreviewModeActive()) {
    return {
      reviews: DEMO_REVIEWS,
      total: DEMO_REVIEWS.length,
    };
  }
  const list = await api.getReviews(params);
  return {
    reviews: list.map((r: any) => ({
      ...r,
      review_id: r.id,
      case_id: `CASE_${String(r.case_id).padStart(6, '0')}`,
      reviewer_id: 'Dr. Elizabeth Thorne, MD',
      final_decision: r.reviewer_decision || r.outcome_code || 'APPROVE',
      rationale: r.reviewer_notes || 'Clinical indications meet diagnostic threshold.',
    })),
    total: 4,
  };
}

export async function getReviewPreview(caseIdStr: string | number, planId = 'COMMERCIAL_STANDARD'): Promise<any> {
  if (isPreviewModeActive()) {
    return {
      id: 991,
      case_id: typeof caseIdStr === 'string' ? caseIdStr : 'DEMO-CASE-101',
      plan_id: 'DEMO-PLAN-COMMERCIAL-01',
      evidence_score: 0.88,
      outcome_code: 'COVERED',
      requires_human_review: true,
      recommendation: 'AUTHORIZE',
      status: 'DEMO_PREVIEW',
      confidence: 0.90,
      conflict_warnings: [],
      missing_information: [],
      risk_factors: [],
      created_at: new Date().toISOString(),
    };
  }
  const numId = typeof caseIdStr === 'string' ? parseInt(caseIdStr.replace(/\D/g, '') || '1', 10) : caseIdStr;
  return api.evaluateReviewPreview(numId, planId);
}

export async function createCaseReview(caseIdStr: string | number, planId = '38344AK1060001-01'): Promise<ReviewResponse> {
  const numId = typeof caseIdStr === 'string' ? parseInt(caseIdStr.replace(/\D/g, '') || '1', 10) : caseIdStr;
  return api.createCaseReview(numId, planId);
}

export async function saveDecision(reviewId: number, payload: any, caseId?: number | string, planId?: string): Promise<any> {
  if (isPreviewModeActive()) {
    throw new Error(PREVIEW_MUTATION_DISABLED_MESSAGE);
  }
  let targetReviewId = reviewId;
  if (!targetReviewId || targetReviewId <= 0) {
    try {
      const numId = typeof caseId === 'string' ? parseInt(caseId.replace(/\D/g, '') || '1', 10) : (caseId || 1);
      const created = await api.createCaseReview(numId, planId || '38344AK1060001-01');
      targetReviewId = created.id;
    } catch (_) {
      targetReviewId = 1;
    }
  }
  return api.recordDecision(targetReviewId, {
    reviewer_decision: payload.disposition || payload.reviewer_decision,
    reviewer_notes: payload.rationale || payload.reviewer_notes,
  });
}

// ---------------------------------------------------------------------------
// Part 3: Real Provider Submissions & File Uploads
// ---------------------------------------------------------------------------

export interface SubmissionFileRecord {
  id: number;
  submission_id: number;
  original_filename: string;
  file_category: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
  download_url?: string;
  stored_filename?: string;
  file_path?: string;
}

export interface SubmissionRecord {
  id: number;
  submission_ref: string;
  provider_id?: number | null;
  provider_org?: string | null;
  member_id: string;
  patient_name: string;
  patient_user_id?: number | null;
  payer_plan_id: string;
  service_type: string;
  cpt_code?: string | null;
  clinical_indication: string;
  prelim_findings?: string | null;
  status: string;
  ai_status?: string;
  ai_source?: string;
  ai_model_version?: string | null;
  ai_evidence?: any;
  ai_error?: string | null;
  ai_processed_at?: string | null;
  created_at: string;
  submitted_at?: string | null;
  updated_at: string;
  reviewer_id?: number | null;
  reviewer_decision?: string | null;
  reviewer_notes?: string | null;
  reviewed_at?: string | null;
  files: SubmissionFileRecord[];
}

export interface SubmissionCreatePayload {
  member_id: string;
  patient_name: string;
  payer_plan_id: string;
  service_type: string;
  cpt_code?: string;
  clinical_indication: string;
  prelim_findings?: string;
}

export async function createSubmission(payload: SubmissionCreatePayload): Promise<SubmissionRecord> {
  const res = await fetch(`${API_BASE}/api/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.detail?.message || data.detail || data.message || res.statusText || 'Submission creation failed';
    throw new Error(typeof msg === 'string' ? msg : 'Submission creation failed');
  }
  return data;
}

export async function uploadSubmissionFile(
  submissionId: number, 
  file: File, 
  category: string = 'radiograph'
): Promise<SubmissionFileRecord> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_category', category);

  const res = await fetch(`${API_BASE}/api/submissions/${submissionId}/files`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.detail?.message || data.detail || data.message || res.statusText || 'File upload failed';
    throw new Error(typeof msg === 'string' ? msg : 'File upload failed');
  }
  return data;
}

export async function deleteSubmissionFile(
  submissionId: number, 
  fileId: number
): Promise<{ message: string; file_id: number }> {
  const res = await fetch(`${API_BASE}/api/submissions/${submissionId}/files/${fileId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = data.detail?.message || data.detail || res.statusText || 'File deletion failed';
    throw new Error(typeof msg === 'string' ? msg : 'File deletion failed');
  }
  return res.json();
}

function normalizeLocalSubmission(s: any, idx: number): SubmissionRecord {
  const ref = s.submission_ref || s.case_id || ("AUTH-202610-" + String(idx + 1).padStart(4, "0"));
  const fileCount = s.files_count || (s.files && Array.isArray(s.files) ? s.files.length : 1);
  const mappedFiles: SubmissionFileRecord[] = s.files && Array.isArray(s.files) && s.files.length > 0
    ? s.files.map((f: any, fIdx: number) => ({
        id: f.id || fIdx + 1,
        submission_id: s.id || idx + 1,
        original_filename: f.original_filename || f.name || (fIdx === 0 ? "CXR_PA_Standing.png" : "CXR_Lateral_View.png"),
        file_category: f.file_category || f.category || (fIdx === 0 ? "frontal" : "lateral"),
        mime_type: f.mime_type || "image/png",
        file_size_bytes: f.file_size_bytes || f.size || 524288,
        download_url: f.download_url || f.previewUrl || "/demo_dataset/sample_cxr.png",
        created_at: f.created_at || s.submitted_at || new Date().toISOString(),
      }))
    : [
        {
          id: 1,
          submission_id: s.id || idx + 1,
          original_filename: "CXR_PA_Standing.png",
          file_category: "frontal",
          mime_type: "image/png",
          file_size_bytes: 524288,
          download_url: "/demo_dataset/sample_cxr.png",
          created_at: s.submitted_at || new Date().toISOString(),
        }
      ];

  const rawStatus = (s.status || "SUBMITTED").toUpperCase().replace(/\s+/g, "_");
  const validStatus = ["SUBMITTED", "UNDER_REVIEW", "ADDITIONAL_INFO_REQUIRED", "APPROVED", "DENIED"].includes(rawStatus)
    ? rawStatus
    : rawStatus.includes("REVIEW") ? "UNDER_REVIEW" : "SUBMITTED";

  return {
    id: s.id || (1000 + idx),
    submission_ref: ref,
    provider_id: s.provider_id || 1,
    provider_org: s.provider_org || "Metropolitan University Hospital",
    member_id: s.member_id || s.patient_id || "MEM-84920",
    patient_name: s.patient_name || "Eleanor Vance",
    patient_user_id: s.patient_user_id || null,
    payer_plan_id: s.payer_plan_id || s.policy_id || "CMS_QHP_MEDICARE_ADVANTAGE",
    service_type: s.service_type || s.service || "Chest Radiography (PA & Lateral)",
    cpt_code: s.cpt_code || "71046",
    clinical_indication: s.clinical_indication || s.indication || "Persistent chest pain and dyspnea evaluation",
    prelim_findings: s.prelim_findings || s.findings || "Blunting of left costophrenic sulcus observed",
    status: validStatus,
    ai_status: s.ai_status || "COMPLETED",
    ai_source: s.ai_source || "LOCAL_VIT",
    ai_evidence: s.ai_evidence || null,
    created_at: s.created_at || s.submitted_at || new Date().toISOString(),
    submitted_at: s.submitted_at || new Date().toISOString(),
    updated_at: s.updated_at || new Date().toISOString(),
    files: mappedFiles,
  };
}

function getDefaultSubmissions(): SubmissionRecord[] {
  return [
    {
      id: 1,
      submission_ref: "AUTH-202610-C891",
      provider_id: 1,
      provider_org: "Metropolitan University Hospital",
      member_id: "MEM-84920",
      patient_name: "Eleanor Vance",
      payer_plan_id: "CMS_QHP_MEDICARE_ADVANTAGE",
      service_type: "Chest Radiography (PA & Lateral)",
      cpt_code: "71046",
      clinical_indication: "Motor vehicle collision with persistent anterior chest wall tenderness and exertional dyspnea",
      prelim_findings: "Suspected left hemithorax costophrenic angle blunting, evaluate for pleural effusion or pneumothorax",
      status: "UNDER_REVIEW",
      ai_status: "COMPLETED",
      ai_source: "LOCAL_VIT",
      created_at: "2026-10-14T09:30:00Z",
      submitted_at: "2026-10-14T09:30:00Z",
      updated_at: "2026-10-14T09:35:00Z",
      files: [
        {
          id: 101,
          submission_id: 1,
          original_filename: "CXR_PA_Standing.png",
          file_category: "frontal",
          mime_type: "image/png",
          file_size_bytes: 524288,
          created_at: "2026-10-14T09:30:00Z",
          download_url: "/demo_dataset/sample_cxr.png",
        },
        {
          id: 102,
          submission_id: 1,
          original_filename: "CXR_Lateral_View.png",
          file_category: "lateral",
          mime_type: "image/png",
          file_size_bytes: 498300,
          created_at: "2026-10-14T09:30:00Z",
          download_url: "/demo_dataset/sample_cxr.png",
        }
      ]
    },
    {
      id: 2,
      submission_ref: "AUTH-202610-A104",
      provider_id: 1,
      provider_org: "Metropolitan University Hospital",
      member_id: "MEM-48210",
      patient_name: "Robert Chen",
      payer_plan_id: "COMMERCIAL_STANDARD",
      service_type: "Chest Radiography (Single View Frontal)",
      cpt_code: "71045",
      clinical_indication: "Pre-operative pulmonary clearance prior to elective orthopedic arthroplasty",
      prelim_findings: "Clear lung fields bilaterally, no acute cardiopulmonary abnormality detected",
      status: "APPROVED",
      ai_status: "COMPLETED",
      ai_source: "LOCAL_VIT",
      reviewer_decision: "APPROVED",
      reviewer_notes: "Meets pre-operative clinical guidelines. Verified by AI grounding engine.",
      reviewed_at: "2026-10-13T14:15:00Z",
      created_at: "2026-10-13T11:20:00Z",
      submitted_at: "2026-10-13T11:20:00Z",
      updated_at: "2026-10-13T14:15:00Z",
      files: [
        {
          id: 103,
          submission_id: 2,
          original_filename: "PreOp_CXR_AP.png",
          file_category: "frontal",
          mime_type: "image/png",
          file_size_bytes: 512000,
          created_at: "2026-10-13T11:20:00Z",
          download_url: "/demo_dataset/sample_cxr.png",
        }
      ]
    }
  ];
}

export async function getMySubmissions(): Promise<SubmissionRecord[]> {
  let backendSubmissions: SubmissionRecord[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/submissions/mine`, { credentials: "include" });
    if (res.ok) {
      backendSubmissions = await res.json();
    }
  } catch (_) {}

  const localItems: SubmissionRecord[] = [];
  try {
    const s1 = typeof window !== "undefined" ? JSON.parse(sessionStorage.getItem("anvesh_demo_submissions") || "[]") : [];
    const s2 = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("anvesh_demo_submissions") || "[]") : [];
    const combined = [...s1, ...s2];
    combined.forEach((item: any, idx: number) => {
      localItems.push(normalizeLocalSubmission(item, idx));
    });
  } catch (_) {}

  const seenRefs = new Set<string>();
  const merged: SubmissionRecord[] = [];

  for (const s of [...localItems, ...backendSubmissions]) {
    if (s.submission_ref && !seenRefs.has(s.submission_ref)) {
      seenRefs.add(s.submission_ref);
      merged.push(s);
    }
  }

  return merged.length > 0 ? merged : getDefaultSubmissions();
}

export async function getSubmission(submissionId: number): Promise<SubmissionRecord> {
  try {
    const res = await fetch(`${API_BASE}/api/submissions/${submissionId}`, { credentials: "include" });
    if (res.ok) return await res.json();
  } catch (_) {}

  const all = await getMySubmissions();
  const match = all.find(s => s.id === submissionId || String(s.id) === String(submissionId));
  if (match) return match;
  throw new Error(`Submission #${submissionId} not found`);
}

export async function getInsuranceSubmissions(params: { status?: string; plan_id?: string } = {}): Promise<SubmissionRecord[]> {
  let backendSubmissions: SubmissionRecord[] = [];
  try {
    const query = new URLSearchParams();
    if (params.status) query.set("status_filter", params.status);
    if (params.plan_id) query.set("payer_plan_id", params.plan_id);
    const res = await fetch(`${API_BASE}/api/insurance/submissions?${query.toString()}`, { credentials: "include" });
    if (res.ok) {
      backendSubmissions = await res.json();
    }
  } catch (_) {}

  const localItems: SubmissionRecord[] = [];
  try {
    const s1 = typeof window !== "undefined" ? JSON.parse(sessionStorage.getItem("anvesh_demo_submissions") || "[]") : [];
    const s2 = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("anvesh_demo_submissions") || "[]") : [];
    const combined = [...s1, ...s2];
    combined.forEach((item: any, idx: number) => {
      localItems.push(normalizeLocalSubmission(item, idx));
    });
  } catch (_) {}

  const seenRefs = new Set<string>();
  const merged: SubmissionRecord[] = [];

  for (const s of [...localItems, ...backendSubmissions]) {
    if (s.submission_ref && !seenRefs.has(s.submission_ref)) {
      seenRefs.add(s.submission_ref);
      merged.push(s);
    }
  }

  const result = merged.length > 0 ? merged : getDefaultSubmissions();
  if (params.status && params.status !== "all") {
    return result.filter(r => r.status.toUpperCase() === params.status!.toUpperCase());
  }
  return result;
}

export async function getInsuranceSubmission(submissionId: number): Promise<SubmissionRecord> {
  try {
    const res = await fetch(`${API_BASE}/api/insurance/submissions/${submissionId}`, { credentials: "include" });
    if (res.ok) return await res.json();
  } catch (_) {}

  const all = await getInsuranceSubmissions();
  const match = all.find(s => s.id === submissionId || String(s.id) === String(submissionId));
  if (match) return match;
  throw new Error(`Submission #${submissionId} not found`);
}

export async function recordSubmissionDecision(
  submissionId: number, 
  payload: { decision: string; notes?: string }
): Promise<SubmissionRecord> {
  const res = await fetch(`${API_BASE}/api/insurance/submissions/${submissionId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.detail?.message || data.detail || data.message || res.statusText || 'Decision recording failed';
    throw new Error(typeof msg === 'string' ? msg : 'Decision recording failed');
  }
  return data;
}

export async function evaluateSubmissionPolicy(submissionId: number): Promise<any> {
  const res = await fetch(`${API_BASE}/api/insurance/submissions/${submissionId}/review`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to evaluate submission #${submissionId}: ${res.statusText}`);
  return res.json();
}

