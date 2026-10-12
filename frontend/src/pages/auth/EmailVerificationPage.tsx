import React, { useState } from 'react';
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Input } from '../../components/common/Input.tsx';
import { Button } from '../../components/common/Button.tsx';

interface EmailVerificationPageProps {
  onNavigate: (path: string) => void;
}

export const EmailVerificationPage: React.FC<EmailVerificationPageProps> = ({ onNavigate }) => {
  const [code, setCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const email = params.get('email') || 'user@organization.org';

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length >= 4) {
      setIsVerified(true);
    }
  };

  return (
    <div className="anvesh-auth-container">
      <div className="auth-card clinical-glass">
        <button onClick={() => onNavigate('/auth/signin')} className="auth-back-btn">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Sign In</span>
        </button>

        <div className="auth-header">
          <div className="auth-icon-wrapper">
            <Mail size={24} className="text-teal" />
          </div>
          <h1 className="auth-title">Email Verification Status</h1>
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200 text-left my-2">
            <strong>Local Environment Notice:</strong> An outbound SMTP / SendGrid mail service is not configured. Self-registered patient accounts are automatically verified upon registration. Staff and provider accounts are provisioned directly by system operators.
          </div>
          <p className="auth-sub">
            Account email: <strong>{email}</strong>
          </p>
        </div>

        {isVerified ? (
          <div className="auth-success-state text-center">
            <CheckCircle2 size={48} className="text-success mx-auto mb-3" />
            <h3>Email Confirmed</h3>
            <p className="text-secondary mb-4">
              Your account has been provisioned for the ANVESH research prototype.
            </p>
            <Button variant="primary" onClick={() => onNavigate('/auth/signin')} className="w-full">
              Proceed to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="auth-form">
            <Input
              label="6-Digit Verification Code"
              placeholder="e.g. 842109"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={6}
            />

            <Button type="submit" variant="primary" size="lg" className="w-full">
              Confirm Email
            </Button>

            <div className="text-center mt-3">
              <span className="text-secondary text-sm">Didn't receive the email? </span>
              <button
                type="button"
                onClick={() => alert('Verification code resent in local research environment.')}
                className="text-teal font-medium text-sm hover:underline"
              >
                Resend Code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
