import React, { useState } from 'react';
import { 
  Building, 
  Users, 
  Shield, 
  UserCheck, 
  UserPlus, 
  Key, 
  AlertCircle, 
  CheckCircle2, 
  Lock 
} from 'lucide-react';
import { Button } from '../../../components/shared/Button';

export const InsuranceAdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reviewers' | 'roles' | 'organization'>('reviewers');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invited, setInvited] = useState(false);

  const reviewers = [
    { name: 'Dr. Elizabeth Thorne, MD', email: 'e.thorne@apexmutual.com', role: 'Medical Director (Adjudication)', status: 'Active Verified', cases: 142 },
    { name: 'Dr. Alan Morales, MD', email: 'a.morales@apexmutual.com', role: 'Clinical Peer Reviewer', status: 'Active Verified', cases: 98 },
    { name: 'Rebecca Vance, BSN, RN', email: 'r.vance@apexmutual.com', role: 'Utilization Review Nurse', status: 'Active Verified', cases: 284 },
    { name: 'Samuel Osei, JD', email: 's.osei@apexmutual.com', role: 'Compliance Auditor (Read-Only)', status: 'Active', cases: 0 }
  ];

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInvited(true);
    setTimeout(() => {
      setInvited(false);
      setInviteEmail('');
    }, 3000);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payer Organization Administration & Access Governance</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure reviewer credentials, role-based authorization scopes, and organizational compliance parameters.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6">
        <button
          onClick={() => setActiveTab('reviewers')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'reviewers'
              ? 'border-indigo-600 text-indigo-700 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" /> Reviewer Staff Roster
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'roles'
              ? 'border-indigo-600 text-indigo-700 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" /> Role Permissions Matrix
        </button>
        <button
          onClick={() => setActiveTab('organization')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'organization'
              ? 'border-indigo-600 text-indigo-700 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" /> Payer Company Profile
        </button>
      </div>

      {/* Reviewer Staff Tab */}
      {activeTab === 'reviewers' && (
        <div className="space-y-6">
          <form onSubmit={handleInvite} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Provision Clinical Reviewer Credentials
              </label>
              <input
                type="email"
                required
                placeholder="physician@apexmutual.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:self-end">
              <Button type="submit" variant="primary" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 text-xs">
                <UserPlus className="w-4 h-4" /> Issue Credential
              </Button>
            </div>
          </form>

          {invited && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Reviewer provisioning request submitted (Preview Mode)
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <th className="py-3 px-4">Reviewer</th>
                  <th className="py-3 px-4">Adjudication Scope</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Cases Reviewed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviewers.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{r.name}</div>
                      <div className="text-[11px] text-slate-500">{r.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{r.role}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-800 font-semibold">{r.cases}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Role Permission Scope Tab */}
      {activeTab === 'roles' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900">Configured Role Permissions Matrix</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="font-bold text-slate-900 text-sm">Clinical Reviewer</div>
              <p className="text-slate-600">
                Authorized to inspect radiographic studies, review precomputed VLM evidence scores, evaluate clinical notes, and recommend determinations.
              </p>
              <div className="text-[11px] text-emerald-700 font-semibold">Scope: Standard Adjudication</div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="font-bold text-slate-900 text-sm">Medical Director / Senior Supervisor</div>
              <p className="text-slate-600">
                Full authority to render adverse determinations (denials), override policy guidelines with signed clinical rationale, and adjudicate appeals.
              </p>
              <div className="text-[11px] text-indigo-700 font-semibold">Scope: Final Binding Determination</div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="font-bold text-slate-900 text-sm">Insurance Administrator</div>
              <p className="text-slate-600">
                Manages policy rule versions, updates coverage thresholds, provisions reviewer accounts, and exports regulatory audit logs.
              </p>
              <div className="text-[11px] text-purple-700 font-semibold">Scope: Policy & System Governance</div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="font-bold text-slate-900 text-sm">Read-Only Auditor</div>
              <p className="text-slate-600">
                Inspects historical determinations, audit logs, and adherence to state insurance commission turnaround standards. No mutation permissions.
              </p>
              <div className="text-[11px] text-slate-600 font-semibold">Scope: Audit Ledger Read-Only</div>
            </div>
          </div>
        </div>
      )}

      {/* Organization Tab */}
      {activeTab === 'organization' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <div className="w-14 h-14 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xl">
              AM
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Apex Mutual Health Insurance Corporation</h2>
              <p className="text-xs text-slate-500">
                NAIC Payer ID: 94821 • CMS Health Plan Contract: H9201 • State Insurance Domicile: Oregon
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block font-semibold text-slate-500 uppercase mb-1">Corporate Headquarters</label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-medium text-slate-800">
                1000 Payer Plaza, Suite 400, Portland, OR 97204
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-500 uppercase mb-1">Prior Auth Medical Director Contact</label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-medium text-slate-800">
                medical.review@apexmutual.com • (800) 555-APEX
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default InsuranceAdminPage;
