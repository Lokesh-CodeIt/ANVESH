import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  RefreshCw, 
  ArrowRight, 
  ShieldAlert, 
  FileCheck, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Sparkles, 
  Building2, 
  Image as ImageIcon,
  X
} from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { 
  getInsuranceSubmissions, 
  getCases, 
  SubmissionRecord, 
  CaseRecord,
  isPreviewModeActive 
} from '../../../services/api';

interface InsuranceQueueProps {
  onNavigate?: (tab: string, caseId?: string) => void;
}

export const InsuranceQueuePage: React.FC<InsuranceQueueProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'live' | 'historical'>('live');
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [totalCases, setTotalCases] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const limit = 20;

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      if (activeTab === 'live') {
        const subs = await getInsuranceSubmissions();
        setSubmissions(subs);
      } else {
        const res = await getCases({ limit, skip: page * limit });
        setCases(res.cases || []);
        setTotalCases(res.total || 0);
      }
    } catch (err: any) {
      console.error('Failed to load queue:', err);
      setError(err.message || 'Failed to load case queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [activeTab, page]);

  const filteredSubmissions = submissions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();

    // Check files for projection or filename matches (e.g. frontal, lateral, pa)
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
      (s.provider_org && s.provider_org.toLowerCase().includes(term)) ||
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Authorized
          </span>
        );
      case 'DENIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-800 border border-red-200">
            <AlertTriangle className="w-3 h-3 text-red-600" /> Denied
          </span>
        );
      case 'ADDITIONAL_INFO_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Info Required
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Clock className="w-3 h-3 text-indigo-600" /> Under Review
          </span>
        );
      case 'SUBMITTED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" /> Awaiting Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl w-full">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical Prior Authorization Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and adjudicate genuine provider imaging submissions and historical benchmark cases.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadQueue}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Queue
          </Button>
        </div>
      </div>

      {/* Distinction Tabs: Real Submissions vs Research Cohort */}
      <div className="flex border-b border-slate-200/80">
        <button
          onClick={() => { setActiveTab('live'); setPage(0); }}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'live'
              ? 'border-[#176B68] text-[#176B68] bg-teal-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4 text-[#176B68]" /> Live Provider Requests ({submissions.length})
        </button>
        <button
          onClick={() => { setActiveTab('historical'); setPage(0); }}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'historical'
              ? 'border-[#176B68] text-[#176B68] bg-teal-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-[#176B68]" /> Historical Research Archive (2,107 Cohort Cases)
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="clinical-search-wrapper flex-1 w-full">
          <input
            type="text"
            placeholder={activeTab === 'live' ? "Search by Submission Ref (e.g. AUTH-202610-...), Patient, or Hospital..." : "Search Case ID (e.g. CASE_000001)..."}
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
          <div className="clinical-filter-select-wrapper w-full md:w-auto shrink-0 flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="clinical-filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="SUBMITTED">Awaiting Review</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ADDITIONAL_INFO_REQUIRED">Info Required</option>
              <option value="APPROVED">Authorized</option>
              <option value="DENIED">Denied</option>
            </select>
            <div className="text-xs text-slate-500 whitespace-nowrap px-2">
              Queue depth: <strong className="text-slate-900">{filteredSubmissions.length}</strong>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <span>Failed to load queue: {error}</span>
          <Button size="sm" variant="outline" onClick={loadQueue}>Retry</Button>
        </div>
      )}

      {/* TAB 1: LIVE PROVIDER SUBMISSIONS */}
      {activeTab === 'live' && (
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Submission Ref</th>
                  <th className="py-3 px-4">Submitted Time</th>
                  <th className="py-3 px-4">Provider / Facility</th>
                  <th className="py-3 px-4">Patient / Member</th>
                  <th className="py-3 px-4">Requested Service</th>
                  <th className="py-3 px-4">Plan Reference</th>
                  <th className="py-3 px-4">Files</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Loading submitted prior authorizations from database...
                    </td>
                  </tr>
                ) : filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      {searchTerm ? 'No submissions match your search.' : 'No provider prior authorization requests pending review.'}
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#176B68]">
                        {s.submission_ref}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(s.submitted_at || s.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]" title={s.provider_org || 'Metropolitan Hospital'}>
                            {s.provider_org || 'Metropolitan Hospital'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-900">
                        <div className="font-medium">{s.patient_name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{s.member_id}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium">
                        <div>{s.service_type}</div>
                        {s.cpt_code && <div className="text-[10px] font-mono text-slate-500">CPT: {s.cpt_code}</div>}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {s.payer_plan_id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                          <FileCheck className="w-3 h-3 text-emerald-600" /> {s.files?.length || 0} Attached
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(s.status)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onNavigate?.('case-workspace', s.submission_ref)}
                          className="text-xs font-semibold shadow-xs"
                        >
                          Open Review
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: HISTORICAL COHORT QUEUE */}
      {activeTab === 'historical' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <strong>Research Benchmark Archive:</strong> Precomputed multi-modal VLM prior authorization cases (Cases #1–#2107).
            </span>
            <span>Total cases: <strong>{totalCases}</strong></span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Case ID</th>
                  <th className="py-3 px-4">Patient Reference</th>
                  <th className="py-3 px-4">Requested Procedure</th>
                  <th className="py-3 px-4">Evidence Status</th>
                  <th className="py-3 px-4">Review Type</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Loading historical research cases...
                    </td>
                  </tr>
                ) : filteredCases.map((c) => (
                  <tr key={c.case_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {c.case_id}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {c.patient_id || 'ANV-PT-9012'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-medium">
                      {c.service_type || 'Chest Radiography'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <FileCheck className="w-3 h-3" /> Precomputed VLM
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                        <Clock className="w-3 h-3" /> Human Review
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onNavigate?.('case-workspace', c.case_id)}
                        className="text-xs font-semibold"
                      >
                        Open Workspace
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar for Historical Cases */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing <strong className="text-slate-900">{page * limit + 1}</strong> to{' '}
              <strong className="text-slate-900">{Math.min((page + 1) * limit, totalCases)}</strong> of{' '}
              <strong className="text-slate-900">{totalCases}</strong> cases
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * limit >= totalCases}
                onClick={() => setPage(p => p + 1)}
                className="text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default InsuranceQueuePage;
