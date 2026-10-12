import React, { useState } from 'react';
import { Lock, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react';
import { Input } from '../../components/common/Input.tsx';
import { Button } from '../../components/common/Button.tsx';

interface ResetPasswordPageProps {
  onNavigate: (path: string) => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onNavigate }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    setSuccess(true);
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
            <Lock size={24} className="text-teal" />
          </div>
          <h1 className="auth-title">Set New Password</h1>
          <p className="auth-sub">Enter and confirm your new secure password.</p>
        </div>

        {success ? (
          <div className="auth-success-state text-center">
            <CheckCircle2 size={48} className="text-success mx-auto mb-3" />
            <h3>Password Updated</h3>
            <p className="text-secondary mb-4">
              Your password has been successfully reset. You may now sign in with your new credentials.
            </p>
            <Button variant="primary" onClick={() => onNavigate('/auth/signin')} className="w-full">
              Sign In Now
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <Input
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
            />

            {errorMsg && (
              <div className="auth-error-banner" role="alert">
                <AlertCircle size={16} className="text-critical inline-icon" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full">
              Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
