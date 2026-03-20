'use client';

import { Badge } from '@/components/ui/Badge';
import { formatRelativeTime } from '@/lib/utils/format';
import type { JobStatus } from '@/lib/utils/status';

interface JobStatusPanelProps {
  job: {
    id: string;
    status: JobStatus;
    created_at: string;
    updated_at?: string;
    error_message?: string;
  };
}

export function JobStatusPanel({ job }: JobStatusPanelProps) {
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
          Created {formatRelativeTime(job.created_at)}
          {job.updated_at && ` • Updated ${formatRelativeTime(job.updated_at)}`}
        </div>
      </div>

      {job.error_message && (
        <div className="px-4 py-3 bg-red-900/20 border-l-4 border-red-500 text-red-400">
          <div className="font-bold mb-1">ERROR</div>
          {job.error_message}
        </div>
      )}

      {/* Status Descriptions */}
      <div className="text-sm text-on-surface-variant">
        {job.status === 'pending' && 'Job created, waiting to be analyzed...'}
        {job.status === 'analyzing' &&
          'AI is analyzing your script and generating scene descriptions...'}
        {job.status === 'generating_images' &&
          'Generating images for scenes...'}
        {job.status === 'review_assets' && (
          <div className="text-yellow-400 font-bold">
            ⚠️ HUMAN REVIEW REQUIRED - Review scenes below, then upload avatar to
            continue
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
