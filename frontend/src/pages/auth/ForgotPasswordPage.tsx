import React, { useState } from 'react';
import { KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Input } from '../../components/common/Input.tsx';
import { Button } from '../../components/common/Button.tsx';

interface ForgotPasswordPageProps {
  onNavigate: (path: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
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
            <KeyRound size={24} className="text-teal" />
          </div>
          <h1 className="auth-title">Reset Your Password</h1>
          <p className="auth-sub">
            Enter your registered email address and we will provide instructions to reset your password.
          </p>
        </div>

        {submitted ? (
          <div className="auth-success-state text-center">
            <CheckCircle2 size={48} className="text-success mx-auto mb-3" />
            <h3>Recovery Request Received</h3>
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200 text-left my-3">
              <strong>Email Service Notice:</strong> Outbound mail transmission is not configured in this local research deployment. To reset operator or staff passwords, use the administrative tool:
              <div className="mt-1 font-mono text-[11px] bg-slate-900/80 p-1.5 rounded text-teal-300">
                python provision_admin.py --email {email || 'your_email'}
              </div>
            </div>
            <Button variant="ghost" onClick={() => onNavigate('/auth/signin')} className="w-full">
              Return to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <Input
              label="Account Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@organization.com"
              required
            />
            <Button type="submit" variant="primary" size="lg" className="w-full">
              Send Password Reset Link
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
