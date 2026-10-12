import React from 'react';
import {
  Home,
  Shield,
  FileText,
  UploadCloud,
  Bell,
  User,
  HelpCircle,
  Search,
  PlusCircle,
  Inbox,
  AlertCircle,
  FileCheck,
  BarChart2,
  Settings,
  Layers,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth, UserRole } from '../../context/AuthContext.tsx';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

interface PortalSidebarProps {
  currentSection: string;
  onSelectSection: (section: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const PortalSidebar: React.FC<PortalSidebarProps> = ({
  currentSection,
  onSelectSection,
  collapsed = false,
  onToggleCollapse,
}) => {
  const { role, signOut } = useAuth();

  const getRoleNavItems = (currentRole: UserRole | null): SidebarItem[] => {
    switch (currentRole) {
      case 'patient':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <Home size={18} /> },
          { id: 'policies', label: 'My Insurance Policies', icon: <Shield size={18} /> },
          { id: 'claims', label: 'My Claims & Prior Auths', icon: <FileText size={18} />, badge: 2 },
          { id: 'documents', label: 'Required Documents', icon: <UploadCloud size={18} />, badge: 1 },
          { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
          { id: 'profile', label: 'Profile & Settings', icon: <User size={18} /> },
          { id: 'help', label: 'Help & Support', icon: <HelpCircle size={18} /> },
        ];

      case 'provider':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <Home size={18} /> },
          { id: 'lookup', label: 'Patient / Member Lookup', icon: <Search size={18} /> },
          { id: 'new-request', label: 'New Authorization Request', icon: <PlusCircle size={18} /> },
          { id: 'submissions', label: 'My Submissions', icon: <FileText size={18} /> },
          { id: 'additional-info', label: 'Additional Info Requests', icon: <AlertCircle size={18} />, badge: 1 },
          { id: 'appeals', label: 'Resubmissions & Appeals', icon: <FileCheck size={18} /> },
          { id: 'profile', label: 'Hospital Profile & Staff', icon: <User size={18} /> },
          { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
          { id: 'help', label: 'Help & Documentation', icon: <HelpCircle size={18} /> },
        ];

      case 'insurance':
      default:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <Home size={18} /> },
          { id: 'queue', label: 'Case Queue', icon: <Inbox size={18} />, badge: 'Active' },
          { id: 'workspace', label: 'Case Workspace', icon: <Layers size={18} /> },
          { id: 'history', label: 'Review History & Audit', icon: <FileCheck size={18} /> },
          { id: 'policies', label: 'Policy Library', icon: <Shield size={18} /> },
          { id: 'analytics', label: 'Analytics & Reports', icon: <BarChart2 size={18} /> },
          { id: 'notifications', label: 'Notifications & Tasks', icon: <Bell size={18} /> },
          { id: 'admin', label: 'Company Administration', icon: <Settings size={18} /> },
          { id: 'help', label: 'How to Use ANVESH', icon: <HelpCircle size={18} /> },
        ];
    }
  };

  const navItems = getRoleNavItems(role);

  return (
    <aside
      className={`anvesh-portal-sidebar ${collapsed ? 'is-collapsed' : ''}`}
      aria-label={`${role ? role.toUpperCase() : 'PORTAL'} Navigation`}
    >
      {/* Brand Header */}
      <div className="sidebar-brand">
        <span className="brand-logo" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="2" />
            <path d="M7 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="3" fill="#5CC4CC" />
          </svg>
        </span>
        {!collapsed && (
          <div className="sidebar-brand-text">
            <span className="brand-title">ANVESH</span>
            <span className="brand-role-sub">
              {role === 'patient' && 'Member Portal'}
              {role === 'provider' && 'Provider Portal'}
              {role === 'insurance' && 'Claims Review'}
            </span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {navItems.map((item) => {
            const isActive = currentSection === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onSelectSection(item.id)}
                  className={`sidebar-nav-item ${isActive ? 'is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="sidebar-item-icon">{item.icon}</span>
                  {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
                  {!collapsed && item.badge !== undefined && (
                    <span className="sidebar-item-badge">{item.badge}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer Controls */}
      <div className="sidebar-footer">
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="sidebar-collapse-toggle"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!collapsed && <span>Collapse Menu</span>}
          </button>
        )}

        <button
          onClick={signOut}
          className="sidebar-signout-btn"
          title="Sign out of portal"
        >
          <LogOut size={18} aria-hidden="true" />
          {!collapsed && <span>Exit Portal</span>}
        </button>
      </div>
    </aside>
  );
};
