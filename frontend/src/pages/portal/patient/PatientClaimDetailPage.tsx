import React from 'react';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, FileText, Building2, HelpCircle, UploadCloud } from 'lucide-react';
import { StatusBadge } from '../../../components/common/StatusBadge.tsx';
import { Button } from '../../../components/common/Button.tsx';

interface PatientClaimDetailPageProps {
  claimId: string;
  onBack: () => void;
  onUploadRequested: () => void;
}

export const PatientClaimDetailPage: React.FC<PatientClaimDetailPageProps> = ({
  claimId,
  onBack,
  onUploadRequested,
}) => {
  // Dynamically resolve claim info
  const claimMeta = React.useMemo(() => {
    if (claimId === 'DEMO-CXR-001') {
      return {
        ref: 'DEMO-CXR-001',
        title: 'Chest Radiography (2 Views PA/LAT)',
        provider: 'Metro General Health • Attending: Dr. M. Vance, MD',
        statusLabel: 'Under Review',
        statusCode: 'OUTCOME_MANUAL_REVIEW_REQUIRED',
        nextStep: 'Your request and uploaded chest radiograph are currently being evaluated by the insurer medical director.',
        needsDocs: false,
      };
    } else if (claimId === 'DEMO-CXR-002') {
      return {
        ref: 'DEMO-CXR-002',
        title: 'Chest Radiography (Single View Frontal)',
        provider: 'St. Jude Regional Care • Attending: Dr. H. Patel, Pulmonology',
        statusLabel: 'More Information Required',
        statusCode: 'OUTCOME_MANUAL_REVIEW_REQUIRED',
        nextStep: 'The health plan reviewer requested additional clinical progress notes and prior comparative imaging.',
        needsDocs: true,
      };
    } else if (claimId === 'DEMO-CXR-003') {
      return {
        ref: 'DEMO-CXR-003',
        title: 'Chest Radiography Pre-Operative (2 Views)',
        provider: 'Metropolitan Imaging Center • Attending: Dr. S. Lewis, MD',
        statusLabel: 'Decision Recorded: Approved',
        statusCode: 'OUTCOME_COVERED',
        nextStep: 'Prior authorization approved. Formal coverage confirmation letter generated for your healthcare provider.',
        needsDocs: false,
      };
    }
    return {
      ref: claimId || 'AUTH-2026-67',
      title: 'Chest Radiography Diagnostic Study',
      provider: 'Metro Regional Care • Ordering Physician Staff',
      statusLabel: 'Under Review',
      statusCode: 'OUTCOME_MANUAL_REVIEW_REQUIRED',
      nextStep: 'Prior authorization package received. Case scheduled for clinical determination.',
      needsDocs: false,
    };
  }, [claimId]);

  // Plain-language timeline milestones
  const timelineMilestones = [
    {
      title: 'Prior Authorization Request Submitted',
      date: 'Oct 1, 2026 at 09:14 AM',
      description: 'Submitted by healthcare provider with diagnostic imaging requisition.',
      status: 'completed',
    },
    {
      title: 'Medical Radiographs & Clinical Notes Received',
      date: 'Oct 1, 2026 at 09:22 AM',
      description: 'Chest radiograph and clinical dictation verified and attached.',
      status: 'completed',
    },
    {
      title: 'Insurance Policy Guidelines Verified',
      date: 'Oct 2, 2026 at 11:45 AM',
      description: 'Coverage terms evaluated under health plan medical policy criteria.',
      status: 'completed',
    },
    {
      title: 'Physician Reviewer Evaluation',
      date: claimMeta.statusLabel.includes('Approved') ? 'Oct 3, 2026' : 'In Progress',
      description: claimMeta.nextStep,
      status: claimMeta.needsDocs ? 'action_required' : (claimMeta.statusLabel.includes('Approved') ? 'completed' : 'in_progress'),
    },
    {
      title: 'Final Decision & Notification',
      date: claimMeta.statusLabel.includes('Approved') ? 'Completed' : 'Within 24-48 business hours',
      description: claimMeta.statusLabel.includes('Approved') ? 'Official determination recorded and sent to hospital.' : 'A final written determination will be communicated to you and your provider.',
      status: claimMeta.statusLabel.includes('Approved') ? 'completed' : 'pending',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto">
      {/* Back Button */}
      <div className="pb-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-600 hover:text-slate-900 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Prior Authorizations
        </Button>
      </div>

      {/* Claim Summary Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1.5">
            <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200/80">
              Reference: {claimMeta.ref}
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{claimMeta.title}</h1>
            <p className="text-sm text-slate-600 flex items-center gap-1.5 font-medium">
              <Building2 size={16} className="text-teal-700" />
              <span>{claimMeta.provider}</span>
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <StatusBadge
              status={claimMeta.statusCode as any}
              label={claimMeta.statusLabel}
              size="md"
            />
            <span className="text-xs text-slate-400">Standard Review Cycle</span>
          </div>
        </div>

        {/* Current State & Next Steps Alert */}
        <div className="p-5 bg-amber-50/70 border border-amber-200/90 rounded-xl flex items-start gap-3.5 text-amber-900 text-sm shadow-2xs" role="status">
          <AlertCircle size={22} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <div>
              <strong className="block font-bold">Current Adjudication Status:</strong>
              <p className="text-xs sm:text-sm text-amber-800 mt-0.5 leading-relaxed">{claimMeta.nextStep}</p>
            </div>
            {claimMeta.needsDocs && (
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<UploadCloud size={14} />}
                  onClick={onUploadRequested}
                  className="bg-[#176B68] hover:bg-[#0E4E4C] text-white shadow-xs"
                >
                  Upload Requested Documentation
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chronological Status Timeline */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900">Progress & Communication Timeline</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Audited milestone progression for this medical necessity intake.</p>
        </div>

        <div className="space-y-6 pl-2 sm:pl-4">
          {timelineMilestones.map((m, idx) => {
            const isCompleted = m.status === 'completed';
            const isAction = m.status === 'action_required';
            return (
              <div key={idx} className="flex items-start gap-4 relative">
                {idx < timelineMilestones.length - 1 && (
                  <div className="absolute left-[13px] top-[26px] bottom-[-24px] w-0.5 bg-slate-200" />
                )}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                  isCompleted ? 'bg-emerald-100 text-emerald-700' : isAction ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 size={16} />
                  ) : isAction ? (
                    <AlertCircle size={16} />
                  ) : (
                    <Clock size={16} />
                  )}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-slate-900">{m.title}</h3>
                    <span className="text-xs text-slate-500 font-mono">{m.date}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{m.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Patient Rights & Support Section */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-teal-800 font-bold text-sm">
          <HelpCircle size={18} className="text-teal-700" />
          <h3>Your Rights as a Member</h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Under healthcare consumer protection guidelines, you have the right to receive timely updates
          on prior authorizations, request an expedited review if delayed care threatens your health,
          and appeal any adverse determination.
        </p>
      </div>
    </div>
  );
};
