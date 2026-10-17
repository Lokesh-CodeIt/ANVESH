import React, { useEffect, useState, useMemo } from 'react';
import { api, PolicyListItem } from '../../../services/api.ts';
import { Shield, AlertCircle, XCircle, ArrowRight, X, RotateCcw } from 'lucide-react';
import { StatusBadge } from '../../../components/common/StatusBadge.tsx';
import { LoadingState } from '../../../components/common/LoadingState.tsx';
import { ErrorState } from '../../../components/common/ErrorState.tsx';
import { Modal } from '../../../components/common/Modal.tsx';
import { Button } from '../../../components/common/Button.tsx';
import { Pagination } from '../../../components/common/Pagination.tsx';

export const PatientPoliciesPage: React.FC = () => {
  const [policies, setPolicies] = useState<PolicyListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'covered' | 'non-covered'>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyListItem | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

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

  // Distinct states for filter dropdown
  const availableStates = useMemo(() => {
    const states = Array.from(new Set(policies.map((p) => p.state).filter(Boolean))).sort();
    return states;
  }, [policies]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: policies.length,
      covered: policies.filter((p) => p.is_covered).length,
      'non-covered': policies.filter((p) => !p.is_covered).length,
    };
  }, [policies]);

  // Filtered dataset
  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      if (!p) return false;
      const planId = (p.plan_id || '').toLowerCase();
      const planName = (p.plan_name || '').toLowerCase();
      const state = (p.state || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = !query || planId.includes(query) || planName.includes(query) || state.includes(query);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'covered' && p.is_covered) ||
        (statusFilter === 'non-covered' && !p.is_covered);
      const matchesState = selectedState === 'all' || p.state === selectedState;

      return matchesSearch && matchesStatus && matchesState;
    });
  }, [policies, searchQuery, statusFilter, selectedState]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedState]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredPolicies.length / pageSize) || 1;
  const paginatedPolicies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPolicies.slice(start, start + pageSize);
  }, [filteredPolicies, currentPage]);

  // Clean formatted helpers
  const formatCopay = (val: string | null) => {
    if (!val || val.toLowerCase().includes('not applicable')) return 'None ($0)';
    return val;
  };

  const formatCoinsurance = (val: string | null) => {
    if (!val || val.toLowerCase().includes('not applicable')) return '0% (Standard)';
    if (val.includes('50.00%')) return '50% after deductible';
    return val;
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSelectedState('all');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto">
      {/* Page Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-1.5 flex flex-col items-start text-left">
          <div className="w-fit self-start inline-flex items-center justify-start text-left gap-2 text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-3 py-1 rounded-md border border-teal-200/80 mb-1">
            <Shield className="w-3.5 h-3.5 text-teal-600 shrink-0" /> Benefit Guidelines
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight text-left">
            My Insurance Policies & Benefit Rules
          </h1>
          <p className="text-base text-slate-600 max-w-3xl leading-relaxed">
            Review active health insurance coverage rules, diagnostic imaging criteria, and cost-sharing guidelines.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl shadow-2xs">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          <div className="text-xs">
            <div className="font-bold text-slate-800">Blue Cross Choice Standard</div>
            <div className="text-slate-500">Eleanor Vance • MEM-941824</div>
          </div>
        </div>
      </div>

      {/* Concise Policy Notice */}
      <div className="p-4 bg-teal-50/70 border border-teal-200/80 rounded-2xl text-teal-900 text-xs sm:text-sm flex items-center gap-3 shadow-2xs" role="note">
        <Shield size={20} className="text-teal-700 shrink-0" aria-hidden="true" />
        <span className="leading-relaxed">
          <strong>Coverage Policy Notice:</strong> Listed benchmark policies outline general benefit eligibility. Individual medical imaging procedures still require clinical evidence verification.
        </span>
      </div>

      {/* Search Bar & Filter Controls Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="clinical-search-wrapper flex-1 max-w-md">
          <input
            type="search"
            placeholder="Search policies by plan name, state, or identifier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="clinical-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Filter Pills */}
          <div className="clinical-filter-pills">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`clinical-filter-pill ${statusFilter === 'all' ? 'is-active' : ''}`}
            >
              <span>All Plans</span>
              <span className="pill-count">{counts.all}</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('covered')}
              className={`clinical-filter-pill ${statusFilter === 'covered' ? 'is-active' : ''}`}
            >
              <span>Covered</span>
              <span className="pill-count">{counts.covered}</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('non-covered')}
              className={`clinical-filter-pill ${statusFilter === 'non-covered' ? 'is-active' : ''}`}
            >
              <span>Non-Covered</span>
              <span className="pill-count">{counts['non-covered']}</span>
            </button>
          </div>

          {/* State Dropdown Filter */}
          {availableStates.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="px-3.5 py-2 text-xs sm:text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-pointer hover:bg-white transition-all shadow-2xs h-10"
              >
                <option value="all">All States</option>
                {availableStates.map((st) => (
                  <option key={st} value={st}>
                    State: {st}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 px-1 font-medium">
        <span>
          Showing <strong className="text-slate-800">{paginatedPolicies.length}</strong> of{' '}
          <strong className="text-slate-800">{filteredPolicies.length}</strong> matching policies
        </span>
        {totalPages > 1 && (
          <span>
            Page <strong className="text-slate-800">{currentPage}</strong> of{' '}
            <strong className="text-slate-800">{totalPages}</strong>
          </span>
        )}
      </div>

      {/* Policies Grid */}
      {isLoading ? (
        <LoadingState message="Loading policy guidelines from research database..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadPolicies} />
      ) : filteredPolicies.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 sm:p-16 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Shield size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900">No policies match your search</h3>
            <p className="text-base text-slate-500 max-w-md mx-auto leading-relaxed">
              We couldn't find any benchmark plan matching your current filters. Try searching by state or keyword.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 mt-2"
          >
            <RotateCcw size={15} />
            <span>Reset Filters & Search</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-cards">
          {paginatedPolicies.map((policy) => {
            const planDisplayName = policy.plan_name || `${policy.state} Benchmark Coverage Plan`;
            return (
              <div key={policy.plan_id} className="clinical-policy-card">
                <div>
                  <div className="card-header">
                    <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200/80">
                      State: {policy.state}
                    </span>
                    <StatusBadge
                      status={policy.is_covered ? 'OUTCOME_COVERED' : 'OUTCOME_NOT_COVERED'}
                      label={policy.is_covered ? 'Covered Benefit' : 'Non-Covered'}
                      size="sm"
                    />
                  </div>

                  <div className="card-title-block">
                    <h3 className="card-plan-title" title={planDisplayName}>
                      {planDisplayName}
                    </h3>
                    <p className="card-plan-id">
                      <span>Plan ID:</span>
                      <strong>{policy.plan_id}</strong>
                    </p>
                  </div>

                  {/* Structured Cost Sharing Cards */}
                  <div className="card-cost-grid">
                    <div className="cost-metric-copay">
                      <span className="metric-label">Copayment</span>
                      <span className="metric-val">{formatCopay(policy.copay)}</span>
                    </div>
                    <div className="cost-metric-coinsurance">
                      <span className="metric-label">Coinsurance</span>
                      <span className="metric-val">{formatCoinsurance(policy.coinsurance)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedPolicy(policy)}
                    className="card-footer-btn"
                  >
                    <span>View Details & Criteria</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && !error && filteredPolicies.length > pageSize && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => {
            setCurrentPage(page);
            const mainEl = document.getElementById('portal-main-content');
            if (mainEl) {
              mainEl.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        />
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
          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Benefit Coverage Status</h4>
              <StatusBadge
                status={selectedPolicy.is_covered ? 'OUTCOME_COVERED' : 'OUTCOME_NOT_COVERED'}
                label={selectedPolicy.is_covered ? 'Approved Benefit Category' : 'Explicit Non-Covered Benefit'}
              />
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Cost Sharing Obligations</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="cost-metric-copay">
                  <span className="metric-label">Copayment</span>
                  <span className="metric-val">{formatCopay(selectedPolicy.copay)}</span>
                </div>
                <div className="cost-metric-coinsurance">
                  <span className="metric-label">Coinsurance</span>
                  <span className="metric-val">{formatCoinsurance(selectedPolicy.coinsurance)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Policy Exclusions & Limitations</h4>
              {selectedPolicy.exclusions && selectedPolicy.exclusions.length > 0 ? (
                <ul className="space-y-2">
                  {selectedPolicy.exclusions.map((ex, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 bg-red-50/50 p-2.5 rounded-lg border border-red-100">
                      <XCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
                      <span>{ex}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-xs sm:text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                  No specific exclusion riders are currently codified in this benchmark plan record.
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
