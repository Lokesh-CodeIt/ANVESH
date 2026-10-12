import { gsap, SplitText } from '../registerGsap.ts';
import { MOTION_TOKENS } from '../tokens.ts';

interface RevealTextOptions {
  duration?: number;
  stagger?: number;
  delay?: number;
  isReducedMotion?: boolean;
  onComplete?: () => void;
}

/**
 * revealText
 * Splits text into lines/words cleanly, animates them into view, and preserves accessibility.
 * Reverts SplitText after animation completes to avoid DOM clutter.
 * Falls back immediately to standard opacity when reduced motion is requested.
 */
export function revealText(
  target: Element | string,
  options: RevealTextOptions = {}
): any {
  if (typeof window === 'undefined') return null;

  const {
    duration = MOTION_TOKENS.durations.reveal,
    stagger = MOTION_TOKENS.staggers.standard,
    delay = 0,
    isReducedMotion = false,
    onComplete,
  } = options;

  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return null;

  // Immediate fallback for reduced motion
  if (isReducedMotion) {
    return gsap.to(el, {
      opacity: 1,
      duration: MOTION_TOKENS.reducedMotion.duration,
      onComplete,
    });
  }

  try {
    if (SplitText) {
      const split = new SplitText(el, {
        type: 'lines,words',
        linesClass: 'anvesh-split-line',
        wordsClass: 'anvesh-split-word',
        aria: 'auto',
      });

      const tl = gsap.timeline({
        delay,
        onComplete: () => {
          try {
            split.revert();
          } catch (_) {}
          if (onComplete) onComplete();
        },
      });

      tl.fromTo(
        split.lines,
        {
          y: MOTION_TOKENS.distances.standard,
          opacity: 0.2,
        },
        {
          y: 0,
          opacity: 1,
          duration,
          stagger,
          ease: MOTION_TOKENS.easings.power2Out,
          clearProps: 'all',
        }
      );

      return tl;
    }
  } catch (err) {
    console.warn('[ANVESH Motion] SplitText fallback:', err);
  }

  // Graceful fallback if SplitText is unavailable or throws
  return gsap.fromTo(
    el,
    { opacity: 0, y: MOTION_TOKENS.distances.standard },
    {
      opacity: 1,
      y: 0,
      duration,
      delay,
      ease: MOTION_TOKENS.easings.power2Out,
      onComplete,
      clearProps: 'transform',
    }
  );
}
