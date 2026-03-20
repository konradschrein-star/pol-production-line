import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  type = 'button',
  className = '',
}: ButtonProps) {
  // Notion-like clean button styles
  const baseStyles = 'font-medium rounded-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2';

  // Variant styles - cleaner, more subtle
  const variantStyles = {
    primary: 'bg-primary text-on-primary hover:bg-opacity-90',
    secondary: 'bg-surface-container-high text-on-surface border border-outline-variant/50 hover:border-outline-variant hover:bg-surface-bright',
    ghost: 'bg-transparent text-on-surface hover:bg-surface-container-low',
  };

  // Size styles with better spacing
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export default Button;
