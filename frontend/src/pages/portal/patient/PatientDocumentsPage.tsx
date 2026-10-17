import React, { useState } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  FileText,
  Clock,
  Eye,
  Building2,
  Check,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { FileUploader } from '../../../components/common/FileUploader.tsx';
import { Button } from '../../../components/common/Button.tsx';

export const PatientDocumentsPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSimulatingUpload, setIsSimulatingUpload] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [previewModalDoc, setPreviewModalDoc] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadComplete(false);
  };

  const handleSubmitDocument = () => {
    if (!selectedFile) return;
    setIsSimulatingUpload(true);

    // Simulate validation & client-side intake
    setTimeout(() => {
      setIsSimulatingUpload(false);
      setUploadComplete(true);
    }, 700);
  };

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto">
      {/* Page Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-1.5 flex flex-col items-start text-left">
          <div className="w-fit self-start inline-flex items-center justify-start text-left gap-2 text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-3 py-1 rounded-md border border-teal-200/80 mb-1">
            <UploadCloud className="w-3.5 h-3.5 text-teal-600 shrink-0" /> Document Intake Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight text-left">
            Required Clinical Documents
          </h1>
          <p className="text-base text-slate-600 max-w-3xl leading-relaxed">
            Submit requested medical reports, physician notes, or imaging records for your prior authorizations.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl shadow-2xs">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          <div className="text-xs">
            <div className="font-bold text-slate-800">Eleanor Vance</div>
            <div className="text-slate-500 font-mono">Member ID: MEM-941824</div>
          </div>
        </div>
      </div>

      {/* Outstanding Document Request Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-card space-y-6">
        {/* Header with Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Action Required
              </span>
              <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200/80">
                Case AUTH-2026-67
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight pt-1">
              Prior Outpatient Pulmonology Progress Note
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Upload a recent specialist clinic note documenting clinical indication for diagnostic chest imaging.
            </p>
          </div>

          <div className="shrink-0 sm:text-right bg-amber-50/70 border border-amber-200/80 px-4 py-2.5 rounded-xl">
            <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">Submission Deadline</div>
            <div className="text-sm font-extrabold text-amber-950 mt-0.5">Due in 14 business days</div>
          </div>
        </div>

        {/* Quick Requirement Parameters */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 text-xs">
          {/* Requesting Physician */}
          <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-between gap-3 shadow-2xs min-h-[44px] whitespace-nowrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Requesting Physician
            </span>
            <div className="flex items-center gap-1.5 text-slate-800 font-semibold truncate min-w-0">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">Dr. M. Vance (Metro General)</span>
            </div>
          </div>

          {/* Related Procedure */}
          <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-between gap-3 shadow-2xs min-h-[44px] whitespace-nowrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Related Procedure
            </span>
            <span className="text-slate-800 font-semibold truncate text-right min-w-0">
              Chest Radiography (Single View)
            </span>
          </div>

          {/* Accepted Formats */}
          <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-between gap-3 shadow-2xs min-h-[44px] whitespace-nowrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Accepted Formats
            </span>
            <span className="text-slate-800 font-semibold truncate text-right min-w-0">
              PDF, JPG, PNG (Up to 10 MB)
            </span>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="space-y-4 pt-2">
          <FileUploader
            label="Upload Requested Medical Progress Note"
            accept=".pdf,.png,.jpg,.jpeg"
            maxSizeBytes={10 * 1024 * 1024}
            onFileSelect={handleFileSelect}
            helperText="Drag & drop your document or click to browse files from your computer"
          />

          {selectedFile && !uploadComplete && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-teal-50/70 border border-teal-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm sm:text-base">{selectedFile.name}</div>
                  <div className="text-xs text-slate-500 font-mono">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready for transmission
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                isLoading={isSimulatingUpload}
                onClick={handleSubmitDocument}
                leftIcon={<UploadCloud size={18} />}
                className="bg-[#176B68] hover:bg-[#0E4E4C] text-white shadow-xs font-bold px-6 py-2.5 rounded-xl shrink-0"
              >
                Submit Document for Review
              </Button>
            </div>
          )}

          {uploadComplete && (
            <div className="p-4 sm:p-5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3.5 text-emerald-900 shadow-xs" role="status">
              <CheckCircle2 size={24} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <strong className="block font-bold text-base text-emerald-950">
                  Document Successfully Submitted
                </strong>
                <p className="text-emerald-800 text-sm leading-relaxed">
                  Your document <strong>{selectedFile?.name}</strong> has been transmitted and linked to case <strong>AUTH-2026-67</strong>. The medical review team has been notified.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Previously Received Documentation Section */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-card space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-600" /> Verified On File
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Previously Received Documentation
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mt-0.5">
            Diagnostic imaging reports and verified attachments associated with your active coverage records.
          </p>
        </div>

        <div className="space-y-3.5">
          {/* Document 1 */}
          <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-100/60 transition-colors">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 bg-white border border-slate-200 rounded-xl text-teal-700 shadow-2xs shrink-0">
                <FileText size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight truncate">
                  Chest Radiograph Report (PA & Lateral)
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                  Submitted by St. Jude Regional Care &bull; Verified Oct 8, 2026 &bull; Diagnostic Study
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Attached to Claim
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewModalDoc('Chest Radiograph Report (PA & Lateral)')}
                className="gap-1.5 text-slate-700 hover:text-slate-900 border-slate-300"
              >
                <Eye size={15} />
                <span>View</span>
              </Button>
            </div>
          </div>

          {/* Document 2 */}
          <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-100/60 transition-colors">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 bg-white border border-slate-200 rounded-xl text-teal-700 shadow-2xs shrink-0">
                <FileText size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight truncate">
                  Prior Authorization Referral & Clinical Order
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                  Submitted by Metro General Health &bull; Verified Oct 1, 2026 &bull; Intake Documentation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Attached to Claim
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewModalDoc('Prior Authorization Referral & Clinical Order')}
                className="gap-1.5 text-slate-700 hover:text-slate-900 border-slate-300"
              >
                <Eye size={15} />
                <span>View</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Document Viewer Modal */}
      {previewModalDoc && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-teal-700 font-bold text-base">
                <FileText size={18} />
                <span>Document Viewer</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalDoc(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">{previewModalDoc}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                This diagnostic document is securely indexed in the ANVESH clinical imaging repository for Eleanor Vance.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Security Verification:</span>
                <span className="font-bold text-emerald-700">SHA-256 Verified</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Status:</span>
                <span className="font-bold text-slate-800">Linked to Case AUTH-2026-67</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="primary" onClick={() => setPreviewModalDoc(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
