import React, { useEffect, useState } from 'react';
import { api, PolicyListItem } from '../../../services/api.ts';
import { Shield, Search, AlertCircle, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { StatusBadge } from '../../../components/common/StatusBadge.tsx';
import { LoadingState } from '../../../components/common/LoadingState.tsx';
import { ErrorState } from '../../../components/common/ErrorState.tsx';
import { Modal } from '../../../components/common/Modal.tsx';
import { Button } from '../../../components/common/Button.tsx';

export const PatientPoliciesPage: React.FC = () => {
  const [policies, setPolicies] = useState<PolicyListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyListItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    loadPolicies(isMounted);
    return () => {
      isMounted = false;
    };
  }, []);

  const loadPolicies = async (isMounted = true) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use timeout promise to guarantee spinner NEVER remains indefinitely
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out while loading policies database.')), 6000)
      );

      const fetchPromise = api.getPolicies({ limit: 100 });
      const rawData = await Promise.race([fetchPromise, timeoutPromise]);

      if (isMounted) {
        const list = Array.isArray(rawData) ? rawData : (rawData as any)?.policies || [];
        setPolicies(list);
      }
    } catch (err: any) {
      if (isMounted) {
        setError(err.message || 'Failed to connect to policies database.');
      }
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
  };

  const filteredPolicies = policies.filter((p) => {
    if (!p) return false;
    const planId = (p.plan_id || '').toLowerCase();
    const planName = (p.plan_name || '').toLowerCase();
    const state = (p.state || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    return planId.includes(query) || planName.includes(query) || state.includes(query);
  });

  return (
    <div className="portal-page-container">
      <div className="portal-page-header">
        <div>
          <h2>My Insurance Policies & Benefit Rules</h2>
          <p className="page-header-sub">
            Review active health insurance coverage rules, diagnostic imaging criteria, and cost-sharing guidelines.
          </p>
        </div>
      </div>

      {/* Critical Policy Gating Notice */}
      <div className="patient-policy-disclaimer clinical-glass" role="note">
        <AlertCircle size={20} className="text-info inline-icon" aria-hidden="true" />
        <span>
          <strong>Coverage Policy Notice:</strong> An active policy listing confirms benefit eligibility,
          but <em>does not by itself guarantee authorization</em> for an unapproved service. Each claim
          undergoes clinical evidence review to verify medical necessity and screen for policy exclusions.
        </span>
      </div>

      {/* Search Bar */}
      <div className="policy-search-bar-row">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon-left" />
          <input
            type="search"
            placeholder="Search policies by plan name, state, or identifier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="anvesh-input has-left-icon"
          />
        </div>
        <span className="policy-count-tag">
          {filteredPolicies.length} {filteredPolicies.length === 1 ? 'Policy' : 'Policies'} Found
        </span>
      </div>

      {/* Policies Content */}
      {isLoading ? (
        <LoadingState message="Loading policy guidelines from research database..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadPolicies} />
      ) : filteredPolicies.length === 0 ? (
        <div className="portal-empty-card clinical-glass text-center p-8">
          <Shield size={36} className="text-muted mx-auto mb-3" />
          <h3>No policies match your search</h3>
          <p className="text-secondary">Try searching by State (e.g., 'VA', 'IN') or clear your search query.</p>
        </div>
      ) : (
        <div className="patient-policies-grid">
          {filteredPolicies.map((policy) => (
            <div key={policy.plan_id} className="patient-policy-card clinical-glass">
              <div className="policy-card-top">
                <span className="policy-state-badge">State: {policy.state}</span>
                <StatusBadge
                  status={policy.is_covered ? 'OUTCOME_COVERED' : 'OUTCOME_NOT_COVERED'}
                  label={policy.is_covered ? 'Covered Benefit' : 'Non-Covered Benefit'}
                  size="sm"
                />
              </div>

              <h3 className="policy-card-title">{policy.plan_name}</h3>
              <p className="policy-card-planid">
                Plan Identifier: <code>{policy.plan_id}</code>
              </p>

              <div className="policy-costs-row">
                <div className="cost-item">
                  <span className="cost-label">Copayment</span>
                  <span className="cost-val">{policy.copay || 'None ($0)'}</span>
                </div>
                <div className="cost-item">
                  <span className="cost-label">Coinsurance</span>
                  <span className="cost-val">{policy.coinsurance || 'Standard (0%)'}</span>
                </div>
              </div>

              <div className="policy-card-footer">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPolicy(policy)}
                  className="w-full"
                >
                  View Details & Criteria
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Policy Details Modal */}
      {selectedPolicy && (
        <Modal
          isOpen={!!selectedPolicy}
          onClose={() => setSelectedPolicy(null)}
          title={selectedPolicy.plan_name}
          description={`Policy ID: ${selectedPolicy.plan_id} • State: ${selectedPolicy.state}`}
          footer={
            <Button variant="primary" onClick={() => setSelectedPolicy(null)}>
              Close Details
            </Button>
          }
        >
          <div className="policy-modal-content">
            <h4>Benefit Coverage Status</h4>
            <div className="mb-4">
              <StatusBadge
                status={selectedPolicy.is_covered ? 'OUTCOME_COVERED' : 'OUTCOME_NOT_COVERED'}
                label={selectedPolicy.is_covered ? 'Approved Benefit Category' : 'Explicit Non-Covered Benefit'}
              />
            </div>

            <h4>Cost Sharing Obligations</h4>
            <ul className="policy-modal-list mb-4">
              <li><strong>Copay:</strong> {selectedPolicy.copay || 'No fixed copayment'}</li>
              <li><strong>Coinsurance:</strong> {selectedPolicy.coinsurance || '0% after deductible'}</li>
            </ul>

            <h4>Policy Exclusions & Limitations</h4>
            {selectedPolicy.exclusions && selectedPolicy.exclusions.length > 0 ? (
              <ul className="policy-exclusions-list">
                {selectedPolicy.exclusions.map((ex, i) => (
                  <li key={i} className="exclusion-item">
                    <XCircle size={14} className="text-critical inline-icon" />
                    <span>{ex}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-secondary text-sm">
                No specific exclusion riders are currently codified in this benchmark plan record.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
