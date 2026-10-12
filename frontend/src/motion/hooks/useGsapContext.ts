import { useLayoutEffect, useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '../registerGsap.ts';
import { usePrefersReducedMotion } from './usePrefersReducedMotion.ts';
import { usePauseAnimations } from './usePauseAnimations.ts';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface UseGsapContextOptions {
  scope?: React.RefObject<Element | null>;
  dependencies?: any[];
  revertOnUpdate?: boolean;
}

/**
 * Lifecycle-safe GSAP context hook.
 * Automatically cleans up all animations, timelines, and ScrollTriggers on unmount or dependency update.
 * Passes reduced motion and pause states to the animation factory.
 */
export function useGsapContext(
  animationCreator: (context: {
    isReducedMotion: boolean;
    isPaused: boolean;
    ctx: any;
  }) => void | (() => void),
  options: UseGsapContextOptions = {}
) {
  const { scope, dependencies = [], revertOnUpdate = true } = options;
  const isReducedMotion = usePrefersReducedMotion();
  const [isPaused] = usePauseAnimations();
  const cleanupRef = useRef<(() => void) | void>(undefined);

  useIsomorphicLayoutEffect(() => {
    const scopeEl = scope?.current || undefined;

    let ctx: any = null;
    try {
      ctx = gsap.context((self: any) => {
        try {
          cleanupRef.current = animationCreator({
            isReducedMotion,
            isPaused,
            ctx: self,
          });
        } catch (animErr) {
          console.warn('[ANVESH Motion] Animation creator error (graceful fallback):', animErr);
        }
      }, scopeEl);
    } catch (gsapErr) {
      console.warn('[ANVESH Motion] GSAP context creation failed (graceful fallback):', gsapErr);
      try {
        cleanupRef.current = animationCreator({
          isReducedMotion: true,
          isPaused: true,
          ctx: null,
        });
      } catch (_) {}
    }

    return () => {
      if (typeof cleanupRef.current === 'function') {
        try {
          cleanupRef.current();
        } catch (e) {
          console.warn('[ANVESH Motion] Error in custom animation cleanup:', e);
        }
      }
      if (ctx && typeof ctx.revert === 'function') {
        try {
          ctx.revert();
        } catch (e) {
          console.warn('[ANVESH Motion] Error reverting GSAP context:', e);
        }
      }
      // Ensure any ScrollTriggers within this scope are removed
      if (ScrollTrigger && typeof (ScrollTrigger as any).refresh === 'function') {
        try {
          (ScrollTrigger as any).refresh();
        } catch (_) {}
      }
    };
  }, [isReducedMotion, isPaused, ...(revertOnUpdate ? dependencies : [])]);
}
