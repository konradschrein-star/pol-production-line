/**
 * Progress Calculation Utilities
 *
 * Estimates job progress percentage and time remaining based on:
 * - Current job status
 * - Scene completion count
 * - Historical average timings
 * - Created/updated timestamps
 */

import type { JobStatus } from './status';

// Historical average timings (in seconds) - based on production metrics
const AVERAGE_TIMINGS = {
  analyzing: 45,              // Script analysis: 30-60s
  generating_images: 1200,    // 8 scenes × 150s = 20 minutes
  review_assets: 0,           // Manual pause - no time estimate
  rendering: 150,             // 60s video = ~2.5 minutes
};

// Progress percentage weights for each stage
const STAGE_WEIGHTS = {
  pending: 0,
  analyzing: 10,              // 10% complete
  generating_images: 40,      // 40% complete (analyzing done + partial images)
  review_assets: 70,          // 70% complete (all images done)
  rendering: 90,              // 90% complete (approved, rendering)
  completed: 100,
  failed: 0,
  cancelled: 0,
};

export interface ProgressInfo {
  percentage: number;           // 0-100
  status: JobStatus;
  estimatedSecondsRemaining: number | null;  // null if can't estimate
  estimatedCompletionTime: Date | null;
  isActive: boolean;            // true if job is actively processing
  stage: string;                // Human-readable stage name
}

export interface Job {
  id: string;
  status: JobStatus;
  created_at: string;
  updated_at?: string;
}

export interface JobWithScenes extends Job {
  total_scenes?: number;
  completed_scenes?: number;
}

/**
 * Calculate progress for a single job
 */
export function calculateJobProgress(job: JobWithScenes): ProgressInfo {
  const status = job.status;
  const basePercentage = STAGE_WEIGHTS[status] || 0;

  // Check if job is actively processing
  const isActive = ['analyzing', 'generating_images', 'rendering'].includes(status);

  // Calculate more granular percentage for generating_images stage
  let percentage = basePercentage;
  if (status === 'generating_images' && job.total_scenes && job.completed_scenes !== undefined) {
    const sceneProgress = (job.completed_scenes / job.total_scenes) * 30; // 30% range for images
    percentage = 10 + sceneProgress; // 10% (analyzing done) + scene progress
  }

  // Calculate estimated time remaining
  let estimatedSecondsRemaining: number | null = null;
  let estimatedCompletionTime: Date | null = null;

  if (isActive) {
    const createdAt = new Date(job.created_at).getTime();
    const now = Date.now();
    const elapsedSeconds = (now - createdAt) / 1000;

    switch (status) {
      case 'analyzing':
        // Use average time, adjusted by elapsed time
        estimatedSecondsRemaining = Math.max(0, AVERAGE_TIMINGS.analyzing - elapsedSeconds);
        break;

      case 'generating_images':
        if (job.total_scenes && job.completed_scenes !== undefined) {
          const remainingScenes = job.total_scenes - job.completed_scenes;
          const avgSecondsPerScene = job.completed_scenes > 0
            ? elapsedSeconds / job.completed_scenes  // Use actual timing
            : 150;  // Fallback: 2.5 min per scene
          estimatedSecondsRemaining = remainingScenes * avgSecondsPerScene;
        } else {
          // Fallback to average
          estimatedSecondsRemaining = Math.max(0, AVERAGE_TIMINGS.generating_images - elapsedSeconds);
        }
        break;

      case 'rendering':
        estimatedSecondsRemaining = Math.max(0, AVERAGE_TIMINGS.rendering - elapsedSeconds);
        break;
    }

    if (estimatedSecondsRemaining !== null) {
      estimatedCompletionTime = new Date(now + estimatedSecondsRemaining * 1000);
    }
  }

  // Get human-readable stage name
  const stageNames: Record<JobStatus, string> = {
    pending: 'Queued',
    analyzing: 'Analyzing script',
    generating_images: 'Generating images',
    review_assets: 'Awaiting review',
    rendering: 'Rendering video',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };

  return {
    percentage: Math.min(100, Math.max(0, Math.round(percentage))),
    status,
    estimatedSecondsRemaining,
    estimatedCompletionTime,
    isActive,
    stage: stageNames[status],
  };
}

/**
 * Calculate overall progress for multiple jobs
 */
export function calculateOverallProgress(jobs: JobWithScenes[]): {
  overallPercentage: number;
  totalEstimatedSecondsRemaining: number;
  activeJobsCount: number;
  completedJobsCount: number;
  failedJobsCount: number;
} {
  if (jobs.length === 0) {
    return {
      overallPercentage: 0,
      totalEstimatedSecondsRemaining: 0,
      activeJobsCount: 0,
      completedJobsCount: 0,
      failedJobsCount: 0,
    };
  }

  let totalPercentage = 0;
  let totalEstimatedSeconds = 0;
  let activeJobsCount = 0;
  let completedJobsCount = 0;
  let failedJobsCount = 0;

  jobs.forEach(job => {
    const progress = calculateJobProgress(job);
    totalPercentage += progress.percentage;

    if (progress.isActive) {
      activeJobsCount++;
      if (progress.estimatedSecondsRemaining !== null) {
        totalEstimatedSeconds += progress.estimatedSecondsRemaining;
      }
    }

    if (job.status === 'completed') completedJobsCount++;
    if (job.status === 'failed') failedJobsCount++;
  });

  return {
    overallPercentage: Math.round(totalPercentage / jobs.length),
    totalEstimatedSecondsRemaining: totalEstimatedSeconds,
    activeJobsCount,
    completedJobsCount,
    failedJobsCount,
  };
}

/**
 * Format seconds into human-readable time estimate
 */
export function formatTimeRemaining(seconds: number | null): string {
  if (seconds === null || seconds < 0) return '--';

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
}

/**
 * Format completion time as relative or absolute
 */
export function formatCompletionTime(date: Date | null): string {
  if (!date) return '--';

  const now = Date.now();
  const completionTime = date.getTime();
  const diffSeconds = Math.floor((completionTime - now) / 1000);

  if (diffSeconds < 60) {
    return 'in < 1 min';
  } else if (diffSeconds < 3600) {
    return `in ${Math.floor(diffSeconds / 60)} min`;
  } else {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
