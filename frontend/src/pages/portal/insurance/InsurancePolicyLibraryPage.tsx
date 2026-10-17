import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  Search, 
  Filter, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  Lock, 
  RefreshCw, 
  Info,
  X
} from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { getPolicies, PolicyRecord } from '../../../services/api';

export const InsurancePolicyLibraryPage: React.FC = () => {
  const [policies, setPolicies] = useState<PolicyRecord[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const res = await getPolicies({ limit: 100 });
      setPolicies(res.policies || []);
      if (res.policies && res.policies.length > 0 && !selectedPolicy) {
        setSelectedPolicy(res.policies[0]);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch policy guidelines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const filtered = policies.filter(p => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.policy_id.toLowerCase().includes(term) ||
      (p.plan_id && p.plan_id.toLowerCase().includes(term)) ||
      (p.diagnosis_code && p.diagnosis_code.toLowerCase().includes(term)) ||
      (p.procedure_code && p.procedure_code.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 w-full max-w-[1720px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical Coverage Policy Library</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse and inspect active clinical coverage guidelines, exclusion rules, and diagnostic necessity thresholds.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadPolicies}
          className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} /> Refresh Policies ({policies.length})
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs flex items-center gap-4">
        <div className="clinical-search-wrapper flex-1 w-full">
          <input
            type="text"
            placeholder="Search by Policy ID, Plan ID, CPT Code, or ICD-10 Diagnosis..."
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
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 shadow-xs">
          Failed to load policies: {error}
        </div>
      )}

      {/* Main Split: Policy Master List & Selected Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List (5 cols): Spacious Guideline Cards */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-[680px]">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200/90 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              Active Guidelines
            </span>
            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full shadow-xs">
              {filtered.length} Loaded
            </span>
          </div>

          <div className="overflow-y-auto flex-1 p-3 space-y-2.5">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading guidelines...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No matching clinical policies found.</div>
            ) : (
              filtered.map((p) => {
                const isSelected = selectedPolicy?.policy_id === p.policy_id;
                return (
                  <button
                    key={p.policy_id}
                    onClick={() => setSelectedPolicy(p)}
                    className={`w-full text-left p-3.5 rounded-xl transition-all flex items-center justify-between gap-3 group ${
                      isSelected 
                        ? 'bg-gradient-to-r from-indigo-50/90 via-blue-50/50 to-white border-2 border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm' 
                        : 'bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-indigo-300 shadow-xs hover:shadow-sm'
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-mono text-xs font-bold transition-colors ${isSelected ? 'text-indigo-900' : 'text-slate-900 group-hover:text-indigo-600'}`}>
                          {p.policy_id}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                          CPT {p.procedure_code || '71046'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>Plan: <span className="font-mono font-medium text-slate-700">{p.plan_id}</span></span>
                        {p.diagnosis_code && (
                          <>
                            <span>•</span>
                            <span>Dx: <span className="font-mono font-medium text-slate-600">{p.diagnosis_code}</span></span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        {p.status || 'Covered'}
                      </span>
                      <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300 group-hover:text-indigo-500'}`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Pane (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow space-y-6 lg:sticky lg:top-4 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          {selectedPolicy ? (
            <>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
                <div>
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-lg shadow-xs">
                    {selectedPolicy.policy_id}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-2">
                    Coverage Guideline: {selectedPolicy.procedure_code || 'Chest Radiography'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Associated Health Plan ID: <strong className="text-slate-800 font-mono">{selectedPolicy.plan_id}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 shadow-xs">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Read-Only Clinical Rule
                </div>
              </div>

              {/* Parameters 4 Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-gradient-to-b from-blue-50/40 to-white rounded-xl border-2 border-blue-100 hover:border-blue-200 space-y-1 shadow-xs transition-all">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                    Applicable Diagnosis (ICD-10)
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm block">
                    {selectedPolicy.diagnosis_code || 'R06.02, J90 (Dyspnea, Effusion)'}
                  </span>
                </div>
                <div className="p-4 bg-gradient-to-b from-indigo-50/40 to-white rounded-xl border-2 border-indigo-100 hover:border-indigo-200 space-y-1 shadow-xs transition-all">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                    Billing Procedure (CPT)
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm block">
                    {selectedPolicy.procedure_code || '71046 (2 Views)'}
                  </span>
                </div>
                <div className="p-4 bg-gradient-to-b from-emerald-50/40 to-white rounded-xl border-2 border-emerald-100 hover:border-emerald-200 space-y-1 shadow-xs transition-all">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    Coverage Status
                  </span>
                  <span className="font-bold text-emerald-800 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Covered with Medical Necessity Validation
                  </span>
                </div>
                <div className="p-4 bg-gradient-to-b from-amber-50/40 to-white rounded-xl border-2 border-amber-100 hover:border-amber-200 space-y-1 shadow-xs transition-all">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                    Exclusion Criteria
                  </span>
                  <span className="font-medium text-slate-700 text-xs block leading-relaxed">
                    Frequency &gt; 1 per 7 days without acute decompensation
                  </span>
                </div>
              </div>

              {/* Requirement Checklist */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Mandatory Medical Necessity Checklist
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-start gap-3 p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-xl shadow-xs transition-all">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">Radiographic image study demonstrating primary lung fields or thoracic silhouette.</span>
                  </li>
                  <li className="flex items-start gap-3 p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-xl shadow-xs transition-all">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">Documented clinical symptoms (e.g. cough, hypoxia, fever, hemoptysis, or chest pain).</span>
                  </li>
                  <li className="flex items-start gap-3 p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-xl shadow-xs transition-all">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">Signed preliminary or final interpretation by a credentialed physician.</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-gradient-to-r from-amber-50/80 via-amber-50/40 to-orange-50/30 border border-amber-200/90 rounded-xl text-xs text-amber-800 flex items-start gap-3 shadow-xs">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong className="text-amber-950">Policy Governance Note:</strong> Modifying clinical rules requires Insurance Administrator credentials and Medical Advisory Committee signoff.
                </span>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">Select a policy from the list to view specifications.</div>
          )}
        </div>
      </div>
    </div>
  );
};
export default InsurancePolicyLibraryPage;
