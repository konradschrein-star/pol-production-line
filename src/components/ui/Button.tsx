import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
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
  // Base styles - brutalist, 0px radius
  const baseStyles = 'font-bold uppercase tracking-widest transition-all duration-75 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

  // Variant styles
  const variantStyles = {
    primary: 'bg-primary text-on-primary hover:bg-on-primary hover:text-primary border border-primary',
    secondary: 'bg-transparent text-primary border border-primary hover:bg-primary hover:text-on-primary',
    ghost: 'bg-transparent text-on-surface hover:bg-surface-container border border-transparent hover:border-outline-variant',
  };

  // Size styles
  const sizeStyles = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
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
