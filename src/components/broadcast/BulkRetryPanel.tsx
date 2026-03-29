'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

interface Scene {
  id: string;
  scene_order: number;
  error_category?: string;
}

interface BulkRetryPanelProps {
  jobId: string;
  failedScenes: Scene[];
  onRetryComplete: () => void;
}

export function BulkRetryPanel({
  jobId,
  failedScenes,
  onRetryComplete,
}: BulkRetryPanelProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [resetPrompts, setResetPrompts] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (failedScenes.length === 0) {
    return null;
  }

  // Estimate retry time based on number of scenes (roughly 2-3 min per scene)
  const estimatedMinutes = Math.ceil(failedScenes.length * 2.5);

  const handleBulkRetry = async () => {
    setIsRetrying(true);
    setProgress(0);
    setError(null);

    try {
      const response = await fetch(`/api/jobs/${jobId}/scenes/bulk-retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene_ids: failedScenes.map((s) => s.id),
          reset_prompts: resetPrompts,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to retry scenes');
      }

      // Simulate progress (actual progress would need WebSocket or polling)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 500);

      // Wait a bit then mark complete
      setTimeout(() => {
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => {
          setIsRetrying(false);
          onRetryComplete();
        }, 500);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsRetrying(false);
    }
  };

  // Categorize errors for display
  const errorCounts = failedScenes.reduce(
    (acc, scene) => {
      const category = scene.error_category || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <Card className="border-2 border-yellow-500/40 bg-yellow-500/5">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Icon name="alert-triangle" size="md" className="text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-yellow-200">
                {failedScenes.length} Scene{failedScenes.length > 1 ? 's' : ''} Failed
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">
                Retry all failed scenes at once
              </p>
            </div>
          </div>
          <Badge color="yellow" size="lg">
            {failedScenes.length}
          </Badge>
        </div>

        {/* Error Breakdown */}
        <div className="bg-surface_container_low rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Error Breakdown</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(errorCounts).map(([category, count]) => (
              <Badge
                key={category}
                color={
                  category === 'policy_violation'
                    ? 'red'
                    : category === 'timeout'
                    ? 'yellow'
                    : 'gray'
                }
                size="sm"
              >
                {category.replace('_', ' ')}: {count}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            <Icon name="clock" size="xs" className="inline mr-1" />
            Estimated retry time: ~{estimatedMinutes} minutes
          </p>
        </div>

        {/* Options */}
        <div className="bg-surface_container_low rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={resetPrompts}
              onChange={(e) => setResetPrompts(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-outline-variant bg-surface_container_high text-primary focus:ring-primary focus:ring-offset-0"
              disabled={isRetrying}
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-300">
                Reset prompts to original
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Undo all sanitization attempts and start fresh with original prompts. Use this
                if AI sanitization made prompts too generic.
              </div>
            </div>
          </label>
        </div>

        {/* Progress Bar (when retrying) */}
        {isRetrying && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Retrying scenes...</span>
              <span className="text-primary font-medium">{progress}%</span>
            </div>
            <div className="h-2 bg-surface_container_low rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-400">
              <Icon name="alert-circle" size="sm" />
              <span className="text-sm font-medium">Retry failed</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{error}</p>
          </div>
        )}

        {/* Action Button */}
        <Button
          variant="primary"
          size="md"
          onClick={handleBulkRetry}
          disabled={isRetrying}
          className="w-full"
        >
          {isRetrying ? (
            <>
              <Icon name="refresh-cw" size="sm" className="animate-spin" />
              Retrying {failedScenes.length} Scenes...
            </>
          ) : (
            <>
              <Icon name="refresh-cw" size="sm" />
              Retry All {failedScenes.length} Failed Scenes
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
