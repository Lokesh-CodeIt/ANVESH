import React, { useState } from 'react';
import { UserCheck, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { Input } from '../../components/common/Input.tsx';
import { Select } from '../../components/common/Select.tsx';
import { Button } from '../../components/common/Button.tsx';
import { api } from '../../services/api.ts';

interface PatientRegisterPageProps {
  onNavigate: (path: string) => void;
}

export const PatientRegisterPage: React.FC<PatientRegisterPageProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    memberId: '',
    carrier: 'aetna',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (formData.password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (!formData.agreeTerms) {
      setErrorMsg('You must agree to the research terms of service.');
      return;
    }

    setIsLoading(true);
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      await api.registerPatient({
        email: formData.email,
        password: formData.password,
        full_name: fullName,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="anvesh-auth-container">
        <div className="auth-card clinical-glass text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center">
            <CheckCircle size={28} />
          </div>
          <h2 className="text-xl font-bold text-white">Registration Successful</h2>
          <p className="text-sm text-slate-300">
            Your patient account has been securely created with bcrypt protection.
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => onNavigate(`/auth/signin?role=patient&email=${encodeURIComponent(formData.email)}`)}
            className="w-full mt-4"
          >
            Sign In with Your New Account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="anvesh-auth-container">
      <div className="auth-card clinical-glass">
        <button onClick={() => onNavigate('/auth/signin?role=patient')} className="auth-back-btn">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Sign In</span>
        </button>

        <div className="auth-header">
          <div className="auth-icon-wrapper">
            <UserCheck size={20} className="text-teal" />
          </div>
          <h1 className="auth-title">Patient / Member Onboarding</h1>
          <p className="auth-sub">
            Register to view prior authorization milestones and clinical evidence transparently.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row-grid">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <div className="form-row-grid">
            <Input
              label="Insurance Member ID"
              placeholder="e.g. W123456789"
              value={formData.memberId}
              onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
              required
            />
            <Select
              label="Insurance Carrier"
              options={[
                { value: 'aetna', label: 'Aetna Commercial' },
                { value: 'bcbs', label: 'Blue Cross Blue Shield' },
                { value: 'cigna', label: 'Cigna Healthcare' },
                { value: 'united', label: 'UnitedHealthcare' },
                { value: 'other', label: 'Other / Regional Plan' },
              ]}
              value={formData.carrier}
              onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
              required
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <div className="form-row-grid">
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
            />
          </div>

          <div className="terms-checkbox-group">
            <label className="auth-remember-label">
              <input
                type="checkbox"
                checked={formData.agreeTerms}
                onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                className="anvesh-checkbox"
                required
              />
              <span>
                I agree to the Research Terms and understand that ANVESH is an evidence-review
                decision support prototype, not a medical diagnostic tool.
              </span>
            </label>
          </div>

          {errorMsg && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} className="text-critical inline-icon" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full">
            Complete Registration
          </Button>
        </form>
      </div>
    </div>
  );
};
