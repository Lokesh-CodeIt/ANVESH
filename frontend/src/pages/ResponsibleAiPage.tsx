import React from 'react';
import { Breadcrumbs } from '../components/common/Breadcrumbs.tsx';
import { ResponsibleAiScene } from '../scenes/ResponsibleAiScene.tsx';
import { Scale } from 'lucide-react';

interface ResponsibleAiPageProps {
  onNavigate: (path: string) => void;
}

export const ResponsibleAiPage: React.FC<ResponsibleAiPageProps> = ({ onNavigate }) => {
  return (
    <div className="anvesh-content-page">
      <div className="container page-header-container">
        <Breadcrumbs
          items={[
            { label: 'Home', onClick: () => onNavigate('/') },
            { label: 'Responsible AI' },
          ]}
        />
        <h1 className="content-page-title">Responsible AI Architecture</h1>
        <p className="content-page-lead">
          Clinical safety guidelines, algorithmic fairness principles, and strict human-in-the-loop
          constraints implemented across the ANVESH research project.
        </p>
      </div>

      <ResponsibleAiScene />

      <section className="container technical-details-section">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col items-start text-left">
              <div className="w-fit self-start inline-flex items-center justify-start text-left gap-2 text-teal-700 text-xs font-bold uppercase tracking-wider mb-1">
                <Scale size={16} className="text-teal-600 shrink-0" aria-hidden="true" />
                Empirical Evaluation
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Calibration & Verification Standards
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">Standards 01 — 03</span>
          </div>

          <div className="anvesh-horizontal-track gap-6 py-2">
            <div className="shrink-0 w-[300px] sm:w-[330px] bg-slate-50/70 border border-slate-200 rounded-xl p-5 shadow-2xs space-y-2.5">
              <span className="text-[10px] font-bold text-teal-700 uppercase bg-teal-50 px-2 py-0.5 rounded border border-teal-100">Standard 01</span>
              <h3 className="text-base font-bold text-slate-900">Expected Calibration Error (ECE)</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Decision support confidence metrics must reflect empirical reliability. Models are assessed
                against reliability diagrams and low ECE thresholds to ensure confidence scores are not
                overconfident.
              </p>
            </div>

            <div className="shrink-0 w-[290px] sm:w-[320px] bg-slate-50/70 border border-slate-200 rounded-xl p-5 shadow-2xs space-y-2.5">
              <span className="text-[10px] font-bold text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Standard 02</span>
              <h3 className="text-base font-bold text-slate-900">Conflict Precedence</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                When VLM observations disagree with physician notes (<code className="text-mono font-bold text-slate-800">consistency &lt; 0.2</code>),
                the outcome is flagged as <code className="text-mono font-bold text-amber-800">OUTCOME_CONFLICTING_EVIDENCE</code> and
                automatically routed to secondary human review.
              </p>
            </div>

            <div className="shrink-0 w-[290px] sm:w-[320px] bg-slate-50/70 border border-slate-200 rounded-xl p-5 shadow-2xs space-y-2.5">
              <span className="text-[10px] font-bold text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">Standard 03</span>
              <h3 className="text-base font-bold text-slate-900">No Autonomous Actions</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                ANVESH strictly prohibits automated final determinations. All recommendations must be confirmed,
                amended, or rejected by an authenticated clinical reviewer.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
