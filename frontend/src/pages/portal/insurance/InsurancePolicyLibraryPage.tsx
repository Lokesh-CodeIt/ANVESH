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
  Info
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
    <div className="space-y-6 max-w-6xl">
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
          className="flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Policies ({policies.length})
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Policy ID, Plan ID, CPT Code, or ICD-10 Diagnosis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          Failed to load policies: {error}
        </div>
      )}

      {/* Main Split: Policy Master List & Selected Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[580px]">
          <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
            Active Guidelines ({filtered.length})
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading guidelines...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No matching policies.</div>
            ) : (
              filtered.map((p) => {
                const isSelected = selectedPolicy?.policy_id === p.policy_id;
                return (
                  <button
                    key={p.policy_id}
                    onClick={() => setSelectedPolicy(p)}
                    className={`w-full text-left p-3.5 transition-colors flex items-center justify-between ${
                      isSelected ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-900">{p.policy_id}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Plan: {p.plan_id} • CPT: {p.procedure_code || '71046'}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {p.status || 'Active'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Pane (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          {selectedPolicy ? (
            <>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {selectedPolicy.policy_id}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">
                    Coverage Guideline: {selectedPolicy.procedure_code || 'Chest Radiography'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Associated Plan ID: <strong className="text-slate-800 font-mono">{selectedPolicy.plan_id}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Lock className="w-3.5 h-3.5" /> Read-Only Rule
                </div>
              </div>

              {/* Parameters */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block mb-0.5">Applicable Diagnosis (ICD-10)</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedPolicy.diagnosis_code || 'R06.02, J90 (Dyspnea, Effusion)'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block mb-0.5">Billing Procedure (CPT)</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedPolicy.procedure_code || '71046 (2 Views)'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block mb-0.5">Coverage Status</span>
                  <span className="font-bold text-emerald-700">
                    Covered with Medical Necessity Validation
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block mb-0.5">Exclusion Criteria</span>
                  <span className="font-semibold text-slate-700">
                    Frequency &gt; 1 per 7 days without acute decompensation
                  </span>
                </div>
              </div>

              {/* Requirement Checklist */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mandatory Medical Necessity Checklist
                </h3>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Radiographic image study demonstrating primary lung fields or thoracic silhouette.</span>
                  </li>
                  <li className="flex items-start gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Documented clinical symptoms (e.g. cough, hypoxia, fever, hemoptysis, or chest pain).</span>
                  </li>
                  <li className="flex items-start gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Signed preliminary or final interpretation by a credentialed physician.</span>
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Policy Governance Note:</strong> Modifying clinical rules requires Insurance Administrator credentials and Medical Advisory Committee signoff.
                </span>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">Select a policy to view specifications.</div>
          )}
        </div>
      </div>
    </div>
  );
};
export default InsurancePolicyLibraryPage;
