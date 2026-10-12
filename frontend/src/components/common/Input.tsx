import React, { forwardRef, useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, id, className = '', ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className={`anvesh-form-group ${className}`}>
        {label && (
          <label htmlFor={inputId} className="anvesh-label">
            {label}
            {rest.required && <span className="anvesh-required-mark" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="anvesh-input-wrapper">
          {leftIcon && <span className="anvesh-input-left-icon">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`anvesh-input ${error ? 'anvesh-input-error' : ''} ${leftIcon ? 'has-left-icon' : ''} ${
              rightIcon ? 'has-right-icon' : ''
            }`}
            {...rest}
          />
          {rightIcon && <span className="anvesh-input-right-icon">{rightIcon}</span>}
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

Input.displayName = 'Input';
