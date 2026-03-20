import React from 'react';

type JobStatus =
  | 'pending'
  | 'analyzing'
  | 'generating_images'
  | 'review_assets'
  | 'rendering'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface BadgeProps {
  status: JobStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ status, size = 'sm', className = '' }: BadgeProps) {
  // Modern status color mappings with rounded corners
  const statusStyles: Record<JobStatus, string> = {
    pending: 'bg-surface-container-high text-on-surface-variant border-outline-variant',
    analyzing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    generating_images: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    review_assets: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    rendering: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
    cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  // More readable status labels (not all caps)
  const statusLabels: Record<JobStatus, string> = {
    pending: 'Pending',
    analyzing: 'Analyzing',
    generating_images: 'Generating',
    review_assets: 'Review',
    rendering: 'Rendering',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`
        font-medium tracking-wide border rounded-full inline-block
        ${statusStyles[status]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {statusLabels[status]}
    </span>
  );
}

export default Badge;
