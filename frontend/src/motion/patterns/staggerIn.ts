import { gsap } from '../registerGsap.ts';
import { MOTION_TOKENS } from '../tokens.ts';

interface StaggerInOptions {
  duration?: number;
  stagger?: number;
  yOffset?: number;
  delay?: number;
  isReducedMotion?: boolean;
  onComplete?: () => void;
}

/**
 * staggerIn
 * Staggers in cards, list items, or metrics with restrained offset (8-16px) and duration.
 */
export function staggerIn(
  targets: Element[] | NodeList | string,
  options: StaggerInOptions = {}
): any {
  if (typeof window === 'undefined') return null;

  const {
    duration = MOTION_TOKENS.durations.standard,
    stagger = MOTION_TOKENS.staggers.standard,
    yOffset = MOTION_TOKENS.distances.standard,
    delay = 0,
    isReducedMotion = false,
    onComplete,
  } = options;

  if (isReducedMotion) {
    return gsap.to(targets, {
      opacity: 1,
      duration: MOTION_TOKENS.reducedMotion.duration,
      onComplete,
    });
  }

  return gsap.fromTo(
    targets,
    { opacity: 0, y: yOffset },
    {
      opacity: 1,
      y: 0,
      duration,
      stagger,
      delay,
      ease: MOTION_TOKENS.easings.power2Out,
      clearProps: 'transform',
      onComplete,
    }
  );
}
