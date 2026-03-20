'use client';

import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card';

interface ErrorDisplayProps {
  error: string;
  code?: string;
  solution?: string;
  details?: string;
  onRetry?: () => void;
  variant?: 'inline' | 'card';
}

/**
 * ErrorDisplay Component
 * Displays errors with actionable solutions
 */
export function ErrorDisplay({
  error,
  code,
  solution,
  details,
  onRetry,
  variant = 'inline',
}: ErrorDisplayProps) {
  const content = (
    <div className="flex items-start gap-4">
      {/* Error Icon */}
      <div className="flex-shrink-0">
        <Icon name="error" size="lg" className="text-red-500" />
      </div>

      {/* Error Content */}
      <div className="flex-1 space-y-2">
        {/* Error Message */}
        <div className="font-bold text-white text-sm">
          {error}
        </div>

        {/* Error Code (if available) */}
        {code && (
          <div className="text-xs text-on-surface-variant font-mono">
            Error Code: {code}
          </div>
        )}

        {/* Solution (if available) */}
        {solution && (
          <div className="mt-3 p-3 bg-surface-container-lowest border-l-2 border-yellow-500">
            <div className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-1">
              How to Fix
            </div>
            <div className="text-sm text-on-surface">
              {solution}
            </div>
          </div>
        )}

        {/* Technical Details (if in development) */}
        {details && process.env.NODE_ENV === 'development' && (
          <details className="mt-2">
            <summary className="text-xs text-on-surface-variant cursor-pointer hover:text-white">
              Technical Details
            </summary>
            <div className="mt-2 p-2 bg-surface-container-lowest font-mono text-xs text-on-surface-variant overflow-x-auto">
              {details}
            </div>
          </details>
        )}

        {/* Retry Button (if provided) */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 px-4 py-2 bg-red-500 text-black font-bold text-sm uppercase tracking-wider hover:bg-red-400 transition-colors"
          >
            RETRY
          </button>
        )}
      </div>
    </div>
  );

  if (variant === 'card') {
    return (
      <Card variant="default" className="border-2 border-red-500">
        <div className="p-6">
          {content}
        </div>
      </Card>
    );
  }

  return (
    <div className="p-4 bg-red-900/20 border border-red-500">
      {content}
    </div>
  );
}
