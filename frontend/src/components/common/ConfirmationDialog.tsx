import React, { useEffect } from 'react';
import { X, ShieldCheck, CheckCircle2, XCircle, HelpCircle, Lock, Loader2, ArrowRight } from 'lucide-react';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  caseId?: string;
  disposition?: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message = '',
  confirmLabel = 'Confirm & Save Determination',
  cancelLabel = 'Review Details',
  variant = 'primary',
  isLoading = false,
  caseId,
  disposition,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Extract caseId or disposition if not provided directly
  const extractedDisp = disposition || message.match(/"([^"]+)"/)?.[1] || '';
  const extractedCase = caseId || message.match(/(?:Case|submission)\s+([A-Z0-9_\-]+)/i)?.[1] || '';

  const renderDispositionBadge = (disp: string) => {
    const d = disp.toUpperCase();
    if (d === 'APPROVE' || d === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
          <CheckCircle2 size={13} className="text-emerald-600" />
          Authorized (Covered)
        </span>
      );
    }
    if (d === 'DENY' || d === 'DENIED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200 shadow-2xs">
          <XCircle size={13} className="text-red-600" />
          Denied (Non-Covered)
        </span>
      );
    }
    if (d === 'REQUEST_MORE_INFO' || d === 'ADDITIONAL_INFO_REQUIRED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
          <HelpCircle size={13} className="text-amber-600" />
          Additional Info Required
        </span>
      );
    }
    if (d === 'ESCALATE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs">
          <ArrowRight size={13} className="text-purple-600" />
          Peer Review Escalation
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
        {disp || 'Pending Sign-off'}
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        backgroundColor: 'rgba(15, 23, 42, 0.70)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col confirmation-modal-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          borderRadius: '1rem',
          boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto',
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50/50">
          <div className="flex items-center gap-3">
            <div 
              style={{ backgroundColor: '#F0FDFA', borderColor: '#99F6E4', color: '#0F766E' }}
              className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs"
            >
              <ShieldCheck className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
              <p className="text-[11px] text-slate-500">Payer Clinical Review Sign-off</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Content */}
        <div 
          className="p-6"
          style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Structured Clinical Decision Summary */}
          {(extractedDisp || extractedCase) && (
            <div 
              className="bg-slate-50/90 rounded-xl border border-slate-200/90 shadow-2xs"
              style={{
                padding: '1rem 1.125rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.875rem',
              }}
            >
              {extractedCase && (
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Case Reference</span>
                  <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                    {extractedCase}
                  </span>
                </div>
              )}
              {extractedDisp && (
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Adjudication</span>
                  {renderDispositionBadge(extractedDisp)}
                </div>
              )}
            </div>
          )}

          {/* Confirmation Question */}
          <div style={{ paddingTop: '0.25rem', paddingBottom: '0.125rem' }}>
            <p 
              className="text-sm font-semibold text-slate-800"
              style={{
                fontSize: '0.875rem',
                lineHeight: '1.6',
                color: '#1E293B',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Are you sure you wish to submit this official clinical determination?
            </p>
          </div>

          {/* Audit Notice Box */}
          <div 
            style={{
              padding: '0.875rem 1.125rem',
              backgroundColor: '#F0FDFA',
              borderRadius: '0.75rem',
              border: '1px solid #CCFBF1',
              color: '#134E4A',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              lineHeight: '1.6',
              fontSize: '0.75rem',
            }}
          >
            <Lock className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <span style={{ color: '#134E4A', fontWeight: 500, lineHeight: '1.55' }}>
              This determination will be cryptographically audited and permanently recorded in the payer review log.
            </span>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '0.625rem',
              padding: '0.55rem 1rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
            className="hover:bg-slate-100 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              backgroundColor: variant === 'danger' ? '#DC2626' : '#0F766E',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '0.625rem',
              padding: '0.55rem 1.15rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: variant === 'danger' ? '0 2px 5px rgba(220, 38, 38, 0.3)' : '0 2px 6px rgba(15, 118, 110, 0.35)',
              transition: 'all 0.15s ease',
            }}
            className="hover:brightness-110 active:brightness-95 transition-all text-white"
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin text-white" />
                <span style={{ color: '#FFFFFF' }}>Saving Determination...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} style={{ color: '#FFFFFF' }} />
                <span style={{ color: '#FFFFFF' }}>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
