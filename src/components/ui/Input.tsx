import React from 'react';

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'email';
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  error,
  className = '',
}: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`
        w-full bg-surface-container-lowest text-on-surface
        border-b-2 ${error ? 'border-error' : 'border-outline'}
        focus:border-primary focus:outline-none
        px-0 py-3 text-sm
        transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    />
  );
}

export default Input;
