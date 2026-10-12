import React from 'react';
import { Breadcrumbs } from '../components/common/Breadcrumbs.tsx';
import { HowItWorksScene } from '../scenes/HowItWorksScene.tsx';
import { Cpu } from 'lucide-react';
import { Button } from '../components/common/Button.tsx';

interface HowItWorksPageProps {
  onNavigate: (path: string) => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onNavigate }) => {
  return (
    <div className="anvesh-content-page">
      <div className="container page-header-container">
        <Breadcrumbs
          items={[
            { label: 'Home', onClick: () => onNavigate('/') },
            { label: 'How It Works' },
          ]}
        />
        <h1 className="content-page-title">How ANVESH Evaluates Evidence</h1>
        <p className="content-page-lead">
          A deep dive into our multimodal evidence comparison pipeline, policy rule enforcement, and
          human reviewer adjudication workflow.
        </p>
      </div>

      <HowItWorksScene />

      <section className="container technical-details-section">
        <div className="details-card clinical-glass">
          <h2 className="details-title">
            <Cpu size={24} className="text-teal inline-icon" aria-hidden="true" />
            Decision Engine Logic & Grounding Rules
          </h2>
          <div className="details-content-grid">
            <div className="detail-box">
              <h3>Evidence Strength vs. Policy Gating</h3>
              <p>
                In the ANVESH architecture, the clinical evidence score (weighted by 40% consistency, 40%
                support, and 20% coverage) evaluates observational completeness only. It does not determine
                legal benefit authorization.
              </p>
            </div>
            <div className="detail-box">
              <h3>Grounding Cap Rule</h3>
              <p>
                If a case lacks physician source documentation (<code className="text-mono">has_source_text = false</code>),
                the evidence score is automatically capped at a maximum of <strong>40.0</strong>, preventing
                ungrounded visual inferences from masquerading as complete medical records.
              </p>
            </div>
            <div className="detail-box">
              <h3>Conservative Handling of Normal Cases</h3>
              <p>
                Legitimate normal chest radiographs with documented clear lung findings evaluate to
                <code className="text-mono">OUTCOME_COVERED</code>, while cases missing clinical observations
                strictly default to <code className="text-mono">OUTCOME_INSUFFICIENT_INFORMATION</code>.
              </p>
            </div>
          </div>
        </div>

        <div className="page-bottom-cta text-center">
          <h3>Ready to inspect the platform?</h3>
          <p>Choose an audience entry point to preview the role-specific experience.</p>
          <div className="cta-buttons-row">
            <Button variant="primary" onClick={() => onNavigate('/auth/signin?role=insurance')}>
              Preview Insurance Portal
            </Button>
            <Button variant="outline" onClick={() => onNavigate('/auth/signin?role=provider')}>
              Preview Hospital Portal
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
