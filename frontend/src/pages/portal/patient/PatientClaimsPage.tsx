import React, { useState } from 'react';
import { Search, Filter, Clock, CheckCircle2, AlertCircle, ArrowRight, FileText } from 'lucide-react';
import { StatusBadge } from '../../../components/common/StatusBadge.tsx';
import { Button } from '../../../components/common/Button.tsx';
import { isPreviewModeActive, isDemoDatasetImported } from '../../../services/api.ts';

interface PatientClaimsPageProps {
  onSelectClaim: (claimId: string) => void;
}

export interface PatientClaimRecord {
  id: string;
  reference: string;
  service: string;
  category: string;
  provider: string;
  submissionDate: string;
  lastUpdate: string;
  status: 'In Review' | 'Information Requested' | 'Approved' | 'Denied';
  outcomeCode: string;
  urgency: 'Standard' | 'Expedited';
}

export const samplePatientClaims: PatientClaimRecord[] = [
  {
    id: 'DEMO-CXR-001',
    reference: 'DEMO-CXR-001',
    service: 'Chest Radiography (2 Views PA/LAT)',
    category: 'Diagnostic Radiology',
    provider: 'Metro General Health (Dr. M. Vance)',
    submissionDate: 'Oct 1, 2026',
    lastUpdate: 'Oct 4, 2026',
    status: 'In Review',
    outcomeCode: 'OUTCOME_MANUAL_REVIEW_REQUIRED',
    urgency: 'Standard',
  },
  {
    id: 'DEMO-CXR-002',
    reference: 'DEMO-CXR-002',
    service: 'Chest Radiography (Single View Frontal)',
    category: 'Diagnostic Radiology',
    provider: 'St. Jude Regional Care - Pulmonology Dept',
    submissionDate: 'Oct 2, 2026',
    lastUpdate: 'Oct 4, 2026',
    status: 'Information Requested',
    outcomeCode: 'OUTCOME_MANUAL_REVIEW_REQUIRED',
    urgency: 'Standard',
  },
  {
    id: 'DEMO-CXR-003',
    reference: 'DEMO-CXR-003',
    service: 'Chest Radiography Pre-Operative (2 Views)',
    category: 'Diagnostic Radiology',
    provider: 'Metropolitan Imaging Center',
    submissionDate: 'Oct 3, 2026',
    lastUpdate: 'Oct 4, 2026',
    status: 'Approved',
    outcomeCode: 'OUTCOME_COVERED',
    urgency: 'Standard',
  },
];

export const PatientClaimsPage: React.FC<PatientClaimsPageProps> = ({ onSelectClaim }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamically resolve claims without inserting synthetic records in live mode
  const dynamicClaims: PatientClaimRecord[] = React.useMemo(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('anvesh_demo_submissions') || '[]');
      const sessionRecords = stored.map((s: any) => ({
        id: s.case_id,
        reference: s.case_id,
        service: s.service || 'Diagnostic Radiography',
        category: 'Diagnostic Radiology',
        provider: 'Hospital Provider (Staged Submission)',
        submissionDate: new Date(s.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        lastUpdate: 'Just now',
        status: 'In Review' as const,
        outcomeCode: 'OUTCOME_MANUAL_REVIEW_REQUIRED',
        urgency: 'Standard' as const,
      }));

      // In Live Mode: only show user-submitted or authentic backend session claims
      if (!isPreviewModeActive()) {
        return sessionRecords;
      }

      // In Demo Mode: only include demo dataset if explicitly imported
      if (isDemoDatasetImported()) {
        const existingRefs = new Set(sessionRecords.map((r: any) => r.reference));
        return [...sessionRecords, ...samplePatientClaims.filter(c => !existingRefs.has(c.reference))];
      }

      return sessionRecords;
    } catch (_) {
      return [];
    }
  }, []);

  const filtered = dynamicClaims.filter((claim) => {
    const matchesStatus = filterStatus === 'all' || claim.status === filterStatus;
    const matchesSearch =
      claim.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.provider.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="portal-page-container">
      <div className="portal-page-header">
        <div>
          <h2>My Prior Authorizations & Claims</h2>
          <p className="page-header-sub">
            Track the status of medical procedure requests submitted on your behalf by healthcare providers.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="claims-controls-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon-left" />
          <input
            type="search"
            placeholder="Search by reference, procedure, or provider..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="anvesh-input has-left-icon"
          />
        </div>

        <div className="status-filter-buttons">
          {['all', 'In Review', 'Information Requested', 'Approved'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`filter-pill-btn ${filterStatus === st ? 'is-active' : ''}`}
            >
              {st === 'all' ? 'All Requests' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Claims List Table/Cards */}
      <div className="patient-claims-list">
        {filtered.length === 0 ? (
          <div className="portal-empty-card clinical-glass text-center p-8">
            <FileText size={36} className="text-muted mx-auto mb-3" />
            <h3>No authorization requests found</h3>
            <p className="text-secondary">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          filtered.map((claim) => (
            <div key={claim.id} className="patient-claim-row-card clinical-glass">
              <div className="claim-row-main">
                <div className="claim-row-header">
                  <span className="claim-ref-code">{claim.reference}</span>
                  <span className="claim-cat-tag">{claim.category}</span>
                  <span className="claim-urgency-tag">{claim.urgency}</span>
                </div>

                <h3 className="claim-service-name">{claim.service}</h3>
                <p className="claim-provider-line">{claim.provider}</p>

                <div className="claim-timeline-quickmeta">
                  <span>Submitted: <strong>{claim.submissionDate}</strong></span>
                  <span className="meta-sep">&bull;</span>
                  <span>Last Update: <strong>{claim.lastUpdate}</strong></span>
                </div>
              </div>

              <div className="claim-row-actions">
                <div className="status-badge-container">
                  <StatusBadge
                    status={claim.outcomeCode}
                    label={claim.status}
                    size="md"
                  />
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  rightIcon={<ArrowRight size={16} />}
                  onClick={() => onSelectClaim(claim.id)}
                >
                  View Details & Timeline
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
