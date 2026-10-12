import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { gsap } from '../../motion/registerGsap.ts';
import { useMotionPreferences } from '../../context/MotionPreferencesContext.tsx';
import { MOTION_TOKENS } from '../../motion/tokens.ts';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const { isReducedMotion } = useMotionPreferences();

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      // Entrance animation
      if (overlayRef.current && cardRef.current) {
        if (isReducedMotion) {
          overlayRef.current.style.opacity = '1';
          cardRef.current.style.opacity = '1';
        } else {
          gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
          gsap.fromTo(
            cardRef.current,
            { opacity: 0, scale: 0.96, y: 8 },
            { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: MOTION_TOKENS.easings.power2Out }
          );
        }
      }

      // Focus first actionable element inside modal
      setTimeout(() => {
        const focusable = cardRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable && focusable.length > 0) {
          focusable[0].focus();
        }
      }, 50);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (previouslyFocusedElement.current) {
          previouslyFocusedElement.current.focus();
        }
      };
    }
  }, [isOpen, onClose, isReducedMotion]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="anvesh-modal-overlay"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="presentation"
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
        className={`anvesh-modal-card anvesh-modal-${size}`}
      >
        <div className="anvesh-modal-header">
          <div>
            <h2 id="modal-title" className="anvesh-modal-title">
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="anvesh-modal-description">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="anvesh-modal-close"
            aria-label="Close dialog"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="anvesh-modal-body">{children}</div>

        {footer && <div className="anvesh-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};
