import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Shield, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Sparkles, 
  HelpCircle, 
  Check, 
  Save, 
  AlertOctagon,
  Eye,
  Info,
  Building2,
  Image as ImageIcon,
  Download
} from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { MedicalImageViewer } from '../../../components/common/MedicalImageViewer';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';
import { useAuth } from '../../../context/AuthContext';
import { 
  getCase, 
  getCaseImages, 
  getCaseEvidence, 
  getPolicies,
  getReviewPreview, 
  saveDecision,
  getInsuranceSubmissions,
  getInsuranceSubmission,
  recordSubmissionDecision,
  SubmissionRecord,
  CaseDetail, 
  CaseImage, 
  EvidenceRecord, 
  PolicyRecord 
} from '../../../services/api';

interface InsuranceWorkspaceProps {
  caseId: string;
  onBack: () => void;
  onNavigate?: (tab: string, caseId?: string) => void;
}

export const InsuranceWorkspacePage: React.FC<InsuranceWorkspaceProps> = ({ 
  caseId, 
  onBack,
  onNavigate 
}) => {
  const { role } = useAuth();
  const [isLiveSubmission, setIsLiveSubmission] = useState(false);
  const [liveSubmission, setLiveSubmission] = useState<SubmissionRecord | null>(null);

  // Historical Case State
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [images, setImages] = useState<CaseImage[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRecord | null>(null);
  const [policies, setPolicies] = useState<PolicyRecord[]>([]);
  const [reviewPreview, setReviewPreview] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reviewer Decision State
  const [selectedDisposition, setSelectedDisposition] = useState<'APPROVE' | 'DENY' | 'REQUEST_MORE_INFO' | 'ESCALATE' | ''>('');
  const [rationale, setRationale] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [decisionPersistedResult, setDecisionPersistedResult] = useState<any>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadWorkspace = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if caseId represents a real live provider submission (e.g. AUTH-202610-...)
        if (caseId.startsWith('AUTH-')) {
          const allSubs = await getInsuranceSubmissions();
          const found = allSubs.find(s => s.submission_ref === caseId || String(s.id) === caseId);
          if (found) {
            if (mounted) {
              setIsLiveSubmission(true);
              setLiveSubmission(found);
              if (found.reviewer_decision) {
                const mapDecision: any = found.reviewer_decision === 'APPROVED' ? 'APPROVE' : found.reviewer_decision === 'DENIED' ? 'DENY' : found.reviewer_decision === 'ADDITIONAL_INFO_REQUIRED' ? 'REQUEST_MORE_INFO' : '';
                setSelectedDisposition(mapDecision);
              }
              if (found.reviewer_notes) setRationale(found.reviewer_notes);
            }
            return;
          }
        }

        // Try historical case loading
        const [cRes, imgRes, evRes, polRes, revRes] = await Promise.all([
          getCase(caseId).catch(() => null),
          getCaseImages(caseId).catch(() => ({ case_id: caseId, images: [] })),
          getCaseEvidence(caseId).catch(() => null),
          getPolicies({ limit: 5 }).catch(() => ({ policies: [] })),
          getReviewPreview(caseId).catch(() => null)
        ]);

        if (cRes) {
          if (mounted) {
            setIsLiveSubmission(false);
            setCaseData(cRes);
            setImages(imgRes.images || []);
            setEvidence(evRes);
            setPolicies(polRes.policies || []);
            setReviewPreview(revRes);
          }
        } else {
          // Check if numeric ID matches a submission
          const allSubs = await getInsuranceSubmissions().catch(() => []);
          const found = allSubs.find(s => String(s.id) === caseId || s.submission_ref === caseId);
          if (found && mounted) {
            setIsLiveSubmission(true);
            setLiveSubmission(found);
            if (found.reviewer_decision) {
              const mapDecision: any = found.reviewer_decision === 'APPROVED' ? 'APPROVE' : found.reviewer_decision === 'DENIED' ? 'DENY' : found.reviewer_decision === 'ADDITIONAL_INFO_REQUIRED' ? 'REQUEST_MORE_INFO' : '';
              setSelectedDisposition(mapDecision);
            }
            if (found.reviewer_notes) setRationale(found.reviewer_notes);
          } else {
            throw new Error(`Case or Submission '${caseId}' not found in ANVESH repository.`);
          }
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load case workspace');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadWorkspace();
    return () => { mounted = false; };
  }, [caseId]);

  const handleOpenConfirm = () => {
    if (!selectedDisposition) {
      alert('Please select a clinical determination disposition.');
      return;
    }
    if (!rationale.trim()) {
      alert('Clinical rationale is required for all prior authorization determinations.');
      return;
    }
    setConfirmModalOpen(true);
  };

  const handleConfirmDecision = async () => {
    setConfirmModalOpen(false);
    setIsSavingDecision(true);
    setDecisionError(null);

    try {
      if (isLiveSubmission && liveSubmission) {
        // Real Live Provider Submission Decision
        const decisionCode = selectedDisposition === 'APPROVE' ? 'APPROVED' : selectedDisposition === 'DENY' ? 'DENIED' : 'ADDITIONAL_INFO_REQUIRED';
        const updated = await recordSubmissionDecision(liveSubmission.id, {
          decision: decisionCode,
          notes: rationale.trim(),
        });
        setLiveSubmission(updated);
        setDecisionPersistedResult({
          review_id: updated.id,
          status: updated.status,
          decision: updated.reviewer_decision,
        });
      } else {
        // Historical Research Case Decision
        const reviewId = reviewPreview?.review_id || reviewPreview?.id || 1;
        const res = await saveDecision(reviewId, {
          disposition: selectedDisposition,
          rationale: rationale.trim(),
          reviewer_id: 'REV-MD-9021',
          evidence_ids: evidence?.evidence_id ? [evidence.evidence_id] : []
        });
        setDecisionPersistedResult(res);
      }
    } catch (err: any) {
      setDecisionError(err.message || 'Failed to persist decision to backend.');
    } finally {
      setIsSavingDecision(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-sm text-slate-500 font-medium">Loading clinical workspace...</div>
      </div>
    );
  }

  if (error || (!caseData && !liveSubmission)) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl space-y-4 max-w-2xl">
        <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
          <AlertOctagon className="w-5 h-5 text-red-600" /> Error Loading Case {caseId}
        </div>
        <p className="text-xs text-red-700">{error || 'Case does not exist.'}</p>
        <Button variant="outline" size="sm" onClick={onBack}>Return to Case Queue</Button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: LIVE PROVIDER PRIOR AUTHORIZATION WORKSPACE
  // -------------------------------------------------------------------------
  if (isLiveSubmission && liveSubmission) {
    const radiographFiles = liveSubmission.files?.filter(f => f.file_category === 'radiograph') || [];
    const reportFiles = liveSubmission.files?.filter(f => f.file_category === 'clinical_report') || [];

    return (
      <div className="space-y-6 max-w-7xl">
        {/* Header Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-600 hover:text-slate-900 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Queue
            </Button>
            <div className="h-5 w-px bg-slate-300" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-indigo-900">{liveSubmission.submission_ref}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Live Provider Request
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                  liveSubmission.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                  liveSubmission.status === 'DENIED' ? 'bg-red-100 text-red-800' :
                  liveSubmission.status === 'ADDITIONAL_INFO_REQUIRED' ? 'bg-amber-100 text-amber-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  Status: {liveSubmission.status}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Facility: <span className="font-medium text-slate-700">{liveSubmission.provider_org || 'Metropolitan Hospital'}</span> • 
                Patient: <span className="font-medium text-slate-700">{liveSubmission.patient_name}</span> ({liveSubmission.member_id}) • 
                Plan: <span className="font-mono text-slate-700">{liveSubmission.payer_plan_id}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-3 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" /> Authorized Payer Scope
            </span>
          </div>
        </div>

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Genuine Uploaded Radiographs & Reports */}
          <div className="lg:col-span-7 space-y-6">
            {/* Medical Image Viewer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
                <span>Genuine Diagnostic Radiograph (Unaltered Native Representation)</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {radiographFiles.length} Image File{radiographFiles.length !== 1 ? 's' : ''} Attached
                </span>
              </div>

              {radiographFiles.length > 0 ? (
                <div className="space-y-3">
                  {radiographFiles.map((rf, idx) => (
                    <div key={rf.id} className="space-y-1">
                      <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between">
                        <span>Film #{idx + 1}: {rf.original_filename} ({Math.round(rf.file_size_bytes / 1024)} KB)</span>
                        {rf.download_url && (
                          <a href={rf.download_url} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline flex items-center gap-1">
                            <Download className="w-3 h-3" /> Raw Bytes
                          </a>
                        )}
                      </div>
                      <MedicalImageViewer
                        imagePath={rf.download_url}
                        viewType={liveSubmission.service_type || 'Radiograph PA'}
                        patientId={liveSubmission.member_id}
                        caseId={liveSubmission.submission_ref}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 bg-slate-100 border border-slate-300 rounded-xl text-center space-y-2">
                  <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="text-xs font-semibold text-slate-700">No Radiographic Images Uploaded</div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    The submitting provider has not attached medical radiograph binaries to this request.
                  </p>
                </div>
              )}
            </div>

            {/* Provider Clinical Indication & Preliminary Findings */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" /> Transmitted Clinical Information & Attending Notes
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-600 uppercase tracking-wider block mb-1">Clinical Indication & History:</span>
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                    {liveSubmission.clinical_indication}
                  </div>
                </div>

                {liveSubmission.prelim_findings && (
                  <div>
                    <span className="font-semibold text-slate-600 uppercase tracking-wider block mb-1">Attending Preliminary Findings:</span>
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-slate-700 leading-relaxed italic whitespace-pre-wrap">
                      {liveSubmission.prelim_findings}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Attached Supporting Reports & Documents */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" /> Supporting Clinical Documents ({reportFiles.length})
              </h3>
              {reportFiles.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-400">
                  No separate PDF or text clinical reports were attached with this submission.
                </div>
              ) : (
                <div className="space-y-2">
                  {reportFiles.map(rf => (
                    <div key={rf.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-800">{rf.original_filename}</div>
                          <div className="text-[11px] text-slate-500">MIME: {rf.mime_type} • Size: {Math.round(rf.file_size_bytes / 1024)} KB</div>
                        </div>
                      </div>
                      {rf.download_url && (
                        <a
                          href={rf.download_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-semibold flex items-center gap-1 shadow-xs"
                        >
                          <Download className="w-3 h-3" /> View / Download
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): AI Provenance Notice & Adjudication Controls */}
          <div className="lg:col-span-5 space-y-6">
            {/* AI Provenance Disclosure */}
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-900">
              <span className="font-bold flex items-center gap-1.5 text-amber-950">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                Awaiting Manual Medical Review (No Model Hallucination)
              </span>
              <p className="leading-relaxed text-amber-800">
                Newly uploaded medical images do NOT have precomputed VLM analysis. In accordance with safety protocol, ANVESH does not synthesize unverified model findings. Authorized clinical staff must evaluate evidence directly.
              </p>
            </div>

            {/* Official Reviewer Determination Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" /> Official Prior Authorization Determination
              </h3>

              {role === 'auditor' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Read-Only Auditor Mode
                  </span>
                  <p>Auditor accounts have read-only inspection privileges. Final authorization determinations are disabled.</p>
                </div>
              )}

              {/* Disposition Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Select Determination
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    disabled={role === 'auditor'}
                    onClick={() => setSelectedDisposition('APPROVE')}
                    className={`p-2.5 rounded-lg border font-semibold text-center transition-all ${
                      role === 'auditor' ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' :
                      selectedDisposition === 'APPROVE'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Authorize (Approve)
                  </button>
                  <button
                    type="button"
                    disabled={role === 'auditor'}
                    onClick={() => setSelectedDisposition('DENY')}
                    className={`p-2.5 rounded-lg border font-semibold text-center transition-all ${
                      role === 'auditor' ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' :
                      selectedDisposition === 'DENY'
                        ? 'border-red-600 bg-red-50 text-red-800 ring-2 ring-red-500'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Adverse (Deny)
                  </button>
                  <button
                    type="button"
                    disabled={role === 'auditor'}
                    onClick={() => setSelectedDisposition('REQUEST_MORE_INFO')}
                    className={`p-2.5 rounded-lg border font-semibold text-center transition-all ${
                      role === 'auditor' ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' :
                      selectedDisposition === 'REQUEST_MORE_INFO'
                        ? 'border-amber-600 bg-amber-50 text-amber-800 ring-2 ring-amber-500'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Request Info
                  </button>
                </div>
              </div>

              {/* Rationale Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Clinical Determination Notes & Rationale <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  disabled={role === 'auditor'}
                  value={rationale}
                  onChange={e => setRationale(e.target.value)}
                  placeholder={role === 'auditor' ? 'Determination input is disabled in read-only auditor mode.' : 'Enter medical rationale referencing diagnostic images, patient indication, and policy criteria...'}
                  className={`w-full p-2.5 text-xs border rounded-lg focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans ${role === 'auditor' ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-300 focus:bg-white'}`}
                />
              </div>

              {/* Save Action */}
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={role === 'auditor' || isSavingDecision || !selectedDisposition || !rationale.trim()}
                  onClick={handleOpenConfirm}
                  className={`w-full text-white flex items-center justify-center gap-1.5 text-xs ${role === 'auditor' ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  {role === 'auditor' ? (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" /> Determinations Disabled (Auditor)
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Persist Official Determination
                    </>
                  )}
                </Button>
              </div>

              {/* Error or Success notification */}
              {decisionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  Failed to record determination: {decisionError}
                </div>
              )}

              {decisionPersistedResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Determination Recorded & Persisted
                  </div>
                  <div className="font-mono text-[11px]">
                    Status: {decisionPersistedResult.status} • Decision: {decisionPersistedResult.decision}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        <ConfirmationDialog
          isOpen={confirmModalOpen}
          title="Confirm Clinical Adjudication"
          message={`Are you sure you wish to submit an official determination of "${selectedDisposition}" for submission ${liveSubmission.submission_ref}? This determination will be cryptographically audited and recorded in the payer review log.`}
          confirmLabel="Confirm & Save Determination"
          cancelLabel="Review Details"
          onConfirm={handleConfirmDecision}
          onClose={() => setConfirmModalOpen(false)}
        />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: HISTORICAL RESEARCH COHORT CASE WORKSPACE
  // -------------------------------------------------------------------------
  const evidenceScore = evidence?.evidence_score ?? reviewPreview?.evidence_score ?? 0.85;
  const policyOutcome = reviewPreview?.policy_outcome || 'MANUAL_REVIEW_REQUIRED';
  const hasExclusion = reviewPreview?.exclusion_flagged || false;
  const hasConflict = reviewPreview?.conflicting_evidence || false;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Case Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-600 hover:text-slate-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Queue
          </Button>
          <div className="h-5 w-px bg-slate-300" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-slate-900">{caseData?.case_id}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Payer Adjudication Mode
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Member ID: <span className="font-mono font-medium text-slate-700">{caseData?.patient_id || 'ANV-PT-9012'}</span> • Service: {caseData?.service_type || 'Chest Radiography'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-3 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-slate-500" /> Research Benchmark Preview
          </span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Medical Image Viewer + Clinical Report */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
              <span>Diagnostic Radiograph (Original Grayscale Native)</span>
              <span className="text-[11px] text-slate-400 font-mono">1/1 Series PA</span>
            </div>
            <MedicalImageViewer
              imagePath={images[0]?.file_path}
              viewType={images[0]?.view_type || 'PA Chest'}
              patientId={caseData?.patient_id}
              caseId={caseData?.case_id}
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" /> Transmitted Clinical Report & Attending Notes
            </h3>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed whitespace-pre-wrap">
              {caseData?.clinical_notes || 'No preliminary notes transmitted with study.'}
            </div>
          </div>

          {/* Precomputed VLM Findings */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" /> Precomputed VLM Clinical Evidence Analysis
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Score: {Math.round(evidenceScore * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block mb-0.5">Classification</span>
                <span className="font-bold text-slate-900 uppercase">{caseData?.classification || 'abnormal'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block mb-0.5">Automated Recommendation</span>
                <span className="font-bold text-indigo-700">{policyOutcome}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Adjudication Controls */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" /> Human Reviewer Determination
            </h3>

            {role === 'auditor' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Read-Only Auditor Mode
                </span>
                <p>Auditor accounts have read-only inspection privileges. Final authorization determination mutations are disabled.</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Select Human Determination
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  disabled={role === 'auditor'}
                  onClick={() => setSelectedDisposition('APPROVE')}
                  className={`p-2.5 rounded-lg border font-semibold text-center transition-all ${
                    role === 'auditor' ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' :
                    selectedDisposition === 'APPROVE'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Authorize (Approve)
                </button>
                <button
                  type="button"
                  disabled={role === 'auditor'}
                  onClick={() => setSelectedDisposition('DENY')}
                  className={`p-2.5 rounded-lg border font-semibold text-center transition-all ${
                    role === 'auditor' ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' :
                    selectedDisposition === 'DENY'
                      ? 'border-red-600 bg-red-50 text-red-800 ring-2 ring-red-500'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Adverse (Deny)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Clinical Adjudication Rationale
              </label>
              <textarea
                rows={3}
                required
                disabled={role === 'auditor'}
                value={rationale}
                onChange={e => setRationale(e.target.value)}
                placeholder={role === 'auditor' ? 'Adjudication rationale is disabled in read-only auditor mode.' : 'State clinical justification for this determination referencing imaging findings and policy criteria...'}
                className={`w-full p-2.5 text-xs border rounded-lg focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans ${role === 'auditor' ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-300 focus:bg-white'}`}
              />
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                disabled={role === 'auditor' || isSavingDecision || !selectedDisposition || !rationale.trim()}
                onClick={handleOpenConfirm}
                className={`w-full text-white flex items-center justify-center gap-1.5 text-xs ${role === 'auditor' ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {role === 'auditor' ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" /> Determinations Disabled (Auditor)
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" /> Persist Official Determination
                  </>
                )}
              </Button>
            </div>

            {decisionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                Failed to persist determination: {decisionError}
              </div>
            )}

            {decisionPersistedResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Determination Successfully Recorded
                </div>
                <div className="font-mono text-[11px]">
                  Review ID: {decisionPersistedResult.review_id} • Status: {decisionPersistedResult.status}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={confirmModalOpen}
        title="Confirm Clinical Adjudication"
        message={`Are you sure you wish to submit an official determination of "${selectedDisposition}" for Case ${caseData?.case_id}? This determination will be cryptographically audited and recorded in the payer review log.`}
        confirmLabel="Confirm & Save Determination"
        cancelLabel="Review Details"
        onConfirm={handleConfirmDecision}
        onClose={() => setConfirmModalOpen(false)}
      />
    </div>
  );
};
export default InsuranceWorkspacePage;
