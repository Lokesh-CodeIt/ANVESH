import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { gsap } from '../../motion/registerGsap.ts';
import { useMotionPreferences } from '../../context/MotionPreferencesContext.tsx';
import { MOTION_TOKENS } from '../../motion/tokens.ts';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  position?: 'right' | 'left';
  size?: 'sm' | 'md' | 'lg';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  size = 'md',
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { isReducedMotion } = useMotionPreferences();

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

      if (overlayRef.current && panelRef.current) {
        if (isReducedMotion) {
          overlayRef.current.style.opacity = '1';
          panelRef.current.style.transform = 'none';
        } else {
          gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
          const xOffset = position === 'right' ? '100%' : '-100%';
          gsap.fromTo(
            panelRef.current,
            { x: xOffset },
            { x: '0%', duration: 0.3, ease: MOTION_TOKENS.easings.power2Out }
          );
        }
      }

      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose, position, isReducedMotion]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="anvesh-drawer-overlay"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={`anvesh-drawer-panel drawer-${position} drawer-${size}`}
      >
        <div className="anvesh-drawer-header">
          <h2 id="drawer-title" className="anvesh-drawer-title">
            {title}
          </h2>
          <button onClick={onClose} className="anvesh-drawer-close" aria-label="Close drawer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="anvesh-drawer-body">{children}</div>
      </div>
    </div>
  );
};
