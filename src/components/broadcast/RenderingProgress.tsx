'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface RenderLog {
  timestamp: string;
  type: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

interface RenderingProgressProps {
  logs: RenderLog[];
  status: string;
}

/**
 * Parse frame progress from log messages
 * Format: "Frame 150/3600 rendered (4%)"
 */
function parseFrameProgress(logs: RenderLog[]): {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
} | null {
  // Find the most recent frame progress log
  const frameLog = [...logs]
    .reverse()
    .find(log => log.message.includes('Frame') && log.message.includes('rendered'));

  if (!frameLog) return null;

  // Extract numbers: "Frame 150/3600 rendered (4%)"
  const match = frameLog.message.match(/Frame (\d+)\/(\d+) rendered \((\d+)%\)/);
  if (!match) return null;

  return {
    currentFrame: parseInt(match[1]),
    totalFrames: parseInt(match[2]),
    percentage: parseInt(match[3]),
  };
}

/**
 * Calculate elapsed time and estimate remaining time
 */
function calculateTiming(logs: RenderLog[], currentPercentage: number): {
  elapsed: string;
  remaining: string | null;
} {
  if (logs.length === 0) return { elapsed: '0s', remaining: null };

  const startTime = new Date(logs[0].timestamp).getTime();
  const now = Date.now();
  const elapsedMs = now - startTime;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  const elapsed = elapsedSeconds < 60
    ? `${elapsedSeconds}s`
    : `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`;

  // Estimate remaining time based on progress
  if (currentPercentage > 0 && currentPercentage < 100) {
    const totalEstimatedMs = (elapsedMs / currentPercentage) * 100;
    const remainingMs = totalEstimatedMs - elapsedMs;
    const remainingSeconds = Math.floor(remainingMs / 1000);

    const remaining = remainingSeconds < 60
      ? `${remainingSeconds}s`
      : `${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s`;

    return { elapsed, remaining };
  }

  return { elapsed, remaining: null };
}

export function RenderingProgress({ logs, status }: RenderingProgressProps) {
  const frameProgress = useMemo(() => parseFrameProgress(logs), [logs]);
  const timing = useMemo(
    () => calculateTiming(logs, frameProgress?.percentage || 0),
    [logs, frameProgress]
  );

  const isRendering = status === 'rendering';
  const isFailed = status === 'failed';
  const isCompleted = status === 'completed';

  // Get latest error if failed
  const errorLog = useMemo(
    () => logs.find(log => log.type === 'error'),
    [logs]
  );

  return (
    <Card variant="elevated" className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
        <div className="flex items-center gap-3">
          {isRendering && (
            <Icon name="movie" size="md" className="text-primary animate-pulse" />
          )}
          {isFailed && (
            <Icon name="error" size="md" className="text-red-400" />
          )}
          {isCompleted && (
            <Icon name="check_circle" size="md" className="text-green-400" />
          )}
          <div>
            <h2 className="text-lg font-bold text-on-surface">
              {isRendering && 'Rendering Video'}
              {isFailed && 'Render Failed'}
              {isCompleted && 'Render Complete'}
            </h2>
            <p className="text-xs text-on-surface-variant font-mono">
              {isRendering && 'Remotion is rendering your video frame-by-frame'}
              {isFailed && 'The render process encountered an error'}
              {isCompleted && 'Video successfully rendered and ready for download'}
            </p>
          </div>
        </div>

        {timing.elapsed && (
          <div className="text-right">
            <div className="text-sm font-semibold text-on-surface">
              {timing.elapsed}
            </div>
            <div className="text-xs text-on-surface-variant">
              Elapsed
            </div>
          </div>
        )}
      </div>

      {/* Progress Section */}
      {frameProgress && (
        <div className="px-6 py-5 bg-surface-container-low/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-3xl font-bold text-primary font-mono">
                  {frameProgress.currentFrame.toLocaleString()}
                </div>
                <div className="text-xs text-on-surface-variant uppercase tracking-wide">
                  Current Frame
                </div>
              </div>
              <div className="text-2xl text-on-surface-variant font-light">/</div>
              <div>
                <div className="text-2xl font-semibold text-on-surface font-mono">
                  {frameProgress.totalFrames.toLocaleString()}
                </div>
                <div className="text-xs text-on-surface-variant uppercase tracking-wide">
                  Total Frames
                </div>
              </div>
            </div>

            {timing.remaining && (
              <div className="text-right">
                <div className="text-xl font-bold text-green-400">
                  ~{timing.remaining}
                </div>
                <div className="text-xs text-on-surface-variant uppercase tracking-wide">
                  Est. Remaining
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <ProgressBar
            percentage={frameProgress.percentage}
            size="lg"
            animated={isRendering}
            showPercentage={true}
            label={`Rendering at ${(frameProgress.totalFrames / (timing.elapsed ? parseInt(timing.elapsed) : 1)).toFixed(1)} fps`}
          />
        </div>
      )}

      {/* Error Display */}
      {isFailed && errorLog && (
        <div className="px-6 py-4 bg-red-950/30 border-t border-red-900/30">
          <div className="flex items-start gap-3">
            <Icon name="error" size="sm" className="text-red-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-400 mb-1">
                Render Error
              </div>
              <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap break-words bg-black/20 p-3 rounded border border-red-900/30">
                {errorLog.message}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Live Console Output */}
      <div className="border-t border-outline-variant/30">
        <div className="px-6 py-3 bg-surface-container-lowest flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="terminal" size="sm" className="text-on-surface-variant" />
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
              Live Render Console
            </span>
            {isRendering && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                LIVE
              </span>
            )}
          </div>
          <div className="text-xs text-on-surface-variant font-mono">
            {logs.length} log entries
          </div>
        </div>

        <div className="px-6 py-4 bg-[#0a0a0a] max-h-64 overflow-y-auto">
          <div className="space-y-1 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-gray-500 italic">
                Waiting for render to start...
              </div>
            ) : (
              logs.map((log, index) => {
                const time = new Date(log.timestamp).toLocaleTimeString();
                const icon = log.type === 'error' ? '❌' : log.type === 'success' ? '✅' : log.type === 'warn' ? '⚠️' : 'ℹ️';
                const color = log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : log.type === 'warn' ? 'text-yellow-400' : 'text-blue-400';

                return (
                  <div key={index} className="flex items-start gap-3">
                    <span className="text-gray-600 flex-shrink-0">{time}</span>
                    <span className="flex-shrink-0">{icon}</span>
                    <span className={`flex-1 ${color}`}>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
