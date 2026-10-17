import React, { useRef, useEffect } from 'react';
import { Breadcrumbs } from '../components/common/Breadcrumbs.tsx';
import { Button } from '../components/common/Button.tsx';
import { 
  UploadCloud, 
  Cpu, 
  Scale, 
  UserCheck, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface HowItWorksPageProps {
  onNavigate: (path: string) => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onNavigate }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  // Allow touchpad two-finger scroll and mouse wheel to move horizontally
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // If user is scrolling primarily vertically or horizontally, scroll the carousel horizontally
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // Native horizontal trackpad gesture - let it scroll naturally
        return;
      }
      // If user scrolls vertically over this track, map it to horizontal scroll
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollLeftRef.current = scrollContainerRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 350;
      scrollContainerRef.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const steps = [
    {
      step: '1',
      title: 'Upload Radiograph',
      icon: <UploadCloud className="w-6 h-6 text-teal-600" />,
      tag: 'Provider Intake',
      simpleText: 'Hospital physician submits chest X-rays and patient clinical notes.',
    },
    {
      step: '2',
      title: 'Multimodal AI Analysis',
      icon: <Cpu className="w-6 h-6 text-indigo-600" />,
      tag: 'LLaVA-1.5-7B',
      simpleText: 'Fine-tuned vision-language model checks if imaging findings match doctor notes.',
    },
    {
      step: '3',
      title: 'Policy Rule Check',
      icon: <Scale className="w-6 h-6 text-amber-600" />,
      tag: 'Policy Engine',
      simpleText: 'System screens health plan criteria and automatically highlights met & unmet rules.',
    },
    {
      step: '4',
      title: 'Doctor Decides',
      icon: <UserCheck className="w-6 h-6 text-emerald-600" />,
      tag: 'Human Reviewer',
      simpleText: 'A licensed medical reviewer inspects evidence and signs the final decision.',
    },
  ];

  return (
    <div className="anvesh-content-page w-full px-4 sm:px-8 lg:px-12 py-10 space-y-12">
      {/* Header with Horizontal Carousel Controls */}
      <div className="page-header-container space-y-4">
        <Breadcrumbs
          items={[
            { label: 'Home', onClick: () => onNavigate('/') },
            { label: 'How It Works' },
          ]}
        />
        <div className="inline-flex items-center justify-start text-left gap-2 px-3.5 py-1.5 bg-teal-50 text-teal-800 rounded-lg text-xs font-bold uppercase tracking-wider border border-teal-200 w-fit self-start shadow-2xs">
          <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
          <span>Transparent 4-Stage Operational Flow</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-1">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              How ANVESH Works
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-4xl leading-relaxed mt-2">
              From hospital radiograph intake through multimodal vision-language verification to final human physician sign-off.
            </p>
          </div>

          {/* Carousel Arrows */}
          <div className="flex items-center gap-3 shrink-0 pb-1">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="w-11 h-11 rounded-full border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-xs transition-all hover:border-slate-400 cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="w-11 h-11 rounded-full border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-xs transition-all hover:border-slate-400 cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Clean Visual Steps (Spacious Horizontally Scrollable Track) */}
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="anvesh-horizontal-track gap-8 py-4"
      >
        {steps.map((s, idx) => (
          <div
            key={idx}
            className="carousel-card-lg bg-white border border-slate-200/90 rounded-2xl p-8 shadow-xs flex flex-col justify-between hover:border-teal-400 hover:shadow-lg transition-all select-none space-y-6"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="clinical-step-badge">
                  {s.step}
                </span>
                <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
                  {s.tag}
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl w-fit">
                {s.icon}
              </div>

              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{s.title}</h2>

              <p className="text-sm text-slate-600 leading-relaxed">
                {s.simpleText}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 text-xs font-semibold text-teal-700 flex items-center gap-1.5">
              <span>Stage 0{s.step} Verified</span> &rarr;
            </div>
          </div>
        ))}
      </div>

      {/* 3 Simple Platform Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-600" /> Evidence Scoring
          </div>
          <h3 className="text-base font-bold text-slate-900">Consistency + Support</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Checks if what the doctor described in notes matches what is seen on the chest radiograph.
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-amber-600" /> Quality Safeguard
          </div>
          <h3 className="text-base font-bold text-slate-900">40% Grounding Cap</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            If an X-ray is submitted with no doctor clinical notes, the score is capped to avoid blind guesses.
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Human in the Loop
          </div>
          <h3 className="text-base font-bold text-slate-900">No Auto-Denials</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            AI never approves or denies insurance claims. A licensed physician always makes the final call.
          </p>
        </div>
      </div>


    </div>
  );
};

export default HowItWorksPage;
