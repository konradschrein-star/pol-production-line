import React from 'react';

type JobStatus =
  | 'pending'
  | 'analyzing'
  | 'generating_images'
  | 'review_assets'
  | 'rendering'
  | 'completed'
  | 'failed';

interface BadgeProps {
  status: JobStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ status, size = 'sm', className = '' }: BadgeProps) {
  // Status color mappings
  const statusStyles: Record<JobStatus, string> = {
    pending: 'bg-surface-container text-on-surface-variant border-outline-variant',
    analyzing: 'bg-blue-900/30 text-blue-400 border-blue-900/50',
    generating_images: 'bg-orange-900/30 text-orange-400 border-orange-900/50',
    review_assets: 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50',
    rendering: 'bg-blue-900/30 text-blue-400 border-blue-900/50',
    completed: 'bg-green-900/30 text-green-500 border-green-900/50',
    failed: 'bg-red-900/30 text-red-500 border-red-900/50',
  };

  // Status labels
  const statusLabels: Record<JobStatus, string> = {
    pending: 'PENDING',
    analyzing: 'ANALYZING',
    generating_images: 'GENERATING',
    review_assets: 'REVIEW',
    rendering: 'RENDERING',
    completed: 'DONE',
    failed: 'FAILED',
  };

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[9px]',
    md: 'px-2 py-1 text-[11px]',
  };

  return (
    <span
      className={`
        font-mono font-black uppercase tracking-wide border
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
