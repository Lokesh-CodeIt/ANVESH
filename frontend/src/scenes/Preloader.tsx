import React, { useEffect, useState, useRef } from 'react';
import { gsap, DrawSVGPlugin } from '../motion/registerGsap.ts';
import { useMotionPreferences } from '../context/MotionPreferencesContext.tsx';

interface PreloaderProps {
  onComplete: () => void;
}

const SESSION_PRELOADER_KEY = 'anvesh_preloader_seen';

export const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const { isReducedMotion, isAnimationsPaused } = useMotionPreferences();

  const [shouldRender, setShouldRender] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hasSeen = sessionStorage.getItem(SESSION_PRELOADER_KEY) === 'true';
    return !hasSeen;
  });

  useEffect(() => {
    if (isReducedMotion || isAnimationsPaused || !shouldRender) {
      onComplete();
      return;
    }

    // 2. Set absolute timeout guard (max 1.1s)
    const fallbackTimeout = setTimeout(() => {
      finishPreloader();
    }, 1100);

    // 3. GSAP Timeline Sequence (snappy 0.8s)
    let ctx: any = null;
    try {
      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          onComplete: () => {
            finishPreloader();
          },
        });

        const dots = containerRef.current?.querySelectorAll('.preloader-dot');
        const tiles = containerRef.current?.querySelectorAll('.preloader-tile');

        // 1. Dots appear & expand into grid
        if (dots && dots.length > 0) {
          tl.fromTo(
            dots,
            { scale: 0, opacity: 0 },
            {
              scale: 1,
              opacity: 0.8,
              duration: 0.25,
              stagger: {
                grid: [5, 7],
                from: 'center',
                amount: 0.15,
              },
              ease: 'power2.out',
            }
          );
        }

        // 2. Fine Evidence Thread draws through grid
        if (pathRef.current) {
          if (DrawSVGPlugin) {
            tl.fromTo(
              pathRef.current,
              { drawSVG: '0%' },
              { drawSVG: '100%', duration: 0.3, ease: 'power2.inOut' },
              '-=0.1'
            );
          } else {
            tl.fromTo(
              pathRef.current,
              { opacity: 0 },
              { opacity: 1, duration: 0.25 },
              '-=0.1'
            );
          }
        }

        // 3. Grid tiles fade/recede to reveal ivory hero
        if (tiles && tiles.length > 0) {
          tl.to(
            tiles,
            {
              opacity: 0,
              scale: 0.95,
              duration: 0.25,
              stagger: {
                grid: [5, 7],
                from: 'edges',
                amount: 0.15,
              },
              ease: 'power2.inOut',
            },
            '+=0.05'
          );
        }

        // Fade out container
        tl.to(containerRef.current, {
          opacity: 0,
          duration: 0.2,
          ease: 'power1.out',
        });
      }, containerRef);
    } catch (err) {
      console.warn('[ANVESH Preloader] GSAP context failed, finishing immediately:', err);
      finishPreloader();
    }

    function finishPreloader() {
      sessionStorage.setItem(SESSION_PRELOADER_KEY, 'true');
      setShouldRender(false);
      onComplete();
    }

    return () => {
      clearTimeout(fallbackTimeout);
      if (ctx && typeof ctx.revert === 'function') {
        try {
          ctx.revert();
        } catch (_) {}
      }
    };
  }, [isReducedMotion, isAnimationsPaused, shouldRender, onComplete]);

  if (!shouldRender) return null;

  // 35 dots for standard desktop, responsive grid
  const dotCount = 35;

  return (
    <div
      ref={containerRef}
      className="anvesh-preloader-overlay"
      role="progressbar"
      aria-label="Loading ANVESH Clinical Research Platform"
      onClick={() => {
        sessionStorage.setItem(SESSION_PRELOADER_KEY, 'true');
        setShouldRender(false);
        onComplete();
      }}
      style={{ cursor: 'pointer' }}
    >
      <div className="preloader-grid">
        {Array.from({ length: dotCount }).map((_, i) => (
          <div key={i} className="preloader-tile">
            <span className="preloader-dot" />
          </div>
        ))}
      </div>

      <svg className="preloader-svg-layer" viewBox="0 0 600 200" fill="none">
        <path
          ref={pathRef}
          d="M 50 100 Q 150 40 300 100 T 550 100"
          stroke="#5CC4CC"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
