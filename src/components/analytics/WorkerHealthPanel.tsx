'use client';

import { useEffect, useState } from 'react';

interface WorkerHealthPanelProps {
  timeRange?: '24h' | '7d' | '30d';
  refreshInterval?: number; // milliseconds
}

interface DashboardMetrics {
  queueHealth: {
    pending_count: number;
    analyzing_count: number;
    generating_images_count: number;
    review_assets_count: number;
    rendering_count: number;
  };
  resourceUsage: {
    databasePool: {
      total: number;
      idle: number;
      waiting: number;
      utilization: number;
    };
  };
  timestamp: string;
}

export function WorkerHealthPanel({
  timeRange = '7d',
  refreshInterval = 30000, // 30 seconds
}: WorkerHealthPanelProps) {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`/api/metrics/dashboard?range=${timeRange}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const metrics = await res.json();
      setData(metrics);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [timeRange, refreshInterval]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading worker health...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">No data available</div>
      </div>
    );
  }

  const queueTotal =
    data.queueHealth.pending_count +
    data.queueHealth.analyzing_count +
    data.queueHealth.generating_images_count +
    data.queueHealth.review_assets_count +
    data.queueHealth.rendering_count;

  const poolActive = data.resourceUsage.databasePool.total - data.resourceUsage.databasePool.idle;

  return (
    <div className="space-y-6">
      {/* Header with Last Update */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Worker Health</h2>
        {lastUpdate && (
          <div className="text-xs text-gray-400 font-mono">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Queue Health */}
      <div className="bg-surface_container rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Queue Depth</h3>

        <div className="space-y-3">
          {/* Total Queue */}
          <div className="flex items-center justify-between p-3 bg-surface_container_high rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-sm font-medium text-gray-300">Total Jobs</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-white">{queueTotal}</span>
              {queueTotal > 10 && (
                <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-500/20 text-yellow-400">
                  HIGH
                </span>
              )}
            </div>
          </div>

          {/* Pending */}
          <QueueStatusRow
            label="Pending"
            count={data.queueHealth.pending_count}
            color="gray"
            description="Waiting to start"
          />

          {/* Analyzing */}
          <QueueStatusRow
            label="Analyzing"
            count={data.queueHealth.analyzing_count}
            color="purple"
            description="Script analysis in progress"
          />

          {/* Generating Images */}
          <QueueStatusRow
            label="Generating Images"
            count={data.queueHealth.generating_images_count}
            color="pink"
            description="Whisk API image generation"
          />

          {/* Review Assets */}
          <QueueStatusRow
            label="Review Assets"
            count={data.queueHealth.review_assets_count}
            color="yellow"
            description="Awaiting manual QA"
          />

          {/* Rendering */}
          <QueueStatusRow
            label="Rendering"
            count={data.queueHealth.rendering_count}
            color="green"
            description="Remotion video render"
          />
        </div>
      </div>

      {/* Database Pool Health */}
      <div className="bg-surface_container rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Database Connection Pool</h3>

        <div className="space-y-4">
          {/* Pool Utilization Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Utilization</span>
              <span className="text-sm font-mono text-white">
                {data.resourceUsage.databasePool.utilization}%
              </span>
            </div>
            <div className="w-full h-3 bg-surface_container_lowest rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  data.resourceUsage.databasePool.utilization > 80
                    ? 'bg-red-500'
                    : data.resourceUsage.databasePool.utilization > 60
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${data.resourceUsage.databasePool.utilization}%` }}
              ></div>
            </div>
          </div>

          {/* Pool Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface_container_high rounded-lg p-4">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Total Connections
              </div>
              <div className="text-2xl font-bold text-white">
                {data.resourceUsage.databasePool.total}
              </div>
            </div>

            <div className="bg-surface_container_high rounded-lg p-4">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Active</div>
              <div className="text-2xl font-bold text-green-400">{poolActive}</div>
            </div>

            <div className="bg-surface_container_high rounded-lg p-4">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Idle</div>
              <div className="text-2xl font-bold text-blue-400">
                {data.resourceUsage.databasePool.idle}
              </div>
            </div>

            <div className="bg-surface_container_high rounded-lg p-4">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Waiting</div>
              <div className="text-2xl font-bold text-yellow-400">
                {data.resourceUsage.databasePool.waiting}
              </div>
              {data.resourceUsage.databasePool.waiting > 0 && (
                <div className="mt-1 text-xs text-red-400">⚠️ Pool exhausted</div>
              )}
            </div>
          </div>

          {/* Health Indicators */}
          <div className="flex items-center justify-between pt-4 border-t border-surface_container_lowest">
            <span className="text-sm text-gray-400">Pool Status</span>
            {data.resourceUsage.databasePool.waiting > 0 ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
                CRITICAL: Pool Exhausted
              </span>
            ) : data.resourceUsage.databasePool.utilization > 80 ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400">
                WARNING: High Load
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                HEALTHY
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface QueueStatusRowProps {
  label: string;
  count: number;
  color: 'gray' | 'purple' | 'pink' | 'yellow' | 'green';
  description: string;
}

function QueueStatusRow({ label, count, color, description }: QueueStatusRowProps) {
  const colorClasses = {
    gray: 'bg-gray-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
  };

  return (
    <div className="flex items-center justify-between p-3 bg-surface_container_low rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${colorClasses[color]}`}></div>
        <div>
          <div className="text-sm font-medium text-gray-200">{label}</div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
      </div>
      <div className="text-xl font-bold text-white">{count}</div>
    </div>
  );
}
