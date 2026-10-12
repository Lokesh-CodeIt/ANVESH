import { gsap } from '../registerGsap.ts';
import { MOTION_TOKENS } from '../tokens.ts';

interface PanelToggleOptions {
  isOpen: boolean;
  duration?: number;
  isReducedMotion?: boolean;
  onComplete?: () => void;
}

/**
 * panelToggle
 * Smoothly expands or collapses a panel's height, managing overflow and visibility.
 */
export function panelToggle(
  element: HTMLElement,
  options: PanelToggleOptions
): any {
  if (typeof window === 'undefined' || !element) return null;

  const {
    isOpen,
    duration = MOTION_TOKENS.durations.standard,
    isReducedMotion = false,
    onComplete,
  } = options;

  if (isReducedMotion) {
    element.style.height = isOpen ? 'auto' : '0px';
    element.style.opacity = isOpen ? '1' : '0';
    element.style.display = isOpen ? 'block' : 'none';
    if (onComplete) onComplete();
    return null;
  }

  if (isOpen) {
    element.style.display = 'block';
    element.style.height = 'auto';
    const targetHeight = element.scrollHeight;
    element.style.height = '0px';

    return gsap.to(element, {
      height: targetHeight,
      opacity: 1,
      duration,
      ease: MOTION_TOKENS.easings.power2Out,
      onComplete: () => {
        element.style.height = 'auto';
        if (onComplete) onComplete();
      },
    });
  } else {
    return gsap.to(element, {
      height: 0,
      opacity: 0,
      duration,
      ease: MOTION_TOKENS.easings.power2Out,
      onComplete: () => {
        element.style.display = 'none';
        if (onComplete) onComplete();
      },
    });
  }
}
