import React, { useState } from 'react';
import { Shield, ArrowLeft, KeyRound, AlertCircle } from 'lucide-react';
import { Input } from '../../components/common/Input.tsx';
import { Select } from '../../components/common/Select.tsx';
import { Button } from '../../components/common/Button.tsx';

interface InsuranceAccessPageProps {
  onNavigate: (path: string) => void;
}

export const InsuranceAccessPage: React.FC<InsuranceAccessPageProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    payerName: 'national_health',
    staffId: '',
    role: 'medical_director',
    institutionalEmail: '',
    invitationCode: '',
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invitationCode) {
      setErrorMsg('An institutional invitation code is required for insurance reviewer provisioning.');
      return;
    }
    onNavigate('/auth/verify-email?email=' + encodeURIComponent(formData.institutionalEmail));
  };

  return (
    <div className="anvesh-auth-container">
      <div className="auth-card clinical-glass">
        <button onClick={() => onNavigate('/auth/signin?role=insurance')} className="auth-back-btn">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Sign In</span>
        </button>

        <div className="auth-header">
          <div className="auth-icon-wrapper">
            <Shield size={20} className="text-accent" />
          </div>
          <h1 className="auth-title">Insurance Reviewer Provisioning</h1>
          <p className="auth-sub">
            Request staff access for medical directors, nurse reviewers, and prior-auth claims adjudicators.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row-grid">
            <Select
              label="Health Plan / Payer Organization"
              options={[
                { value: 'national_health', label: 'National Health Assurance' },
                { value: 'virginia_premier', label: 'Virginia Premier Health' },
                { value: 'capital_care', label: 'Capital Care Adjudication' },
                { value: 'commercial_puf', label: 'PUF Benchmark Research Plan' },
              ]}
              value={formData.payerName}
              onChange={(e) => setFormData({ ...formData, payerName: e.target.value })}
              required
            />
            <Input
              label="Staff / Reviewer ID"
              placeholder="e.g. ADJ-89421"
              value={formData.staffId}
              onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
              required
            />
          </div>

          <div className="form-row-grid">
            <Select
              label="Adjudication Role"
              options={[
                { value: 'medical_director', label: 'Medical Director (MD/DO)' },
                { value: 'nurse_reviewer', label: 'Clinical Nurse Reviewer (RN)' },
                { value: 'claims_examiner', label: 'Prior Auth Claims Examiner' },
                { value: 'appeals_coordinator', label: 'Appeals & Grievances Officer' },
              ]}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
            />
            <Input
              label="Work Email"
              type="email"
              placeholder="reviewer@payer.com"
              value={formData.institutionalEmail}
              onChange={(e) => setFormData({ ...formData, institutionalEmail: e.target.value })}
              required
            />
          </div>

          <Input
            label="Invitation / Department Access Code"
            placeholder="Enter authorization token provided by Payer Admin"
            value={formData.invitationCode}
            onChange={(e) => setFormData({ ...formData, invitationCode: e.target.value })}
            required
            leftIcon={<KeyRound size={16} />}
          />

          {errorMsg && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} className="text-critical inline-icon" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full">
            Submit Provisioning Request
          </Button>
        </form>
      </div>
    </div>
  );
};
