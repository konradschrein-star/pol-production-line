/**
 * Progress Bar Component
 *
 * Displays a horizontal progress bar with percentage and optional time estimate
 */

import { Icon } from './Icon';

interface ProgressBarProps {
  percentage: number;           // 0-100
  label?: string;                // Optional label text
  timeRemaining?: string;        // Optional time estimate (e.g., "5m 30s")
  showPercentage?: boolean;      // Show percentage number (default: true)
  size?: 'sm' | 'md' | 'lg';    // Size variant
  variant?: 'default' | 'success' | 'warning' | 'error';
  animated?: boolean;            // Animate the progress bar
  className?: string;
}

export function ProgressBar({
  percentage,
  label,
  timeRemaining,
  showPercentage = true,
  size = 'md',
  variant = 'default',
  animated = true,
  className = '',
}: ProgressBarProps) {
  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  // Size classes
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  // Variant colors
  const variantClasses = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Header with label and stats */}
      {(label || timeRemaining || showPercentage) && (
        <div className="flex items-center justify-between mb-2 text-xs">
          {label && (
            <div className="flex items-center gap-2 text-on-surface-variant">
              {animated && <Icon name="autorenew" size="sm" className="animate-spin" />}
              <span>{label}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-on-surface-variant font-mono">
            {timeRemaining && (
              <span className="flex items-center gap-1">
                <Icon name="schedule" size="sm" />
                {timeRemaining}
              </span>
            )}
            {showPercentage && (
              <span className="font-semibold text-white">{clampedPercentage}%</span>
            )}
          </div>
        </div>
      )}

      {/* Progress bar track */}
      <div className={`bg-surface-container-high rounded-full overflow-hidden ${sizeClasses[size]}`}>
        {/* Progress bar fill */}
        <div
          className={`${variantClasses[variant]} ${sizeClasses[size]} rounded-full transition-all duration-500 ease-out ${
            animated ? 'animate-pulse' : ''
          }`}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
    </div>
  );
}
