import React from 'react';

interface IconProps {
  name: string; // Material Symbols icon name
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Icon({ name, size = 'md', className = '' }: IconProps) {
  const sizeMap = {
    sm: 'text-base', // 16px
    md: 'text-xl',   // 20px
    lg: 'text-2xl',  // 24px
    xl: 'text-4xl',  // 32px
  };

  return (
    <span className={`material-symbols-outlined ${sizeMap[size]} ${className}`}>
      {name}
    </span>
  );
}

export default Icon;
