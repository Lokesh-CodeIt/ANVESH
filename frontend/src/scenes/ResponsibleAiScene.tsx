import React from 'react';
import { ShieldAlert, AlertTriangle, Eye, CheckCircle2, UserCheck } from 'lucide-react';

export const ResponsibleAiScene: React.FC = () => {
  return (
    <section className="anvesh-responsible-ai-section" aria-labelledby="responsible-ai-heading">
      <div className="container responsible-ai-container">
        <div className="section-header text-center">
          <span className="section-eyebrow">Ethical Architecture</span>
          <h2 id="responsible-ai-heading" className="section-title">
            Responsible AI & Clinical Safety Principles
          </h2>
          <p className="section-subtitle">
            Engineered from first principles to prevent algorithmic rubber-stamping, hallucinated approvals,
            and unverified coverage determinations.
          </p>
        </div>

        {/* Central Core Rule Banner */}
        <div className="safety-principle-banner clinical-glass" role="region" aria-label="Core Safety Rule">
          <div className="banner-icon-box">
            <ShieldAlert size={32} className="text-critical" aria-hidden="true" />
          </div>
          <div className="banner-text-box">
            <h3 className="banner-rule-title">Core Safety Invariant</h3>
            <p className="banner-rule-text">
              <strong>“A high evidence score never overrides a policy exclusion.”</strong>
            </p>
            <p className="banner-rule-sub">
              Even if multimodal imaging findings present strong clinical consistency (e.g. 95%), an
              applicable policy exclusion, unverified beneficiary eligibility, or conflicting finding
              strictly halts automated progression and demands comprehensive human review.
            </p>
          </div>
        </div>

        {/* Abstract Three Layers Demonstration (Moving Apart, Not Merging) */}
        <div className="responsible-layers-demonstration" aria-label="Illustrative Three Layers Decoupling">
          <div className="demonstration-header">
            <span className="illustrative-badge">Illustrative representation &bull; Decoupled Architecture</span>
          </div>

          <div className="decoupled-cards-grid">
            {/* Layer A: Neutral Evidence */}
            <div className="decoupled-card clinical-glass">
              <div className="decoupled-card-header">
                <Eye size={18} className="text-teal" aria-hidden="true" />
                <h4>Layer 1: Clinical Findings</h4>
              </div>
              <div className="decoupled-card-body">
                <p className="decoupled-stat">High Evidence Consistency: <strong>88.4%</strong></p>
                <span className="decoupled-note">Extracted anatomical observations from radiograph</span>
              </div>
            </div>

            {/* Separator: Does NOT merge into approval */}
            <div className="decoupled-barrier" aria-hidden="true">
              <span className="barrier-text">&ne; NO MERGE</span>
            </div>

            {/* Layer B: Policy with Exclusion */}
            <div className="decoupled-card clinical-glass has-exclusion">
              <div className="decoupled-card-header">
                <AlertTriangle size={18} className="text-caution" aria-hidden="true" />
                <h4>Layer 2: Policy Criteria</h4>
              </div>
              <div className="decoupled-card-body">
                <p className="decoupled-stat text-caution">
                  <strong>Exclusion Flagged:</strong> Unmet Prior Authorization Requirement
                </p>
                <span className="decoupled-note">Policy exclusion strictly dominates high score</span>
              </div>
            </div>

            {/* Separator */}
            <div className="decoupled-barrier" aria-hidden="true">
              <span className="barrier-text">&rarr; GATES</span>
            </div>

            {/* Layer C: Mandatory Human Adjudication */}
            <div className="decoupled-card clinical-glass human-gate">
              <div className="decoupled-card-header">
                <UserCheck size={18} className="text-info" aria-hidden="true" />
                <h4>Layer 3: Human Adjudication</h4>
              </div>
              <div className="decoupled-card-body">
                <p className="decoupled-stat text-info">
                  <strong>Outcome:</strong> MANUAL_REVIEW_REQUIRED
                </p>
                <span className="decoupled-note">Medical Director must review documentation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Responsible AI Pillar Cards */}
        <div className="pillars-grid">
          <div className="pillar-card clinical-glass">
            <div className="pillar-icon">
              <Eye size={20} className="text-teal" aria-hidden="true" />
            </div>
            <h4 className="pillar-title">Explainability & Grounding</h4>
            <p className="pillar-text">
              Every extracted clinical observation links directly to explicit source documentation or
              imaging features. If source text is missing, evidence scores are strictly capped at 40%.
            </p>
          </div>

          <div className="pillar-card clinical-glass">
            <div className="pillar-icon">
              <AlertTriangle size={20} className="text-caution" aria-hidden="true" />
            </div>
            <h4 className="pillar-title">Uncertainty & Conflict Handling</h4>
            <p className="pillar-text">
              When clinical findings or VLM extractions conflict with physician reports, ANVESH triggers
              an explicit <code className="text-mono">OUTCOME_CONFLICTING_EVIDENCE</code> rather than guessing.
            </p>
          </div>

          <div className="pillar-card clinical-glass">
            <div className="pillar-icon">
              <CheckCircle2 size={20} className="text-success" aria-hidden="true" />
            </div>
            <h4 className="pillar-title">Human-in-the-Loop Oversight</h4>
            <p className="pillar-text">
              The platform acts exclusively as decision support. No claim denials or approvals are
              issued autonomously. All decisions are signed, timestamped, and audited by human reviewers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
