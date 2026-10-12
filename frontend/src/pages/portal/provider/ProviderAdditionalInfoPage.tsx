import React, { useState } from 'react';
import { 
  ArrowLeft, 
  AlertCircle, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Send,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { Button } from '../../../components/shared/Button';

interface ProviderAdditionalInfoProps {
  caseId?: string;
  onBack: () => void;
}

export const ProviderAdditionalInfoPage: React.FC<ProviderAdditionalInfoProps> = ({ 
  caseId = 'CASE_000001', 
  onBack 
}) => {
  const [responseNotes, setResponseNotes] = useState('');
  const [files, setFiles] = useState<{ name: string; size: string }[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const added = Array.from(e.target.files).map(f => ({
        name: f.name,
        size: `${(f.size / 1024).toFixed(0)} KB`
      }));
      setFiles(prev => [...prev, ...added]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-600 hover:text-slate-900 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="h-4 w-px bg-slate-300" />
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Additional Clinical Documentation & Clarification
        </h1>
      </div>

      {/* Case Identifier Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-500 block">Associated Authorization Case</span>
          <span className="font-mono font-bold text-slate-900 text-sm">{caseId}</span>
        </div>
        <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-800 font-semibold rounded-full border border-amber-200 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> Due within 5 Business Days
        </span>
      </div>

      {/* Payer Request Explanation */}
      <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
          <AlertCircle className="w-4 h-4 text-amber-700" /> Payer Clinical Inquiry: Clarification on Pleural Effusion History
        </div>
        <p className="text-xs text-amber-800 leading-relaxed">
          The medical reviewer has requested prior chest imaging comparisons (within the preceding 6–12 months) 
          or attending pulmonology consultation notes to verify whether the blunted left costophrenic angle 
          represents acute pleural effusion or chronic pleural thickening.
        </p>
      </div>

      {submitted ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Additional Information Staged</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Clinical clarification notes and {files.length} attached document(s) have been attached to case {caseId}.
          </p>
          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 font-mono">
            Status: PENDING_PAYER_RESUMPTION • Staged on {new Date().toLocaleDateString()}
          </div>
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={onBack}>
              Return to Case Workspace
            </Button>
          </div>
        </div>
      ) : (
        /* Form */
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Attending Clinical Clarification / Response Notes
            </label>
            <textarea
              rows={4}
              required
              value={responseNotes}
              onChange={e => setResponseNotes(e.target.value)}
              placeholder="Provide clinical details regarding prior history, clinical response, or radiographic context..."
              className="w-full p-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 leading-relaxed font-sans"
            />
          </div>

          {/* Upload Box */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Attach Supporting Records (.pdf, .dcm, .jpg)
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50/50">
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
              <div className="text-xs text-slate-600 mb-2">Drag files here or browse from local device</div>
              <label className="inline-block">
                <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                <span className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-sm">
                  Select Documents
                </span>
              </label>
            </div>

            {files.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {files.map((f, i) => (
                  <div key={i} className="p-2.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-800 font-medium">
                      <FileText className="w-4 h-4 text-teal-600" /> {f.name}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">{f.size}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Appeals Capability Truth Note */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
            <strong>Formal Appeal Boundary:</strong> Formal second-level external appeals and independent physician dispute resolution are governed by state insurance commission timelines. The current ANVESH research node supports supplemental evidence submission only.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onBack}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || !responseNotes.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5"
            >
              {submitting ? 'Transmitting Response...' : (
                <>
                  <Send className="w-3.5 h-3.5" /> Submit Response to Payer
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
export default ProviderAdditionalInfoPage;
