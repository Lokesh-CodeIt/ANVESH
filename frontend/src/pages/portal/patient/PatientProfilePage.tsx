import React, { useState } from 'react';
import { User, Bell, Shield, HelpCircle, Mail, Phone, MapPin, AlertCircle, CheckCircle, ChevronDown, ChevronUp, LogOut } from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { useAuth } from '../../../context/AuthContext.tsx';

export const PatientProfilePage: React.FC = () => {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'faq'>('profile');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [emailNotify, setEmailNotify] = useState(true);
  const [smsNotify, setSmsNotify] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const faqs = [
    {
      q: 'How does ANVESH handle my medical prior authorization?',
      a: 'ANVESH assists healthcare providers and insurance clinical reviewers by organizing radiographic evidence and policy criteria. Decisions are never made autonomously by artificial intelligence—a qualified clinical reviewer always evaluates the evidence.'
    },
    {
      q: 'Why does my claim status say "Review in Progress"?',
      a: 'This means your provider submitted the required imaging and clinical reports, and a medical reviewer at your health plan is currently validating policy criteria against the clinical findings.'
    },
    {
      q: 'What should I do if additional documents are requested?',
      a: 'Visit the "Required Documents" tab to view specific requests from your health plan. You or your healthcare provider can upload requested clinical summaries or clarifying records directly.'
    },
    {
      q: 'Are my personal medical records secure?',
      a: 'Yes. ANVESH strictly separates member data, employs role-based access restrictions, and only displays authorized medical summaries permitted for your member profile.'
    }
  ];

  const handleSavePreferences = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Member Profile & Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal details, communication preferences, and access support resources.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-emerald-600 text-emerald-700 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-4 h-4" /> Personal Information
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'notifications'
              ? 'border-emerald-600 text-emerald-700 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4" /> Notifications & Alerts
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'security'
              ? 'border-emerald-600 text-emerald-700 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" /> Security & Access
        </button>
        <button
          onClick={() => setActiveTab('faq')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'faq'
              ? 'border-emerald-600 text-emerald-700 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <HelpCircle className="w-4 h-4" /> Help & Support
        </button>
      </div>

      {/* Tab: Profile */}
      {activeTab === 'profile' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl font-bold">
              ES
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Eleanor Silverwood</h2>
              <p className="text-sm text-slate-500">Member ID: MEM-928471 • Primary Insured</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Full Legal Name
              </label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium text-slate-800">
                Eleanor Maeve Silverwood
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Date of Birth
              </label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium text-slate-800">
                14 May 1968 (Age 57)
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" /> e.silverwood@example.org
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Contact Phone
              </label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" /> +1 (555) 234-8910
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Residential Address
              </label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" /> 742 Evergreen Terrace, Springfield, OR 97477
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>To update demographic or contact information, please submit verified identity documents or contact Member Services.</span>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('faq')}>
              Request Update
            </Button>
          </div>
        </div>
      )}

      {/* Tab: Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900">Communication Channels</h2>
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotify}
                  onChange={(e) => setEmailNotify(e.target.checked)}
                  className="mt-1 h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800 block">Email Notifications</span>
                  <span className="text-xs text-slate-500">
                    Receive email alerts when claims change status, decisions are recorded, or documents are requested.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsNotify}
                  onChange={(e) => setSmsNotify(e.target.checked)}
                  className="mt-1 h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800 block">SMS Text Alerts</span>
                  <span className="text-xs text-slate-500">
                    Receive urgent mobile notifications for time-sensitive document requests and final determinations.
                  </span>
                </div>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              {savedSuccess ? (
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Preferences saved locally
                </span>
              ) : (
                <span className="text-xs text-slate-400">Settings stored in local session</span>
              )}
              <Button size="sm" onClick={handleSavePreferences}>
                Save Preferences
              </Button>
            </div>
          </div>

          {/* Backend Notification Dependency State */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Backend Event Feed Status</h3>
                <p className="text-xs text-slate-600 mt-1">
                  The ANVESH research prototype backend currently operates without a persistent push-notification server. 
                  Real-time alerts and inbox synchronization require a dedicated WebSocket or SSE notification endpoint. 
                  Direct claim updates are reflected on the Claims timeline upon manual page refresh.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Security */}
      {activeTab === 'security' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900">Account Security & Access Log</h2>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <div className="font-semibold text-amber-900">Development Design Preview Session</div>
              <p>
                You are currently viewing ANVESH in front-end design preview mode. No live identity provider (OAuth/SAML) 
                is connected to authenticate individual patient credentials on this research node.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
              <div>
                <div className="text-sm font-semibold text-slate-800">Two-Factor Authentication (2FA)</div>
                <div className="text-xs text-slate-500">Requires authenticator app or SMS OTP</div>
              </div>
              <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded font-medium">
                Not Enforced (Preview)
              </span>
            </div>

            <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
              <div>
                <div className="text-sm font-semibold text-slate-800">Session Timeout</div>
                <div className="text-xs text-slate-500">Auto-lock active session after 15 minutes of inactivity</div>
              </div>
              <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded font-medium">
                Active (15 min)
              </span>
            </div>

            <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6">
              <div>
                <div className="text-sm font-bold text-red-950">Active Member Session</div>
                <div className="text-xs text-red-700 mt-0.5">
                  Sign out to terminate active access on this browser and clear all local member session cache.
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  signOut();
                  window.location.href = '/auth/signin';
                }}
                className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 self-start sm:self-auto shrink-0"
              >
                <LogOut className="w-4 h-4" /> Sign Out Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: FAQ & Support */}
      {activeTab === 'faq' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">Frequently Asked Questions</h2>
            <div className="divide-y divide-slate-100">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="py-3">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between text-left group"
                    >
                      <span className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700">
                        {faq.q}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                      )}
                    </button>
                    {isOpen && (
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed pr-6">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Need Live Member Assistance?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Member advocates are available Monday–Friday, 8:00 AM – 7:00 PM EST.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="text-white border-slate-700 hover:bg-slate-800">
                1-800-555-ANVESH
              </Button>
              <Button variant="primary">
                Submit Support Ticket
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PatientProfilePage;
