import React, { useState } from 'react';
import { useAuth, UserRole } from '../../context/AuthContext.tsx';
import { PortalHeader } from './PortalHeader.tsx';
import { PortalSidebar } from './PortalSidebar.tsx';
import { SupportWidget } from './SupportWidget.tsx';

// Patient Portal Pages
import { PatientDashboardPage } from '../../pages/portal/patient/PatientDashboardPage.tsx';
import { PatientPoliciesPage } from '../../pages/portal/patient/PatientPoliciesPage.tsx';
import { PatientClaimsPage } from '../../pages/portal/patient/PatientClaimsPage.tsx';
import { PatientClaimDetailPage } from '../../pages/portal/patient/PatientClaimDetailPage.tsx';
import { PatientDocumentsPage } from '../../pages/portal/patient/PatientDocumentsPage.tsx';
import { PatientProfilePage } from '../../pages/portal/patient/PatientProfilePage.tsx';

// Provider Portal Pages
import { ProviderDashboardPage } from '../../pages/portal/provider/ProviderDashboardPage.tsx';
import { ProviderPatientLookupPage } from '../../pages/portal/provider/ProviderPatientLookupPage.tsx';
import { ProviderNewRequestPage } from '../../pages/portal/provider/ProviderNewRequestPage.tsx';
import { ProviderSubmissionsPage } from '../../pages/portal/provider/ProviderSubmissionsPage.tsx';
import { ProviderRequestDetailPage } from '../../pages/portal/provider/ProviderRequestDetailPage.tsx';
import { ProviderAdditionalInfoPage } from '../../pages/portal/provider/ProviderAdditionalInfoPage.tsx';
import { ProviderProfilePage } from '../../pages/portal/provider/ProviderProfilePage.tsx';

// Insurance Portal Pages
import { InsuranceDashboardPage } from '../../pages/portal/insurance/InsuranceDashboardPage.tsx';
import { InsuranceQueuePage } from '../../pages/portal/insurance/InsuranceQueuePage.tsx';
import { InsuranceWorkspacePage } from '../../pages/portal/insurance/InsuranceWorkspacePage.tsx';
import { InsuranceReviewHistoryPage } from '../../pages/portal/insurance/InsuranceReviewHistoryPage.tsx';
import { InsurancePolicyLibraryPage } from '../../pages/portal/insurance/InsurancePolicyLibraryPage.tsx';
import { InsuranceAnalyticsPage } from '../../pages/portal/insurance/InsuranceAnalyticsPage.tsx';
import { InsuranceAdminPage } from '../../pages/portal/insurance/InsuranceAdminPage.tsx';
import { HowToUsePage } from '../../pages/HowToUsePage.tsx';

import { ShieldAlert } from 'lucide-react';
import { Button } from '../common/Button.tsx';

interface PortalShellProps {
  onNavigatePublic?: (path: string) => void;
}

