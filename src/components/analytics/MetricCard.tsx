/**
 * Metric Card Component
 *
 * Reusable card for displaying single metrics with trend indicators.
 * Part of modular analytics system for platform-wide use.
 *
 * @module MetricCard
 */

'use client';

import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: string; // Material icon name
  trend?: {
    value: number; // Percentage change
    direction: 'up' | 'down' | 'neutral';
  };
  suffix?: string; // e.g., '%', 'ms', 'MB'
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  default: 'text-white',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
};

const sizeStyles = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-5xl',
};

export function MetricCard({
  label,
  value,
  icon,
  trend,
  suffix,
  variant = 'default',
  size = 'md',
}: MetricCardProps) {
  return (
    <Card variant="default" className="hover:shadow-lg transition-shadow">
      <div className="px-6 py-6 space-y-3">
        {/* Label */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">
            {label}
          </div>
          {icon && (
            <div className="text-outline-variant">
              <Icon name={icon} size="md" />
            </div>
          )}
        </div>

        {/* Value */}
        <div className={`${sizeStyles[size]} font-bold ${variantStyles[variant]} leading-none`}>
          {value}
          {suffix && <span className="text-xl ml-1 text-on-surface-variant">{suffix}</span>}
        </div>

        {/* Trend */}
        {trend && (
          <div className="flex items-center gap-1 text-xs">
            {trend.direction === 'up' && (
              <>
                <Icon name="trending_up" size="sm" className="text-green-400" />
                <span className="text-green-400">+{trend.value}%</span>
              </>
            )}
            {trend.direction === 'down' && (
              <>
                <Icon name="trending_down" size="sm" className="text-red-400" />
                <span className="text-red-400">{trend.value}%</span>
              </>
            )}
            {trend.direction === 'neutral' && (
              <>
                <Icon name="trending_flat" size="sm" className="text-on-surface-variant" />
                <span className="text-on-surface-variant">No change</span>
              </>
            )}
            <span className="text-on-surface-variant ml-1">vs. last period</span>
          </div>
        )}
      </div>
    </Card>
  );
}
