import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'low' | 'high' | 'bright';
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function Card({ children, variant = 'default', className = '', onClick }: CardProps) {
  // Notion-like clean cards with subtle borders and shadows
  const variantStyles = {
    default: 'bg-surface-container border border-outline-variant/30',
    low: 'bg-surface-container-low border border-outline-variant/20',
    high: 'bg-surface-container-high border border-outline-variant/40',
    bright: 'bg-surface-bright border border-outline-variant/50',
  };

  return (
    <div
      className={`rounded-lg ${variantStyles[variant]} ${className} ${
        onClick ? 'cursor-pointer hover:border-outline-variant/60 transition-all duration-200' : ''
      }`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export default Card;
