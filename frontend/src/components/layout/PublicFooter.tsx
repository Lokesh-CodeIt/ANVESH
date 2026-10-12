import React from 'react';

interface PublicFooterProps {
  onNavigate: (path: string) => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ onNavigate }) => {
  return (
    <footer className="anvesh-public-footer" role="contentinfo">
      {/* Evidence Thread ending in a calm dot */}
      <div className="footer-evidence-thread-container" aria-hidden="true">
        <div className="footer-thread-line" />
        <div className="footer-thread-dot" />
      </div>

      <div className="container footer-container">
        <div className="footer-grid">
          {/* Brand & Purpose */}
          <div className="footer-brand-col">
            <div className="footer-brand-header">
              <span className="brand-name">ANVESH</span>
              <span className="brand-tag">Evidence Review System</span>
            </div>
            <p className="footer-tagline">
              A healthcare-insurance claim evidence-review research prototype integrating precomputed
              vision-language representations with policy criteria for transparent, human-led prior authorization.
            </p>
            <div className="footer-badge">Research Prototype Only</div>
          </div>

          {/* Navigation Columns */}
          <div className="footer-nav-col">
            <h4 className="footer-col-title">Platform</h4>
            <ul className="footer-links">
              <li>
                <button onClick={() => onNavigate('/how-it-works')} className="footer-link-btn">
                  How It Works
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/responsible-ai')} className="footer-link-btn">
                  Responsible AI
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/about')} className="footer-link-btn">
                  About ANVESH
                </button>
              </li>
            </ul>
          </div>

          <div className="footer-nav-col">
            <h4 className="footer-col-title">Portals</h4>
            <ul className="footer-links">
              <li>
                <button onClick={() => onNavigate('/auth/signin?role=patient')} className="footer-link-btn">
                  Patient / Member
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/auth/signin?role=provider')} className="footer-link-btn">
                  Hospital / Provider
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/auth/signin?role=insurance')} className="footer-link-btn">
                  Insurance Reviewer
                </button>
              </li>
            </ul>
          </div>

          <div className="footer-nav-col">
            <h4 className="footer-col-title">Governance</h4>
            <ul className="footer-links">
              <li>
                <span className="footer-static-item">HIPAA Security Framework</span>
              </li>
              <li>
                <span className="footer-static-item">CMS Interoperability Readiness</span>
              </li>
              <li>
                <span className="footer-static-item">Da Vinci PAS / FHIR Roadmap</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Clinical Research Disclaimer */}
        <div className="footer-disclaimer-box">
          <p className="disclaimer-text">
            <strong>RESEARCH PROTOTYPE NOTICE:</strong> ANVESH is designed strictly for academic and
            technical demonstration of prior-authorization decision support. It does not provide medical
            diagnoses, treatment recommendations, or autonomous claim approvals. All insurance determinations
            require deliberate human review and clinical judgment.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <p className="copyright-text">
            &copy; 2026 ANVESH Healthcare Research. All rights reserved.
          </p>
          <div className="footer-legal-links">
            <span className="legal-item">Privacy Policy</span>
            <span className="legal-dot">&bull;</span>
            <span className="legal-item">Terms of Research Use</span>
            <span className="legal-dot">&bull;</span>
            <span className="legal-item">Accessibility Statement</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
