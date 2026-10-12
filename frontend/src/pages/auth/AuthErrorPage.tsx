import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { Button } from '../../components/common/Button.tsx';

interface AuthErrorPageProps {
  onNavigate: (path: string) => void;
}

export const AuthErrorPage: React.FC<AuthErrorPageProps> = ({ onNavigate }) => {
  return (
    <div className="anvesh-auth-container">
      <div className="auth-card clinical-glass">
        <div className="auth-header text-center">
          <div className="auth-icon-wrapper mx-auto mb-3">
            <AlertOctagon size={32} className="text-critical" />
          </div>
          <h1 className="auth-title">Authorization Error</h1>
          <p className="auth-sub">
            The requested action could not be verified or your session token has expired.
          </p>
        </div>

        <div className="auth-notice-alert" role="alert">
          <p className="notice-text">
            <strong>Error Reference:</strong> AUTH_SESSION_EXPIRED_OR_UNAUTHORIZED
            <br />
            Please return to sign in or contact your healthcare institution's ANVESH administrator.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Button variant="primary" onClick={() => onNavigate('/auth/signin')} className="w-full">
            Return to Sign In
          </Button>
          <Button variant="ghost" onClick={() => onNavigate('/')} className="w-full">
            Return to Homepage
          </Button>
        </div>
      </div>
    </div>
  );
};
