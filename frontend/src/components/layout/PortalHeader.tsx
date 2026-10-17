import React from 'react';
import { UserMenu } from './UserMenu.tsx';
import { NotificationCenter } from './NotificationCenter.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { useAuth, UserRole } from '../../context/AuthContext.tsx';
import { Shield, Database, LogOut, Menu, Sparkles } from 'lucide-react';

interface PortalHeaderProps {
  portalTitle: string;
  sectionTitle: string;
  onToggleSidebar?: () => void;
  onNavigatePublic?: (path: string) => void;
}

export const PortalHeader: React.FC<PortalHeaderProps> = ({
  portalTitle,
  sectionTitle,
  onToggleSidebar,
  onNavigatePublic,
}) => {
  const { role, isDesignPreview, enterDesignPreview, signOut } = useAuth();

  const handleSwitchPreviewRole = (newRole: UserRole) => {
    enterDesignPreview(newRole);
  };

  const handleDirectSignOut = () => {
    signOut();
    if (onNavigatePublic) {
      onNavigatePublic('/auth/signin');
    } else {
      window.location.href = '/auth/signin';
    }
  };

  return (
    <header className="anvesh-portal-header sticky top-0 z-30" role="banner">
      <div className="portal-header-left flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors md:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
          </button>
        )}

        <div className="portal-breadcrumbs-bar flex items-center gap-2">
          <span className="crumb-root text-xs font-medium text-slate-500">{portalTitle}</span>
          <span className="crumb-sep text-slate-300">/</span>
          <span className="crumb-active text-xs font-bold text-slate-900">{sectionTitle}</span>
        </div>

        <StatusBadge
          status="info"
          label={
            role === 'patient'
              ? 'Patient / Member'
              : role === 'provider'
              ? 'Hospital / Provider'
              : 'Insurance Reviewer'
          }
          size="sm"
        />
      </div>

      <div className="portal-header-right flex items-center gap-3">
        {/* Environment Data Mode Badge */}
        {isDesignPreview ? (
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold tracking-wider uppercase rounded-full flex items-center gap-1.5 shadow-xs">
              <Shield size={12} className="text-amber-600" /> DEV PREVIEW MODE
            </span>
            <div className="preview-role-switcher" title="Switch portal view in demonstration mode">
              <span className="switcher-label">View:</span>
              <select
                value={role || 'insurance'}
                onChange={(e) => handleSwitchPreviewRole(e.target.value as UserRole)}
                className="preview-role-select text-xs font-semibold"
                aria-label="Switch demonstration portal role"
              >
                <option value="patient">Patient Portal</option>
                <option value="provider">Provider Portal</option>
                <option value="insurance">Insurance Portal</option>
              </select>
            </div>
          </div>
        ) : (
          <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold tracking-wider uppercase rounded-full flex items-center gap-1.5 shadow-2xs">
            <Database size={13} className="text-emerald-600" /> LIVE POSTGRESQL (2,107 CASES)
          </span>
        )}

        <NotificationCenter />
        
        {/* Visible Direct Log Out Shortcut */}
        <button
          onClick={handleDirectSignOut}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200 hover:border-red-200 shadow-2xs"
          title="Sign out of active session"
          aria-label="Sign out of ANVESH"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline font-semibold">Log Out</span>
        </button>

        <UserMenu onNavigatePublic={onNavigatePublic} />
      </div>
    </header>
  );
};
export default PortalHeader;
