import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  children?: React.ReactNode;
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  error,
  className = '',
  children,
}: SelectProps) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`
        w-full bg-surface-container-lowest text-on-surface
        border-b-2 ${error ? 'border-error' : 'border-outline'}
        focus:border-primary focus:outline-none
        px-0 py-3 text-sm uppercase font-bold
        transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        appearance-none cursor-pointer
        ${className}
      `}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children || options?.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default Select;
