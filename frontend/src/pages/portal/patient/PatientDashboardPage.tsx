import React from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Shield,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../../components/common/Button.tsx';
import { StatusBadge } from '../../../components/common/StatusBadge.tsx';

interface PatientDashboardProps {
  onNavigateSection: (section: string) => void;
}

export const PatientDashboardPage: React.FC<PatientDashboardProps> = ({ onNavigateSection }) => {
  return (
    <div className="portal-page-container">
      {/* Welcome & Member Overview */}
      <div className="portal-welcome-card clinical-glass">
        <div className="welcome-text-col">
          <span className="welcome-eyebrow">Member ID: MEM-941824 &bull; Plan: Blue Cross Choice Standard</span>
          <h2 className="welcome-title">Welcome back, Eleanor Vance</h2>
          <p className="welcome-desc">
            Track your healthcare prior-authorization requests, review submitted diagnostic imaging
            summaries, and view requested clinical documentation in plain language.
          </p>
        </div>
        <div className="welcome-quick-actions">
          <Button
            variant="primary"
            size="sm"
            rightIcon={<ArrowRight size={16} />}
            onClick={() => onNavigateSection('claims')}
          >
            View Active Claims
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<UploadCloud size={16} />}
            onClick={() => onNavigateSection('documents')}
          >
            Upload Documents
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="portal-kpi-grid">
        <div className="kpi-card clinical-glass">
          <div className="kpi-icon-box bg-teal-subtle">
            <Clock size={20} className="text-teal" />
          </div>
          <div className="kpi-data">
            <span className="kpi-value">1</span>
            <span className="kpi-label">Active Authorization in Review</span>
          </div>
        </div>

        <div className="kpi-card clinical-glass">
          <div className="kpi-icon-box bg-caution-subtle">
            <AlertCircle size={20} className="text-caution" />
          </div>
          <div className="kpi-data">
            <span className="kpi-value">1</span>
            <span className="kpi-label">Action Required (Document Request)</span>
          </div>
        </div>

        <div className="kpi-card clinical-glass">
          <div className="kpi-icon-box bg-success-subtle">
            <CheckCircle2 size={20} className="text-success" />
          </div>
          <div className="kpi-data">
            <span className="kpi-value">1</span>
            <span className="kpi-label">Completed / Approved Authorizations</span>
          </div>
        </div>

        <div className="kpi-card clinical-glass">
          <div className="kpi-icon-box bg-info-subtle">
            <Shield size={20} className="text-info" />
          </div>
          <div className="kpi-data">
            <span className="kpi-value">Active</span>
            <span className="kpi-label">Policy Status (Virginia Standard)</span>
          </div>
        </div>
      </div>

      {/* Action Needed Banner */}
      <div className="patient-action-callout" role="alert">
        <div className="callout-icon-col">
          <AlertCircle size={24} className="text-caution" />
        </div>
        <div className="callout-body">
          <h4>Clarifying Medical Records Requested</h4>
          <p>
            Your insurance clinical reviewer has requested a copy of your previous outpatient pulmonology
            progress note (dated within the last 12 months) to complete review for procedure <strong>Chest X-ray (PA and Lateral)</strong>.
          </p>
          <div className="callout-actions">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<UploadCloud size={14} />}
              onClick={() => onNavigateSection('documents')}
            >
              Upload Document Now
            </Button>
            <button
              onClick={() => onNavigateSection('claims')}
              className="callout-link-btn"
            >
              Inspect Claim Timeline &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Recent Claims & Policy Snapshot */}
      <div className="portal-two-col-grid">
        {/* Recent Claims List */}
        <div className="portal-panel clinical-glass">
          <div className="panel-header">
            <h3>Recent Prior Authorization Requests</h3>
            <button
              onClick={() => onNavigateSection('claims')}
              className="panel-view-all-btn"
            >
              View All
            </button>
          </div>
          <div className="panel-body">
            <div className="patient-claim-item">
              <div className="claim-item-left">
                <span className="claim-ref">AUTH-2026-67</span>
                <span className="claim-service">Chest Radiography (PA & Lateral)</span>
                <span className="claim-provider">St. Jude Regional Care &bull; Submitted Oct 8, 2026</span>
              </div>
              <div className="claim-item-right">
                <StatusBadge status="OUTCOME_MANUAL_REVIEW_REQUIRED" label="Clinical Review In Progress" />
                <button
                  onClick={() => onNavigateSection('claims')}
                  className="claim-inspect-link"
                >
                  View Details &rarr;
                </button>
              </div>
            </div>

            <div className="patient-claim-item">
              <div className="claim-item-left">
                <span className="claim-ref">AUTH-2026-12</span>
                <span className="claim-service">Routine Chest Radiography (Follow-up)</span>
                <span className="claim-provider">Metropolitan Radiology &bull; Submitted Sep 14, 2026</span>
              </div>
              <div className="claim-item-right">
                <StatusBadge status="OUTCOME_COVERED" label="Approved & Authorized" />
                <button
                  onClick={() => onNavigateSection('claims')}
                  className="claim-inspect-link"
                >
                  View Details &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Coverage Snapshot & Resources */}
        <div className="portal-panel clinical-glass">
          <div className="panel-header">
            <h3>Active Benefit Coverage Snapshot</h3>
            <button
              onClick={() => onNavigateSection('policies')}
              className="panel-view-all-btn"
            >
              View Policy
            </button>
          </div>
          <div className="panel-body">
            <div className="benefit-row">
              <span className="benefit-label">Health Plan</span>
              <span className="benefit-val">CMS Commercial Benchmark (VA-1001)</span>
            </div>
            <div className="benefit-row">
              <span className="benefit-label">Diagnostic Imaging Copay</span>
              <span className="benefit-val">$25.00 Copayment per service</span>
            </div>
            <div className="benefit-row">
              <span className="benefit-label">Coinsurance Rate</span>
              <span className="benefit-val">10% after In-Network Deductible</span>
            </div>
            <div className="benefit-row">
              <span className="benefit-label">Prior Authorization Requirement</span>
              <span className="benefit-val">Required for Advanced & Interventional Modalities</span>
            </div>

            <div className="patient-support-box">
              <h4>Questions About Your Request?</h4>
              <p>
                Our clinical support navigators are available to help you understand your doctor's
                findings and insurance criteria.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateSection('help')}
                className="mt-2 w-full"
              >
                Help & Explanation Guide
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
