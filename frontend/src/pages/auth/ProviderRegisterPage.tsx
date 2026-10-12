import React, { useState } from 'react';
import { Building2, ArrowLeft, AlertCircle } from 'lucide-react';
import { Input } from '../../components/common/Input.tsx';
import { Select } from '../../components/common/Select.tsx';
import { Button } from '../../components/common/Button.tsx';

interface ProviderRegisterPageProps {
  onNavigate: (path: string) => void;
}

export const ProviderRegisterPage: React.FC<ProviderRegisterPageProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    orgName: '',
    npi: '',
    clinicalRole: 'physician',
    department: 'radiology',
    contactName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeHipaa: false,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (!formData.agreeHipaa) {
      setErrorMsg('You must certify HIPAA compliance awareness.');
      return;
    }
    onNavigate('/auth/verify-email?email=' + encodeURIComponent(formData.email));
  };

  return (
    <div className="anvesh-auth-container">
      <div className="auth-card clinical-glass">
        <button onClick={() => onNavigate('/auth/signin?role=provider')} className="auth-back-btn">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Sign In</span>
        </button>

        <div className="auth-header">
          <div className="auth-icon-wrapper">
            <Building2 size={20} className="text-info" />
          </div>
          <h1 className="auth-title">Healthcare Provider Registration</h1>
          <p className="auth-sub">
            Enroll your clinic or hospital for digital evidence submission and prior-authorization pre-checks.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row-grid">
            <Input
              label="Organization Name"
              placeholder="e.g. Memorial Regional Medical Center"
              value={formData.orgName}
              onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
              required
            />
            <Input
              label="10-Digit NPI Number"
              placeholder="e.g. 1234567890"
              value={formData.npi}
              onChange={(e) => setFormData({ ...formData, npi: e.target.value })}
              required
            />
          </div>

          <div className="form-row-grid">
            <Select
              label="Department / Specialty"
              options={[
                { value: 'radiology', label: 'Diagnostic Radiology' },
                { value: 'pulmonology', label: 'Pulmonology & Critical Care' },
                { value: 'cardiology', label: 'Cardiology' },
                { value: 'oncology', label: 'Oncology' },
                { value: 'prior_auth', label: 'Prior Auth Office / Administration' },
              ]}
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              required
            />
            <Select
              label="Clinical Role"
              options={[
                { value: 'physician', label: 'Attending Physician (MD/DO)' },
                { value: 'nurse_navigator', label: 'Clinical Nurse Navigator' },
                { value: 'auth_specialist', label: 'Prior Auth Coordinator' },
                { value: 'admin', label: 'Hospital IT / Administrator' },
              ]}
              value={formData.clinicalRole}
              onChange={(e) => setFormData({ ...formData, clinicalRole: e.target.value })}
              required
            />
          </div>

          <div className="form-row-grid">
            <Input
              label="Contact Full Name"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              required
            />
            <Input
              label="Institutional Email"
              type="email"
              placeholder="physician@hospital.org"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

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
                checked={formData.agreeHipaa}
                onChange={(e) => setFormData({ ...formData, agreeHipaa: e.target.checked })}
                className="anvesh-checkbox"
                required
              />
              <span>
                I certify that submitted medical documentation conforms to de-identification and
                research data security standards.
              </span>
            </label>
          </div>

          {errorMsg && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} className="text-critical inline-icon" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full">
            Submit Provider Application
          </Button>
        </form>
      </div>
    </div>
  );
};
