import React, { useState } from 'react';
import { Menu, X, Play, Pause } from 'lucide-react';
import { useMotionPreferences } from '../../context/MotionPreferencesContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Button } from '../common/Button.tsx';

interface PublicNavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({ currentPath, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAnimationsPaused, setAnimationsPaused } = useMotionPreferences();
  const { isDesignPreview, exitDesignPreview } = useAuth();

  const navLinks = [
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'How to Use', path: '/how-to-use' },
    { label: 'Responsible AI', path: '/responsible-ai' },
    { label: 'About', path: '/about' },
  ];

  const handleLinkClick = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="anvesh-public-navbar" role="banner">
      {/* Top Banner if in Design Preview Mode */}
      {isDesignPreview && (
        <div className="preview-mode-banner" role="status">
          <div className="container banner-inner">
            <span>
              <strong>DEVELOPMENT PREVIEW:</strong> Unauthenticated design evaluation mode.
            </span>
            <button onClick={exitDesignPreview} className="banner-exit-btn">
              Exit Preview
            </button>
          </div>
        </div>
      )}

      <div className="container navbar-container">
        {/* Brand Wordmark */}
        <button
          onClick={() => handleLinkClick('/')}
          className="navbar-brand-btn"
          aria-label="ANVESH Home"
        >
          <span className="brand-logo-mark" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="2" />
              <path d="M7 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="3" fill="#5CC4CC" />
            </svg>
          </span>
          <div className="brand-text">
            <span className="brand-name">ANVESH</span>
            <span className="brand-tag">Evidence Review</span>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="navbar-desktop-nav" aria-label="Main Navigation">
          <ul className="nav-links-list">
            {navLinks.map((link) => {
              const isActive = currentPath === link.path;
              return (
                <li key={link.path}>
                  <button
                    onClick={() => handleLinkClick(link.path)}
                    className={`nav-link-btn ${isActive ? 'is-active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.label}
                    {isActive && <span className="nav-active-dot" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Navbar Actions */}
        <div className="navbar-actions">
          {/* Pause Animations Toggle */}
          <button
            onClick={() => setAnimationsPaused(!isAnimationsPaused)}
            className="navbar-anim-toggle"
            title={isAnimationsPaused ? 'Resume ambient animations' : 'Pause animations'}
            aria-label={isAnimationsPaused ? 'Resume ambient animations' : 'Pause animations'}
            aria-pressed={isAnimationsPaused}
          >
            {isAnimationsPaused ? (
              <Play size={14} aria-hidden="true" />
            ) : (
              <Pause size={14} aria-hidden="true" />
            )}
            <span className="anim-toggle-label">
              {isAnimationsPaused ? 'Resume Motion' : 'Pause Motion'}
            </span>
          </button>

          {/* Portal Demo Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleLinkClick('/portal')}
            className="navbar-portal-btn text-xs font-semibold border-teal-600/40 text-teal-800 hover:bg-teal-50"
          >
            Portals Demo
          </Button>

          {/* Sign In CTA */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleLinkClick('/auth/signin')}
            className="navbar-signin-btn"
          >
            Sign In / Access
          </Button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="navbar-mobile-toggle"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="navbar-mobile-menu" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
          <ul className="mobile-nav-list">
            {navLinks.map((link) => (
              <li key={link.path}>
                <button
                  onClick={() => handleLinkClick(link.path)}
                  className={`mobile-nav-link ${currentPath === link.path ? 'is-active' : ''}`}
                >
                  {link.label}
                </button>
              </li>
            ))}
            <li className="mobile-nav-divider" />
            <li>
              <button
                onClick={() => handleLinkClick('/auth/signin')}
                className="mobile-nav-link primary"
              >
                Sign In / Role Access
              </button>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};
