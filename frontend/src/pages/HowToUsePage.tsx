import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  User,
  Building2,
  ShieldCheck,
  Activity,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Server,
  FileText,
  Clock,
  Layers,
  HelpCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  UploadCloud,
  FileCheck,
  Info,
  Sparkles
} from 'lucide-react';
import { Button } from '../components/common/Button.tsx';
import { Breadcrumbs } from '../components/common/Breadcrumbs.tsx';
import { api, getSummary } from '../services/api.ts';

interface HowToUsePageProps {
  onNavigate?: (path: string) => void;
}

export const HowToUsePage: React.FC<HowToUsePageProps> = ({ onNavigate }) => {
  const tabsScrollRef = React.useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'about' | 'patient' | 'provider' | 'insurance' | 'status' | 'troubleshooting'>('about');
  const [systemHealth, setSystemHealth] = useState<{
    backendOnline: boolean;
    dbConnected: boolean;
    totalCases: number;
    totalPolicies: number;
    checking: boolean;
  }>({
    backendOnline: false,
    dbConnected: false,
    totalCases: 0,
    totalPolicies: 0,
    checking: true,
  });

  const checkStatus = async () => {
    try {
      setSystemHealth(prev => ({ ...prev, checking: true }));
      const health = await api.getHealth();
      const summary = await getSummary();
      setSystemHealth({
        backendOnline: health.status === 'ok' || health.status === 'healthy',
        dbConnected: health.database === 'connected',
        totalCases: summary.total_cases,
        totalPolicies: summary.total_policies,
        checking: false,
      });
    } catch {
      setSystemHealth({
        backendOnline: false,
        dbConnected: false,
        totalCases: 0,
        totalPolicies: 0,
        checking: false,
      });
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const handleLink = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
    window.scrollTo(0, 0);
  };

  return (
    <div className="anvesh-content-page w-full px-4 sm:px-8 lg:px-12 py-10 space-y-10">
      {/* Breadcrumb Navigation */}
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', onClick: () => handleLink('/') },
            { label: 'How to Use ANVESH' },
          ]}
        />
      </div>

      {/* Hero Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex items-center gap-3 text-teal-700 text-xs font-bold tracking-widest uppercase mb-2">
          <BookOpen className="w-4 h-4" /> Comprehensive Operational Handbook
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          How to Use ANVESH
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-3xl leading-relaxed">
          Clear, step-by-step operating guide for patients, healthcare providers, and insurance reviewers. 
          Learn clinical workflows, understand multimodal AI evidence limitations, and troubleshoot common scenarios.
        </p>

        {/* Navigation Tabs (Horizontally Scrollable Carousel with Arrow Controls) */}
        <div className="mt-8 pt-4 border-t border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Select Handbook Section
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  tabsScrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
                }}
                className="w-8 h-8 rounded-full border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-2xs transition-all cursor-pointer"
                aria-label="Scroll tabs left"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  tabsScrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
                }}
                className="w-8 h-8 rounded-full border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-2xs transition-all cursor-pointer"
                aria-label="Scroll tabs right"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <div
            ref={tabsScrollRef}
            className="anvesh-horizontal-track gap-2.5 pb-2"
          >
            <button
              onClick={() => setActiveTab('about')}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'about'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Info className="w-3.5 h-3.5" /> A. About ANVESH
            </button>
            <button
              onClick={() => setActiveTab('patient')}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'patient'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" /> B. Patient Guide
            </button>
            <button
              onClick={() => setActiveTab('provider')}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'provider'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> C. Hospital / Provider Guide
            </button>
            <button
              onClick={() => setActiveTab('insurance')}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'insurance'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> D. Insurer Reviewer Guide
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'status'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Server className="w-3.5 h-3.5" /> E. Live System Status
            </button>
            <button
              onClick={() => setActiveTab('troubleshooting')}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'troubleshooting'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> F. Troubleshooting
            </button>
          </div>
        </div>
      </div>

      {/* SECTION A: ABOUT ANVESH */}
      {activeTab === 'about' && (
        <section className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <Info className="w-5 h-5 text-teal-700" /> Platform Architecture & Core Principles
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Understanding what ANVESH does, how Vision-Language Models assist human reviewers, and why automated decisions are prohibited.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Core Architectural Pillars (Swipe or use controls)
                </span>
              </div>
              <div className="anvesh-horizontal-track gap-6 py-2">
                <div className="shrink-0 w-[290px] sm:w-[320px] p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between shadow-2xs">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Platform Mission
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Correlates high-resolution diagnostic chest radiographs, clinical notes, and health plan coverage rules 
                      into a unified workspace to eliminate administrative delays.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 w-fit">Decision Support</span>
                </div>

                <div className="shrink-0 w-[280px] sm:w-[310px] p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between shadow-2xs">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-indigo-600" /> Primary VLM Engine
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Primary radiograph vision-language extractions and diagnostic evaluations are generated directly by live GPU inference on the
                      <strong> Fine-Tuned LLaVA-1.5-7B v2</strong>.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 w-fit">LoRA Fine-Tuned</span>
                </div>

                <div className="shrink-0 w-[280px] sm:w-[310px] p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between shadow-2xs">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600" /> Human Gate
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      AI never approves, denies, or modifies coverage autonomously. All final determinations require a licensed human medical reviewer's 
                      recorded signature.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 w-fit">Mandatory Sign-Off</span>
                </div>

                <div className="shrink-0 w-[280px] sm:w-[310px] p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between shadow-2xs">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                      <Layers className="w-4 h-4 text-teal-700" /> Score vs. Outcome
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      A high Evidence Score indicates observational completeness between radiograph and report. It <em>does not equal approval</em> without meeting plan policy rules.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 w-fit">Policy Dominance</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLink('/how-it-works')}
                className="flex items-center gap-1.5"
              >
                Read Technical Methodology <ExternalLink className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLink('/responsible-ai')}
                className="flex items-center gap-1.5"
              >
                Review Responsible AI Policy <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* SECTION B: PATIENT GUIDE */}
      {activeTab === 'patient' && (
        <section className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <User className="w-5 h-5 text-teal-700" /> Patient / Member Walkthrough
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Track your active prior-authorization requests, review submitted documents, and understand decisions in plain language.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="clinical-step-badge-teal">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Sign In to Member Portal</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Navigate to the Sign In page using your member email credentials or enter Development Preview Mode. 
                    Your session will authenticate you into the Member Portal with access restricted solely to your authorized personal records.
                  </p>
                  <button
                    onClick={() => handleLink('/auth/signin')}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 mt-2"
                  >
                    Go to Sign In &rarr;
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="clinical-step-badge-teal">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Open "My Claims & Prior Auths"</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Inspect active prior authorization requests submitted on your behalf by your physician or hospital. 
                    Review the current triage status: <em>Under Review</em>, <em>Information Requested</em>, or <em>Decision Recorded</em>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="clinical-step-badge-teal">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Inspect Claim Details & Timeline</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Click <strong>View Details</strong> on any claim. The chronological timeline explains what has occurred 
                    (intake, image verification, policy criteria review) and plainly describes what step occurs next.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="clinical-step-badge-teal">
                  4
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Review Requested Documents</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    If your insurance medical director requests clarifying medical records (e.g. prior outpatient pulmonology notes), 
                    open the <strong>Required Documents</strong> tab. Select your file (PDF or high-res image) to stage it for reviewer intake.
                  </p>
                  <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                    <strong>Honesty Notice:</strong> Files selected in the prototype are staged locally in browser memory for validation demonstration.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="clinical-step-badge-teal">
                  5
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Understand the Determination</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    When the licensed reviewer concludes evaluation, your determination (Approved, Denied, or Incomplete) 
                    and official reason are documented with applicable appeal and next-step contact instructions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION C: HOSPITAL / PROVIDER GUIDE */}
      {activeTab === 'provider' && (
        <section className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-teal-700" /> Hospital & Clinical Provider Guide
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Step-by-step instructions for submitting prior authorizations, attaching radiographs, and tracking reviews.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="clinical-step-badge-teal">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Member Eligibility & Case Lookup</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Verify patient coverage before initiating an authorization. Enter Member ID (e.g. <code>MEM-900001</code>) 
                    or existing Case ID. Only patients with active clinical orders may be searched under HIPAA minimum-necessary access policies.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="clinical-step-badge-teal">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">The 6-Step New Authorization Wizard</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Open <strong>New Authorization Request</strong>. The redesigned stepper advances one step at a time:
                  </p>
                  <ul className="text-xs text-slate-600 mt-2 space-y-1 list-disc list-inside">
                    <li><strong>Step 1: Member & Policy:</strong> Input patient identifier, full name, and payer policy ID.</li>
                    <li><strong>Step 2: Requested Service:</strong> Select modality (e.g. Chest Radiography) and CPT code (71046).</li>
                    <li><strong>Step 3: Clinical Notes:</strong> Enter ICD-10 indication and preliminary attending findings.</li>
                    <li><strong>Step 4: Image & Documents:</strong> Distinct sections for medical radiographs (.dcm, .png) and clinical reports (.pdf, .txt).</li>
                    <li><strong>Step 5: Review & Validate:</strong> Automated checklist flags missing data before submission.</li>
                    <li><strong>Step 6: Confirmation:</strong> Provides formal tracking identifier.</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="clinical-step-badge-teal">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Understanding Upload States (Honesty Protocol)</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    To prevent misleading clinical staff, ANVESH strictly differentiates between:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-xs">
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <span className="font-bold text-slate-800 block">1. Selected in Browser</span>
                      <span className="text-slate-500">File chosen from local disk; held in JavaScript memory.</span>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <span className="font-bold text-teal-800 block">2. Staged Locally</span>
                      <span className="text-slate-500">Validated against format & size rules in local session storage.</span>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <span className="font-bold text-emerald-800 block">3. Transmitted to Server</span>
                      <span className="text-slate-500">Only shown once remote backend API acknowledges persistence.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="clinical-step-badge-teal">
                  4
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Track Submissions & Respond to Information Requests</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Visit <strong>My Submissions</strong> to monitor triage status across all participating health plans. 
                    If a payer issues an additional-information request, the <strong>Additional Info</strong> tab allows 
                    supplemental notes and comparative imaging to be submitted without opening a duplicate case.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION D: INSURANCE REVIEWER GUIDE */}
      {activeTab === 'insurance' && (
        <section className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-indigo-700" /> Insurance Clinical Reviewer Guide
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Standard operating protocol for medical directors and clinical reviewers conducting prior-authorization evaluations.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="clinical-step-badge">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Manage the Case Queue</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Open the <strong>Case Queue</strong>. Cases are triaged into actionable categories (Awaiting Medical Director, 
                    Incomplete Evidence, Exclusion Triggered). Filter by case reference or member ID to open the active case.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="clinical-step-badge">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Inspect Radiograph & Clinical Narrative (Left Column)</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    The left workspace column (~58% width) displays the original <strong>grayscale native radiograph</strong> in 
                    the diagnostic viewer with invert, pan, zoom, and windowing controls. No synthetic heatmaps or fabricated annotations 
                    obscure clinical pixels. Review the attending physician's clinical report alongside the radiograph.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="clinical-step-badge">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Evaluate Precomputed Evidence & Policy Rules (Right Column)</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    The right column displays precomputed VLM extractions (image-text consistency, clinical support score) 
                    and compares findings against CMS diagnostic imaging policy rules. Review flagged exclusion riders or clinical contradictions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="clinical-step-badge">
                  4
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Record Human Determination & Rationale</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Select clinical disposition: <strong>Approve</strong>, <strong>Deny</strong>, <strong>Request More Info</strong>, 
                    or <strong>Escalate to Peer-to-Peer</strong>. Enter a detailed medical necessity rationale. A confirmation modal 
                    prevents accidental submission and records your determination via <code>POST /api/reviews</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION E: DATA AND SYSTEM STATUS */}
      {activeTab === 'status' && (
        <section className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                  <Server className="w-5 h-5 text-emerald-700" /> Environment Capabilities & Live Connectivity
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Real-time status of backend services, PostgreSQL database, authentication boundaries, and storage nodes.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={checkStatus}
                className="flex items-center gap-1.5 self-start"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${systemHealth.checking ? 'animate-spin' : ''}`} /> Refresh Status
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-semibold text-slate-500 block">FastAPI Server</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${systemHealth.backendOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-bold text-slate-900">
                    {systemHealth.backendOnline ? 'Online (Port 8000)' : 'Unavailable'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block font-mono">http://127.0.0.1:8000</span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-semibold text-slate-500 block">PostgreSQL Database</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${systemHealth.dbConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-bold text-slate-900">
                    {systemHealth.dbConnected ? 'Connected & Verified' : 'Disconnected'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {systemHealth.totalCases} Cases • {systemHealth.totalPolicies} Policies
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-semibold text-slate-500 block">Identity Provider (Auth)</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-sm font-bold text-slate-900">Prototype Gate (Part 1)</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">JWT / IdP integration scheduled for Part 2</span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-semibold text-slate-500 block">Document Cloud Storage</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-sm font-bold text-slate-900">Local Browser Staging</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Zero remote cloud persistence active</span>
              </div>
            </div>

            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-900 leading-relaxed space-y-1">
              <span className="font-bold block text-teal-950">Active Operational Mode:</span>
              <p>
                In <strong>Live Mode</strong>, the frontend queries real records from the PostgreSQL database (2,107 research cases and 100 CMS policy guidelines). 
                In <strong>Development Design Preview Mode</strong>, isolated de-identified demo cases (<code>DEMO-CXR-001</code> through <code>DEMO-CXR-003</code>) 
                allow safe UI testing without database mutation.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* SECTION F: TROUBLESHOOTING */}
      {activeTab === 'troubleshooting' && (
        <section className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-emerald-700" /> Operational Troubleshooting Guide
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Fast resolutions for common edge cases, connectivity problems, and validation errors.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="text-xs font-bold text-slate-900 block">1. The Case Queue / Submissions List is Empty</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>Resolution:</strong> In Development Preview Mode, the queue starts empty by default to prevent automatic fake data insertion. 
                  Click <em>"Import Isolated Demo Dataset (3 CXR Studies)"</em> to load verified test studies, or verify that the FastAPI backend server is running on port 8000.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="text-xs font-bold text-slate-900 block">2. A Policy Page Keeps Loading</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>Resolution:</strong> The policy loader contains an automatic 6-second timeout race. If a network interruption occurs, 
                  the spinner terminates and displays an error banner with a <em>"Retry Loading Policies"</em> control. Click Retry or check server connectivity.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="text-xs font-bold text-slate-900 block">3. Uploaded File Type is Rejected</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>Resolution:</strong> Medical images support DICOM (<code>.dcm</code>), PNG, and JPG formats. Clinical narrative reports support 
                  PDF and plain text (<code>.txt</code>). File size is capped at 50 MB per file. Executables, scripts, and archives are strictly rejected.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="text-xs font-bold text-slate-900 block">4. Upload Cannot Be Saved to Remote Server</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>Resolution:</strong> This prototype stages uploaded files in local browser session memory for validation demonstration. 
                  Live remote persistence to cloud object storage (S3 / Azure Blob / PACS) is planned for future infrastructure phases.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="text-xs font-bold text-slate-900 block">5. Backend API is Unavailable</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>Resolution:</strong> Verify that the Python backend process is running: <code>python -m uvicorn main:app --host 127.0.0.1 --port 8000</code>. 
                  Inspect <code>app.log</code> for database connection errors.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="text-xs font-bold text-slate-900 block">6. Session Expiration & Role Lockout</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>Resolution:</strong> If locked out, click <em>"Log Out"</em> from the top-right user menu to clear local session tokens, 
                  then re-authenticate on the Sign In page or re-enter Development Preview Mode.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick Launch Portal Cards with Distinctive Role Styling & Generous Breathing Space */}
      <div className="pt-12 sm:pt-16 mt-12 sm:mt-16 border-t border-slate-200/90 space-y-6">
        <div className="flex flex-col items-start text-left">
          <span className="w-fit self-start inline-flex items-center justify-start text-left gap-2 text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-3.5 py-1.5 rounded-lg border border-teal-200/90 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" /> Interactive Portals
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2.5">
            Launch Role-Based Clinical Portals
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Access the dedicated review, submission, and adjudication workspaces for each participant.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10">
          {/* Patient Portal Card */}
          <div
            style={{
              boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
              border: 'none',
              borderRadius: '1.5rem',
              transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="group cursor-pointer rounded-3xl p-8 sm:p-9 lg:p-10 bg-gradient-to-b from-teal-50/60 via-white to-teal-50/20 hover:-translate-y-2.5 hover:scale-[1.012] hover:shadow-xl hover:shadow-teal-900/10 flex flex-col justify-between select-none"
          >
            <div>
              {/* Top Row: Badge & Elevated Role Icon */}
              <div className="flex items-center justify-between gap-4 mb-7">
                <span className="inline-flex items-center text-[11px] font-bold uppercase tracking-wider text-teal-800 bg-teal-100/80 px-3.5 py-1.5 rounded-full shadow-2xs">
                  Member Access
                </span>
                <div className="w-13 h-13 rounded-2xl bg-teal-100/70 text-teal-700 flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:bg-teal-100 transition-all">
                  <User className="w-6 h-6 text-teal-700" />
                </div>
              </div>

              {/* Title & Description with Generous Spacing */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Patient & Member Workspace
                </div>
                <h3 className="text-2xl sm:text-[1.65rem] font-black text-slate-900 tracking-tight leading-tight">
                  Patient Portal
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed pt-1">
                  Review personal claim history, benefit coverage guidelines, and requested clinical documents.
                </p>
              </div>

              {/* Key Capabilities Checklist (Spacious & Clean) */}
              <ul className="space-y-3.5 py-6 my-7 border-t border-b border-slate-100 text-xs sm:text-[13px] text-slate-700 font-medium leading-normal">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Track prior authorization review status</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Verify clinical coverage & plan benefits</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Submit requested doctor clinical documents</span>
                </li>
              </ul>
            </div>

            {/* Launch Action Button */}
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem('anvesh_design_preview_role', 'patient');
                handleLink('/portal/patient');
              }}
              style={{ color: '#FFFFFF' }}
              className="portal-launch-btn portal-launch-btn-patient"
            >
              <span style={{ color: '#FFFFFF', fontWeight: 700 }}>Launch Patient Portal</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" style={{ color: '#FFFFFF' }} />
            </button>
          </div>

          {/* Provider Portal Card */}
          <div
            style={{
              boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
              border: 'none',
              borderRadius: '1.5rem',
              transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="group cursor-pointer rounded-3xl p-8 sm:p-9 lg:p-10 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/20 hover:-translate-y-2.5 hover:scale-[1.012] hover:shadow-xl hover:shadow-emerald-900/10 flex flex-col justify-between select-none"
          >
            <div>
              {/* Top Row: Badge & Elevated Role Icon */}
              <div className="flex items-center justify-between gap-4 mb-7">
                <span className="inline-flex items-center text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-3.5 py-1.5 rounded-full shadow-2xs">
                  Clinical Access
                </span>
                <div className="w-13 h-13 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:bg-emerald-100 transition-all">
                  <Building2 className="w-6 h-6 text-emerald-700" />
                </div>
              </div>

              {/* Title & Description with Generous Spacing */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Hospital & Clinic Staff
                </div>
                <h3 className="text-2xl sm:text-[1.65rem] font-black text-slate-900 tracking-tight leading-tight">
                  Provider Portal
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed pt-1">
                  Complete the 6-step authorization stepper, upload DICOM radiographs, and monitor adjudication.
                </p>
              </div>

              {/* Key Capabilities Checklist (Spacious & Clean) */}
              <ul className="space-y-3.5 py-6 my-7 border-t border-b border-slate-100 text-xs sm:text-[13px] text-slate-700 font-medium leading-normal">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>6-step clinical authorization intake stepper</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Automated policy eligibility pre-screening</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>DICOM radiograph & clinical report upload</span>
                </li>
              </ul>
            </div>

            {/* Launch Action Button */}
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem('anvesh_design_preview_role', 'provider');
                handleLink('/portal/provider');
              }}
              style={{ color: '#FFFFFF' }}
              className="portal-launch-btn portal-launch-btn-provider"
            >
              <span style={{ color: '#FFFFFF', fontWeight: 700 }}>Launch Provider Portal</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" style={{ color: '#FFFFFF' }} />
            </button>
          </div>

          {/* Insurer Portal Card */}
          <div
            style={{
              boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
              border: 'none',
              borderRadius: '1.5rem',
              transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="group cursor-pointer rounded-3xl p-8 sm:p-9 lg:p-10 bg-gradient-to-b from-indigo-50/60 via-white to-indigo-50/20 hover:-translate-y-2.5 hover:scale-[1.012] hover:shadow-xl hover:shadow-indigo-900/10 flex flex-col justify-between select-none"
          >
            <div>
              {/* Top Row: Badge & Elevated Role Icon */}
              <div className="flex items-center justify-between gap-4 mb-7">
                <span className="inline-flex items-center text-[11px] font-bold uppercase tracking-wider text-indigo-800 bg-indigo-100/80 px-3.5 py-1.5 rounded-full shadow-2xs">
                  Payer Adjudication
                </span>
                <div className="w-13 h-13 rounded-2xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:bg-indigo-100 transition-all">
                  <ShieldCheck className="w-6 h-6 text-indigo-700" />
                </div>
              </div>

              {/* Title & Description with Generous Spacing */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Payer Medical Review Team
                </div>
                <h3 className="text-2xl sm:text-[1.65rem] font-black text-slate-900 tracking-tight leading-tight">
                  Insurer Portal
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed pt-1">
                  Inspect radiographs, evaluate precomputed VLM evidence, and record human clinical determinations.
                </p>
              </div>

              {/* Key Capabilities Checklist (Spacious & Clean) */}
              <ul className="space-y-3.5 py-6 my-7 border-t border-b border-slate-100 text-xs sm:text-[13px] text-slate-700 font-medium leading-normal">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Side-by-side policy vs. multimodal evidence</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Automated VLM scoring & exclusion gating</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Record audited human medical determinations</span>
                </li>
              </ul>
            </div>

            {/* Launch Action Button */}
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem('anvesh_design_preview_role', 'insurance');
                handleLink('/portal/insurance');
              }}
              style={{ color: '#FFFFFF' }}
              className="portal-launch-btn portal-launch-btn-insurer"
            >
              <span style={{ color: '#FFFFFF', fontWeight: 700 }}>Launch Insurer Portal</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" style={{ color: '#FFFFFF' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowToUsePage;
