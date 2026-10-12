import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, FileText, Clock, Info } from 'lucide-react';
import { FileUploader } from '../../../components/common/FileUploader.tsx';
import { Button } from '../../../components/common/Button.tsx';

export const PatientDocumentsPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSimulatingUpload, setIsSimulatingUpload] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

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
    }, 800);
  };

  return (
    <div className="portal-page-container">
      <div className="portal-page-header">
        <div>
          <h2>Required Clinical Documents</h2>
          <p className="page-header-sub">
            Upload diagnostic records and medical notes requested by your health plan's prior authorization review team.
          </p>
        </div>
      </div>

      {/* Honest Upload Architecture Notice */}
      <div className="patient-upload-disclaimer clinical-glass" role="status">
        <Info size={20} className="text-info inline-icon" aria-hidden="true" />
        <span>
          <strong>Research Prototype Notice:</strong> The ANVESH backend operates on precomputed multimodal
          research datasets without live cloud document persistence. File validation, drag-and-drop, and
          client-side checks below execute locally for demonstration.
        </span>
      </div>

      {/* Outstanding Document Request Card */}
      <div className="portal-panel clinical-glass mb-6">
        <div className="panel-header">
          <h3>Pending Document Request</h3>
          <span className="badge-caution-inline">Action Needed</span>
        </div>
        <div className="panel-body">
          <div className="requested-doc-box">
            <div className="doc-icon-col">
              <FileText size={32} className="text-teal" />
            </div>
            <div className="doc-meta-col">
              <h4>Prior Outpatient Pulmonology Progress Note</h4>
              <p className="doc-desc">
                Requested by Medical Reviewer for Prior Auth <strong>AUTH-2026-67</strong>.
                Note must be dated within the preceding 12 months and document clinical indication for
                chest imaging (e.g., persistent dyspnea, abnormal auscultation).
              </p>
              <div className="doc-due-line">
                <Clock size={14} className="inline-icon" />
                <span>Requested: Oct 11, 2026 &bull; Due within: 14 business days</span>
              </div>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="doc-upload-form mt-6">
            <FileUploader
              label="Select Document File to Submit"
              accept=".pdf,.png,.jpg,.jpeg"
              maxSizeBytes={10 * 1024 * 1024}
              onFileSelect={handleFileSelect}
              helperText="Accepted formats: PDF or High-Resolution Medical Image (Max 10MB)"
            />

            {selectedFile && !uploadComplete && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  isLoading={isSimulatingUpload}
                  onClick={handleSubmitDocument}
                  leftIcon={<UploadCloud size={16} />}
                >
                  Submit Document for Clinical Review
                </Button>
              </div>
            )}

            {uploadComplete && (
              <div className="upload-success-state clinical-glass mt-4" role="status">
                <CheckCircle2 size={24} className="text-success inline-icon" />
                <div>
                  <strong>Document Upload Recorded (Demonstration Mode)</strong>
                  <p className="text-secondary text-sm">
                    File <em>{selectedFile?.name}</em> verified against format standards and queued for
                    reviewer notification.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Previously Submitted Documents */}
      <div className="portal-panel clinical-glass">
        <div className="panel-header">
          <h3>Previously Received Documentation</h3>
        </div>
        <div className="panel-body">
          <div className="submitted-doc-row">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-teal" />
              <div>
                <span className="font-semibold block">Chest Radiograph Report (PA & Lateral)</span>
                <span className="text-muted text-xs">Submitted by St. Jude Regional Care &bull; Verified Oct 8, 2026</span>
              </div>
            </div>
            <span className="text-success text-xs font-semibold">&bull; Attached to Claim</span>
          </div>
        </div>
      </div>
    </div>
  );
};
