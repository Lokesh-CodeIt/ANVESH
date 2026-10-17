import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronDown, 
  ArrowUpDown, 
  RefreshCw, 
  Image as ImageIcon, 
  FileCheck, 
  Download, 
  ShieldCheck, 
  Sparkles,
  X
} from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { 
  getMySubmissions, 
  getCases, 
  SubmissionRecord, 
  CaseRecord,
  isPreviewModeActive 
} from '../../../services/api';

interface ProviderSubmissionsProps {
  onNavigate?: (tab: string, caseId?: string) => void;
}

export const ProviderSubmissionsPage: React.FC<ProviderSubmissionsProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'live' | 'historical'>('live');
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'live') {
        const data = await getMySubmissions();
        setSubmissions(data);
      } else {
        const res = await getCases({ limit: 20 });
        setCases(res.cases || []);
      }
    } catch (err: any) {
      console.error('Failed to load submissions:', err);
      setError(err.message || 'Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const filteredSubmissions = submissions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();

    const matchesFiles = (s.files || []).some(f => 
      f.original_filename?.toLowerCase().includes(term) ||
      f.file_category?.toLowerCase().includes(term)
    );

    const service = (s.service_type || '').toLowerCase();
    const isLateralMatch = term === 'lateral' && (service.includes('lat') || service.includes('2 views') || service.includes('lateral'));
    const isFrontalMatch = term === 'frontal' && (service.includes('frontal') || service.includes('pa') || service.includes('single view'));

    return (
      s.submission_ref.toLowerCase().includes(term) ||
      s.member_id.toLowerCase().includes(term) ||
      s.patient_name.toLowerCase().includes(term) ||
      service.includes(term) ||
      (s.clinical_indication && s.clinical_indication.toLowerCase().includes(term)) ||
      (s.prelim_findings && s.prelim_findings.toLowerCase().includes(term)) ||
      isLateralMatch ||
      isFrontalMatch ||
      matchesFiles
    );
  });

  const filteredCases = cases.filter(c => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const service = (c.service_type || c.requested_procedure || '').toLowerCase();
    const isLateralMatch = term === 'lateral' && (service.includes('lat') || service.includes('2 views') || service.includes('lateral'));
    const isFrontalMatch = term === 'frontal' && (service.includes('frontal') || service.includes('pa') || service.includes('single view'));

    return (
      c.case_id.toLowerCase().includes(term) ||
      (c.patient_id && c.patient_id.toLowerCase().includes(term)) ||
      service.includes(term) ||
      (c.indication && c.indication.toLowerCase().includes(term)) ||
      (c.classification && c.classification.toLowerCase().includes(term)) ||
      isLateralMatch ||
      isFrontalMatch
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Authorized
          </span>
        );
      case 'DENIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs whitespace-nowrap">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" /> Denied
          </span>
        );
      case 'ADDITIONAL_INFO_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs whitespace-nowrap">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Action Required
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-300 shadow-2xs whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> In Review
          </span>
        );
      case 'SUBMITTED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-300 shadow-2xs whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" /> Submitted
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Provider Prior Authorization Submissions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track real patient prior authorization requests and attached diagnostic imaging files in real time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate?.('new-request')}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            New Request
          </Button>
        </div>
      </div>

      {/* Primary Tabs: Live Submissions vs Historical Research Cases */}
      <div className="flex border-b border-slate-200/80">
        <button
          onClick={() => setActiveTab('live')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'live'
              ? 'border-[#176B68] text-[#176B68] bg-teal-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4 text-[#176B68]" /> Live Submissions ({submissions.length})
        </button>
        <button
          onClick={() => setActiveTab('historical')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'historical'
              ? 'border-[#176B68] text-[#176B68] bg-teal-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-[#176B68]" /> Research Cohort Archive (2,107 Cases)
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="clinical-search-wrapper flex-1 w-full">
          <input
            type="text"
            placeholder={activeTab === 'live' ? "Search by AUTH Reference (e.g. AUTH-202610-...) or Patient Name..." : "Search Case ID (e.g. CASE_000001)..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="clinical-search-input font-mono"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {activeTab === 'live' && (
          <div className="clinical-filter-select-wrapper w-full md:w-auto shrink-0">
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="clinical-filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">In Review</option>
              <option value="ADDITIONAL_INFO_REQUIRED">Additional Info Required</option>
              <option value="APPROVED">Authorized</option>
              <option value="DENIED">Denied</option>
            </select>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between">
          <span>Failed to load: {error}</span>
          <Button size="sm" variant="outline" onClick={loadData}>Retry</Button>
        </div>
      )}

      {/* LIVE SUBMISSIONS TABLE */}
      {activeTab === 'live' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Submission Ref</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Patient / Member</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Requested Service</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Policy Plan</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Evidence Files</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Submitted At</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading real prior authorization submissions from secure database...
                    </td>
                  </tr>
                ) : filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      {searchTerm ? 'No submissions match your search.' : 'No prior authorization requests created yet. Click "New Request" to create your first submission.'}
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((s) => {
                    const isExpanded = expandedId === s.id;
                    const fileCount = s.files?.length || 0;
                    return (
                      <React.Fragment key={s.id}>
                        <tr className="hover:bg-teal-50/30 transition-colors">
                          {/* 1. Submission Ref */}
                          <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                            <span className="font-mono font-bold text-xs text-teal-900 bg-teal-50/90 border border-teal-200/90 px-2.5 py-1 rounded-md shadow-2xs inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                              {s.submission_ref}
                            </span>
                          </td>

                          {/* 2. Patient / Member */}
                          <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">{s.patient_name}</div>
                            <span className="font-mono text-[11px] font-semibold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-100/90 inline-block mt-0.5">
                              {s.member_id}
                            </span>
                          </td>

                          {/* 3. Requested Service */}
                          <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                            <div className="text-slate-900 font-semibold text-xs sm:text-sm">{s.service_type}</div>
                            {s.cpt_code && (
                              <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                                CPT: {s.cpt_code}
                              </span>
                            )}
                          </td>

                          {/* 4. Policy Plan */}
                          <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                            <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200/90 px-2.5 py-1 rounded-md inline-block shadow-2xs">
                              {s.payer_plan_id}
                            </span>
                          </td>

                          {/* 5. Evidence Files */}
                          <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md border shadow-2xs ${
                              fileCount > 0 
                                ? 'bg-cyan-50 text-cyan-800 border-cyan-200/90' 
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              <FileText className={`w-3.5 h-3.5 ${fileCount > 0 ? 'text-cyan-600' : 'text-slate-400'}`} />
                              {fileCount} {fileCount === 1 ? 'File' : 'Files'}
                            </span>
                          </td>

                          {/* 6. Submitted At */}
                          <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                            <div className="text-slate-700 font-medium text-xs">
                              {new Date(s.submitted_at || s.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-slate-400 font-mono text-[11px]">
                              {new Date(s.submitted_at || s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                          </td>

                          {/* 7. Status Badge */}
                          <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                            {getStatusBadge(s.status)}
                          </td>

                          {/* 8. Action Details */}
                          <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : s.id)}
                              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all shadow-2xs ${
                                isExpanded 
                                  ? 'bg-teal-700 text-white border-teal-700' 
                                  : 'bg-teal-50 hover:bg-teal-100/90 text-teal-800 border-teal-200'
                              }`}
                            >
                              <span>{isExpanded ? 'Hide' : 'View'}</span>
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable details row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={8} className="p-4 border-y border-slate-200">
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Clinical Indication</span>
                                    <p className="text-xs text-slate-700 leading-relaxed">{s.clinical_indication}</p>
                                    {s.prelim_findings && (
                                      <div className="pt-2 border-t border-slate-100 mt-2">
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Preliminary Attending Findings</span>
                                        <p className="text-xs text-slate-600 italic">{s.prelim_findings}</p>
                                      </div>
                                    )}
                                  </div>

                                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Reviewer Determination & Status</span>
                                    <div className="text-xs">
                                      <span className="text-slate-500">Current Status:</span>{' '}
                                      <strong className="text-slate-800">{s.status}</strong>
                                    </div>
                                    {s.reviewer_decision && (
                                      <div className="text-xs">
                                        <span className="text-slate-500">Decision:</span>{' '}
                                        <strong className="text-slate-800">{s.reviewer_decision}</strong> (at {s.reviewed_at ? new Date(s.reviewed_at).toLocaleString() : 'Recent'})
                                      </div>
                                    )}
                                    {s.reviewer_notes && (
                                      <div className="text-xs p-2 bg-slate-50 rounded border border-slate-200">
                                        <span className="text-slate-500 block mb-0.5">Reviewer Notes:</span>
                                        <span className="text-slate-800">{s.reviewer_notes}</span>
                                      </div>
                                    )}
                                    {s.ai_model_version && (
                                      <div className="text-xs pt-1 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-slate-500">AI Model:</span>
                                        <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[10px]">
                                          {s.ai_model_version}
                                        </span>
                                      </div>
                                    )}
                                    {s.ai_evidence?.image_evidence?.primary_llava_output && (
                                      <div className="text-xs flex items-center justify-between">
                                        <span className="text-slate-500">LLaVA Finding:</span>
                                        <strong className={
                                          s.ai_evidence.image_evidence.primary_llava_output.classification === 'abnormal'
                                            ? 'text-amber-700 font-bold'
                                            : 'text-emerald-700 font-bold'
                                        }>
                                          {s.ai_evidence.image_evidence.primary_llava_output.classification?.toUpperCase()}
                                          {' '}({Math.round(s.ai_evidence.image_evidence.primary_llava_output.confidence * 100)}%)
                                        </strong>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Attached Files List */}
                                <div className="space-y-2">
                                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Attached Genuine Evidence ({s.files?.length || 0})</span>
                                  {(!s.files || s.files.length === 0) ? (
                                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-400">
                                      No files attached to this request.
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                      {s.files.map(f => (
                                        <div key={f.id} className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                                          <div className="flex items-center gap-2 min-w-0">
                                            {f.file_category === 'radiograph' ? (
                                              <ImageIcon className="w-5 h-5 text-teal-600 shrink-0" />
                                            ) : (
                                              <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                                            )}
                                            <div className="truncate">
                                              <div className="text-xs font-semibold text-slate-800 truncate" title={f.original_filename}>{f.original_filename}</div>
                                              <div className="text-[10px] text-slate-500">{Math.round(f.file_size_bytes / 1024)} KB • {f.file_category}</div>
                                            </div>
                                          </div>
                                          {f.download_url && (
                                            <a
                                              href={f.download_url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="p-1 text-slate-400 hover:text-teal-700 rounded transition-colors ml-2"
                                              title="Download / View Authentic File"
                                            >
                                              <Download className="w-3.5 h-3.5" />
                                            </a>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HISTORICAL COHORT ARCHIVE TABLE */}
      {activeTab === 'historical' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 bg-amber-50/60 border-b border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Reference Cohort Archive:</strong> These 2,107 historical clinical research cases include precomputed VLM model findings for policy compliance benchmarks. They are separate from newly submitted provider prior authorizations.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Research Case ID</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Indication</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Requested Modality</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Classification</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Source Clinical Text</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Loading historical research cases...
                    </td>
                  </tr>
                ) : cases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No cases loaded.
                    </td>
                  </tr>
                ) : (
                  filteredCases.map(c => (
                    <tr key={c.case_id} className="hover:bg-amber-50/25 transition-colors">
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <span className="font-mono font-bold text-xs text-amber-900 bg-amber-50/90 border border-amber-200/90 px-2.5 py-1 rounded-md shadow-2xs inline-block">
                          {c.case_id}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 align-middle text-slate-800 font-medium">
                        {c.indication || '—'}
                      </td>
                      <td className="py-3.5 px-4 align-middle font-medium text-slate-900">
                        {c.service_type || 'Chest Radiography'}
                      </td>
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border shadow-2xs ${
                          c.classification === 'abnormal' 
                            ? 'bg-amber-50 text-amber-900 border-amber-300' 
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}>
                          {c.classification || 'normal'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border ${
                          c.has_source_text 
                            ? 'bg-teal-50 text-teal-800 border-teal-200' 
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {c.has_source_text ? 'Available' : 'Absent'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProviderSubmissionsPage;
