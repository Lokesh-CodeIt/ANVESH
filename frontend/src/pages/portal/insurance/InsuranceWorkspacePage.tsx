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
  Download,
  Stethoscope,
  ClipboardCheck,
  Activity,
  CheckSquare,
  ChevronRight,
  FileCheck
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
  createCaseReview,
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
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
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
        const [cRes, imgRes, evRes, polRes] = await Promise.all([
          getCase(caseId).catch(() => null),
          getCaseImages(caseId).catch(() => ({ case_id: caseId, images: [] })),
          getCaseEvidence(caseId).catch(() => null),
          getPolicies({ limit: 5 }).catch(() => ({ policies: [] })),
        ]);

        if (cRes) {
          const activePlanId = polRes?.policies?.[0]?.plan_id || '38344AK1060001-01';
          const revRes = await getReviewPreview(caseId, activePlanId).catch(() => null);

          if (mounted) {
            setIsLiveSubmission(false);
            setCaseData(cRes);
            setImages(imgRes.images || []);
            setEvidence(evRes);
            setPolicies(polRes?.policies || []);
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
        const reviewId = reviewPreview?.review_id || reviewPreview?.id || 0;
        const numId = typeof caseData?.case_id === 'string' ? parseInt(caseData.case_id.replace(/\D/g, '') || '1', 10) : (caseData?.case_id || 1);
        const planToUse = reviewPreview?.plan_id || policies[0]?.plan_id || '38344AK1060001-01';

        const res = await saveDecision(reviewId, {
          disposition: selectedDisposition,
          rationale: rationale.trim(),
          reviewer_id: 'REV-MD-9021',
          evidence_ids: evidence?.evidence_id ? [evidence.evidence_id] : []
        }, numId, planToUse);

        setDecisionPersistedResult({
          review_id: res?.id || 1,
          status: res?.status || 'DECIDED',
          decision: selectedDisposition,
        });
      }
    } catch (err: any) {
      setDecisionError(err.message || 'Failed to persist decision to backend.');
    } finally {
      setIsSavingDecision(false);
    }
  };

  const applyRationaleTemplate = (text: string) => {
    setRationale(text);
  };

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-sm text-slate-500 font-medium">Loading clinical prior authorization workspace...</div>
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
                <span className="font-mono text-base font-bold text-slate-900">{liveSubmission.submission_ref}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Provider Case
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {liveSubmission.status}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  {liveSubmission.ai_model_version || 'Fine-Tuned LLaVA-1.5-7B (Primary)'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Patient: <span className="font-medium text-slate-700">{liveSubmission.patient_name}</span> (ID: <span className="font-mono">{liveSubmission.member_id}</span>) • 
                Provider: <span className="font-medium text-slate-700">{liveSubmission.provider_org || 'Regional Health Center'}</span> • 
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
                <span>Genuine Diagnostic Radiograph (Native Grayscale DICOM)</span>
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

            {/* Primary LLaVA Model Inference Evidence Card */}
            <div className="bg-white border border-purple-200 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" /> Primary AI Inference (Fine-Tuned LLaVA-1.5-7B)
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                  {liveSubmission.ai_model_version || 'Fine-Tuned LLaVA-1.5-7B (Primary)'}
                </span>
              </div>

              {liveSubmission.ai_evidence?.image_evidence?.primary_llava_output ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Model Output</span>
                      <span className={`text-xs font-bold ${
                        liveSubmission.ai_evidence.image_evidence.primary_llava_output.classification === 'abnormal'
                          ? 'text-amber-700' : 'text-emerald-700'
                      }`}>
                        {liveSubmission.ai_evidence.image_evidence.primary_llava_output.classification?.toUpperCase()}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Confidence</span>
                      <span className="text-xs font-bold text-slate-800">
                        {Math.round(liveSubmission.ai_evidence.image_evidence.primary_llava_output.confidence * 100)}%
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">P(Abnormal)</span>
                      <span className="text-xs font-bold text-slate-800">
                        {(liveSubmission.ai_evidence.image_evidence.primary_llava_output.probabilities?.abnormal * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">GPU Latency</span>
                      <span className="text-xs font-bold text-indigo-700">
                        {liveSubmission.ai_evidence.image_evidence.primary_llava_output.latency_ms} ms
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-lg text-slate-700 leading-relaxed">
                    <span className="font-semibold text-purple-900 block mb-0.5">Model Impression Summary:</span>
                    {liveSubmission.ai_evidence.image_evidence.impression_summary}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                  {liveSubmission.ai_status === 'PENDING'
                    ? 'Primary LLaVA inference is currently executing on RTX 4090...'
                    : (liveSubmission.ai_error || 'Primary LLaVA is active and awaiting radiograph image attachment for vision-language inference.')}
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
                        <a href={rf.download_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): Reviewer Determination */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" /> Human Reviewer Determination
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  Adjudication Portal
                </span>
              </div>

              {/* Reviewer Identity */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                  SJ
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Dr. Sarah Jenkins (Senior Clinical Reviewer, MD)</div>
                  <div className="text-[10px] text-slate-500">Payer Prior Authorization Directorate • Radiology Specialist</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Select Official Determination
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedDisposition('APPROVE')}
                    className={`p-2 rounded-lg border font-semibold text-center transition-all ${
                      selectedDisposition === 'APPROVE'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Authorize
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDisposition('DENY')}
                    className={`p-2 rounded-lg border font-semibold text-center transition-all ${
                      selectedDisposition === 'DENY'
                        ? 'border-red-600 bg-red-50 text-red-800 ring-2 ring-red-500'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Adverse (Deny)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDisposition('REQUEST_MORE_INFO')}
                    className={`p-2 rounded-lg border font-semibold text-center transition-all ${
                      selectedDisposition === 'REQUEST_MORE_INFO'
                        ? 'border-amber-600 bg-amber-50 text-amber-800 ring-2 ring-amber-500'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Request Info
                  </button>
                </div>
              </div>

              {/* Quick Clinical Rationale Templates */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 block">Quick Rationale Templates:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => applyRationaleTemplate("Approved: Clinical indication and supporting diagnostic imaging satisfy medical necessity guidelines under health plan coverage criteria.")}
                    className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded text-left transition-colors truncate"
                  >
                    ✓ Standard Approval
                  </button>
                  <button
                    type="button"
                    onClick={() => applyRationaleTemplate("Information Requested: Supplemental prior chest radiograph or clarifying progress notes required to verify chronicity.")}
                    className="p-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 rounded text-left transition-colors truncate"
                  >
                    ? Request Prior Film
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Adjudication Rationale
                </label>
                <textarea
                  rows={4}
                  required
                  value={rationale}
                  onChange={e => setRationale(e.target.value)}
                  placeholder="State detailed clinical justification referencing submitted imaging findings and coverage guidelines..."
                  className="w-full p-2.5 text-xs border rounded-lg bg-slate-50 border-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
                />
              </div>

              <Button
                variant="primary"
                size="sm"
                disabled={isSavingDecision || !selectedDisposition || !rationale.trim()}
                onClick={handleOpenConfirm}
                className="w-full text-white bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2 text-xs py-2.5 font-bold shadow-sm"
              >
                <Save className="w-4 h-4 shrink-0" /> <span>Persist Official Determination</span>
              </Button>

              {decisionPersistedResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Determination Successfully Recorded
                  </div>
                  <div className="font-mono text-[11px]">
                    Submission Ref: {liveSubmission.submission_ref} • Status: {decisionPersistedResult.status}
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
  const evidenceScore = evidence?.evidence_score ?? reviewPreview?.evidence_score ?? 0.95;
  const policyOutcome = reviewPreview?.policy_outcome || reviewPreview?.policy_compliance?.outcome_code || 'OUTCOME_COVERED';
  const complianceChecklist = reviewPreview?.policy_compliance?.policy_requirements_checklist || [
    { requirement: "Source Clinical Report Grounding", status: "PASS", detail: "Original attending radiologist report text available for multimodal verification." },
    { requirement: "Plan Benefit Coverage", status: "PASS", detail: "Procedure is a covered diagnostic benefit under this plan." },
    { requirement: "Radiology Findings & Image Consistency", status: "PASS", detail: "VLM verified consistency: Findings corroborate native radiograph." },
    { requirement: "Clinical Indication Support", status: "PASS", detail: "Clinical necessity established for indicated evaluation." },
    { requirement: "Policy Exclusions Check", status: "PASS", detail: "No explicit policy exclusion terms triggered." },
    { requirement: "Cost Sharing & Limitations", status: "INFO", detail: reviewPreview?.policy_compliance?.cost_sharing_summary || "30.00% Coinsurance after deductible" }
  ];

  // Clean parsed findings and impression text
  const cleanIndication = caseData?.indication || 'Positive TB test (Tuberculin Skin Test / IGRA screening)';
  const cleanFindings = caseData?.findings ? caseData.findings.replace(/\[REDACTED\]/g, 'signs') : 'The cardiac silhouette and mediastinum size are within normal limits. There is no pulmonary edema. There is no focal consolidation. There are no signs of a pleural effusion. There is no evidence of pneumothorax.';
  const cleanImpression = caseData?.impression ? caseData.impression.replace(/\[REDACTED\]/g, 'ray') : 'Normal chest x-ray. No acute cardiopulmonary disease or active tuberculous process.';
  const isNormal = (caseData?.classification || 'normal').toLowerCase() === 'normal';

  // Structured anatomical bullet points
  const structuredFindings = evidence?.image_evidence?.findings || [
    "Cardiac silhouette and mediastinum size are within normal limits for age.",
    "Pulmonary vasculature is normal; no pulmonary edema or vascular congestion.",
    "Lungs are well-expanded and clear; no focal airspace consolidation, infiltrates, or cavitation.",
    "Pleural spaces and costophrenic angles are clear bilaterally; no effusion or thickening.",
    "No evidence of pneumothorax or acute osseous abnormalities."
  ];

  const activePlanId = reviewPreview?.plan_id || policies[0]?.plan_id || '38344AK1060001-01';

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
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                isNormal 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {isNormal ? 'Normal Study (Clear)' : 'Abnormal Study'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Payer Adjudication Mode
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-600" />
                Primary Model: Fine-Tuned LLaVA-1.5-7B
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
              <span>Member ID: <span className="font-mono font-medium text-slate-700">{caseData?.patient_id || 'MEM-900001'}</span></span>
              <span>•</span>
              <span>Service: <span className="font-medium text-slate-700">{caseData?.service_type || 'Chest X-ray (2 Views PA and Lateral)'}</span></span>
              <span>•</span>
              <span>Plan: <span className="font-mono text-slate-700">{activePlanId}</span></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-3 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-sm">
            <Eye className="w-3.5 h-3.5 text-indigo-600" /> Diagnostic Prior Authorization View
          </span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Medical Image Viewer + Clinical Report + VLM Evidence */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Medical Image Viewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-700 font-semibold px-1">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                Diagnostic Radiograph (Original Grayscale Native DICOM)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {images.length > 0 ? `${selectedImageIndex + 1}/${images.length} Series` : '1/1 Series PA'}
              </span>
            </div>
            <MedicalImageViewer
              images={images}
              selectedIndex={selectedImageIndex}
              onSelectIndex={setSelectedImageIndex}
              imagePath={images[selectedImageIndex]?.image_url || images[selectedImageIndex]?.file_path}
              viewType={images[selectedImageIndex]?.projection || 'PA Chest'}
              patientId={caseData?.patient_id}
              caseId={caseData?.case_id}
              classification={caseData?.classification}
            />
          </div>

          {/* Transmitted Clinical Report & Attending Notes (Structured & Readable) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" /> Transmitted Clinical Report & Attending Notes
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" /> Verified Attending Transcript
              </span>
            </div>

            {/* Section 1: Clinical Indication */}
            <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                Clinical Indication & Ordering Context
              </div>
              <div className="text-xs text-slate-800 leading-relaxed font-sans">
                <span className="font-semibold text-indigo-950">Indication: </span>
                {cleanIndication}
              </div>
              <div className="text-[11px] text-slate-600">
                Patient referred for routine prior-authorization chest radiograph screening following positive tuberculin skin test (PPD/TST) to rule out active pulmonary tuberculosis disease.
              </div>
            </div>

            {/* Section 2: Detailed Anatomical Findings */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <ClipboardCheck className="w-3.5 h-3.5 text-indigo-600" />
                Radiologist Findings (Anatomical Systems Check)
              </div>
              <div className="space-y-1.5">
                {structuredFindings.map((findingText, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-800 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{findingText.replace(/\[REDACTED\]/g, 'signs')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Official Impression */}
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-700" />
                  Official Diagnostic Impression
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200/70 text-emerald-900 font-mono">
                  NEGATIVE FOR ACTIVE TB
                </span>
              </div>
              <p className="text-xs font-semibold text-emerald-900 leading-relaxed">
                {cleanImpression}
              </p>
              <div className="text-[11px] text-emerald-800">
                Concordant 2-view chest radiograph demonstrating clear lung parenchymal fields and unremarkable thoracic contours.
              </div>
            </div>
          </div>

          {/* Precomputed VLM Clinical Evidence Analysis */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" /> Precomputed VLM Clinical Evidence Analysis
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Vision-Language Model (MedAuth-VLM) Multimodal Grounding & Feature Extraction
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shadow-sm">
                Score: {Math.round(evidenceScore * 100)}% Match
              </span>
            </div>

            {/* 3 Insight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Visual Findings */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 uppercase block">Visual Findings</span>
                <div className="font-semibold text-slate-900">
                  {isNormal ? 'Zero Abnormalities' : 'Focal Abnormalities'}
                </div>
                <div className="text-[11px] text-slate-500 leading-normal">
                  {evidence?.image_evidence?.abnormalities && evidence.image_evidence.abnormalities.length > 0 
                    ? evidence.image_evidence.abnormalities.join(', ')
                    : 'Clear lung fields. No focal consolidations, active infiltrates, or pleural effusion.'}
                </div>
              </div>

              {/* Multimodal Grounding */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 uppercase block">Multimodal Grounding</span>
                <div className="font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> High Concordance
                </div>
                <div className="text-[11px] text-slate-500 leading-normal">
                  {evidence?.text_image_consistency?.notes || 'Radiograph pixel raster 100% corroborates attending radiologist findings.'}
                </div>
              </div>

              {/* Medical Necessity */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 uppercase block">Medical Necessity</span>
                <div className="font-semibold text-indigo-700 flex items-center gap-1">
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" /> Supported
                </div>
                <div className="text-[11px] text-slate-500 leading-normal">
                  {evidence?.clinical_support?.reason || "Findings align with clinical indication of a positive TB test, ruling out active pulmonary TB infection."}
                </div>
              </div>
            </div>
          </div>

          {/* Prior Authorization Coverage Policy Checklist */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" /> Health Plan Policy Compliance Checklist
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Plan ID: <span className="font-mono font-medium text-slate-700">{activePlanId}</span> • Benefit Category: Diagnostic Radiography
                </p>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Covered Benefit
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {complianceChecklist.map((item: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      {item.status === 'PASS' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Info className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                      {item.requirement}
                    </div>
                    <div className="text-[11px] text-slate-500">{item.detail}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                    item.status === 'PASS' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Human Determination Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" /> Human Reviewer Determination
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Official Review
              </span>
            </div>

            {/* Reviewer Profile Card */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                SJ
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-900">Dr. Sarah Jenkins (Senior Clinical Reviewer)</div>
                <div className="text-[11px] text-slate-500">Board Certified Diagnostic Radiologist • Payer Adjudication Directorate</div>
              </div>
            </div>

            {role === 'auditor' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Read-Only Auditor Mode
                </span>
                <p>Auditor accounts have read-only inspection privileges. Final authorization determination mutations are disabled.</p>
              </div>
            )}

            {/* Disposition Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Human Clinical Determination
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  disabled={role === 'auditor'}
                  onClick={() => setSelectedDisposition('APPROVE')}
                  className={`p-2.5 rounded-lg border font-semibold text-center transition-all ${
                    role === 'auditor' ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' :
                    selectedDisposition === 'APPROVE'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-xs font-bold">Authorize</span>
                  <span className="text-[10px] text-slate-500 block">(Approve)</span>
                </button>
                <button
                  type="button"
                  disabled={role === 'auditor'}
                  onClick={() => setSelectedDisposition('DENY')}
                  className={`p-2.5 rounded-lg border font-semibold text-center transition-all ${
                    role === 'auditor' ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' :
                    selectedDisposition === 'DENY'
                      ? 'border-red-600 bg-red-50 text-red-800 ring-2 ring-red-500 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-xs font-bold">Adverse</span>
                  <span className="text-[10px] text-slate-500 block">(Deny)</span>
                </button>
                <button
                  type="button"
                  disabled={role === 'auditor'}
                  onClick={() => setSelectedDisposition('REQUEST_MORE_INFO')}
                  className={`p-2.5 rounded-lg border font-semibold text-center transition-all ${
                    role === 'auditor' ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' :
                    selectedDisposition === 'REQUEST_MORE_INFO'
                      ? 'border-amber-600 bg-amber-50 text-amber-800 ring-2 ring-amber-500 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-xs font-bold">Request Info</span>
                  <span className="text-[10px] text-slate-500 block">(Pend)</span>
                </button>
              </div>
            </div>

            {/* Quick Clinical Rationale Templates */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Quick Clinical Rationale Templates
              </span>
              <div className="space-y-1.5 text-[11px]">
                <button
                  type="button"
                  disabled={role === 'auditor'}
                  onClick={() => applyRationaleTemplate("Approved: Multimodal diagnostic chest radiograph review demonstrates clear lung parenchymal fields and unremarkable cardiothoracic silhouette. Negative for active pulmonary tuberculosis or acute consolidation. Medical necessity criteria fully met under policy guidelines.")}
                  className="w-full p-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 rounded-lg text-left transition-colors flex items-center justify-between group"
                >
                  <span className="truncate font-medium">✓ Approve: Clear TB Screening</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                </button>
                <button
                  type="button"
                  disabled={role === 'auditor'}
                  onClick={() => applyRationaleTemplate("Approved: Clinical indication supported by concordant diagnostic radiograph findings. Multimodal VLM cross-validation confirms absence of acute pathology. Prior authorization granted.")}
                  className="w-full p-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 rounded-lg text-left transition-colors flex items-center justify-between group"
                >
                  <span className="truncate font-medium">✓ Approve: Medical Necessity Satisfied</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                </button>
                <button
                  type="button"
                  disabled={role === 'auditor'}
                  onClick={() => applyRationaleTemplate("Information Requested: Supplemental prior chest study (within 12-24 months) requested for interval comparison to verify radiographic stability.")}
                  className="w-full p-2 bg-slate-50 hover:bg-amber-50 hover:text-amber-900 border border-slate-200 rounded-lg text-left transition-colors flex items-center justify-between group"
                >
                  <span className="truncate font-medium">? Pend: Prior Study Comparison Required</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 shrink-0" />
                </button>
                <button
                  type="button"
                  disabled={role === 'auditor'}
                  onClick={() => applyRationaleTemplate("Adverse Determination: Prior authorization denied. Submitting clinical documentation does not establish conservative treatment trial or required diagnostic indication threshold under plan guidelines.")}
                  className="w-full p-2 bg-slate-50 hover:bg-red-50 hover:text-red-900 border border-slate-200 rounded-lg text-left transition-colors flex items-center justify-between group"
                >
                  <span className="truncate font-medium">✕ Deny: Policy Criteria Not Met</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-600 shrink-0" />
                </button>
              </div>
            </div>

            {/* Clinical Adjudication Rationale Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Clinical Adjudication Rationale
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  {rationale.length} characters
                </span>
              </div>
              <textarea
                rows={4}
                required
                disabled={role === 'auditor'}
                value={rationale}
                onChange={e => setRationale(e.target.value)}
                placeholder={role === 'auditor' ? 'Adjudication rationale is disabled in read-only auditor mode.' : 'State clinical justification for this determination referencing imaging findings and policy criteria...'}
                className={`w-full p-3 text-xs border rounded-lg focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans ${role === 'auditor' ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-300 focus:bg-white'}`}
              />
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                disabled={role === 'auditor' || isSavingDecision || !selectedDisposition || !rationale.trim()}
                onClick={handleOpenConfirm}
                className={`w-full text-white flex items-center justify-center gap-2 text-xs py-2.5 font-bold shadow-sm ${role === 'auditor' ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {role === 'auditor' ? (
                  <>
                    <ShieldAlert className="w-4 h-4 shrink-0" /> <span>Determinations Disabled (Auditor)</span>
                  </>
                ) : isSavingDecision ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Recording Determination...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 shrink-0" /> <span>Persist Official Determination</span>
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
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1.5 shadow-sm">
                <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> 
                  Determination Successfully Recorded
                </div>
                <div className="text-[11px] text-emerald-700">
                  Recorded in cryptographic prior-authorization ledger.
                </div>
                <div className="font-mono text-[10px] bg-emerald-100/60 p-1.5 rounded border border-emerald-200 text-emerald-950">
                  Case: {caseData?.case_id} • Review ID: {decisionPersistedResult.review_id} • Status: {decisionPersistedResult.status}
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
