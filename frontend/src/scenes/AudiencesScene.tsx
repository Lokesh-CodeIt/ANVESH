import React, { useState, useRef } from 'react';
import { UserCheck, Building2, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { flipExpand } from '../motion/patterns/flipExpand.ts';
import { useMotionPreferences } from '../context/MotionPreferencesContext.tsx';
import { Button } from '../components/common/Button.tsx';

interface AudiencesSceneProps {
  onSelectRole: (role: 'patient' | 'provider' | 'insurance') => void;
}

export const AudiencesScene: React.FC<AudiencesSceneProps> = ({ onSelectRole }) => {
  const [activeCard, setActiveCard] = useState<'patient' | 'provider' | 'insurance'>('insurance');
  const containerRef = useRef<HTMLDivElement>(null);
  const { isReducedMotion } = useMotionPreferences();

  const handleCardClick = (role: 'patient' | 'provider' | 'insurance') => {
    if (activeCard === role) return;

    if (containerRef.current) {
      flipExpand(
        containerRef.current,
        () => {
          setActiveCard(role);
        },
        { isReducedMotion }
      );
    } else {
      setActiveCard(role);
    }
  };

  const audiences = [
    {
      id: 'patient' as const,
      title: 'Patients / Members',
      icon: <UserCheck size={24} className="text-teal" aria-hidden="true" />,
      tagline: 'Demystifying prior authorization with clear, transparent status.',
      description:
        'Track claim review progress in plain language. Understand what medical evidence was evaluated, view policy criteria milestones, and obtain clear explanations when further documentation is requested.',
      features: [
        'Plain-language claim status timeline',
        'Transparent medical evidence review summary',
        'Direct notice if physician records are missing',
        'Accessible appeal and enquiry workflows',
      ],
      portalCta: 'Preview Patient Portal',
    },
    {
      id: 'provider' as const,
      title: 'Hospitals & Providers',
      icon: <Building2 size={24} className="text-info" aria-hidden="true" />,
      tagline: 'Accelerating authorization with evidence pre-screening.',
      description:
        'Submit digital clinical evidence and run instant pre-submission checks against insurer policies. Identify missing clinical records or policy exclusions before formal submission, reducing denial cycles.',
      features: [
        'Chest radiograph and report ingestion',
        'Pre-submission policy eligibility checklist',
        'Automated detection of missing source documentation',
        'FHIR / Da Vinci PAS interoperability roadmap',
      ],
      portalCta: 'Preview Provider Portal',
    },
    {
      id: 'insurance' as const,
      title: 'Insurance Review Teams',
      icon: <Shield size={24} className="text-accent" aria-hidden="true" />,
      tagline: 'Objective, explainable evidence review for human adjudicators.',
      description:
        'Equip medical directors and clinical reviewers with side-by-side policy comparisons, grounded evidence summaries, exclusion screening, and conflict warnings for thorough, human-led decisions.',
      features: [
        'Side-by-side policy criteria vs. clinical evidence',
        'Strict exclusion overrides preventing false coverage',
        'Conflict & contradiction warning indicators',
        'One-click adjudication decision recording & audit log',
      ],
      portalCta: 'Preview Insurance Workspace',
    },
  ];

  return (
    <section
      ref={containerRef}
      className="anvesh-audiences-section"
      aria-labelledby="audiences-heading"
    >
      <div className="container audiences-container">
        <div className="section-header text-center">
          <span className="section-eyebrow">Target Stakeholders</span>
          <h2 id="audiences-heading" className="section-title">
            Tailored Portals for Every Participant
          </h2>
          <p className="section-subtitle">
            ANVESH bridges healthcare providers, insurance reviewers, and patients through a single,
            transparent evidence-review framework.
          </p>
        </div>

        {/* Interactive Cards Container */}
        <div className="audiences-cards-grid">
          {audiences.map((aud) => {
            const isExpanded = activeCard === aud.id;
            return (
              <div
                key={aud.id}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-label={`${aud.title} portal details`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(aud.id);
                  }
                }}
                onClick={() => handleCardClick(aud.id)}
                className={`audience-card flip-card clinical-glass ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
              >
                <div className="audience-card-header">
                  <div className="audience-icon-box">{aud.icon}</div>
                  <h3 className="audience-card-title">{aud.title}</h3>
                </div>

                <p className="audience-tagline">{aud.tagline}</p>

                {isExpanded ? (
                  <div className="audience-expanded-content">
                    <p className="audience-description">{aud.description}</p>
                    <ul className="audience-features-list">
                      {aud.features.map((feat, i) => (
                        <li key={i} className="feature-item">
                          <CheckCircle2 size={16} className="text-success inline-icon" aria-hidden="true" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="audience-cta-wrapper">
                      <Button
                        variant="primary"
                        size="sm"
                        rightIcon={<ArrowRight size={16} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRole(aud.id);
                        }}
                      >
                        {aud.portalCta}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="audience-collapsed-indicator">
                    <span>Click or press Enter to expand</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
