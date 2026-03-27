'use client';

import React from 'react';
import { Toast } from '@/lib/hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const typeStyles = {
    error: 'bg-red-500/90 border-red-600',
    success: 'bg-green-500/90 border-green-600',
    info: 'bg-blue-500/90 border-blue-600',
    warning: 'bg-yellow-500/90 border-yellow-600',
  };

  const typeIcons = {
    error: '❌',
    success: '✅',
    info: 'ℹ️',
    warning: '⚠️',
  };

  return (
    <div
      className={`
        ${typeStyles[toast.type]}
        border rounded-lg shadow-lg
        px-4 py-3
        flex items-start gap-3
        text-white
        animate-slide-in-right
        min-w-[300px]
      `}
      role="alert"
      aria-live="assertive"
    >
      <span className="text-xl flex-shrink-0">{typeIcons[toast.type]}</span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
        aria-label="Dismiss notification"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
