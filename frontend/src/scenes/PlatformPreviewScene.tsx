import React from 'react';
import { ImageIcon, FileText, Shield, UserCheck, Clock, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge.tsx';

export const PlatformPreviewScene: React.FC = () => {
  return (
    <section className="anvesh-preview-section" aria-labelledby="preview-heading">
      <div className="container preview-container">
        <div className="section-header text-center">
          <span className="section-eyebrow">Interface Architecture</span>
          <h2 id="preview-heading" className="section-title">
            Illustrative Reviewer Workspace
          </h2>
          <p className="section-subtitle">
            A static preview demonstrating the future clinical review layout. Designed for clarity,
            auditability, and side-by-side evidence inspection.
          </p>
        </div>

        {/* Prominent Disclaimer Label */}
        <div className="preview-watermark-banner" role="note">
          <span>Illustrative interface. Sample layout, not a live claim or active patient record.</span>
        </div>

        {/* Mock Workspace Container */}
        <div className="mock-workspace-card clinical-glass">
          {/* Mock Workspace Header */}
          <div className="mock-header">
            <div className="mock-case-meta">
              <span className="mock-case-id">SAMPLE-CASE-DEMO-2107</span>
              <span className="mock-case-type">Chest Radiography &bull; PA/Lateral View</span>
            </div>
            <div className="mock-header-actions">
              <StatusBadge status="OUTCOME_MANUAL_REVIEW_REQUIRED" label="Manual Review Required" />
            </div>
          </div>

          {/* Main 2-Column Mock Interface */}
          <div className="mock-body-grid">
            {/* Left Column: Neutral Medical Image & Report Placeholder */}
            <div className="mock-left-col">
              <div className="mock-image-viewer-placeholder">
                <div className="viewer-neutral-canvas">
                  <ImageIcon size={48} className="viewer-canvas-icon" aria-hidden="true" />
                  <span className="viewer-canvas-text">Neutral Radiograph Viewer Area</span>
                  <span className="viewer-canvas-sub">
                    Displays high-resolution DICOM / Greyscale X-ray in clinical portal
                  </span>
                </div>
                <div className="viewer-controls-bar">
                  <span className="viewer-tag">Modality: CR / DX</span>
                  <span className="viewer-tag">Resolution: 2048x2048</span>
                  <span className="viewer-tag">Invert: Off</span>
                </div>
              </div>

              <div className="mock-clinical-report-area">
                <div className="card-mini-header">
                  <FileText size={16} className="text-teal inline-icon" aria-hidden="true" />
                  <h4>Clinical Indications & Physician Findings</h4>
                </div>
                <p className="report-text">
                  Patient presented with persistent dyspnea and cough. Frontal and lateral views evaluated.
                  Precomputed multimodal feature extraction indicates clear bilateral lung fields with normal
                  cardiomediastinal contour.
                </p>
              </div>
            </div>

            {/* Right Column: Policy Criteria & Adjudication Decision Panel */}
            <div className="mock-right-col">
              {/* Policy Evaluation Panel */}
              <div className="mock-policy-panel">
                <div className="card-mini-header">
                  <Shield size={16} className="text-info inline-icon" aria-hidden="true" />
                  <h4>Policy Coverage & Criteria Match</h4>
                </div>
                <div className="policy-meta-line">
                  <span>Policy ID: <strong>DEMO-PLAN-VA-001</strong></span>
                  <StatusBadge status="info" label="Standard Commercial" size="sm" />
                </div>

                <ul className="criteria-checklist">
                  <li className="criteria-item verified">
                    <CheckCircle2 size={16} className="text-success inline-icon" aria-hidden="true" />
                    <span>Beneficiary Eligibility Active (State: VA)</span>
                  </li>
                  <li className="criteria-item verified">
                    <CheckCircle2 size={16} className="text-success inline-icon" aria-hidden="true" />
                    <span>Prior Diagnostic Modality Documented</span>
                  </li>
                  <li className="criteria-item pending">
                    <Clock size={16} className="text-caution inline-icon" aria-hidden="true" />
                    <span>Clinical Necessity Confirmation Pending Human Review</span>
                  </li>
                </ul>
              </div>

              {/* Human Decision Panel (Decisions Unselected) */}
              <div className="mock-decision-panel">
                <div className="card-mini-header">
                  <UserCheck size={16} className="text-accent inline-icon" aria-hidden="true" />
                  <h4>Adjudicator Decision Action</h4>
                </div>
                <p className="decision-prompt">
                  Reviewer must select an adjudication determination and record clinical rationale:
                </p>

                <div className="mock-decision-buttons">
                  <button className="decision-btn btn-approve" disabled>
                    Approve Prior Auth
                  </button>
                  <button className="decision-btn btn-deny" disabled>
                    Deny Authorization
                  </button>
                  <button className="decision-btn btn-info-req is-pending" disabled>
                    Request Additional Info
                  </button>
                </div>
                <span className="decision-unselected-note">
                  &bull; Sample decision controls are unselected in illustrative preview
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
