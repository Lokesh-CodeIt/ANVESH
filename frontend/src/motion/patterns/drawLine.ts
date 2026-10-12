import { gsap, DrawSVGPlugin } from '../registerGsap.ts';
import { MOTION_TOKENS } from '../tokens.ts';

interface DrawLineOptions {
  duration?: number;
  delay?: number;
  isReducedMotion?: boolean;
  onComplete?: () => void;
}

/**
 * drawLine
 * Animates the clinical Evidence Thread SVG path into view.
 * Utilizes DrawSVGPlugin when available or native strokeDashoffset fallback.
 */
export function drawLine(
  target: SVGPathElement | SVGElement | string,
  options: DrawLineOptions = {}
): any {
  if (typeof window === 'undefined') return null;

  const {
    duration = MOTION_TOKENS.durations.reveal,
    delay = 0,
    isReducedMotion = false,
    onComplete,
  } = options;

  const el = typeof target === 'string' ? document.querySelector<SVGElement>(target) : target;
  if (!el) return null;

  if (isReducedMotion) {
    if (el instanceof SVGGeometryElement) {
      el.style.strokeDasharray = 'none';
      el.style.strokeDashoffset = '0';
    }
    return gsap.to(el, { opacity: 1, duration: MOTION_TOKENS.reducedMotion.duration, onComplete });
  }

  try {
    if (DrawSVGPlugin) {
      return gsap.fromTo(
        el,
        { drawSVG: '0%' },
        {
          drawSVG: '100%',
          duration,
          delay,
          ease: MOTION_TOKENS.easings.power2InOut,
          onComplete,
        }
      );
    }
  } catch (err) {
    console.warn('[ANVESH Motion] DrawSVGPlugin fallback:', err);
  }

  // Native SVG stroke-dasharray fallback
  if (el instanceof SVGGeometryElement) {
    const length = el.getTotalLength ? el.getTotalLength() : 500;
    el.style.strokeDasharray = `${length}`;
    el.style.strokeDashoffset = `${length}`;

    return gsap.to(el, {
      strokeDashoffset: 0,
      duration,
      delay,
      ease: MOTION_TOKENS.easings.power2InOut,
      onComplete,
    });
  }

  return gsap.to(el, { opacity: 1, duration, delay, onComplete });
}
