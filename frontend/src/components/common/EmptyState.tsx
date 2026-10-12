import React from 'react';
import { FileQuestion } from 'lucide-react';
import { Button } from './Button.tsx';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Records Found',
  description = 'There are no items matching your criteria or currently available in the dataset.',
  actionLabel,
  onAction,
  icon,
  className = '',
}) => {
  return (
    <div className={`anvesh-empty-state ${className}`}>
      <div className="empty-state-icon-wrapper">
        {icon || <FileQuestion size={40} className="empty-state-icon" aria-hidden="true" />}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" onClick={onAction} className="empty-state-btn">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
