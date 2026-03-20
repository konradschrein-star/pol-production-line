/**
 * Status Utilities
 * Job status labels and color mappings
 */

export type JobStatus =
  | 'pending'
  | 'analyzing'
  | 'generating_images'
  | 'review_assets'
  | 'rendering'
  | 'completed'
  | 'failed';

export const STATUS_LABELS: Record<JobStatus, string> = {
  pending: 'Pending',
  analyzing: 'Analyzing',
  generating_images: 'Generating',
  review_assets: 'Review',
  rendering: 'Rendering',
  completed: 'Done',
  failed: 'Failed',
};

export const STATUS_COLORS: Record<JobStatus, { bg: string; text: string; border: string }> = {
  pending: {
    bg: 'bg-surface-container',
    text: 'text-on-surface-variant',
    border: 'border-outline-variant'
  },
  analyzing: {
    bg: 'bg-blue-900/30',
    text: 'text-blue-400',
    border: 'border-blue-900/50'
  },
  generating_images: {
    bg: 'bg-orange-900/30',
    text: 'text-orange-400',
    border: 'border-orange-900/50'
  },
  review_assets: {
    bg: 'bg-yellow-900/30',
    text: 'text-yellow-400',
    border: 'border-yellow-900/50'
  },
  rendering: {
    bg: 'bg-blue-900/30',
    text: 'text-blue-400',
    border: 'border-blue-900/50'
  },
  completed: {
    bg: 'bg-green-900/30',
    text: 'text-green-500',
    border: 'border-green-900/50'
  },
  failed: {
    bg: 'bg-red-900/30',
    text: 'text-red-500',
    border: 'border-red-900/50'
  },
};

export function isTerminalStatus(status: JobStatus): boolean {
  return status === 'completed' || status === 'failed';
}
