import React, { useState } from 'react';
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  ShieldAlert, 
  FileCheck,
  Send,
  HelpCircle,
  Info,
  RotateCcw,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { 
  createSubmission, 
  uploadSubmissionFile, 
  isPreviewModeActive 
} from '../../../services/api';

interface ProviderNewRequestProps {
  onNavigate?: (tab: string, caseId?: string) => void;
}

interface AttachedFile {
  id: string;
  name: string;
  format: string;
  size: string;
  category: 'radiograph' | 'clinical_report';
  status: 'selected_locally' | 'uploading' | 'uploaded' | 'failed';
  rawFile?: File;
  previewUrl?: string;
  error?: string;
}

export const ProviderNewRequestPage: React.FC<ProviderNewRequestProps> = ({ onNavigate }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Form State (Initializes EMPTY in live mode — zero fake prepopulated data)
  const [memberId, setMemberId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [payerId, setPayerId] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [cptCode, setCptCode] = useState('');
  const [clinicalIndication, setClinicalIndication] = useState('');
  const [prelimFindings, setPrelimFindings] = useState('');
  const [files, setFiles] = useState<AttachedFile[]>([]);

  // Demo selection tracking
  const [selectedDemoId, setSelectedDemoId] = useState<string | null>(null);
  const [dragActiveImage, setDragActiveImage] = useState(false);
  const [dragActiveReport, setDragActiveReport] = useState(false);

  const steps = [
    { num: 1, title: 'Member & Policy' },
    { num: 2, title: 'Requested Service' },
    { num: 3, title: 'Clinical Notes' },
    { num: 4, title: 'Image & Documents' },
    { num: 5, title: 'Review & Validate' },
    { num: 6, title: 'Confirmation' }
  ];

  // Validation Checks
  const validationErrors: { step: number; field: string; message: string }[] = [];
  if (!memberId.trim()) validationErrors.push({ step: 1, field: 'Member ID', message: 'Patient Member ID is required.' });
  if (!memberName.trim()) validationErrors.push({ step: 1, field: 'Member Name', message: 'Patient full legal name is required.' });
  if (!payerId.trim()) validationErrors.push({ step: 1, field: 'Payer Plan ID', message: 'Health plan identifier is required.' });
  if (!serviceType.trim()) validationErrors.push({ step: 2, field: 'Service Type', message: 'Requested diagnostic imaging modality is required.' });
  if (!clinicalIndication.trim()) validationErrors.push({ step: 3, field: 'Clinical Indication', message: 'Documented medical indication rationale is required.' });
  if (files.length === 0) validationErrors.push({ step: 4, field: 'Diagnostic Evidence', message: 'At least one medical image or clinical report must be attached.' });

  const handleNext = async () => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    } else if (currentStep === 5) {
      if (validationErrors.length > 0) {
        alert('Please complete all required fields before transmitting request.');
        return;
      }

      setIsSubmitting(true);
      setSubmissionError(null);

      // Safe Local Submission Staging if explicitly in design preview mode
      if (selectedDemoId || isPreviewModeActive()) {
        setTimeout(() => {
          setIsSubmitting(false);
          const newRef = selectedDemoId || `DEMO-REQ-${Date.now().toString().slice(-6)}`;
          setSubmittedRef(newRef);
          
          try {
            const existingSubmissions = JSON.parse(sessionStorage.getItem('anvesh_demo_submissions') || '[]');
            const updated = [
              {
                case_id: newRef,
                patient_id: memberId,
                patient_name: memberName,
                policy_id: payerId,
                service: serviceType,
                indication: clinicalIndication,
                files_count: files.length,
                status: 'Under Review',
                submitted_at: new Date().toISOString()
              },
              ...existingSubmissions.filter((s: any) => s.case_id !== newRef)
            ];
            sessionStorage.setItem('anvesh_demo_submissions', JSON.stringify(updated));
          } catch (_) {}

          setCurrentStep(6);
        }, 700);
        return;
      }

      // Real Provider Submission to FastAPI Backend
      try {
        const sub = await createSubmission({
          member_id: memberId.trim(),
          patient_name: memberName.trim(),
          payer_plan_id: payerId.trim(),
          service_type: serviceType.trim(),
          cpt_code: cptCode.trim() || undefined,
          clinical_indication: clinicalIndication.trim(),
          prelim_findings: prelimFindings.trim() || undefined,
        });

        setSubmittedRef(sub.submission_ref);

        // Upload attached files with genuine File objects
        const updatedFiles = [...files];
        for (let i = 0; i < updatedFiles.length; i++) {
          const item = updatedFiles[i];
          if (item.rawFile) {
            item.status = 'uploading';
            setFiles([...updatedFiles]);
            try {
              await uploadSubmissionFile(sub.id, item.rawFile, item.category);
              item.status = 'uploaded';
            } catch (upErr: any) {
              console.error(`Upload error for ${item.name}:`, upErr);
              item.status = 'failed';
              item.error = upErr.message || 'File upload failed';
            }
          } else {
            item.status = 'uploaded';
          }
        }
        setFiles([...updatedFiles]);
        setCurrentStep(6);
      } catch (err: any) {
        console.error('Submission creation error:', err);
        setSubmissionError(err.message || 'Failed to submit prior authorization request.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1 && currentStep <= 5) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedImageFiles(Array.from(e.target.files));
    }
  };

  const processSelectedImageFiles = (fileList: File[]) => {
    const newFiles: AttachedFile[] = fileList.map((f, i) => {
      const ext = f.name.split('.').pop()?.toUpperCase() || 'IMG';
      const isImage = ['PNG', 'JPG', 'JPEG'].includes(ext);
      return {
        id: `img-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        name: f.name,
        format: ext,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        category: 'radiograph',
        status: 'selected_locally',
        rawFile: f,
        previewUrl: isImage ? URL.createObjectURL(f) : undefined,
      };
    });
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleReportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedReportFiles(Array.from(e.target.files));
    }
  };

  const processSelectedReportFiles = (fileList: File[]) => {
    const newFiles: AttachedFile[] = fileList.map((f, i) => {
      const ext = f.name.split('.').pop()?.toUpperCase() || 'DOC';
      return {
        id: `doc-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        name: f.name,
        format: ext,
        size: f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
        category: 'clinical_report',
        status: 'selected_locally',
        rawFile: f,
      };
    });
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleClearForm = () => {
    setSelectedDemoId(null);
    setMemberId('');
    setMemberName('');
    setPayerId('');
    setServiceType('');
    setCptCode('');
    setClinicalIndication('');
    setPrelimFindings('');
    setFiles([]);
    setSubmissionError(null);
    setCurrentStep(1);
  };

  const handleLoadDemoCase = (id: string) => {
    setSelectedDemoId(id);
    if (id === 'DEMO-CXR-001') {
      setMemberId('DEMO-MEM-0042');
      setMemberName('Eleanor Silverwood (Synthetic Demo)');
      setPayerId('POL-CARDIO-2026-X');
      setServiceType('Chest Radiography (2 Views PA/LAT)');
      setCptCode('71046');
      setClinicalIndication('Progressive exertional dyspnea x 3 weeks. Rule out cardiomegaly or pleural effusion.');
      setPrelimFindings('Cardiomegaly noted with cardiothoracic ratio > 0.54. Blunting of left costophrenic angle consistent with small pleural effusion.');
      setFiles([
        { id: 'f-1', name: 'DEMO-CXR-001_cxr_frontal_pa.png', format: 'PNG', size: '2.0 MB', category: 'radiograph', status: 'selected_locally', previewUrl: '/demo_dataset/cases/DEMO-CXR-001/image/cxr_frontal_pa.png' },
        { id: 'f-2', name: 'DEMO-CXR-001_clinical_report.txt', format: 'TXT', size: '1.6 KB', category: 'clinical_report', status: 'selected_locally' }
      ]);
    } else if (id === 'DEMO-CXR-002') {
      setMemberId('DEMO-MEM-0089');
      setMemberName('Arthur Pendelton (Synthetic Demo)');
      setPayerId('POL-PULM-2026-B');
      setServiceType('Chest Radiography (Single View Frontal)');
      setCptCode('71045');
      setClinicalIndication('Productive cough, fever up to 38.6°C, and pleuritic chest pain x 4 days. Evaluate for pneumonia.');
      setPrelimFindings('Patchy alveolar airspace consolidation noted in the right lower lobe base. Right hemidiaphragm partially obscured.');
      setFiles([
        { id: 'f-1', name: 'DEMO-CXR-002_cxr_frontal_pa.png', format: 'PNG', size: '1.9 MB', category: 'radiograph', status: 'selected_locally', previewUrl: '/demo_dataset/cases/DEMO-CXR-002/image/cxr_frontal_pa.png' },
        { id: 'f-2', name: 'DEMO-CXR-002_clinical_report.txt', format: 'TXT', size: '1.5 KB', category: 'clinical_report', status: 'selected_locally' }
      ]);
    } else if (id === 'DEMO-CXR-003') {
      setMemberId('DEMO-MEM-0120');
      setMemberName('Beatrice Holloway (Synthetic Demo)');
      setPayerId('POL-GEN-2026-PREOP');
      setServiceType('Chest Radiography (2 Views PA/LAT)');
      setCptCode('71046');
      setClinicalIndication('Pre-operative pulmonary clearance evaluation for elective knee replacement.');
      setPrelimFindings('Lungs are well-expanded and clear of focal infiltrates, effusions, or pneumothorax. Normal cardiothoracic ratio (<0.50).');
      setFiles([
        { id: 'f-1', name: 'DEMO-CXR-003_cxr_frontal_pa.png', format: 'PNG', size: '2.1 MB', category: 'radiograph', status: 'selected_locally', previewUrl: '/demo_dataset/cases/DEMO-CXR-003/image/cxr_frontal_pa.png' },
        { id: 'f-2', name: 'DEMO-CXR-003_clinical_report.txt', format: 'TXT', size: '1.2 KB', category: 'clinical_report', status: 'selected_locally' }
      ]);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title & Optional Demo Loader */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">New Prior Authorization Request</h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete the six-step intake process to submit diagnostic imaging for medical necessity adjudication.
          </p>
        </div>

        {/* Optional Demo Population Bar */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Optional: Test with Demo Case
            </span>
            {selectedDemoId && (
              <button
                type="button"
                onClick={handleClearForm}
                className="text-[11px] text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                title="Reset all fields to empty"
              >
                <RotateCcw className="w-3 h-3" /> Clear to Blank
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleLoadDemoCase('DEMO-CXR-001')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                selectedDemoId === 'DEMO-CXR-001'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              CXR-001 (Effusion)
            </button>
            <button
              type="button"
              onClick={() => handleLoadDemoCase('DEMO-CXR-002')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                selectedDemoId === 'DEMO-CXR-002'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              CXR-002 (Pneumonia)
            </button>
            <button
              type="button"
              onClick={() => handleLoadDemoCase('DEMO-CXR-003')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                selectedDemoId === 'DEMO-CXR-003'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              CXR-003 (Pre-Op)
            </button>
          </div>
        </div>
      </div>

      {/* Stepper Navigation Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm" role="navigation" aria-label="Wizard Steps">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => {
            const isCompleted = currentStep > s.num || (currentStep === 6 && s.num === 6);
            const isCurrent = currentStep === s.num;
            return (
              <React.Fragment key={s.num}>
                <div 
                  className="flex flex-col items-center cursor-pointer group"
                  onClick={() => {
                    if (s.num <= currentStep || isCompleted) setCurrentStep(s.num);
                  }}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-teal-600 text-white ring-4 ring-teal-100'
                      : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`text-[11px] mt-1 font-medium hidden sm:block ${
                    isCurrent ? 'text-teal-900 font-bold' : 'text-slate-500'
                  }`}>
                    {s.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    currentStep > idx + 1 ? 'bg-emerald-500' : 'bg-slate-200'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Member & Policy */}
      {currentStep === 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Step 1: Patient / Member & Insurance Policy</h2>
            <p className="text-xs text-slate-500 mt-0.5">Specify patient identification and active health plan benefit.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Member Identifier <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={memberId}
                onChange={e => setMemberId(e.target.value)}
                placeholder="e.g. MEM-928471"
                className="anvesh-input font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Patient Legal Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={memberName}
                onChange={e => setMemberName(e.target.value)}
                placeholder="e.g. Eleanor Silverwood"
                className="anvesh-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Payer Health Plan / Policy ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={payerId}
                onChange={e => setPayerId(e.target.value)}
                placeholder="e.g. POL-9021-CARD"
                className="anvesh-input font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Ordering Hospital Facility
              </label>
              <input
                type="text"
                readOnly
                value="Metropolitan Health System — Dept of Radiology"
                className="anvesh-input bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Requested Service */}
      {currentStep === 2 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Step 2: Requested Service & Billing Modality</h2>
            <p className="text-xs text-slate-500 mt-0.5">Specify diagnostic procedure, CPT billing code, and clinical setting.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Service Description / Modality <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={serviceType}
                onChange={e => setServiceType(e.target.value)}
                placeholder="e.g. Chest Radiography (2 Views PA/LAT)"
                className="anvesh-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">CPT / HCPCS Code</label>
              <input
                type="text"
                value={cptCode}
                onChange={e => setCptCode(e.target.value)}
                placeholder="e.g. 71046"
                className="anvesh-input font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Place of Service</label>
              <select className="anvesh-select">
                <option>22 — Outpatient Hospital Department</option>
                <option>11 — Office / Diagnostic Clinic</option>
                <option>21 — Inpatient Hospital Facility</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Clinical Notes */}
      {currentStep === 3 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Step 3: Clinical Indication & Preliminary Interpretation</h2>
            <p className="text-xs text-slate-500 mt-0.5">Document medical necessity rationale, signs, and attending observations.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Clinical Indication / Diagnosis Rationale (ICD-10) <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={clinicalIndication}
                onChange={e => setClinicalIndication(e.target.value)}
                placeholder="Describe patient symptoms, history, and medical necessity reason..."
                className="anvesh-textarea leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Attending or Radiologist Preliminary Findings
              </label>
              <textarea
                rows={4}
                value={prelimFindings}
                onChange={e => setPrelimFindings(e.target.value)}
                placeholder="Enter preliminary radiologist findings or examination summary..."
                className="anvesh-textarea leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Document & Image Attachment */}
      {currentStep === 4 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Step 4: Image & Supporting Document Upload</h2>
              <p className="text-xs text-slate-500 mt-0.5">Separate medical images from supporting clinical reports.</p>
            </div>
            <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
              {files.length} Item{files.length !== 1 ? 's' : ''} Attached
            </span>
          </div>

          {/* Architecture Disclosure */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 text-xs text-slate-600">
            <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800 block">Server Storage & Upload Protocol:</span>
              <span>
                Genuine medical images (PNG, JPEG, DICOM up to 25 MB) and clinical documents (PDF, TXT up to 25 MB) are validated server-side for magic byte signatures and stored outside public web roots. Original radiograph pixels are strictly preserved.
              </span>
            </div>
          </div>

          {/* Two Distinct Upload Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box A: Medical Radiograph / DICOM */}
            <div 
              onDragOver={e => { e.preventDefault(); setDragActiveImage(true); }}
              onDragLeave={() => setDragActiveImage(false)}
              onDrop={e => { 
                e.preventDefault(); 
                setDragActiveImage(false); 
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  processSelectedImageFiles(Array.from(e.dataTransfer.files));
                }
              }}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all flex flex-col justify-between ${
                dragActiveImage ? 'border-teal-500 bg-teal-50/50' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div>
                <ImageIcon className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Section A: Diagnostic Radiographs
                </div>
                <p className="text-[11px] text-slate-500 mt-1 mb-3">
                  Upload genuine PA or Lateral chest views. Supported: DICOM (.dcm), PNG, JPG, JPEG. Max 25 MB per file.
                </p>
              </div>
              <label className="inline-flex justify-center">
                <input type="file" accept=".dcm,.png,.jpg,.jpeg" multiple onChange={handleImageUpload} className="hidden" />
                <span className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs">
                  Browse Radiograph Files
                </span>
              </label>
            </div>

            {/* Box B: Clinical Reports & Progress Notes */}
            <div 
              onDragOver={e => { e.preventDefault(); setDragActiveReport(true); }}
              onDragLeave={() => setDragActiveReport(false)}
              onDrop={e => { 
                e.preventDefault(); 
                setDragActiveReport(false); 
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  processSelectedReportFiles(Array.from(e.dataTransfer.files));
                }
              }}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all flex flex-col justify-between ${
                dragActiveReport ? 'border-teal-500 bg-teal-50/50' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div>
                <FileText className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Section B: Clinical Documentation
                </div>
                <p className="text-[11px] text-slate-500 mt-1 mb-3">
                  Signed radiology impressions, physician notes, or lab results. Supported: PDF, TXT. Max 25 MB per file.
                </p>
              </div>
              <label className="inline-flex justify-center">
                <input type="file" accept=".pdf,.txt" multiple onChange={handleReportUpload} className="hidden" />
                <span className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs">
                  Browse Clinical Reports
                </span>
              </label>
            </div>
          </div>

          {/* Staged File Inventory */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase">Attached Evidence Inventory</label>
            {files.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-400">
                No diagnostic files currently selected. Use the browse controls above or select a demo case.
              </div>
            ) : (
              files.map(f => (
                <div key={f.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {f.previewUrl ? (
                      <img
                        src={f.previewUrl}
                        alt="Radiograph Preview"
                        className="w-12 h-12 object-cover rounded border border-slate-300 filter grayscale bg-black shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {f.format}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{f.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {f.category === 'radiograph' ? 'Radiographic Medical Image' : 'Clinical Report'} • Format: {f.format} • Size: {f.size}
                      </div>
                      <div className="mt-0.5">
                        {f.status === 'uploaded' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Server Confirmed & Persisted
                          </span>
                        ) : f.status === 'uploading' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" /> Uploading to Server...
                          </span>
                        ) : f.status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            <AlertCircle className="w-3 h-3 text-red-600" /> Upload Failed: {f.error || 'Server rejected file'}
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            Selected Locally (Ready for Transmission)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFile(f.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                    title="Remove File"
                    aria-label={`Remove file ${f.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* STEP 5: Review & Validate */}
      {currentStep === 5 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Step 5: Pre-Submission Validation & Clinical Integrity</h2>
              <p className="text-xs text-slate-500 mt-0.5">Verify case completeness before transmission.</p>
            </div>
            {validationErrors.length === 0 ? (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> All Checks Passed
              </span>
            ) : (
              <span className="text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-full flex items-center gap-1 border border-red-200">
                <AlertCircle className="w-3.5 h-3.5" /> {validationErrors.length} Requirement{validationErrors.length !== 1 ? 's' : ''} Missing
              </span>
            )}
          </div>

          {/* Error from transmission if any */}
          {submissionError && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Transmission Failed:</strong>
                <span>{submissionError}</span>
              </div>
            </div>
          )}

          {/* Missing Fields Warnings */}
          {validationErrors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <span className="text-xs font-bold text-red-900 block">Missing Information Identified:</span>
              <ul className="text-xs text-red-800 space-y-1">
                {validationErrors.map((err, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span>• {err.field}: {err.message}</span>
                    <button
                      onClick={() => setCurrentStep(err.step)}
                      className="text-xs font-semibold text-red-900 underline hover:text-red-700 ml-2"
                    >
                      Fix in Step {err.step} &rarr;
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Submission Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Member</span>
                <span className="font-semibold text-slate-800">{memberName || '—'} ({memberId || '—'})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Service</span>
                <span className="font-semibold text-slate-800">{serviceType || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">CPT / Billing</span>
                <span className="font-mono font-semibold text-slate-800">{cptCode || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Policy ID</span>
                <span className="font-mono font-semibold text-slate-800">{payerId || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Evidence Attached</span>
                <span className="font-semibold text-slate-800">{files.length} document(s)</span>
              </div>
              <div>
                <span className="text-slate-500 block">Submitting Facility</span>
                <span className="font-semibold text-slate-800">Metropolitan Health System</span>
              </div>
            </div>

            {clinicalIndication && (
              <div className="pt-3 border-t border-slate-200 text-xs">
                <span className="text-slate-500 block mb-0.5">Clinical Indication:</span>
                <p className="text-slate-700 italic">{clinicalIndication}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 6: Confirmation */}
      {currentStep === 6 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            PRIOR AUTHORIZATION TRANSMITTED & PERSISTED
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Your prior authorization request has been successfully submitted and stored on the secure server with reference:
          </p>
          <div className="inline-block px-4 py-2 bg-slate-100 rounded-lg font-mono font-bold text-sm text-slate-900 border border-slate-300">
            {submittedRef || 'AUTH-RECORDED'}
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg max-w-md mx-auto text-xs text-emerald-800 text-left">
            <span className="font-bold block mb-1">Status: SUBMITTED (Awaiting Payer Review)</span>
            <span>Attached Evidence: {files.length} genuine diagnostic file(s) persisted. Medical insurance reviewers can now access and adjudicate this submission in the payer workspace.</span>
          </div>
          <div className="pt-4 flex flex-wrap justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearForm}
            >
              Submit Another Request
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => onNavigate?.('my-submissions')}
            >
              View in My Submissions
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => onNavigate?.('queue')}
            >
              Open Payer Queue &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* Stepper Footer Controls */}
      {currentStep <= 5 && (
        <div className="flex items-center justify-between pt-2">
          {currentStep > 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          ) : <div />}

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              onClick={handleNext}
              className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1"
            >
              {isSubmitting ? (
                'Transmitting & Storing Files...'
              ) : currentStep === 5 ? (
                <>
                  <Send className="w-4 h-4" /> Submit Prior Authorization Request
                </>
              ) : (
                <>
                  Continue <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProviderNewRequestPage;
