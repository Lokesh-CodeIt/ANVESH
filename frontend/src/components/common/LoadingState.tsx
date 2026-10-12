import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
  variant?: 'spinner' | 'skeleton';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading clinical data...',
  className = '',
  variant = 'spinner',
}) => {
  if (variant === 'skeleton') {
    return (
      <div className={`anvesh-skeleton-container ${className}`} role="status" aria-busy="true">
        <span className="sr-only">{message}</span>
        <div className="anvesh-skeleton-line skeleton-title" />
        <div className="anvesh-skeleton-line skeleton-text" />
        <div className="anvesh-skeleton-line skeleton-text short" />
      </div>
    );
  }

  return (
    <div className={`anvesh-loading-state ${className}`} role="status" aria-busy="true">
      <Loader2 size={32} className="anvesh-spinner" aria-hidden="true" />
      <p className="loading-message">{message}</p>
    </div>
  );
};