export const PortalShell: React.FC<PortalShellProps> = ({ onNavigatePublic }) => {
  const { role, isDesignPreview, isAuthenticated, enterDesignPreview, isLoadingSession } = useAuth();
  const [currentSection, setCurrentSection] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.includes('/workspace')) return 'workspace';
      if (path.includes('/queue')) return 'queue';
      if (path.includes('/history')) return 'history';
      if (path.includes('/policies')) return 'policies';
      if (path.includes('/analytics')) return 'analytics';
      if (path.includes('/admin')) return 'admin';
      const params = new URLSearchParams(window.location.search);
      const sec = params.get('section');
      if (sec) return sec;
    }
    return 'dashboard';
  });
  const [activeCaseId, setActiveCaseId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const match = path.match(/CASE_\d+|AUTH-[A-Za-z0-9-]+|DEMO-[A-Za-z0-9-]+/i);
      if (match) return match[0];
      const params = new URLSearchParams(window.location.search);
      const c = params.get('caseId');
      if (c) return c;
    }
    return isDesignPreview ? 'DEMO-CASE-101' : 'CASE_000001';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Loading state while checking session
  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="inline-block w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Verifying security session...</p>
        </div>
      </div>
    );
  }

  // Enforcement for unauthenticated requests
  if (!isDesignPreview && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 text-amber-400">
            <ShieldAlert size={28} />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Portal Access Requires Authentication
            </h1>
          </div>

          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed space-y-2">
            <p className="font-semibold text-teal-300">Server-Enforced RBAC & Security Boundary:</p>
            <p>
              Access to clinical records, evidence metrics, and prior-authorization decisions is protected by server-enforced authentication. Passwords are encrypted with bcrypt and sessions are verified using revocable tokens.
            </p>
          </div>

          <div className="text-xs text-slate-400 space-y-2">
            <p>
              Please sign in with your verified account credentials, or evaluate the interface safely using isolated visual design preview mode with synthetic demonstration data.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              onClick={() => onNavigatePublic ? onNavigatePublic('/auth/signin') : (window.location.href = '/auth/signin')}
              className="bg-teal-600 hover:bg-teal-700 text-white flex-1"
            >
              Sign In with Credentials
            </Button>
            <Button
              variant="outline"
              onClick={() => enterDesignPreview('insurance')}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Visual Preview (Synthetic Data)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Normalized effective role for layout and navigation
  const effectiveRole: UserRole = role === 'patient' ? 'patient' : role === 'provider' ? 'provider' : 'insurance';

  const handleNavigate = (section: string, caseId?: string) => {
    setCurrentSection(section);
    if (caseId) {
      setActiveCaseId(caseId);
    }
    window.scrollTo(0, 0);
  };

  const getPortalTitle = (): string => {
    switch (effectiveRole) {
      case 'patient': return 'Member Portal';
      case 'provider': return 'Provider Portal';
      case 'insurance': default: return role === 'auditor' ? 'Auditor Oversight Portal' : 'Payer Portal';
    }
  };

  const getSectionTitle = (): string => {
    switch (currentSection) {
      case 'dashboard': return 'Dashboard';
      case 'policies': return effectiveRole === 'patient' ? 'My Policies' : 'Policy Library';
      case 'claims': return 'Claims & Authorizations';
      case 'claim-detail': return `Claim ${activeCaseId}`;
      case 'documents': return 'Required Documents';
      case 'lookup': case 'patient-lookup': return 'Member Lookup';
      case 'new-request': return 'New Request';
      case 'submissions': case 'my-submissions': return 'My Submissions';
      case 'request-details': return `Request ${activeCaseId}`;
      case 'additional-info': case 'appeals': return 'Additional Information';
      case 'queue': case 'case-queue': return 'Case Queue';
      case 'workspace': case 'case-workspace': return `Workspace ${activeCaseId}`;
      case 'history': case 'review-history': return 'Review History & Audit';
      case 'analytics': return 'Analytics & Reports';
      case 'admin': return 'Company Administration';
      case 'profile': return effectiveRole === 'provider' ? 'Hospital Profile' : 'Profile & Settings';
      case 'help': return 'How to Use ANVESH';
      case 'notifications': return 'Notifications';
      default: return 'Overview';
    }
  };

  // Render Portal Content Based On Role and Current Section
  const renderPortalContent = () => {
    // Shared Help Section
    if (currentSection === 'help') {
      return (
        <HowToUsePage
          onNavigate={(path) => {
            if (path.startsWith('/portal/')) {
              const parts = path.split('/');
              if (parts[2]) {
                enterDesignPreview(parts[2] as UserRole);
                setCurrentSection(parts[3] || 'dashboard');
              }
            } else if (onNavigatePublic) {
              onNavigatePublic(path);
            } else {
              window.location.href = path;
            }
          }}
        />
      );
    }

    if (effectiveRole === 'patient') {
      switch (currentSection) {
        case 'dashboard':
          return <PatientDashboardPage onNavigateSection={handleNavigate} />;
        case 'policies':
          return <PatientPoliciesPage />;
        case 'claims':
          return <PatientClaimsPage onSelectClaim={(cId) => handleNavigate('claim-detail', cId)} />;
        case 'claim-detail':
          return (
            <PatientClaimDetailPage
              claimId={activeCaseId}
              onBack={() => handleNavigate('claims')}
              onUploadRequested={() => handleNavigate('documents')}
            />
          );
        case 'documents':
          return <PatientDocumentsPage />;
        case 'notifications':
        case 'profile':
        default:
          return <PatientProfilePage />;
      }
    }

    if (effectiveRole === 'provider') {
      switch (currentSection) {
        case 'dashboard':
          return <ProviderDashboardPage onNavigate={handleNavigate} />;
        case 'lookup':
        case 'patient-lookup':
          return <ProviderPatientLookupPage onNavigate={handleNavigate} />;
        case 'new-request':
          return <ProviderNewRequestPage onNavigate={handleNavigate} />;
        case 'submissions':
        case 'my-submissions':
          return <ProviderSubmissionsPage onNavigate={handleNavigate} />;
        case 'request-details':
          return (
            <ProviderRequestDetailPage
              caseId={activeCaseId}
              onBack={() => handleNavigate('submissions')}
              onNavigate={handleNavigate}
            />
          );
        case 'additional-info':
        case 'appeals':
          return (
            <ProviderAdditionalInfoPage
              caseId={activeCaseId}
              onBack={() => handleNavigate('request-details', activeCaseId)}
            />
          );
        case 'profile':
        case 'notifications':
        default:
          return <ProviderProfilePage />;
      }
    }

    // Default: Insurance Portal
    switch (currentSection) {
      case 'dashboard':
        return <InsuranceDashboardPage onNavigate={handleNavigate} />;
      case 'queue':
      case 'case-queue':
        return <InsuranceQueuePage onNavigate={handleNavigate} />;
      case 'workspace':
      case 'case-workspace':
        return (
          <InsuranceWorkspacePage
            caseId={activeCaseId}
            onBack={() => handleNavigate('queue')}
            onNavigate={handleNavigate}
          />
        );
      case 'history':
      case 'review-history':
        return <InsuranceReviewHistoryPage onNavigate={handleNavigate} />;
      case 'policies':
      case 'policy-library':
        return <InsurancePolicyLibraryPage />;
      case 'analytics':
        return <InsuranceAnalyticsPage />;
      case 'admin':
        return <InsuranceAdminPage />;
      default:
        return <InsuranceDashboardPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="anvesh-portal-layout flex min-h-screen bg-slate-100 text-slate-800">
      {/* Sidebar */}
      <PortalSidebar
        currentSection={currentSection}
        onSelectSection={(sec) => handleNavigate(sec)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Column */}
      <div className="portal-main-column flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <PortalHeader
          portalTitle={getPortalTitle()}
          sectionTitle={getSectionTitle()}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onNavigatePublic={onNavigatePublic}
        />

        {/* Content Viewport */}
        <main
          id="portal-main-content"
          tabIndex={-1}
          className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto outline-none"
        >
          {role === 'auditor' && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-800 text-xs shadow-xs" role="status">
              <ShieldAlert size={18} className="text-amber-600 shrink-0" />
              <div>
                <strong>Auditor Mode (Read-Only):</strong> You have oversight permission to inspect clinical evidence, case histories, and model findings. Decision submissions and record modifications are strictly disabled.
              </div>
            </div>
          )}
          {renderPortalContent()}
        </main>
      </div>

      {/* Support Floating Button */}
      <SupportWidget />
    </div>
  );
};
export default PortalShell;
