import React from 'react';
import { User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export const ProfileMenu: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="anvesh-profile-summary-card">
      <div className="profile-header">
        <div className="profile-avatar">
          <User size={24} />
        </div>
        <div className="profile-details">
          <h4 className="profile-name">{user?.name || 'Authorized Reviewer'}</h4>
          <p className="profile-email">{user?.email || 'reviewer@anvesh.research'}</p>
        </div>
      </div>
      <div className="profile-meta">
        <div className="meta-row">
          <span className="meta-label">Access Level</span>
          <span className="meta-value">{user?.role ? user.role.toUpperCase() : 'RESEARCH PREVIEW'}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Organization</span>
          <span className="meta-value">{user?.organization || 'Clinical Evaluation Team'}</span>
        </div>
      </div>
    </div>
  );
};
