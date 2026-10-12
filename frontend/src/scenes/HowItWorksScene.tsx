import React, { useRef } from 'react';
import { UploadCloud, FileSearch, UserCheck, ShieldAlert } from 'lucide-react';
import { useGsapContext } from '../motion/hooks/useGsapContext.ts';
import { drawLine } from '../motion/patterns/drawLine.ts';

export const HowItWorksScene: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const threadPathRef = useRef<SVGPathElement>(null);

  useGsapContext(
    ({ isReducedMotion, isPaused }) => {
      if (isReducedMotion || isPaused) return;

      if (threadPathRef.current) {
        drawLine(threadPathRef.current, { isReducedMotion });
      }
    },
    { scope: containerRef }
  );

  const steps = [
    {
      number: '01',
      title: 'Submit Clinical Evidence',
      icon: <UploadCloud size={24} className="step-icon text-teal-light" aria-hidden="true" />,
      description:
        'Hospital or physician submits chest radiographs and clinical notes. ANVESH references precomputed multimodal representations for structured clinical findings and anatomical features.',
      badge: 'Multimodal Ingestion',
    },
    {
      number: '02',
      title: 'Policy Comparison & Screening',
      icon: <FileSearch size={24} className="step-icon text-teal-light" aria-hidden="true" />,
      description:
        'The policy engine extracts clinical requirements and exclusion rules. It identifies whether clinical evidence is grounded, missing, or contradictory, computing objective criteria scores.',
      badge: 'Exclusion Screening',
    },
    {
      number: '03',
      title: 'Licensed Human Adjudication',
      icon: <UserCheck size={24} className="step-icon text-teal-light" aria-hidden="true" />,
      description:
        'Crucial milestone: Evidence never produces autonomous approvals. The thread terminates at a qualified Human Reviewer workstation for final clinical and administrative adjudication.',
      badge: 'Human Decision Required',
    },
  ];

  return (
    <section
      ref={containerRef}
      className="anvesh-how-it-works-section anvesh-dot-grid-navy"
      aria-labelledby="how-it-works-heading"
    >
      <div className="container how-it-works-container">
        <div className="section-header text-center text-on-navy">
          <span className="section-eyebrow text-teal-light">Workflow Pipeline</span>
          <h2 id="how-it-works-heading" className="section-title text-on-navy">
            How ANVESH Orchestrates Prior Authorization
          </h2>
          <p className="section-subtitle text-on-navy-secondary">
            A transparent, audit-ready pipeline ensuring evidence is verified and policies are screened
            before reaching the human decision-maker.
          </p>
        </div>

        {/* Evidence Thread Visual Connection (Desktop) */}
        <div className="workflow-thread-visual" aria-hidden="true">
          <svg className="workflow-svg-thread" viewBox="0 0 900 60" fill="none">
            <path
              ref={threadPathRef}
              d="M 50 30 L 450 30 L 850 30"
              stroke="#5CC4CC"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
          </svg>
        </div>

        {/* Steps Grid */}
        <div className="workflow-steps-grid">
          {steps.map((step, idx) => (
            <div key={idx} className="workflow-step-card clinical-glass-navy">
              <div className="step-card-top">
                <span className="step-number">{step.number}</span>
                <span className="step-badge">{step.badge}</span>
              </div>
              <div className="step-icon-wrapper">{step.icon}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Deliberate Human Review Guarantee */}
        <div className="workflow-guarantee-banner">
          <ShieldAlert size={20} className="text-teal-light inline-icon" aria-hidden="true" />
          <span className="guarantee-text">
            <strong>Mandatory Human Gate:</strong> No claim authorization is finalized without an
            authenticated clinical reviewer signing off on policy eligibility and clinical findings.
          </span>
        </div>
      </div>
    </section>
  );
};
