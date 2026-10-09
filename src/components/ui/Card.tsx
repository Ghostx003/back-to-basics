import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantClasses = {
    default: 'bg-surface border border-surface-border',
    elevated: 'bg-surface-elevated border border-surface-border shadow-lg shadow-black/30',
    subtle: 'bg-surface-subtle border border-surface-border/60',
  }[variant];

  return (
    <div className={`rounded-xl p-5 ${variantClasses} ${className}`} {...props}>
      {children}
    </div>
  );
};
