import React, { useState } from 'react';
import { HelpCircle, X, ExternalLink, ShieldAlert } from 'lucide-react';

export const SupportWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="anvesh-support-widget-container">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="support-floating-btn"
        aria-label={isOpen ? 'Close help widget' : 'Open help & research documentation'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={20} /> : <HelpCircle size={20} />}
      </button>

      {isOpen && (
        <div className="support-floating-card" role="dialog" aria-label="ANVESH Support & Guidelines">
          <div className="support-card-header">
            <h4>Research Prototype Support</h4>
            <button onClick={() => setIsOpen(false)} aria-label="Close" className="support-close-btn">
              <X size={16} />
            </button>
          </div>
          <div className="support-card-body">
            <div className="support-alert">
              <ShieldAlert size={16} className="text-caution inline-icon" />
              <span>
                <strong>Decision Support Boundary:</strong> ANVESH does not issue automated claim approvals.
                Recommendations require licensed human reviewer confirmation.
              </span>
            </div>
            <div className="support-links">
              <a href="#rules" className="support-doc-link">
                <span>Hardened Policy Engine Taxonomy</span>
                <ExternalLink size={14} />
              </a>
              <a href="#metrics" className="support-doc-link">
                <span>Evaluation Audit Standards</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
