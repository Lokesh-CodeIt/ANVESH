import React from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Shield,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../../components/common/Button.tsx';
import { StatusBadge } from '../../../components/common/StatusBadge.tsx';

interface PatientDashboardProps {
  onNavigateSection: (section: string) => void;
}

export const PatientDashboardPage: React.FC<PatientDashboardProps> = ({ onNavigateSection }) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome & Member Overview */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5 flex flex-col items-start text-left">
          <div className="w-fit self-start inline-flex items-center justify-start text-left gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100">
            <Shield className="w-3.5 h-3.5 text-teal-700 shrink-0" /> Member ID: MEM-941824 • Blue Cross Choice Standard
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight text-left">
            Welcome back, Eleanor Vance
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
            Track your healthcare prior-authorization requests, review submitted diagnostic imaging summaries, and view requested clinical documentation in plain language.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateSection('documents')}
            className="flex items-center gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <UploadCloud size={16} className="text-slate-500" /> Upload Documents
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigateSection('claims')}
            className="flex items-center gap-1.5 bg-[#176B68] hover:bg-[#0E4E4C] text-white shadow-xs"
          >
            <span>View Active Claims</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-cards">
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-card hover:shadow-card-hover hover:border-slate-400 card-hover transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>In Review</span>
            <span className="p-1.5 bg-teal-50 rounded-md text-teal-700">
              <Clock size={18} />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 font-mono tracking-tight">
            1
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-600"></span>
            Active authorization in review
          </div>
        </div>

        <div className="bg-white border border-amber-300 rounded-xl p-5 shadow-card hover:shadow-card-hover hover:border-amber-400 card-hover transition-all bg-gradient-to-b from-white to-amber-50/20">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium">
            <span>Action Required</span>
            <span className="p-1.5 bg-amber-100/70 rounded-md text-amber-700">
              <AlertCircle size={18} />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-900 font-mono tracking-tight">
            1
          </div>
          <div className="text-xs text-amber-700 mt-1 font-medium flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Document request pending
          </div>
        </div>

        <div className="bg-white border border-emerald-300 rounded-xl p-5 shadow-card hover:shadow-card-hover hover:border-emerald-400 card-hover transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Authorized</span>
            <span className="p-1.5 bg-emerald-50 rounded-md text-emerald-600">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 font-mono tracking-tight">
            1
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Approved authorizations
          </div>
        </div>

        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-card hover:shadow-card-hover hover:border-slate-400 card-hover transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Coverage Status</span>
            <span className="p-1.5 bg-sky-50 rounded-md text-sky-700">
              <Shield size={18} />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-700 tracking-tight text-lg sm:text-2xl">
            Active
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Virginia Standard Health Plan
          </div>
        </div>
      </div>

      {/* Action Needed Banner */}
      <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-5 shadow-xs flex items-start gap-4">
        <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5">
          <AlertCircle size={20} />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-sm font-bold text-amber-950">Clarifying Medical Records Requested</h4>
          <p className="text-xs text-amber-900/90 leading-relaxed max-w-4xl">
            Your insurance clinical reviewer has requested a copy of your previous outpatient pulmonology progress note (dated within the last 12 months) to complete review for procedure <strong>Chest X-ray (PA and Lateral)</strong>.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigateSection('documents')}
              className="bg-amber-800 hover:bg-amber-900 text-white text-xs px-3 py-1.5 h-auto shadow-xs"
            >
              Upload Document Now
            </Button>
            <button
              onClick={() => onNavigateSection('claims')}
              className="text-xs text-amber-900 font-medium hover:underline flex items-center gap-1"
            >
              Inspect Claim Timeline <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Recent Claims & Policy Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Claims List */}
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900">Recent Prior Authorization Requests</h3>
            <button
              onClick={() => onNavigateSection('claims')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900"
            >
              View All
            </button>
          </div>
          <div className="divide-y divide-slate-100 p-2">
            <div className="p-3 hover:bg-slate-50/80 rounded-lg transition-colors flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">AUTH-2026-67</span>
                  <span className="text-xs font-semibold text-slate-800">Chest Radiography (PA & Lateral)</span>
                </div>
                <div className="text-xs text-slate-500">St. Jude Regional Care • Submitted Oct 8, 2026</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                  Review In Progress
                </span>
                <button
                  onClick={() => onNavigateSection('claims')}
                  className="text-xs text-teal-700 font-semibold hover:underline"
                >
                  Details &rarr;
                </button>
              </div>
            </div>

            <div className="p-3 hover:bg-slate-50/80 rounded-lg transition-colors flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">AUTH-2026-12</span>
                  <span className="text-xs font-semibold text-slate-800">Routine Chest Radiography (Follow-up)</span>
                </div>
                <div className="text-xs text-slate-500">Metropolitan Radiology • Submitted Sep 14, 2026</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                  Authorized
                </span>
                <button
                  onClick={() => onNavigateSection('claims')}
                  className="text-xs text-teal-700 font-semibold hover:underline"
                >
                  Details &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Coverage Snapshot & Resources */}
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900">Active Benefit Coverage Snapshot</h3>
            <button
              onClick={() => onNavigateSection('policies')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900"
            >
              View Policy
            </button>
          </div>
          <div className="p-5 space-y-3.5">
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Health Plan</span>
              <span className="font-medium text-slate-800">CMS Commercial Benchmark (VA-1001)</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Diagnostic Imaging Copay</span>
              <span className="font-medium text-slate-800">$25.00 Copayment per service</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Coinsurance Rate</span>
              <span className="font-medium text-slate-800">10% after In-Network Deductible</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Prior Auth Criteria</span>
              <span className="font-medium text-slate-800">Required for Interventional Imaging</span>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateSection('help')}
                className="w-full text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Open Patient Explanation Guide
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
