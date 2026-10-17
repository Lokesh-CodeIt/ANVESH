import React, { useState } from 'react';
import { 
  ArrowRight, 
  ShieldCheck, 
  FileCheck,
  CheckCircle2,
} from 'lucide-react';

interface HeroSceneProps {
  onExplore: () => void;
  onHowItWorks: () => void;
}

export const HeroScene: React.FC<HeroSceneProps> = ({ onExplore, onHowItWorks }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Subtle interactive mouse parallax effect for depth
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const x = ((clientX - left) / width - 0.5) * 12;
    const y = ((clientY - top) / height - 0.5) * 12;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  return (
    <section className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">
      {/* Modern Medical SaaS Split Hero Container */}
      <div 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
          borderRadius: '2.25rem',
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)',
          border: '1px solid #E2E8F0',
        }}
        className="overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] transition-all duration-300"
      >
        
        {/* Left Side: Clean Editorial Clinical Architecture (7 cols) */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-14 flex flex-col justify-between space-y-8 bg-transparent">
          {/* Top Brand Pill with Subtle Status Pulse */}
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-lg text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
              ANVESH Clinical
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-teal-50 text-teal-800 font-bold border border-teal-200/80 shadow-2xs">
              MedAuth VLM Engine
            </span>
          </div>

          {/* Main Hero Headline & Value Proposition */}
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.12]">
              Verify medical claims & prior authorizations in just a few clicks
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              Connect high-resolution diagnostic imaging, fine-tuned multimodal vision-language representations, and clinical policy criteria into an intelligent, physician-in-the-loop review workspace.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <button
              type="button"
              onClick={onExplore}
              style={{
                background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
                boxShadow: '0 4px 14px rgba(13, 148, 136, 0.28)',
              }}
              className="h-11 px-6 hover:brightness-105 active:scale-[0.98] text-white font-semibold rounded-lg text-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm border border-transparent"
            >
              <span>Inspect Workflow</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onHowItWorks}
              className="h-11 px-6 bg-slate-50 hover:bg-slate-100/90 active:scale-[0.98] text-slate-700 hover:text-slate-900 font-semibold rounded-lg text-sm border border-slate-200/90 transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs"
            >
              <span>How It Works</span>
            </button>
          </div>

          {/* Quick Stats Micro Row */}
          <div className="flex flex-wrap items-center gap-6 pt-1 text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-teal-600" /> 100% Licensed Physician Gate
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-800">
              <FileCheck className="w-4 h-4 text-emerald-600" /> 2,107 Verified Studies
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Indiana Univ. Open-i Cohort
            </span>
          </div>
        </div>

        {/* Right Side: Clean, Standalone Doctor Visual (NO badges, NO buttons, NO overlays) */}
        <div 
          style={{
            background: 'linear-gradient(145deg, #134E4A 0%, #0F3B39 100%)',
          }}
          className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-center items-center relative overflow-hidden"
        >
          {/* Subtle Ambient Background Radial Glow */}
          <div 
            style={{
              background: 'radial-gradient(circle, rgba(20, 184, 166, 0.22) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
            className="absolute inset-0 pointer-events-none"
          />

          {/* Clean Standalone Doctor Frame with Soft Parallax */}
          <div 
            style={{
              transform: `translate3d(${mousePos.x}px, ${mousePos.y}px, 0)`,
              transition: 'transform 0.15s ease-out',
            }}
            className="w-full max-w-sm sm:max-w-md flex items-center justify-center relative z-10"
          >
            {/* Elegant Rounded Image Container with Smooth Shadow */}
            <div 
              style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 8px 20px rgba(0, 0, 0, 0.25)',
                borderRadius: '2rem',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
              className="w-full aspect-[4/5] overflow-hidden bg-slate-900/30 flex items-center justify-center"
            >
              <img
                src="/hero_doctor.jpg"
                alt="Clinical Physician Reviewer"
                className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-700 ease-out select-none pointer-events-none"
              />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default HeroScene;
