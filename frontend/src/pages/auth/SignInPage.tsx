import React, { useState } from 'react';
import { UserCheck, Building2, Shield, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth, UserRole } from '../../context/AuthContext.tsx';
import { Input } from '../../components/common/Input.tsx';
import { Button } from '../../components/common/Button.tsx';

type PortalView = 'patient' | 'provider' | 'insurance';

interface SignInPageProps {
  initialRole?: UserRole;
  onNavigate: (path: string) => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({ initialRole = 'insurance', onNavigate }) => {
  const [selectedRole, setSelectedRole] = useState<PortalView>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get('role');
      if (roleParam && ['patient', 'provider', 'insurance'].includes(roleParam)) {
        return roleParam as PortalView;
      }
    }
    return (initialRole === 'patient' || initialRole === 'provider' ? initialRole : 'insurance') as PortalView;
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, enterDesignPreview } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const result = await signIn(email, password, selectedRole);
    setIsLoading(false);

    if (result.success) {
      onNavigate('/portal');
    } else {
      setErrorMsg(result.message);
    }
  };

  const handleEnterPreview = () => {
    enterDesignPreview(selectedRole);
    onNavigate('/portal');
  };

  const roleConfigs = {
    patient: {
      title: 'Patient / Member Access',
      icon: <UserCheck size={20} className="text-teal" />,
      registerPath: '/auth/register/patient',
      registerLabel: 'Register as Member',
    },
    provider: {
      title: 'Hospital & Healthcare Provider',
      icon: <Building2 size={20} className="text-info" />,
      registerPath: '/auth/register/provider',
      registerLabel: 'Register Clinic or Hospital',
    },
    insurance: {
      title: 'Insurance Reviewer Workspace',
      icon: <Shield size={20} className="text-accent" />,
      registerPath: '/auth/access/insurance',
      registerLabel: 'Request Staff Access',
    },
  };

  const currentConfig = roleConfigs[selectedRole];

  return (
    <div className="anvesh-auth-container">
      <div className="auth-card clinical-glass">
        {/* Role Selector Tabs */}
        <div className="auth-role-tabs" role="tablist" aria-label="Select User Role">
          {(['patient', 'provider', 'insurance'] as PortalView[]).map((role) => (
            <button
              key={role}
              role="tab"
              aria-selected={selectedRole === role}
              onClick={() => {
                setSelectedRole(role);
                setErrorMsg(null);
              }}
              className={`auth-role-tab ${selectedRole === role ? 'is-active' : ''}`}
            >
              {role === 'patient' && 'Patient'}
              {role === 'provider' && 'Provider'}
              {role === 'insurance' && 'Insurance Reviewer'}
            </button>
          ))}
        </div>

        {/* Card Header */}
        <div className="auth-header">
          <div className="auth-icon-wrapper">{currentConfig.icon}</div>
          <h1 className="auth-title">{currentConfig.title}</h1>
          <p className="auth-sub">
            Secure entry for prior-authorization evidence review and claim status.
          </p>
        </div>

        {/* Authentication Architecture Alert */}
        <div className="auth-notice-alert" role="status">
          <AlertCircle size={18} className="notice-icon text-info" aria-hidden="true" />
          <div className="notice-content">
            <span className="notice-title">Server-Enforced Authentication Active</span>
            <p className="notice-text">
              Real session authentication with bcrypt hashing and RBAC authorization is active. Sign in with your registered account.
            </p>
            <div className="mt-2 p-2 bg-slate-900/60 rounded text-[11px] font-mono text-slate-300 space-y-1 border border-slate-700/40">
              <div>Reviewer: <span className="text-teal-400">reviewer@anvesh.com</span> / <span className="text-slate-400">AnveshReview2026!</span></div>
              <div>Auditor: <span className="text-teal-400">auditor@anvesh.com</span> / <span className="text-slate-400">AnveshAudit2026!</span></div>
              <div>Admin: <span className="text-teal-400">admin@anvesh.com</span> / <span className="text-slate-400">AnveshAdmin2026!</span></div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEnterPreview}
              className="mt-3 w-full border border-slate-700 text-xs text-slate-300 hover:text-white"
            >
              Visual Design Preview Mode ({selectedRole.toUpperCase()} — Synthetic UI Only)
            </Button>
          </div>
        </div>

        {/* Standard Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@organization.com"
            required
            autoComplete="email"
          />

          <div className="auth-password-group">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
          </div>

          <div className="auth-options-row">
            <label className="auth-remember-label">
              <input type="checkbox" className="anvesh-checkbox" />
              <span>Remember this device</span>
            </label>
            <button
              type="button"
              onClick={() => onNavigate('/auth/forgot-password')}
              className="auth-forgot-link"
            >
              Forgot password?
            </button>
          </div>

          {errorMsg && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} className="text-critical inline-icon" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full auth-submit-btn"
          >
            Sign In with Credentials
          </Button>
        </form>

        {/* Footer Actions */}
        <div className="auth-footer">
          <span>Don't have an account? </span>
          <button
            onClick={() => onNavigate(currentConfig.registerPath)}
            className="auth-register-link"
          >
            {currentConfig.registerLabel} &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
