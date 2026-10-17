import React, { useRef } from 'react';
import { UserCheck, Building2, Shield, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/common/Button.tsx';

interface AudiencesSceneProps {
  onSelectRole: (role: 'patient' | 'provider' | 'insurance') => void;
}

export const AudiencesScene: React.FC<AudiencesSceneProps> = ({ onSelectRole }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 380;
      scrollContainerRef.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const audiences = [
    {
      id: 'insurance' as const,
      title: 'Insurance Review Teams',
      badge: 'Payer Adjudication',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
      icon: <Shield size={26} className="text-teal-700" aria-hidden="true" />,
      tagline: 'Objective, explainable evidence review for human medical reviewers.',
      description:
        'Equip medical directors and clinical reviewers with side-by-side policy comparisons, grounded evidence summaries, exclusion screening, and conflict warnings for thorough, human-led decisions.',
      features: [
        'Side-by-side policy criteria vs. clinical evidence',
        'Strict exclusion overrides preventing false coverage',
        'Conflict & contradiction warning indicators',
        'One-click adjudication decision recording & audit log',
      ],
      portalCta: 'Launch Insurance Reviewer Portal',
    },
    {
      id: 'provider' as const,
      title: 'Hospitals & Providers',
      badge: 'Clinical Submissions',
      badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      icon: <Building2 size={26} className="text-indigo-600" aria-hidden="true" />,
      tagline: 'Accelerating prior authorization with automated evidence pre-screening.',
      description:
        'Submit digital clinical evidence and run instant pre-submission checks against insurer policies. Identify missing clinical records or policy exclusions before formal submission, reducing denial cycles.',
      features: [
        'Chest radiograph DICOM & indication notes ingestion',
        'Pre-submission policy eligibility checklist',
        'Automated detection of missing source documentation',
        'Direct tracking of reviewer status & document requests',
      ],
      portalCta: 'Launch Hospital Provider Portal',
    },
    {
      id: 'patient' as const,
      title: 'Patients / Members',
      badge: 'Member Self-Service',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: <UserCheck size={26} className="text-emerald-600" aria-hidden="true" />,
      tagline: 'Demystifying prior authorization with clear, transparent status.',
      description:
        'Track claim review progress in plain language. Understand what medical evidence was evaluated, view policy criteria milestones, and obtain clear explanations when further documentation is requested.',
      features: [
        'Plain-language claim status timeline & tracking',
        'Transparent medical evidence review summary',
        'Direct notice if physician records are missing',
        'Secure upload portal for requested documents',
      ],
      portalCta: 'Launch Patient Member Portal',
    },
  ];

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" aria-labelledby="audiences-heading">
      {/* Header with Horizontal Carousel Navigation Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div className="flex flex-col items-start text-left">
          <span className="w-fit self-start inline-flex items-center justify-start text-left text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-3 py-1 rounded-md border border-teal-200/80 mb-2">
            Target Stakeholders & Portals
          </span>
          <h2 id="audiences-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Tailored Experiences for Every Participant
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-1 max-w-2xl">
            Swipe or scroll horizontally to explore role-specific workflows and launch preview access.
          </p>
        </div>

        {/* Scroll Arrows */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="w-10 h-10 rounded-full border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-2xs transition-all hover:border-slate-400 cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="w-10 h-10 rounded-full border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-2xs transition-all hover:border-slate-400 cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Horizontally Scrollable Carousel Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-6 overflow-x-auto pb-6 pt-2 scroll-smooth snap-x snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {audiences.map((aud) => (
          <div
            key={aud.id}
            className="snap-start shrink-0 w-[340px] sm:w-[380px] bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${aud.badgeColor}`}>
                  {aud.badge}
                </span>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  {aud.icon}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">{aud.title}</h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{aud.tagline}</p>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                {aud.description}
              </p>

              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Core Capabilities:
                </span>
                <ul className="space-y-1.5 list-none p-0 m-0">
                  {aud.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={15} className="text-teal-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-100">
              <Button
                variant="primary"
                size="md"
                rightIcon={<ArrowRight size={16} />}
                onClick={() => onSelectRole(aud.id)}
                className="w-full justify-center bg-[#176B68] hover:bg-[#0E4E4C] text-white font-semibold shadow-xs"
              >
                {aud.portalCta}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
export default AudiencesScene;
