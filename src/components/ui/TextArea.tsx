import React from 'react';

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  error?: string;
  className?: string;
  maxLength?: number;
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
  disabled = false,
  error,
  className = '',
  maxLength,
}: TextAreaProps) {
  return (
    <div className="w-full">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        maxLength={maxLength}
        className={`
          w-full bg-surface-container-low text-on-surface
          border ${error ? 'border-red-500' : 'border-outline-variant/50'}
          focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20
          rounded-md px-4 py-3 text-sm resize-none leading-relaxed
          transition-all duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          placeholder:text-on-surface-variant/60
          ${className}
        `}
      />
      {maxLength && (
        <p className="text-xs text-on-surface-variant mt-2">
          {value.length} / {maxLength} characters
        </p>
      )}
    </div>
  );
}

export default TextArea;
