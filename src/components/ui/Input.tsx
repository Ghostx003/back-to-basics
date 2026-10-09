import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  rightElement,
  className = '',
  id,
  ...props
}) => {
  const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={generatedId}
          className="block text-xs font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          id={generatedId}
          className={`w-full bg-surface-subtle border ${
            error
              ? 'border-accent-rose focus:border-accent-rose focus:ring-accent-rose/20'
              : 'border-surface-border focus:border-primary focus:ring-primary-glow'
          } rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:bg-surface ${
            rightElement ? 'pr-10' : ''
          } ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-2 flex items-center">{rightElement}</div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-accent-rose font-medium animate-fadeIn">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-text-muted">{helperText}</p>
      ) : null}
    </div>
  );
};
