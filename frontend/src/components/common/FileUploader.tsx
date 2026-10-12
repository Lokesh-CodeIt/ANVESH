import React, { useState, useRef, forwardRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  label?: string;
  accept?: string;
  maxSizeBytes?: number; // Default 10MB
  onFileSelect?: (file: File) => void;
  helperText?: string;
  error?: string;
  className?: string;
}

export const FileUploader = forwardRef<HTMLDivElement, FileUploaderProps>(
  (
    {
      label = 'Upload Medical Evidence Document',
      accept = '.pdf,.png,.jpg,.jpeg,.dicom',
      maxSizeBytes = 10 * 1024 * 1024,
      onFileSelect,
      helperText = 'Accepted: PDF, PNG, JPG, DICOM (Max 10MB)',
      error: externalError,
      className = '',
    },
    ref
  ) => {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [internalError, setInternalError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeError = externalError || internalError;

    const validateAndSetFile = (file: File) => {
      setInternalError(null);
      if (file.size > maxSizeBytes) {
        setInternalError(`File size exceeds limit (${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB).`);
        return;
      }
      setSelectedFile(file);
      if (onFileSelect) onFileSelect(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = () => {
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        validateAndSetFile(e.dataTransfer.files[0]);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        validateAndSetFile(e.target.files[0]);
      }
    };

    return (
      <div ref={ref} className={`anvesh-file-uploader-group ${className}`}>
        {label && <label className="anvesh-label">{label}</label>}
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload file area"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`anvesh-dropzone ${isDragging ? 'is-dragging' : ''} ${activeError ? 'has-error' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            style={{ display: 'none' }}
          />

          {selectedFile ? (
            <div className="dropzone-file-selected">
              <CheckCircle2 size={32} className="text-success" aria-hidden="true" />
              <div className="dropzone-file-info">
                <span className="file-name">{selectedFile.name}</span>
                <span className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          ) : (
            <div className="dropzone-content">
              <UploadCloud size={36} className="dropzone-icon" aria-hidden="true" />
              <p className="dropzone-prompt">
                <strong>Click to select file</strong> or drag & drop here
              </p>
              <p className="dropzone-helper">{helperText}</p>
            </div>
          )}
        </div>

        {activeError ? (
          <p className="anvesh-field-error" role="alert">
            <AlertCircle size={14} className="inline-icon" aria-hidden="true" /> {activeError}
          </p>
        ) : null}
      </div>
    );
  }
);

FileUploader.displayName = 'FileUploader';
