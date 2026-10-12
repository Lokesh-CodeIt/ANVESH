import React from 'react';
import { Breadcrumbs } from '../components/common/Breadcrumbs.tsx';
import { ResponsibleAiScene } from '../scenes/ResponsibleAiScene.tsx';
import { Scale } from 'lucide-react';

interface ResponsibleAiPageProps {
  onNavigate: (path: string) => void;
}

export const ResponsibleAiPage: React.FC<ResponsibleAiPageProps> = ({ onNavigate }) => {
  return (
    <div className="anvesh-content-page">
      <div className="container page-header-container">
        <Breadcrumbs
          items={[
            { label: 'Home', onClick: () => onNavigate('/') },
            { label: 'Responsible AI' },
          ]}
        />
        <h1 className="content-page-title">Responsible AI Architecture</h1>
        <p className="content-page-lead">
          Clinical safety guidelines, algorithmic fairness principles, and strict human-in-the-loop
          constraints implemented across the ANVESH research project.
        </p>
      </div>

      <ResponsibleAiScene />

      <section className="container technical-details-section">
        <div className="details-card clinical-glass">
          <h2 className="details-title">
            <Scale size={24} className="text-teal inline-icon" aria-hidden="true" />
            Calibration & Evaluation Standards
          </h2>
          <div className="details-content-grid">
            <div className="detail-box">
              <h3>Expected Calibration Error (ECE)</h3>
              <p>
                Decision support confidence metrics must reflect empirical reliability. Models are assessed
                against reliability diagrams and low ECE thresholds to ensure confidence scores are not
                overconfident.
              </p>
            </div>
            <div className="detail-box">
              <h3>Conflict Warning Precedence</h3>
              <p>
                When VLM observations disagree with physician notes (<code className="text-mono">consistency &lt; 0.2</code>),
                the outcome is flagged as <code className="text-mono">OUTCOME_CONFLICTING_EVIDENCE</code> and
                automatically routed to secondary human review.
              </p>
            </div>
            <div className="detail-box">
              <h3>No Autonomous Denials or Approvals</h3>
              <p>
                ANVESH strictly prohibits automated final determinations. All recommendations must be confirmed,
                amended, or rejected by an authenticated clinical reviewer.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
