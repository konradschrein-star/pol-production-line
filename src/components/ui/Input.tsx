import React from 'react';

interface InputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'email';
  disabled?: boolean;
  error?: string;
  className?: string;
  maxLength?: number;
}

export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  error,
  className = '',
  maxLength,
}: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      className={`
        w-full bg-surface-container-low text-on-surface
        border ${error ? 'border-red-500' : 'border-outline-variant/50'}
        focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20
        rounded-md px-4 py-2.5 text-sm
        placeholder:text-on-surface-variant/60
        transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    />
  );
}

export default Input;
