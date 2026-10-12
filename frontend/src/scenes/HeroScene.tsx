import React, { useRef, useState } from 'react';
import { ArrowRight, Layers, FileCheck, ShieldCheck, UserCheck } from 'lucide-react';
import { gsap } from '../motion/registerGsap.ts';
import { useGsapContext } from '../motion/hooks/useGsapContext.ts';
import { revealText } from '../motion/patterns/revealText.ts';
import { Button } from '../components/common/Button.tsx';

interface HeroSceneProps {
  onExplore: () => void;
  onHowItWorks: () => void;
}

export const HeroScene: React.FC<HeroSceneProps> = ({ onExplore, onHowItWorks }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useGsapContext(
    ({ isReducedMotion, isPaused }) => {
      if (isReducedMotion || isPaused) return;

      // 1. Headline reveal
      if (headlineRef.current) {
        revealText(headlineRef.current, { isReducedMotion });
      }

      // 2. Staggered introduction of the Three Layers
      const cards = cardsContainerRef.current?.querySelectorAll('.three-layer-card');
      if (cards && cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 16, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            stagger: 0.1,
            delay: 0.1,
            ease: 'power2.out',
            onComplete: () => {
              // 3. Gentle floating movement limited to <= 6px (chained after reveal)
              gsap.to(cards, {
                y: '-=6',
                duration: 3.5,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                stagger: 0.2,
              });
            },
          }
        );
      }
    },
    { scope: containerRef }
  );

  // Desktop Pointer Parallax limited to max 4 degrees
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: x * 4, // Max 4 degrees
      y: -y * 4,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <section
      ref={containerRef}
      className="anvesh-hero-section anvesh-dot-grid"
      aria-label="ANVESH Introduction"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="container hero-container">
        {/* Left Column: Text Content */}
        <div className="hero-text-content">
          <div className="hero-badge">
            <Layers size={14} className="hero-badge-icon" aria-hidden="true" />
            <span>Prior-Authorization Evidence Review Prototype</span>
          </div>

          <h1 ref={headlineRef} className="hero-headline">
            Medical Evidence.<br />
            <span className="hero-headline-accent">Smarter Claims.</span>
          </h1>

          <p className="hero-subheading">
            ANVESH helps insurance reviewers inspect medical evidence, compare it with policy
            requirements, identify missing information, and make human-led decisions.
          </p>

          <div className="hero-cta-group">
            <Button
              variant="primary"
              size="lg"
              rightIcon={<ArrowRight size={18} />}
              onClick={onExplore}
              className="hero-btn-primary"
            >
              Explore the Platform
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onHowItWorks}
              className="hero-btn-secondary"
            >
              How It Works
            </Button>
          </div>

          <div className="hero-notice">
            <span className="notice-dot" aria-hidden="true" />
            <span>Offline precomputed VLM analysis &bull; Decision support only</span>
          </div>
        </div>

        {/* Right Column: Signature Three Layers Object */}
        <div className="hero-visual-content">
          {/* Pale teal background organic glow form */}
          <div className="hero-organic-glow" aria-hidden="true" />

          <div
            ref={cardsContainerRef}
            className="three-layers-container"
            style={{
              transform: `perspective(1000px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
              transition: 'transform 0.15s ease-out',
            }}
          >
            {/* Layer 1: Evidence */}
            <div className="three-layer-card layer-evidence clinical-glass">
              <div className="layer-card-header">
                <FileCheck size={18} className="text-teal" aria-hidden="true" />
                <span className="layer-title">Layer 1 &bull; Clinical Evidence</span>
              </div>
              <div className="layer-abstract-body">
                <div className="abstract-line wide" />
                <div className="abstract-line medium" />
                <div className="abstract-tag-group">
                  <span className="abstract-tag">Chest X-Ray</span>
                  <span className="abstract-tag">PA View</span>
                  <span className="abstract-tag">Grounded</span>
                </div>
              </div>
            </div>

            {/* Layer 2: Policy */}
            <div className="three-layer-card layer-policy clinical-glass">
              <div className="layer-card-header">
                <ShieldCheck size={18} className="text-info" aria-hidden="true" />
                <span className="layer-title">Layer 2 &bull; Coverage Policy</span>
              </div>
              <div className="layer-abstract-body">
                <div className="abstract-line wide" />
                <div className="abstract-checklist">
                  <span className="check-item verified">&bull; Medical Necessity Verified</span>
                  <span className="check-item check-gray">&bull; Exclusion Screening Intact</span>
                </div>
              </div>
            </div>

            {/* Layer 3: Human Decision */}
            <div className="three-layer-card layer-decision clinical-glass">
              <div className="layer-card-header">
                <UserCheck size={18} className="text-accent" aria-hidden="true" />
                <span className="layer-title">Layer 3 &bull; Human Adjudication</span>
              </div>
              <div className="layer-abstract-body">
                <div className="abstract-status-box">
                  <span className="status-indicator-dot" />
                  <span className="status-label">Adjudicator Confirmation Required</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
