import React, { useRef } from 'react';
import { useGsapContext } from '../motion/hooks/useGsapContext.ts';
import { ScrollTrigger, gsap } from '../motion/registerGsap.ts';

interface RiseOverSceneProps {
  children?: React.ReactNode;
}

export const RiseOverScene: React.FC<RiseOverSceneProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGsapContext(
    ({ isReducedMotion, isPaused }) => {
      if (isReducedMotion || isPaused || !ScrollTrigger) return;

      const el = containerRef.current;
      if (!el) return;

      gsap.fromTo(
        el,
        { y: 30, opacity: 0.9 },
        {
          y: 0,
          opacity: 1,
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            end: 'top 50%',
            scrub: 0.5,
          },
        }
      );
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="anvesh-rise-over-wrapper">
      {children}
    </div>
  );
};
