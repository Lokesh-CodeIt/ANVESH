import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  UserCheck,
  Info,
} from 'lucide-react';

export type StatusVariant =
  | 'info'
  | 'success'
  | 'caution'
  | 'critical'
  | 'OUTCOME_COVERED'
  | 'OUTCOME_NOT_COVERED'
  | 'OUTCOME_EXCLUDED'
  | 'OUTCOME_CONFLICTING_EVIDENCE'
  | 'OUTCOME_INSUFFICIENT_INFORMATION'
  | 'OUTCOME_UNKNOWN_POLICY'
  | 'OUTCOME_MANUAL_REVIEW_REQUIRED';

interface StatusBadgeProps {
  status: StatusVariant | string;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  className = '',
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'OUTCOME_COVERED':
      case 'success':
      case 'Approved':
      case 'Covered':
        return {
          variantClass: 'badge-success',
          icon: <CheckCircle2 size={14} aria-hidden="true" />,
          defaultText: 'Covered',
        };

      case 'OUTCOME_NOT_COVERED':
      case 'Denied':
      case 'Not Covered':
        return {
          variantClass: 'badge-critical',
          icon: <XCircle size={14} aria-hidden="true" />,
          defaultText: 'Not Covered',
        };

      case 'OUTCOME_EXCLUDED':
        return {
          variantClass: 'badge-critical',
          icon: <XCircle size={14} aria-hidden="true" />,
          defaultText: 'Policy Exclusion',
        };

      case 'OUTCOME_CONFLICTING_EVIDENCE':
      case 'critical':
        return {
          variantClass: 'badge-critical',
          icon: <AlertCircle size={14} aria-hidden="true" />,
          defaultText: 'Conflicting Evidence',
        };

      case 'OUTCOME_INSUFFICIENT_INFORMATION':
      case 'caution':
        return {
          variantClass: 'badge-caution',
          icon: <AlertTriangle size={14} aria-hidden="true" />,
          defaultText: 'Insufficient Information',
        };

      case 'OUTCOME_UNKNOWN_POLICY':
        return {
          variantClass: 'badge-info',
          icon: <HelpCircle size={14} aria-hidden="true" />,
          defaultText: 'Unknown Policy',
        };

      case 'OUTCOME_MANUAL_REVIEW_REQUIRED':
      case 'Pending':
        return {
          variantClass: 'badge-caution',
          icon: <UserCheck size={14} aria-hidden="true" />,
          defaultText: 'Manual Review Required',
        };

      case 'info':
      default:
        return {
          variantClass: 'badge-info',
          icon: <Info size={14} aria-hidden="true" />,
          defaultText: status,
        };
    }
  };

  const { variantClass, icon, defaultText } = getBadgeConfig();

  return (
    <span className={`anvesh-status-badge ${variantClass} badge-${size} ${className}`}>
      <span className="badge-icon">{icon}</span>
      <span className="badge-text">{label || defaultText}</span>
    </span>
  );
};
