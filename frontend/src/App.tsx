import React, { useState, useEffect } from 'react';
import './styles/tokens.css';
import './styles/global.css';
import './App.css';

import { MotionPreferencesProvider } from './context/MotionPreferencesContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import { PublicNavbar } from './components/layout/PublicNavbar.tsx';
import { PublicFooter } from './components/layout/PublicFooter.tsx';
import { SupportWidget } from './components/layout/SupportWidget.tsx';

// Public Pages
import { LandingPage } from './pages/LandingPage.tsx';
import { HowItWorksPage } from './pages/HowItWorksPage.tsx';
import { ResponsibleAiPage } from './pages/ResponsibleAiPage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import { HowToUsePage } from './pages/HowToUsePage.tsx';

// Auth Pages
import { SignInPage } from './pages/auth/SignInPage.tsx';
import { PatientRegisterPage } from './pages/auth/PatientRegisterPage.tsx';
import { ProviderRegisterPage } from './pages/auth/ProviderRegisterPage.tsx';
import { InsuranceAccessPage } from './pages/auth/InsuranceAccessPage.tsx';
import { EmailVerificationPage } from './pages/auth/EmailVerificationPage.tsx';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage.tsx';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage.tsx';
import { AuthErrorPage } from './pages/auth/AuthErrorPage.tsx';

import { PortalShell } from './components/layout/PortalShell.tsx';

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname || '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (path !== currentPath) {
      window.history.pushState({}, '', path);
      setCurrentPath(path.split('?')[0]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isPortalRoute = currentPath.startsWith('/portal');

  const renderCurrentPage = () => {
    if (isPortalRoute) {
      return <PortalShell onNavigatePublic={navigate} />;
    }

    switch (currentPath) {
      case '/':
        return <LandingPage onNavigate={navigate} />;
      case '/how-it-works':
        return <HowItWorksPage onNavigate={navigate} />;
      case '/responsible-ai':
        return <ResponsibleAiPage onNavigate={navigate} />;
      case '/about':
        return <AboutPage onNavigate={navigate} />;
      case '/how-to-use':
      case '/guide':
        return <HowToUsePage onNavigate={navigate} />;
      case '/auth/signin':
        return <SignInPage onNavigate={navigate} />;
      case '/auth/register/patient':
        return <PatientRegisterPage onNavigate={navigate} />;
      case '/auth/register/provider':
        return <ProviderRegisterPage onNavigate={navigate} />;
      case '/auth/access/insurance':
        return <InsuranceAccessPage onNavigate={navigate} />;
      case '/auth/verify-email':
        return <EmailVerificationPage onNavigate={navigate} />;
      case '/auth/forgot-password':
        return <ForgotPasswordPage onNavigate={navigate} />;
      case '/auth/reset-password':
        return <ResetPasswordPage onNavigate={navigate} />;
      case '/auth/error':
        return <AuthErrorPage onNavigate={navigate} />;
      default:
        return <LandingPage onNavigate={navigate} />;
    }
  };

  return (
    <ErrorBoundary fallbackTitle="ANVESH Platform Recovery">
      <MotionPreferencesProvider>
        <AuthProvider>
          {isPortalRoute ? (
            <PortalShell onNavigatePublic={navigate} />
          ) : (
            <div className="anvesh-app-shell">
              {/* Navigation Bar */}
              <PublicNavbar currentPath={currentPath} onNavigate={navigate} />

              {/* Main Page Area */}
              <div className="anvesh-main-content">
                <ErrorBoundary fallbackTitle="Page Content Recovery">
                  {renderCurrentPage()}
                </ErrorBoundary>
              </div>

              {/* Footer */}
              <PublicFooter onNavigate={navigate} />

              {/* Floating Support & Guideline Widget */}
              <SupportWidget />
            </div>
          )}
        </AuthProvider>
      </MotionPreferencesProvider>
    </ErrorBoundary>
  );
}

export default App;
