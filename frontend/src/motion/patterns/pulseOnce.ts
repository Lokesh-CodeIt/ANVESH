import { gsap } from '../registerGsap.ts';
import { MOTION_TOKENS } from '../tokens.ts';

interface PulseOnceOptions {
  duration?: number;
  scale?: number;
  isReducedMotion?: boolean;
  onComplete?: () => void;
}

/**
 * pulseOnce
 * Restrained single-pulse notification for state changes or highlights.
 * NEVER creates an infinite loop or celebratory animation.
 */
export function pulseOnce(
  element: Element | string,
  options: PulseOnceOptions = {}
): any {
  if (typeof window === 'undefined') return null;

  const {
    duration = MOTION_TOKENS.durations.standard,
    scale = 1.025,
    isReducedMotion = false,
    onComplete,
  } = options;

  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (!el || isReducedMotion) {
    if (onComplete) onComplete();
    return null;
  }

  const tl = gsap.timeline({ onComplete });

  tl.to(el, {
    scale,
    duration: duration / 2,
    ease: MOTION_TOKENS.easings.power2Out,
  }).to(el, {
    scale: 1,
    duration: duration / 2,
    ease: MOTION_TOKENS.easings.power2InOut,
    clearProps: 'transform',
  });

  return tl;
}
