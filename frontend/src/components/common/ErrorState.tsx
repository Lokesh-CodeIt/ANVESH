import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button.tsx';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Service Interruption',
  message = 'An unexpected issue occurred while communicating with the service. Please verify your connection or try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`anvesh-error-state ${className}`} role="alert">
      <div className="error-icon-wrapper">
        <AlertCircle size={40} className="error-icon" aria-hidden="true" />
      </div>
      <h3 className="error-title">{title}</h3>
      <p className="error-message">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          leftIcon={<RotateCcw size={16} aria-hidden="true" />}
          onClick={onRetry}
          className="error-retry-btn"
        >
          Retry Request
        </Button>
      )}
    </div>
  );
};
