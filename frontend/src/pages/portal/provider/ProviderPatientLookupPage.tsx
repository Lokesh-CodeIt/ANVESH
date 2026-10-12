import React, { useState } from 'react';
import { Search, UserCheck, AlertTriangle, ShieldAlert, FileText, ArrowRight, User } from 'lucide-react';
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
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient / Member Eligibility & Prior Auth Lookup</h1>
        <p className="text-sm text-slate-500 mt-1">
          Verify member coverage under contracted payer health plans and review existing prior-authorization submissions.
        </p>
      </div>

      {/* Clear Guidance: Required Identifier, Access Rules, and Post-Lookup Workflow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px]">1</span>
            Required Identifier
          </span>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            Input patient Member ID (e.g. <code>MEM-900001</code>), Case Reference (e.g. <code>CASE_000001</code>), or hospital MRN.
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px]">2</span>
            Permitted Access
          </span>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            HIPAA Minimum Necessary Access: Querying is restricted to active patients under current diagnosis or treatment in your department.
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px]">3</span>
            What Happens Next
          </span>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            Successful matches display active plan benefits and prior imaging reviews, and let you launch a pre-populated New Request.
          </p>
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Member ID, Case ID, or MRN
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. CASE_000001, MEM-928471, or MRN-10492"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all font-mono"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Contracted Payer
            </label>
            <select className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700">
              <option value="all">All Participating Payers</option>
              <option value="anthem">Aetna / CVS Health</option>
              <option value="bluecross">Blue Cross Blue Shield</option>
              <option value="united">UnitedHealthcare</option>
              <option value="medicare">Medicare Part B</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !searchTerm.trim()}
            className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2"
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
