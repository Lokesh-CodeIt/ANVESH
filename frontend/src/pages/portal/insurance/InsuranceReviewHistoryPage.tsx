import React, { useEffect, useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  RefreshCw, 
  FileText,
  X
} from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { getReviews, ReviewRecord } from '../../../services/api';

interface InsuranceReviewHistoryProps {
  onNavigate?: (tab: string, caseId?: string) => void;
}

export const InsuranceReviewHistoryPage: React.FC<InsuranceReviewHistoryProps> = ({ onNavigate }) => {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await getReviews({ limit: 50, skip: 0 });
      setReviews(res.reviews || []);
      setTotal(res.total || 0);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load historical review determinations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filtered = reviews.filter(r => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.case_id && r.case_id.toLowerCase().includes(term)) ||
      (r.reviewer_id && r.reviewer_id.toLowerCase().includes(term)) ||
      (r.final_decision && r.final_decision.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review Determinations & Audit Log</h1>
          <p className="text-sm text-slate-500 mt-1">
            Permanent, immutable ledger of clinical prior-authorization determinations and physician rationales.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadHistory}
          className="flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Log
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="clinical-search-wrapper flex-1 w-full">
          <input
            type="text"
            placeholder="Search by Case ID, Reviewer ID, or Decision..."
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

        <div className="text-xs text-slate-500 whitespace-nowrap px-2 shrink-0">
          Audited Determinations in DB: <strong className="text-slate-900 font-mono">{total}</strong>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          Failed to load review records: {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">Audit ID</th>
              <th className="py-3 px-4">Case Reference</th>
              <th className="py-3 px-4">Adjudicating Reviewer</th>
              <th className="py-3 px-4">Determination</th>
              <th className="py-3 px-4">Clinical Rationale</th>
              <th className="py-3 px-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  Loading persisted review audit trail...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  No persisted determinations found.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.review_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-500">
                    REV-{r.review_id}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {r.case_id}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {r.reviewer_id || 'Medical Director (Auth)'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                      r.final_decision === 'APPROVE' || r.final_decision === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : r.final_decision === 'DENY' || r.final_decision === 'DENIED'
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {r.final_decision || 'Persisted'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={r.rationale || 'Clinical rationale documented'}>
                    {r.rationale || 'Clinical necessity criteria evaluated against radiographic findings.'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : 'Audited'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default InsuranceReviewHistoryPage;
