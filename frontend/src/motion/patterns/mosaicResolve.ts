import { gsap } from '../registerGsap.ts';
import { MOTION_TOKENS } from '../tokens.ts';

interface MosaicResolveOptions {
  duration?: number;
  isReducedMotion?: boolean;
  onComplete?: () => void;
}

/**
 * mosaicResolve
 * Handles page and scene transitions: resolves preloader tiles or transitions
 * between views with a max duration of 700ms, adhering to reduced motion settings.
 */
export function mosaicResolve(
  tiles: Element[] | NodeList | string,
  options: MosaicResolveOptions = {}
): any {
  if (typeof window === 'undefined') return null;

  const {
    duration = 0.55, // Strict maximum 700ms
    isReducedMotion = false,
    onComplete,
  } = options;

  if (isReducedMotion) {
    return gsap.to(tiles, {
      opacity: 0,
      duration: MOTION_TOKENS.reducedMotion.duration,
      onComplete,
    });
  }

  const tl = gsap.timeline({ onComplete });

  tl.to(tiles, {
    scale: 0.95,
    opacity: 0,
    duration,
    stagger: {
      grid: 'auto',
      from: 'center',
      amount: 0.2,
    },
    ease: MOTION_TOKENS.easings.power2Out,
    clearProps: 'all',
  });

  return tl;
}
