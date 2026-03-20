import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'low' | 'high' | 'bright';
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function Card({ children, variant = 'default', className = '', onClick }: CardProps) {
  // Surface elevation via background shifts (no borders)
  const variantStyles = {
    default: 'bg-surface-container',
    low: 'bg-surface-container-low',
    high: 'bg-surface-container-high',
    bright: 'bg-surface-bright',
  };

  return (
    <div
      className={`${variantStyles[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export default Card;
