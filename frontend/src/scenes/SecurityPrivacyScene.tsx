import React from 'react';
import { Lock, Database, ShieldCheck, FileCheck } from 'lucide-react';

export const SecurityPrivacyScene: React.FC = () => {
  const verifiedSafeguards = [
    {
      title: 'Local On-Premises Architecture',
      icon: <Database size={24} className="text-teal" aria-hidden="true" />,
      description:
        'All research records, chest radiographs, and policy rules execute within an isolated local environment. Patient evidence is never transmitted to third-party public cloud inference APIs.',
    },
    {
      title: 'Path Traversal Asset Protection',
      icon: <Lock size={24} className="text-info" aria-hidden="true" />,
      description:
        'Backend image streaming endpoints strictly resolve file paths within designated image directory boundaries, rejecting directory traversal attempts and preventing unauthorized file access.',
    },
    {
      title: 'Atomic Transaction Boundaries',
      icon: <ShieldCheck size={24} className="text-accent" aria-hidden="true" />,
      description:
        'Adjudication reviews and clinical updates execute within strict transactional boundaries with guaranteed database rollbacks on failure, preventing partial persistence states.',
    },
    {
      title: 'Auditable Decision Logging',
      icon: <FileCheck size={24} className="text-success" aria-hidden="true" />,
      description:
        'Every policy evaluation logs deterministic outcome codes, criteria breakdown, and conflict warnings, providing clear provenance for clinical peer reviews and compliance audits.',
    },
  ];

  return (
    <section className="anvesh-security-section" aria-labelledby="security-heading">
      <div className="container security-container">
        <div className="section-header text-center">
          <span className="section-eyebrow">Data Governance</span>
          <h2 id="security-heading" className="section-title">
            Security & Data Protection Architecture
          </h2>
          <p className="section-subtitle">
            Grounded in rigorous data reliability principles. We document verified engineering
            protections implemented in the ANVESH research codebase.
          </p>
        </div>

        <div className="security-cards-grid">
          {verifiedSafeguards.map((item, idx) => (
            <div key={idx} className="security-card clinical-glass">
              <div className="security-icon-box">{item.icon}</div>
              <h3 className="security-card-title">{item.title}</h3>
              <p className="security-card-desc">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="security-honesty-note">
          <p>
            <strong>Research Prototype Notice:</strong> Production multi-tenant deployment will
            require integrating enterprise Identity Provider (IdP) authentication (OAuth2 / SAML),
            role-based access control (RBAC), and HIPAA Business Associate Agreements (BAAs).
          </p>
        </div>
      </div>
    </section>
  );
};
