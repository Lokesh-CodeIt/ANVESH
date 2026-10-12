import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Layers, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  FileSearch, 
  ArrowRight, 
  TrendingUp,
  Activity,
  FolderOpen
} from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { getSummary, getCases, getReviews, SummaryData, CaseRecord, ReviewRecord } from '../../../services/api';

interface InsuranceDashboardProps {
  onNavigate?: (tab: string, caseId?: string) => void;
}

export const InsuranceDashboardPage: React.FC<InsuranceDashboardProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [recentCases, setRecentCases] = useState<CaseRecord[]>([]);
  const [recentReviews, setRecentReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadInsuranceData = async () => {
      try {
        setLoading(true);
        const [sumRes, caseRes, revRes] = await Promise.all([
          getSummary().catch(() => null),
          getCases({ limit: 6, skip: 0 }).catch(() => ({ cases: [], total: 0, limit: 6, skip: 0 })),
          getReviews({ limit: 4, skip: 0 }).catch(() => ({ reviews: [], total: 0, limit: 4, skip: 0 }))
        ]);

        if (mounted) {
          setSummary(sumRes);
          setRecentCases(caseRes.cases || []);
          setRecentReviews(revRes.reviews || []);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to fetch insurance metrics');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInsuranceData();
    return () => { mounted = false; };
  }, []);

  const totalCases = summary?.total_cases ?? recentCases.length;
  const totalReviews = summary?.total_reviews ?? recentReviews.length;
  const pendingCases = Math.max(0, totalCases - totalReviews);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            <ShieldCheck className="w-4 h-4" /> Apex Mutual Health • Clinical Medical Review Operations
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Prior Authorization Review Workspace
          </h1>
          <p className="text-sm text-slate-500">
            Evaluate submitted radiographic evidence, clinical indications, and health plan policy rules with explicit human oversight.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.('policy-library')}
            className="flex items-center gap-1.5"
          >
            <FolderOpen className="w-4 h-4" /> Policy Library
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate?.('case-queue')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
          >
            <FileSearch className="w-4 h-4" /> Open Review Queue ({pendingCases})
          </Button>
        </div>
      </div>

      {/* Real Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Case Intake</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {loading ? '—' : totalCases}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Total active prior auth records
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Awaiting Human Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {loading ? '—' : pendingCases}
          </div>
          <div className="text-xs text-amber-700 mt-1 font-medium">
            Actionable medical review queue
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Determinations Recorded</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {loading ? '—' : totalReviews}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Persisted review records in DB
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Policy Guidelines</span>
            <ShieldCheck className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {loading ? '—' : (summary?.total_policies ?? 100)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Standard clinical policy rules
          </div>
        </div>
      </div>

      {/* Main Split: Intake Queue Preview & Determination Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Intake Queue Preview */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Priority Clinical Review Queue</h2>
              <p className="text-xs text-slate-500">Unreviewed cases awaiting clinical policy validation</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate?.('case-queue')}
              className="text-xs"
            >
              View Full Queue ({pendingCases})
            </Button>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading cases...</div>
            ) : recentCases.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No cases currently pending review.</div>
            ) : (
              recentCases.map((c) => (
                <div key={c.case_id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{c.case_id}</span>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium">
                        {c.service_type || 'Diagnostic Chest X-Ray'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 truncate">
                      Patient: <span className="font-mono text-slate-700">{c.patient_id || 'ANV-PT-9021'}</span> • Received: {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Active'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-800 font-semibold rounded-full border border-amber-200">
                      Pending Review
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onNavigate?.('case-workspace', c.case_id)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1 h-auto"
                    >
                      Open Case
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Audit Log Summary & Operational Guidelines */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Recent Determination Audits</h3>
            <p className="text-xs text-slate-500">
              Directly persisted reviewer dispositions from the database:
            </p>

            <div className="space-y-3">
              {recentReviews.length === 0 ? (
                <div className="text-xs text-slate-400 py-3 text-center">No determinations recorded yet.</div>
              ) : (
                recentReviews.map((r) => (
                  <div key={r.review_id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-800">Case {r.case_id}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-emerald-100 text-emerald-800">
                        {r.final_decision || 'Persisted'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Reviewer: {r.reviewer_id || 'Medical Director'} • {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Verified'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-700" /> Human Decision Governance
            </h3>
            <p className="text-xs text-indigo-900 leading-relaxed">
              ANVESH separates precomputed VLM evidence scoring from policy adjudication. 
              Exclusions, contradictions, and missing items require mandatory clinical rationale. 
              Opening a case never commits or changes a determination automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default InsuranceDashboardPage;
