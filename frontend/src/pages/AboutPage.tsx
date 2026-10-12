import React from 'react';
import { Breadcrumbs } from '../components/common/Breadcrumbs.tsx';
import { Database, FileImage, Shield, BookOpen } from 'lucide-react';

interface AboutPageProps {
  onNavigate: (path: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  const stats = [
    { label: 'Total Verified Cases', value: '2,107', icon: <Database size={20} className="text-teal" /> },
    { label: 'Chest Radiographs', value: '4,093', icon: <FileImage size={20} className="text-info" /> },
    { label: 'Insurance Policies', value: '100', icon: <Shield size={20} className="text-accent" /> },
    { label: 'Historical Reviews', value: '4', icon: <BookOpen size={20} className="text-success" /> },
  ];

  return (
    <div className="anvesh-content-page">
      <div className="container page-header-container">
        <Breadcrumbs
          items={[
            { label: 'Home', onClick: () => onNavigate('/') },
            { label: 'About ANVESH' },
          ]}
        />
        <h1 className="content-page-title">About the ANVESH Project</h1>
        <p className="content-page-lead">
          An academic and technical research initiative exploring multimodal evidence evaluation in
          healthcare insurance prior authorization.
        </p>
      </div>

      <div className="container about-stats-grid">
        {stats.map((s, idx) => (
          <div key={idx} className="about-stat-card clinical-glass">
            <div className="stat-icon-box">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="container about-narrative-section">
        <div className="narrative-card clinical-glass">
          <h2>Motivation & Problem Statement</h2>
          <p>
            Healthcare prior authorization often suffers from prolonged adjudication delays, missing clinical
            documentation, and opaque administrative criteria. ANVESH was created to investigate whether
            precomputed multimodal vision-language representations of diagnostic imaging can provide objective,
            explainable evidence synthesis for human reviewers.
          </p>

          <h2>Technical Architecture & Grounding</h2>
          <p>
            The ANVESH backend is powered by FastAPI, SQLAlchemy, and PostgreSQL. It incorporates precomputed
            multimodal extractions generated offline, paired with a hardened policy comparison engine. The system
            separates clinical evidence strength from legal coverage eligibility, guaranteeing that exclusions
            always override high model confidence scores.
          </p>

          <div className="disclaimer-callout">
            <h3>Research Decision-Support Disclaimer</h3>
            <p>
              ANVESH is a prototype developed strictly for clinical evaluation and technical feasibility
              research. It is not an FDA-cleared diagnostic device, does not formulate autonomous authorization
              determinations, and should never be used as a replacement for certified physician review.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
