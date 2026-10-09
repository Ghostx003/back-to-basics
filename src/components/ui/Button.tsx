import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] select-none';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 h-8',
    md: 'text-sm px-3.5 py-2 gap-2 h-9',
    lg: 'text-base px-5 py-2.5 gap-2.5 h-11',
  }[size];

  const variantClasses = {
    primary:
      'bg-primary text-white hover:bg-primary-hover shadow-sm shadow-indigo-500/10 disabled:opacity-50 disabled:pointer-events-none',
    secondary:
      'bg-surface-subtle text-text-primary hover:bg-surface-elevated border border-surface-border disabled:opacity-50 disabled:pointer-events-none',
    outline:
      'bg-transparent text-text-primary hover:bg-surface-subtle border border-surface-border hover:border-surface-hover disabled:opacity-50 disabled:pointer-events-none',
    danger:
      'bg-accent-rose/10 text-accent-rose hover:bg-accent-rose/20 border border-accent-rose/30 disabled:opacity-50 disabled:pointer-events-none',
    ghost:
      'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-subtle disabled:opacity-50 disabled:pointer-events-none',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
