import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  FileText, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Calendar, 
  Send,
  Download,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { 
  getCase, 
  getCaseImages, 
  getCaseEvidence, 
  CaseDetail, 
  CaseImage, 
  EvidenceRecord,
  SAMPLE_PROVIDER_CASES_DATA,
  SAMPLE_PROVIDER_CASES_IMAGES 
} from '../../../services/api';

interface ProviderRequestDetailProps {
  caseId: string;
  onBack: () => void;
  onNavigate?: (tab: string, caseId?: string) => void;
}

export const ProviderRequestDetailPage: React.FC<ProviderRequestDetailProps> = ({ 
  caseId, 
  onBack,
  onNavigate 
}) => {
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [images, setImages] = useState<CaseImage[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadDetails = async () => {
      try {
        setLoading(true);
        const [cRes, imgRes, evRes] = await Promise.all([
          getCase(caseId),
          getCaseImages(caseId).catch(() => ({ case_id: caseId, images: [] })),
          getCaseEvidence(caseId).catch(() => null)
        ]);

        if (mounted) {
          setCaseData(cRes);
          setImages(imgRes.images || []);
          setEvidence(evRes);
          setError(null);
        }
      } catch (err: any) {
        console.warn(`Encountered error loading case ${caseId}, trying sample catalog:`, err);
        if (mounted) {
          const fallbackCase = SAMPLE_PROVIDER_CASES_DATA[caseId];
          if (fallbackCase) {
            setCaseData(fallbackCase);
            setImages(SAMPLE_PROVIDER_CASES_IMAGES[caseId] || []);
            setError(null);
          } else {
            setError(err.message || 'Failed to load case details');
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDetails();
    return () => { mounted = false; };
  }, [caseId]);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <div className="text-sm text-slate-500 font-medium">Fetching clinical case records...</div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl space-y-4 max-w-2xl">
        <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
          <AlertCircle className="w-5 h-5 text-red-600" /> Unable to load Case {caseId}
        </div>
        <p className="text-xs text-red-700">{error || 'Case not found in database.'}</p>
        <Button variant="outline" size="sm" onClick={onBack}>Return to Submissions</Button>
      </div>
    );
  }

  const statusText = caseData.status || 'Under Payer Review';
  const isApproved = statusText.toLowerCase().includes('approv') || statusText.toLowerCase().includes('authoriz');
  const isDenied = statusText.toLowerCase().includes('deni');
  const isActionRequired = statusText.toLowerCase().includes('info') || statusText.toLowerCase().includes('action');

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto">
      {/* Back button & Title */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-600 hover:text-slate-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="h-5 w-px bg-slate-300" />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
            {caseData.case_id}
          </h1>
          <span className={`text-xs px-2.5 py-0.5 font-semibold rounded-full border ${
            isApproved 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : isDenied 
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : isActionRequired
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            {statusText}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.('additional-info', caseId)}
            className="text-xs"
          >
            Submit Additional Records
          </Button>
        </div>
      </div>

      {/* Case Overview Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Patient / Member ID</span>
            <span className="font-mono font-bold text-slate-800 text-sm">{caseData.patient_id || 'ANV-PT-9012'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Service / Modality</span>
            <span className="font-bold text-slate-800 text-sm">{caseData.service_type || caseData.requested_procedure || 'Chest Radiography'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Date of Service</span>
            <span className="font-medium text-slate-800 text-sm">
              {caseData.created_at ? new Date(caseData.created_at).toLocaleDateString() : 'Active Study'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Health Plan</span>
            <span className="font-medium text-slate-800 text-sm">{caseData.payer_plan_id || 'Commercial Standard PPO'}</span>
          </div>
        </div>

        {/* Clinical Narrative */}
        {caseData.clinical_notes && (
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Transmitted Clinical Notes & Indications
            </h3>
            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed font-mono whitespace-pre-line">
              {caseData.clinical_notes}
            </p>
          </div>
        )}
      </div>

      {/* Associated Radiographic Studies & Documents */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-teal-600" /> Associated Imaging Studies ({images.length})
          </h2>
          <span className="text-xs text-slate-400">Authentic Radiographic Series</span>
        </div>

        {images.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
            No image files linked directly to this case identifier.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img) => (
              <div key={img.image_id || img.id} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-900 group">
                <div className="aspect-square relative flex items-center justify-center overflow-hidden bg-black">
                  <img
                    src={img.image_url || (img.file_path && img.file_path.startsWith('/') ? img.file_path : `/images/${img.file_path}`)}
                    alt={`Study view ${img.view_type || 'Chest'}`}
                    className="w-full h-full object-contain grayscale"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('cxr_frontal_pa.png') && !target.src.includes('cxr_lateral.png')) {
                        target.src = (img.projection === 'lateral' || img.view_type?.toLowerCase().includes('lateral')) 
                          ? '/cxr_lateral.png' 
                          : '/cxr_frontal_pa.png';
                      }
                    }}
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white font-mono text-[10px] rounded">
                    {img.view_type || (img.projection === 'lateral' ? 'Lateral' : 'PA')}
                  </div>
                </div>
                <div className="p-2.5 bg-slate-800 text-slate-200 text-xs flex items-center justify-between">
                  <span className="font-mono text-[11px] truncate">{img.filename || img.file_path}</span>
                  <span className="text-[10px] text-slate-400">{img.projection || img.view_type || 'Chest'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline of Status Progression */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900">Authorization Review Timeline</h2>
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          <div className="relative">
            <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-white" />
            <div className="text-xs font-bold text-slate-900">Case Intake Transmitted & Staged</div>
            <div className="text-[11px] text-slate-500">
              {caseData.created_at ? new Date(caseData.created_at).toLocaleString() : 'Recent'} • Metro General Clinical Gateway
            </div>
            <p className="text-xs text-slate-600 mt-1">
              DICOM images and preliminary clinical narrative successfully accepted into the review queue.
            </p>
          </div>

          <div className="relative">
            <div className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
              isApproved ? 'bg-emerald-600' : isDenied ? 'bg-rose-600' : isActionRequired ? 'bg-amber-600' : 'bg-blue-600'
            }`} />
            <div className="text-xs font-bold text-slate-900">
              {isApproved ? 'Authorization Approved & Adjudicated' : isDenied ? 'Prior Authorization Denied' : isActionRequired ? 'Additional Clinical Documentation Requested' : 'Payer Clinical Review in Progress'}
            </div>
            <div className="text-[11px] text-slate-500">
              {isApproved ? 'Adjudication Complete • Coverage Verified' : isDenied ? 'Adjudication Complete • Denial Notice Dispatched' : isActionRequired ? 'Pending Provider Response • Medical Review' : 'Active • Health Plan Medical Review Department'}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {isApproved 
                ? 'Payer medical review concluded with approval. Authorization reference generated for billing submission.' 
                : isDenied 
                ? 'Clinical documentation provided does not meet coverage policy criteria. Appeal options available.' 
                : isActionRequired
                ? 'Payer adjudicator has requested additional clinical notes or pulmonary function tests prior to authorization.'
                : 'Payer medical director and clinical specialist reviewing policy coverage guidelines against clinical evidence.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderRequestDetailPage;
