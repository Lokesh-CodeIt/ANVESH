import React, { useState } from 'react';
import { User, LogOut, Shield, Database, CheckCircle2, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface UserMenuProps {
  onNavigatePublic?: (path: string) => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onNavigatePublic }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, role, signOut, isDesignPreview } = useAuth();

  const handleSignOut = () => {
    setIsOpen(false);
    signOut();
    if (onNavigatePublic) {
      onNavigatePublic('/auth/signin');
    } else {
      window.location.href = '/auth/signin';
    }
  };

  return (
    <div className="anvesh-user-menu-wrapper relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="User Account Menu"
        className="user-menu-trigger-btn flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <div className="user-avatar w-8 h-8 rounded-full bg-slate-900 text-teal-300 flex items-center justify-center font-bold text-xs" aria-hidden="true">
          <User size={16} />
        </div>
        <div className="user-info-text text-left hidden sm:block">
          <span className="user-name text-xs font-bold text-slate-800 block">
            {user?.name || (role === 'patient' ? 'Eleanor Vance' : role === 'provider' ? 'Dr. Marcus Vance' : 'Dr. Elizabeth Thorne')}
          </span>
          <span className="user-role-badge text-[10px] text-slate-500 font-medium block">
            {isDesignPreview ? 'Preview Mode' : 'Authenticated Staff'}
          </span>
        </div>
      </button>

      {isOpen && (
        <div 
          className="user-menu-dropdown absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50 text-xs space-y-3" 
          role="menu"
        >
          {/* Identity & Portal Header */}
          <div className="pb-3 border-b border-slate-100">
            <div className="font-bold text-sm text-slate-900">
              {user?.name || (role === 'patient' ? 'Eleanor Vance' : role === 'provider' ? 'Dr. Marcus Vance' : 'Dr. Elizabeth Thorne')}
            </div>
            <div className="text-slate-500 text-[11px] font-mono mt-0.5">
              {user?.email || (role === 'patient' ? 'member@anvesh.internal' : role === 'provider' ? 'provider@metrogeneral.org' : 'reviewer@apexmutual.com')}
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold text-slate-700">
              <Shield size={12} className="text-teal-700" />
              Active Portal: {role === 'patient' ? 'Patient / Member' : role === 'provider' ? 'Hospital Provider' : 'Insurance Reviewer'}
            </div>
          </div>

          {/* Mode & Honesty Notice */}
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1 text-slate-600">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              {isDesignPreview ? (
                <>
                  <Shield size={12} className="text-amber-600" /> Development Preview Mode
                </>
              ) : (
                <>
                  <Database size={12} className="text-emerald-600" /> Live Database Active
                </>
              )}
            </span>
            <p className="text-[10px] text-slate-500">
              {isDesignPreview
                ? 'Using isolated synthetic cases. Database writes and live cloud APIs are safely disabled.'
                : 'Connected to live PostgreSQL database. Model findings are precomputed VLM extractions.'}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-1 pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                if (onNavigatePublic) onNavigatePublic('/how-to-use');
                else window.location.href = '/how-to-use';
              }}
              className="w-full text-left p-2 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center justify-between"
            >
              <span>How to Use ANVESH Guide</span>
              <ExternalLink size={12} className="text-slate-400" />
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={handleSignOut}
              role="menuitem"
              className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut size={14} aria-hidden="true" />
              <span>Log Out / Exit Session</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default UserMenu;
