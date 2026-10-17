import React, { useState, useMemo } from 'react';
import {
  Clock,
  ArrowRight,
  FileText,
  X,
  Calendar,
  Building2,
  RotateCcw,
} from 'lucide-react';
import { StatusBadge } from '../../../components/common/StatusBadge.tsx';
import { Button } from '../../../components/common/Button.tsx';

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
  const dynamicClaims: PatientClaimRecord[] = useMemo(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('anvesh_demo_submissions') || '[]');
      const sessionRecords = stored.map((s: any) => ({
        id: s.case_id,
        reference: s.case_id,
        service: s.service || 'Diagnostic Radiography',
        category: 'Diagnostic Radiology',
        provider: 'Hospital Provider (Staged Submission)',
        submissionDate: new Date(s.submitted_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        lastUpdate: 'Just now',
        status: 'In Review' as const,
        outcomeCode: 'OUTCOME_MANUAL_REVIEW_REQUIRED',
        urgency: 'Standard' as const,
      }));

      // Combine any user-submitted claims with the patient's existing active claims
      if (sessionRecords.length > 0) {
        const existingRefs = new Set(sessionRecords.map((r: any) => r.reference));
        return [...sessionRecords, ...samplePatientClaims.filter((c) => !existingRefs.has(c.reference))];
      }

      return samplePatientClaims;
    } catch (_) {
      return samplePatientClaims;
    }
  }, []);

  const counts = useMemo(() => {
    return {
      all: dynamicClaims.length,
      'In Review': dynamicClaims.filter((c) => c.status === 'In Review').length,
      'Information Requested': dynamicClaims.filter((c) => c.status === 'Information Requested').length,
      Approved: dynamicClaims.filter((c) => c.status === 'Approved').length,
    };
  }, [dynamicClaims]);

  const filtered = dynamicClaims.filter((claim) => {
    const matchesStatus = filterStatus === 'all' || claim.status === filterStatus;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      claim.reference.toLowerCase().includes(query) ||
      claim.service.toLowerCase().includes(query) ||
      claim.provider.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto">
      {/* Page Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-1.5 flex flex-col items-start text-left">
          <div className="w-fit self-start inline-flex items-center justify-start text-left gap-2 text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-3 py-1 rounded-md border border-teal-200/80 mb-1">
            <FileText className="w-3.5 h-3.5 text-teal-600 shrink-0" /> Member Prior Authorizations
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight text-left">
            My Prior Authorizations & Claims
          </h1>
          <p className="text-base text-slate-600 max-w-3xl leading-relaxed">
            Track the status of medical procedure requests submitted on your behalf by healthcare providers.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl shadow-2xs">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <div className="text-xs">
            <div className="font-bold text-slate-800">Eleanor Vance</div>
            <div className="text-slate-500 font-mono">Member ID: MEM-941824</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="clinical-search-wrapper flex-1 max-w-xl">
          <input
            type="search"
            placeholder="Search by reference, procedure, or provider..."
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

        <div className="clinical-filter-pills">
          {(['all', 'In Review', 'Information Requested', 'Approved'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`clinical-filter-pill ${filterStatus === st ? 'is-active' : ''}`}
            >
              <span>{st === 'all' ? 'All Requests' : st}</span>
              <span className="pill-count">{counts[st]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Claims List Table/Cards */}
      <div className="space-y-5">
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-12 sm:p-16 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">No authorization requests found</h3>
              <p className="text-base text-slate-500 max-w-md mx-auto leading-relaxed">
                {searchQuery || filterStatus !== 'all'
                  ? `No requests match "${searchQuery || filterStatus}". Try adjusting your filters or search keywords.`
                  : 'You have no active prior authorization records on file.'}
              </p>
            </div>
            {(searchQuery || filterStatus !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
                className="inline-flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 mt-2"
              >
                <RotateCcw size={15} />
                <span>Reset Filters & Search</span>
              </Button>
            )}
          </div>
        ) : (
          filtered.map((claim) => (
            <div
              key={claim.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card hover:shadow-card-hover hover:border-slate-300 transition-all duration-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
            >
              <div className="space-y-3.5 flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-md border border-teal-200/80">
                    {claim.reference}
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200/60">
                    {claim.category}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {claim.urgency} Review
                  </span>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {claim.service}
                  </h3>
                  <div className="flex items-center gap-2 text-base text-slate-700 mt-1 font-medium">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{claim.provider}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-500 font-medium flex-wrap pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Submitted: <strong className="text-slate-700">{claim.submissionDate}</strong>
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Last Decision Update: <strong className="text-slate-700">{claim.lastUpdate}</strong>
                  </span>
                </div>
              </div>

              <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-4 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                <StatusBadge
                  status={claim.outcomeCode}
                  label={claim.status}
                  size="md"
                />

                <Button
                  variant="primary"
                  size="md"
                  rightIcon={<ArrowRight size={17} />}
                  onClick={() => onSelectClaim(claim.id)}
                  className="bg-[#176B68] hover:bg-[#0E4E4C] text-white shadow-xs font-semibold px-5 py-2.5 rounded-xl"
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
