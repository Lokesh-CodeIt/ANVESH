import { Flip } from '../registerGsap.ts';
import { MOTION_TOKENS } from '../tokens.ts';

interface FlipExpandOptions {
  duration?: number;
  isReducedMotion?: boolean;
  onComplete?: () => void;
}

/**
 * flipExpand
 * Performs seamless FLIP card expansion / accordion transitions.
 * Falls back to instantaneous or simple opacity transition on reduced motion.
 */
export function flipExpand(
  container: Element,
  stateChanger: () => void,
  options: FlipExpandOptions = {}
): any {
  if (typeof window === 'undefined') {
    stateChanger();
    return null;
  }

  const {
    duration = MOTION_TOKENS.durations.standard,
    isReducedMotion = false,
    onComplete,
  } = options;

  if (isReducedMotion || !Flip) {
    stateChanger();
    if (onComplete) onComplete();
    return null;
  }

  try {
    const state = Flip.getState(container.querySelectorAll('.flip-target, .flip-card'));
    stateChanger();

    return Flip.from(state, {
      duration,
      ease: MOTION_TOKENS.easings.power2Out,
      absolute: false,
      nested: true,
      onComplete,
    });
  } catch (err) {
    console.warn('[ANVESH Motion] Flip fallback:', err);
    stateChanger();
    if (onComplete) onComplete();
    return null;
  }
}
