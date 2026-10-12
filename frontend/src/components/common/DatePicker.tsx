import React, { forwardRef, useId } from 'react';
import { Calendar } from 'lucide-react';

interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, error, helperText, id, className = '', ...rest }, ref) => {
    const generatedId = useId();
    const dateId = id || generatedId;
    const errorId = `${dateId}-error`;
    const helperId = `${dateId}-helper`;

    return (
      <div className={`anvesh-form-group ${className}`}>
        {label && (
          <label htmlFor={dateId} className="anvesh-label">
            {label}
            {rest.required && <span className="anvesh-required-mark" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="anvesh-input-wrapper">
          <input
            ref={ref}
            id={dateId}
            type="date"
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`anvesh-input has-right-icon ${error ? 'anvesh-input-error' : ''}`}
            {...rest}
          />
          <span className="anvesh-input-right-icon">
            <Calendar size={18} aria-hidden="true" />
          </span>
        </div>
        {error && (
          <p id={errorId} className="anvesh-field-error" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="anvesh-field-helper">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
