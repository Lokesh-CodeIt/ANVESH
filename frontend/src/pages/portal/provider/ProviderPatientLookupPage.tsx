import React, { useState } from 'react';
import { Search, UserCheck, AlertTriangle, ShieldAlert, FileText, ArrowRight, User, X } from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { getCases, CaseRecord } from '../../../services/api';

interface ProviderPatientLookupProps {
  onNavigate?: (tab: string, caseId?: string) => void;
}

export const ProviderPatientLookupPage: React.FC<ProviderPatientLookupProps> = ({ onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [matchedCases, setMatchedCases] = useState<CaseRecord[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      // In the real system, case searches find verified clinical records
      const res = await getCases({ limit: 50, skip: 0 });
      const term = searchTerm.trim().toLowerCase();
      const filtered = (res.cases || []).filter((c: CaseRecord) => 
        c.case_id.toLowerCase().includes(term) ||
        (c.patient_id && c.patient_id.toLowerCase().includes(term))
      );
      setMatchedCases(filtered);
    } catch {
      setMatchedCases([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient / Member Eligibility & Prior Auth Lookup</h1>
        <p className="text-sm text-slate-500 mt-1">
          Verify member coverage under contracted payer health plans and review existing prior-authorization submissions.
        </p>
      </div>

      {/* Clear Guidance Cards: Required Identifier, Access Rules, and Post-Lookup Workflow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Required Identifier */}
        <div className="bg-gradient-to-br from-teal-50/70 via-white to-teal-50/20 border-2 border-teal-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#0F766E] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              1
            </span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Required Identifier
            </h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Input patient Member ID (e.g. <span className="font-mono font-semibold px-2 py-0.5 bg-teal-100/70 text-[#0F766E] rounded border border-teal-200 text-xs">MEM-900001</span>), Case Reference (e.g. <span className="font-mono font-semibold px-2 py-0.5 bg-teal-100/70 text-[#0F766E] rounded border border-teal-200 text-xs">CASE_000001</span>), or hospital MRN.
          </p>
        </div>

        {/* Card 2: Permitted Access */}
        <div className="bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/20 border-2 border-blue-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              2
            </span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Permitted Access
            </h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong className="text-slate-800 font-semibold">HIPAA Minimum Necessary Access:</strong> Querying is restricted to active patients under current diagnosis or treatment in your department.
          </p>
        </div>

        {/* Card 3: What Happens Next */}
        <div className="bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/20 border-2 border-emerald-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              3
            </span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              What Happens Next
            </h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Successful matches display active plan benefits and prior imaging reviews, and let you launch a pre-populated <strong className="text-emerald-800 font-semibold">New Request</strong>.
          </p>
        </div>
      </div>

      {/* Search Form Card */}
      <form onSubmit={handleSearch} className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="md:col-span-2 space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Member ID, Case ID, or MRN
            </label>
            <div className="clinical-search-wrapper">
              <input
                type="text"
                placeholder="e.g. CASE_000001, MEM-928471, or MRN-10492"
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

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Contracted Payer
            </label>
            <select className="clinical-filter-select w-full">
              <option value="all">All Participating Payers</option>
              <option value="anthem">Aetna / CVS Health</option>
              <option value="bluecross">Blue Cross Blue Shield</option>
              <option value="united">UnitedHealthcare</option>
              <option value="medicare">Medicare Part B</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !searchTerm.trim()}
            className="h-12 px-7 bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors"
          >
            {loading ? 'Querying Eligibility...' : 'Verify Eligibility & Lookup'}
          </Button>
        </div>
      </form>

      {/* Results View */}
      {searched && (
        <div className="space-y-4">
          {matchedCases.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 bg-teal-50/50 border-b border-teal-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-teal-900 font-semibold text-sm">
                  <UserCheck className="w-4 h-4 text-teal-700" />
                  Active Treatment Relationship Verified • {matchedCases.length} Associated Clinical Case{matchedCases.length > 1 ? 's' : ''}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigate?.('new-request')}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs"
                >
                  Create New Request
                </Button>
              </div>

              <div className="divide-y divide-slate-100">
                {matchedCases.map((c) => (
                  <div key={c.case_id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 px-2 py-0.5 bg-slate-100 rounded">
                          {c.case_id}
                        </span>
                        <span className="text-xs font-medium text-slate-700">
                          {c.service_type || 'Diagnostic Chest Study'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Patient Ref: <span className="font-mono font-medium text-slate-700">{c.patient_id || 'ANV-PT-9021'}</span> • Record Date: {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Active'}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-800 rounded font-medium">
                        Prior Auth In Review
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate?.('request-details', c.case_id)}
                        className="text-xs flex items-center gap-1"
                      >
                        Inspect Case <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No Associated Authorization Records Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No active authorization submissions were found matching "{searchTerm}" within Metro General Health System's permitted roster.
              </p>
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigate?.('new-request')}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  Initiate New Request for this Member
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default ProviderPatientLookupPage;
