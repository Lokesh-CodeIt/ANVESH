import React, { useRef, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Eye, CheckCircle2, UserCheck, ChevronLeft, ChevronRight, Lock } from 'lucide-react';

export const ResponsibleAiScene: React.FC = () => {
  const pillarsScrollRef = useRef<HTMLDivElement>(null);
  const layersScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const attachWheelForwarding = (el: HTMLDivElement | null) => {
      if (!el) return () => {};
      const handleWheel = (e: WheelEvent) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        if (e.deltaY !== 0) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      };
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    };

    const cleanupLayers = attachWheelForwarding(layersScrollRef.current);
    const cleanupPillars = attachWheelForwarding(pillarsScrollRef.current);
    return () => {
      cleanupLayers();
      cleanupPillars();
    };
  }, []);

  const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = 340;
      ref.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const pillars = [
    {
      icon: <Eye size={20} className="text-teal-600" aria-hidden="true" />,
      tag: 'Grounded Evidence',
      title: 'Explainability & Grounding',
      text: 'Every extracted clinical observation links directly to explicit source documentation or imaging features. If source text is missing, evidence scores are strictly capped at 40%.',
    },
    {
      icon: <AlertTriangle size={20} className="text-amber-600" aria-hidden="true" />,
      tag: 'Conflict Safeguard',
      title: 'Uncertainty & Conflict Handling',
      text: 'When clinical findings or VLM extractions conflict with physician reports, ANVESH triggers an explicit OUTCOME_CONFLICTING_EVIDENCE rather than guessing.',
    },
    {
      icon: <CheckCircle2 size={20} className="text-emerald-600" aria-hidden="true" />,
      tag: 'Mandatory Human Gate',
      title: 'Human-in-the-Loop Oversight',
      text: 'The platform acts exclusively as decision support. No claim denials or approvals are issued autonomously. All decisions are signed, timestamped, and audited by human reviewers.',
    },
    {
      icon: <Lock size={20} className="text-indigo-600" aria-hidden="true" />,
      tag: 'Auditable Log',
      title: 'Cryptographic Provenance',
      text: 'Every model inference, rule verification, and reviewer interaction generates an immutable audit record with cryptographic hash integrity.',
    },
  ];

  return (
    <section className="anvesh-responsible-ai-section" aria-labelledby="responsible-ai-heading">
      <div className="container responsible-ai-container space-y-10">
        <div className="section-header text-center max-w-3xl mx-auto">
          <span className="section-eyebrow">Ethical Architecture</span>
          <h2 id="responsible-ai-heading" className="section-title">
            Responsible AI & Clinical Safety Principles
          </h2>
          <p className="section-subtitle">
            Engineered from first principles to prevent algorithmic rubber-stamping, hallucinated approvals,
            and unverified coverage determinations.
          </p>
        </div>

        {/* Central Core Rule Banner */}
        <div className="safety-principle-banner clinical-glass" role="region" aria-label="Core Safety Rule">
          <div className="banner-icon-box">
            <ShieldAlert size={32} className="text-critical" aria-hidden="true" />
          </div>
          <div className="banner-text-box">
            <h3 className="banner-rule-title">Core Safety Invariant</h3>
            <p className="banner-rule-text">
              “A high evidence score never overrides a policy exclusion.”
            </p>
            <p className="banner-rule-sub">
              Even if multimodal imaging findings present strong clinical consistency (e.g. 95%), an
              applicable policy exclusion, unverified beneficiary eligibility, or conflicting finding
              strictly halts automated progression and demands comprehensive human review.
            </p>
          </div>
        </div>

        {/* Decoupled Three Layers Demonstration with Touchpad Horizontal Scroll */}
        <div className="responsible-layers-demonstration bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4" aria-label="Illustrative Three Layers Decoupling">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="illustrative-badge">Illustrative representation &bull; Decoupled Architecture</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Multi-Tier Separation of Concern</h3>
              <p className="text-xs sm:text-sm text-slate-500">Swipe horizontally or use arrows to inspect how clinical evidence is segregated from coverage policy.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => scrollContainer(layersScrollRef, 'left')}
                className="w-9 h-9 rounded-full border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-2xs transition-all cursor-pointer"
                aria-label="Scroll layers left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => scrollContainer(layersScrollRef, 'right')}
                className="w-9 h-9 rounded-full border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-2xs transition-all cursor-pointer"
                aria-label="Scroll layers right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            ref={layersScrollRef}
            className="anvesh-horizontal-track gap-4 py-2"
          >
            {/* Layer 1: Neutral Evidence */}
            <div className="carousel-card-md bg-slate-50/70 border border-slate-200 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
                  <Eye size={18} aria-hidden="true" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Layer 1: Clinical Findings</h4>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">Evidence Consistency: <span className="font-mono text-teal-700 font-bold">88.4%</span></div>
                <p className="text-xs text-slate-500 leading-relaxed">Extracted anatomical observations strictly mapped to chest radiograph findings.</p>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">Neutral Observation</span>
              </div>
            </div>

            {/* Separator Barrier */}
            <div className="shrink-0 flex items-center justify-center px-1">
              <span className="px-2.5 py-1 text-[11px] font-mono font-bold text-amber-800 bg-amber-50 rounded border border-amber-200">≠ NO MERGE</span>
            </div>

            {/* Layer 2: Policy Criteria */}
            <div className="carousel-card-md bg-amber-50/40 border border-amber-200 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <AlertTriangle size={18} aria-hidden="true" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Layer 2: Policy Criteria</h4>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-amber-800">Status: <span className="font-bold">Exclusion Flagged</span></div>
                <p className="text-xs text-slate-600 leading-relaxed">Unmet prior authorization requirement or pre-existing condition rule.</p>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">Strict Dominance</span>
              </div>
            </div>

            {/* Separator Barrier */}
            <div className="shrink-0 flex items-center justify-center px-1">
              <span className="px-2.5 py-1 text-[11px] font-mono font-bold text-indigo-800 bg-indigo-50 rounded border border-indigo-200">→ GATES</span>
            </div>

            {/* Layer 3: Human Adjudication */}
            <div className="carousel-card-md bg-indigo-50/40 border border-indigo-200 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <UserCheck size={18} aria-hidden="true" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Layer 3: Human Adjudication</h4>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-indigo-900">Routing: <span className="font-bold font-mono">MANUAL_REVIEW</span></div>
                <p className="text-xs text-slate-600 leading-relaxed">Credentialed Medical Director examines case records before determination.</p>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200">Licensed Physician Gate</span>
              </div>
            </div>
          </div>
        </div>

        {/* Responsible AI Pillars with Horizontal Touchpad Scroll Track */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Ethical Pillars & Guarantees</h3>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => scrollContainer(pillarsScrollRef, 'left')}
                className="w-9 h-9 rounded-full border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-2xs transition-all cursor-pointer"
                aria-label="Scroll pillars left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => scrollContainer(pillarsScrollRef, 'right')}
                className="w-9 h-9 rounded-full border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-2xs transition-all cursor-pointer"
                aria-label="Scroll pillars right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            ref={pillarsScrollRef}
            className="anvesh-horizontal-track gap-6 py-2"
          >
            {pillars.map((p, idx) => (
              <div
                key={idx}
                className="carousel-card-md bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all select-none"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      {p.icon}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-full">
                      {p.tag}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{p.title}</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {p.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

