import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldCheck, 
  UserPlus, 
  CheckCircle2, 
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../../components/shared/Button';

export const ProviderProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'facility' | 'staff' | 'audit'>('facility');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitedSuccess, setInvitedSuccess] = useState(false);

  const staff = [
    { name: 'Dr. Marcus Vance, MD', role: 'Attending Pulmonologist', npi: '1487295103', status: 'Active Verified', email: 'm.vance@metrogeneral.org' },
    { name: 'Dr. Sarah Chen, MD', role: 'Chief of Diagnostic Radiology', npi: '1902847192', status: 'Active Verified', email: 's.chen@metrogeneral.org' },
    { name: 'Elena Rostova, RN', role: 'Prior Authorization Coordinator', npi: 'N/A', status: 'Active', email: 'e.rostova@metrogeneral.org' },
    { name: 'David Kim, RT(R)', role: 'Lead Radiologic Technologist', npi: 'N/A', status: 'Active', email: 'd.kim@metrogeneral.org' }
  ];

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInvitedSuccess(true);
    setTimeout(() => {
      setInvitedSuccess(false);
      setInviteEmail('');
    }, 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hospital Profile & Clinical Staff</h1>
        <p className="text-sm text-slate-500 mt-1">
          Healthcare organization credentials, facility licensing, and authorization team access management.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6">
        <button
          onClick={() => setActiveTab('facility')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'facility'
              ? 'border-teal-600 text-teal-700 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" /> Facility Credentials
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'staff'
              ? 'border-teal-600 text-teal-700 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" /> Clinical Staff Directory
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-teal-600 text-teal-700 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Facility Access Audit
        </button>
      </div>

      {/* Facility Tab */}
      {activeTab === 'facility' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <div className="w-14 h-14 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xl">
              MG
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Metro General Health System</h2>
              <p className="text-xs text-slate-500">
                Facility ID: FAC-89210 • CMS Certification: CCN-380192 • Level 1 Trauma Center
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block font-semibold text-slate-500 uppercase mb-1">Organization NPI</label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono font-medium text-slate-800">
                1982736450 (Type 2 Organization)
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-500 uppercase mb-1">State License & Accreditation</label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-medium text-slate-800">
                The Joint Commission (TJC) Gold Seal • License #HOS-9921
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-500 uppercase mb-1">Primary Clinical Address</label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-medium text-slate-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" /> 1200 Health Sciences Way, Portland, OR 97201
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-500 uppercase mb-1">Clinical Department Contact</label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-medium text-slate-800 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" /> (503) 555-0199 • priorauth@metrogeneral.org
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Directory Tab */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          {/* Invite Box */}
          <form onSubmit={handleInvite} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Invite Clinical Staff Member</label>
              <input
                type="email"
                required
                placeholder="colleague@metrogeneral.org"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="sm:self-end">
              <Button type="submit" variant="primary" size="sm" className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 text-xs">
                <UserPlus className="w-4 h-4" /> Send Invitation
              </Button>
            </div>
          </form>

          {invitedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Invitation email staged (Research Sandbox Mode)
            </div>
          )}

          {/* Directory Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Clinical Role</th>
                  <th className="py-3 px-4">Individual NPI</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-500">{s.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{s.role}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{s.npi}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Organization Security & Authorization Audit</h2>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Audit Logging:</span> All case submissions, document uploads, and member eligibility lookups are logged with timestamp, user ID, and client IP in accordance with HIPAA audit requirements.
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <div className="p-3 border border-slate-100 rounded-lg flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-800">Case Submission CASE_000001</span>
                <span className="text-slate-400 block text-[11px]">Submitted by Dr. Marcus Vance, MD</span>
              </div>
              <span className="font-mono text-slate-500">2026-10-10 14:22:01 UTC</span>
            </div>
            <div className="p-3 border border-slate-100 rounded-lg flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-800">DICOM Radiograph Series Upload</span>
                <span className="text-slate-400 block text-[11px]">Verified by David Kim, RT(R)</span>
              </div>
              <span className="font-mono text-slate-500">2026-10-10 14:18:40 UTC</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProviderProfilePage;
