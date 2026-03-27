/**
 * Performance Breakdown Component
 *
 * Visualizes pipeline stage performance (analysis, images, render).
 * Uses horizontal bar chart for clear stage comparison.
 *
 * @module PerformanceBreakdown
 */

'use client';

import { Card } from '@/components/ui/Card';

interface PerformanceBreakdownProps {
  analysis?: string;
  imageGeneration?: string;
  rendering?: string;
  total?: string;
}

/**
 * Convert duration string (e.g., "2m 30s") to seconds for percentage calculation
 */
function durationToSeconds(duration?: string): number {
  if (!duration) return 0;

  let seconds = 0;
  const minutesMatch = duration.match(/(\d+)m/);
  const secondsMatch = duration.match(/(\d+)s/);
  const hoursMatch = duration.match(/(\d+)h/);

  if (hoursMatch) seconds += parseInt(hoursMatch[1]) * 3600;
  if (minutesMatch) seconds += parseInt(minutesMatch[1]) * 60;
  if (secondsMatch) seconds += parseInt(secondsMatch[1]);

  return seconds;
}

export function PerformanceBreakdown({
  analysis,
  imageGeneration,
  rendering,
  total,
}: PerformanceBreakdownProps) {
  const analysisSeconds = durationToSeconds(analysis);
  const imageGenSeconds = durationToSeconds(imageGeneration);
  const renderSeconds = durationToSeconds(rendering);
  const totalSeconds = durationToSeconds(total);

  // Calculate percentages
  const analysisPercent = totalSeconds > 0 ? (analysisSeconds / totalSeconds) * 100 : 0;
  const imageGenPercent = totalSeconds > 0 ? (imageGenSeconds / totalSeconds) * 100 : 0;
  const renderPercent = totalSeconds > 0 ? (renderSeconds / totalSeconds) * 100 : 0;

  const stages = [
    {
      name: 'Script Analysis',
      duration: analysis || '0s',
      percent: analysisPercent,
      color: 'bg-blue-500',
    },
    {
      name: 'Image Generation',
      duration: imageGeneration || '0s',
      percent: imageGenPercent,
      color: 'bg-purple-500',
    },
    {
      name: 'Video Rendering',
      duration: rendering || '0s',
      percent: renderPercent,
      color: 'bg-green-500',
    },
  ];

  if (!total || totalSeconds === 0) {
    return (
      <Card variant="default">
        <div className="border-b border-outline-variant/20 px-6 py-4">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">
            ⚡ Performance Breakdown
          </h2>
        </div>
        <div className="px-6 py-12 text-center text-on-surface-variant">
          No completed jobs with metrics yet
        </div>
      </Card>
    );
  }

  return (
    <Card variant="default">
      <div className="border-b border-outline-variant/20 px-6 py-4">
        <h2 className="text-lg font-bold text-white uppercase tracking-wider">
          ⚡ Performance Breakdown
        </h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Average time per pipeline stage
        </p>
      </div>

      <div className="p-6 space-y-6">
        {stages.map((stage) => (
          <div key={stage.name}>
            {/* Stage Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-on-surface uppercase tracking-wider">
                {stage.name}
              </span>
              <span className="text-sm text-on-surface-variant font-mono">
                {stage.duration}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-3 bg-surface-container-low rounded-full overflow-hidden">
              <div
                className={`h-full ${stage.color} transition-all duration-500 rounded-full`}
                style={{ width: `${Math.min(stage.percent, 100)}%` }}
              />
            </div>

            {/* Percentage */}
            <div className="text-xs text-on-surface-variant mt-1 text-right">
              {stage.percent.toFixed(1)}% of total time
            </div>
          </div>
        ))}

        {/* Total Time */}
        <div className="pt-4 border-t border-outline-variant/20">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-white uppercase tracking-wider">
              Total Processing Time
            </span>
            <span className="text-2xl font-bold text-primary">{total}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
