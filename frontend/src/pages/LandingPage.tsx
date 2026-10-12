import React from 'react';
import { Preloader } from '../scenes/Preloader.tsx';
import { HeroScene } from '../scenes/HeroScene.tsx';
import { RiseOverScene } from '../scenes/RiseOverScene.tsx';
import { AudiencesScene } from '../scenes/AudiencesScene.tsx';
import { HowItWorksScene } from '../scenes/HowItWorksScene.tsx';
import { ResponsibleAiScene } from '../scenes/ResponsibleAiScene.tsx';
import { PlatformPreviewScene } from '../scenes/PlatformPreviewScene.tsx';
import { SecurityPrivacyScene } from '../scenes/SecurityPrivacyScene.tsx';

import { ErrorBoundary } from '../components/common/ErrorBoundary.tsx';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const handleExplore = () => {
    const el = document.getElementById('audiences-section-anchor');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      onNavigate('/how-it-works');
    }
  };

  return (
    <div className="anvesh-landing-page">
      <Preloader onComplete={() => {}} />

      <main id="main-content" tabIndex={-1}>
        <ErrorBoundary fallbackTitle="Clinical Overview Scene">
          <HeroScene
            onExplore={handleExplore}
            onHowItWorks={() => onNavigate('/how-it-works')}
          />
        </ErrorBoundary>

        <div id="audiences-section-anchor">
          <ErrorBoundary fallbackTitle="Audience Portals Scene">
            <RiseOverScene>
              <AudiencesScene
                onSelectRole={(role) => onNavigate(`/auth/signin?role=${role}`)}
              />
            </RiseOverScene>
          </ErrorBoundary>
        </div>

        <ErrorBoundary fallbackTitle="Workflow Pipeline Scene">
          <HowItWorksScene />
        </ErrorBoundary>

        <ErrorBoundary fallbackTitle="Responsible AI Scene">
          <ResponsibleAiScene />
        </ErrorBoundary>

        <ErrorBoundary fallbackTitle="Platform Preview Scene">
          <PlatformPreviewScene />
        </ErrorBoundary>

        <ErrorBoundary fallbackTitle="Security & Governance Scene">
          <SecurityPrivacyScene />
        </ErrorBoundary>
      </main>
    </div>
  );
};
