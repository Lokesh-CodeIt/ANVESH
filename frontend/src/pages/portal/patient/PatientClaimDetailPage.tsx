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
    <div className="portal-page-container">
      <button onClick={onBack} className="portal-back-btn">
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to Prior Authorizations</span>
      </button>

      {/* Claim Summary Card */}
      <div className="claim-detail-header-card clinical-glass">
        <div className="detail-header-top">
          <div>
            <span className="claim-meta-code">Reference: {claimMeta.ref}</span>
            <h2 className="detail-service-title">{claimMeta.title}</h2>
            <p className="detail-provider-info">
              <Building2 size={16} className="inline-icon text-teal" />
              <span>{claimMeta.provider}</span>
            </p>
          </div>
          <div className="text-right">
            <StatusBadge
              status={claimMeta.statusCode as any}
              label={claimMeta.statusLabel}
              size="md"
            />
            <span className="claim-urgency-note">Standard Review (Research Prototype Demonstration)</span>
          </div>
        </div>

        {/* Current State & Next Steps Alert */}
        <div className="claim-next-steps-banner" role="status">
          <AlertCircle size={22} className="text-caution inline-icon" />
          <div className="banner-text-body">
            <strong>Current Status:</strong> {claimMeta.nextStep}
            {claimMeta.needsDocs && (
              <div className="mt-2 flex gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<UploadCloud size={14} />}
                  onClick={onUploadRequested}
                >
                  Upload Requested Documentation
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chronological Status Timeline */}
      <div className="portal-panel clinical-glass mt-6">
        <div className="panel-header">
          <h3>Progress & Communication Timeline</h3>
        </div>
        <div className="panel-body">
          <div className="patient-timeline-list">
            {timelineMilestones.map((m, idx) => {
              const isCompleted = m.status === 'completed';
              const isAction = m.status === 'action_required';
              return (
                <div key={idx} className={`timeline-milestone-item is-${m.status}`}>
                  <div className="timeline-node-marker">
                    {isCompleted ? (
                      <CheckCircle2 size={18} className="text-success" />
                    ) : isAction ? (
                      <AlertCircle size={18} className="text-caution" />
                    ) : (
                      <Clock size={18} className="text-muted" />
                    )}
                  </div>
                  <div className="timeline-milestone-content">
                    <div className="milestone-title-row">
                      <h4>{m.title}</h4>
                      <span className="milestone-date">{m.date}</span>
                    </div>
                    <p className="milestone-desc">{m.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Patient Rights & Support Section */}
      <div className="patient-rights-card clinical-glass mt-6">
        <div className="rights-header">
          <HelpCircle size={20} className="text-teal inline-icon" />
          <h4>Your Rights as a Member</h4>
        </div>
        <p className="rights-text">
          Under healthcare consumer protection guidelines, you have the right to receive timely updates
          on prior authorizations, request an expedited review if delayed care threatens your health,
          and appeal any adverse determination.
        </p>
      </div>
    </div>
  );
};
