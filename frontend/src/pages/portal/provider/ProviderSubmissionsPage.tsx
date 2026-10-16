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
  Sparkles
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
    return (
      s.submission_ref.toLowerCase().includes(term) ||
      s.member_id.toLowerCase().includes(term) ||
      s.patient_name.toLowerCase().includes(term) ||
      s.service_type.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Authorized
          </span>
        );
      case 'DENIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-800 border border-red-200">
            <AlertCircle className="w-3 h-3 text-red-600" /> Denied
          </span>
        );
      case 'ADDITIONAL_INFO_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" /> Additional Info Required
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Clock className="w-3 h-3 text-indigo-600" /> In Review
          </span>
        );
      case 'SUBMITTED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" /> Submitted (Pending Review)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
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
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('live')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'live'
              ? 'border-teal-600 text-teal-800 bg-teal-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileCheck className="w-4 h-4" /> Live Submissions ({submissions.length})
        </button>
        <button
          onClick={() => setActiveTab('historical')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'historical'
              ? 'border-teal-600 text-teal-800 bg-teal-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" /> Research Cohort Archive (2,107 Cases)
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder={activeTab === 'live' ? "Search by AUTH Reference (e.g. AUTH-202610-...) or Patient Name..." : "Search Case ID (e.g. CASE_000001)..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
          />
        </div>

        {activeTab === 'live' && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Submission Ref</th>
                  <th className="py-3 px-4">Patient / Member</th>
                  <th className="py-3 px-4">Requested Service</th>
                  <th className="py-3 px-4">Policy Plan</th>
                  <th className="py-3 px-4">Evidence Files</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
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
                    return (
                      <React.Fragment key={s.id}>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-teal-900">
                            {s.submission_ref}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-900">
                            <div>{s.patient_name}</div>
                            <div className="font-mono text-[11px] text-slate-400">{s.member_id}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-800 font-medium">
                            <div>{s.service_type}</div>
                            {s.cpt_code && <div className="text-[10px] font-mono text-slate-500">CPT: {s.cpt_code}</div>}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {s.payer_plan_id}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              <FileText className="w-3 h-3 text-slate-500" /> {s.files?.length || 0} File{s.files?.length !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {new Date(s.submitted_at || s.created_at).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            {getStatusBadge(s.status)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : s.id)}
                              className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-900 font-semibold px-2 py-1 rounded hover:bg-teal-50"
                            >
                              {isExpanded ? 'Hide' : 'View'} {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
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
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Research Case ID</th>
                  <th className="py-3 px-4">Indication</th>
                  <th className="py-3 px-4">Requested Modality</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Source Clinical Text</th>
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
                  cases.map(c => (
                    <tr key={c.case_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {c.case_id}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {c.indication || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {c.service_type || 'Chest Radiography'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.classification === 'abnormal' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {c.classification || 'normal'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {c.has_source_text ? 'Available' : 'Absent'}
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
