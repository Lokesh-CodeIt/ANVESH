import React, { forwardRef } from 'react';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion.ts';
import { usePauseAnimations } from './hooks/usePauseAnimations.ts';

interface AccessibleAnimationWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
  fallbackStyle?: React.CSSProperties;
}

/**
 * AccessibleAnimationWrapper
 * Guarantees that children are immediately rendered and visible.
 * Applies data attributes for reduced motion and paused states so CSS can also adapt.
 */
export const AccessibleAnimationWrapper = forwardRef<HTMLDivElement, AccessibleAnimationWrapperProps>(
  ({ children, as: Component = 'div', className = '', fallbackStyle, ...rest }, ref) => {
    const isReducedMotion = usePrefersReducedMotion();
    const [isPaused] = usePauseAnimations();

    return (
      <Component
        ref={ref}
        className={`anvesh-motion-wrapper ${className}`}
        data-reduced-motion={isReducedMotion ? 'true' : 'false'}
        data-animations-paused={isPaused ? 'true' : 'false'}
        style={{
          visibility: 'visible',
          opacity: 1,
          ...fallbackStyle,
        }}
        {...rest}
      >
        {children}
      </Component>
    );
  }
);

AccessibleAnimationWrapper.displayName = 'AccessibleAnimationWrapper';
