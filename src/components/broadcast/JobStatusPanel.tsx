'use client';

import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { calculateJobProgress, formatTimeRemaining, formatCompletionTime } from '@/lib/utils/progress';
import type { JobStatus } from '@/lib/utils/status';

interface JobStatusPanelProps {
  job: {
    id: string;
    status: JobStatus;
    created_at: string;
    updated_at?: string;
    error_message?: string;
    total_scenes?: number;
    completed_scenes?: number;
  };
}

export function JobStatusPanel({ job }: JobStatusPanelProps) {
  // Calculate progress
  const progress = calculateJobProgress({
    ...job,
    total_scenes: job.total_scenes,
    completed_scenes: job.completed_scenes,
  });

  return (
    <div className="bg-surface-container border-b border-outline-variant p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider">
            JOB {job.id.slice(0, 8)}
          </h1>
          <Badge status={job.status} />
        </div>
        <div className="text-xs font-mono text-on-surface-variant">
          Created <RelativeTime timestamp={job.created_at} className="inline" />
          {job.updated_at && (
            <>
              {' • Updated '}
              <RelativeTime timestamp={job.updated_at} className="inline" />
            </>
          )}
        </div>
      </div>

      {/* Progress Bar - Show for active jobs */}
      {progress.isActive && (
        <div className="mb-4">
          <ProgressBar
            percentage={progress.percentage}
            label={progress.stage}
            timeRemaining={formatTimeRemaining(progress.estimatedSecondsRemaining)}
            size="md"
            animated={true}
          />
          {progress.estimatedCompletionTime && (
            <div className="text-xs text-on-surface-variant mt-1 text-right">
              Estimated completion: {formatCompletionTime(progress.estimatedCompletionTime)}
            </div>
          )}
        </div>
      )}

      {job.error_message && (
        <div className="px-4 py-3 bg-red-900/20 border-l-4 border-red-500 text-red-400 mb-4">
          <div className="font-bold mb-1">ERROR</div>
          {job.error_message}
        </div>
      )}

      {/* Status Descriptions */}
      <div className="text-sm text-on-surface-variant">
        {job.status === 'pending' && 'Job created, waiting to be analyzed...'}
        {job.status === 'analyzing' &&
          'AI is analyzing your script and generating scene descriptions...'}
        {job.status === 'generating_images' && job.total_scenes && (
          <div>
            Generating images for scenes... ({job.completed_scenes || 0}/{job.total_scenes} complete)
          </div>
        )}
        {job.status === 'generating_images' && !job.total_scenes &&
          'Generating images for scenes...'}
        {job.status === 'review_assets' && (
          <div className="text-yellow-400 font-bold">
            ⚠️ HUMAN REVIEW REQUIRED - Review scenes below, then approve to start rendering
          </div>
        )}
        {job.status === 'rendering' &&
          'Rendering final video with Remotion...'}
        {job.status === 'completed' && '✅ Job completed successfully!'}
        {job.status === 'failed' && '❌ Job failed - see error above'}
      </div>
    </div>
  );
}
