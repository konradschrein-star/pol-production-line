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
          w-full bg-surface-container-lowest text-on-surface font-mono
          border-b-2 ${error ? 'border-error' : 'border-outline'}
          focus:border-primary focus:outline-none
          px-4 py-3 text-sm resize-none
          transition-colors duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
      />
      {maxLength && (
        <p className="font-mono text-[9px] text-on-surface-variant mt-1">
          {value.length} / {maxLength} characters
        </p>
      )}
    </div>
  );
}

export default TextArea;
