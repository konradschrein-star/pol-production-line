'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { MetricCard } from '@/components/analytics/MetricCard';
import { PerformanceBreakdown } from '@/components/analytics/PerformanceBreakdown';
import { PerformanceChart } from '@/components/analytics/PerformanceChart';
import { WorkerHealthPanel } from '@/components/analytics/WorkerHealthPanel';
import { ErrorBreakdown } from '@/components/analytics/ErrorBreakdown';

interface AnalyticsData {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  pendingJobs: number;
  successRate: number;
  avgProcessingTime: string;
  performanceBreakdown?: {
    analysis: string;
    imageGeneration: string;
    rendering: string;
    total: string;
  } | null;
  imageGenerationStats?: {
    totalAttempts: number;
    successfulAttempts: number;
    avgGenerationTime: string;
    successRate: string;
  };
  jobsByStatus: {
    status: string;
    count: number;
  }[];
}

async function fetchAnalytics(): Promise<AnalyticsData> {
  try {
    const response = await fetch('/api/analytics');
    if (!response.ok) throw new Error('Failed to fetch analytics');
    return await response.json();
  } catch (error) {
    console.error('❌ [Analytics] Error fetching data:', error);
    return {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      pendingJobs: 0,
      successRate: 0,
      avgProcessingTime: '0m',
      jobsByStatus: [],
    };
  }
}

type TimeRange = '24h' | '7d' | '30d';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    pendingJobs: 0,
    successRate: 0,
    avgProcessingTime: '0m',
    jobsByStatus: [],
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  useEffect(() => {
    fetchAnalytics().then((data) => {
      setAnalytics(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader title="ANALYTICS" subtitle="Loading..." />
        <div className="text-center py-12 text-on-surface-variant">
          Loading analytics...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="ANALYTICS"
          subtitle="Production Performance Metrics"
        />

        {/* Time Range Selector */}
        <div className="flex items-center gap-2 bg-surface_container rounded-lg p-1">
          {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${
                  timeRange === range
                    ? 'bg-primary text-on-primary'
                    : 'text-gray-400 hover:text-white hover:bg-surface_container_high'
                }
              `}
            >
              {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Key Metrics Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard
            label="Total Jobs"
            value={analytics.totalJobs}
            icon="work"
            variant="default"
          />
          <MetricCard
            label="Success Rate"
            value={analytics.successRate}
            suffix="%"
            icon="check_circle"
            variant={analytics.successRate >= 90 ? 'success' : analytics.successRate >= 70 ? 'warning' : 'error'}
          />
          <MetricCard
            label="Completed"
            value={analytics.completedJobs}
            icon="done_all"
            variant="success"
          />
          <MetricCard
            label="Failed"
            value={analytics.failedJobs}
            icon="error"
            variant={analytics.failedJobs > 0 ? 'error' : 'default'}
          />
        </div>

        {/* Key Metrics Row 2 - Image Generation Stats */}
        {analytics.imageGenerationStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              label="Image Success Rate"
              value={analytics.imageGenerationStats.successRate}
              suffix="%"
              icon="image"
              variant="default"
              size="sm"
            />
            <MetricCard
              label="Total Attempts"
              value={analytics.imageGenerationStats.totalAttempts}
              icon="refresh"
              variant="default"
              size="sm"
            />
            <MetricCard
              label="Avg Generation Time"
              value={analytics.imageGenerationStats.avgGenerationTime}
              icon="schedule"
              variant="default"
              size="sm"
            />
          </div>
        )}

        {/* Performance Charts (New) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PerformanceChart timeRange={timeRange} />
          </div>
          <div>
            <WorkerHealthPanel timeRange={timeRange} refreshInterval={30000} />
          </div>
        </div>

        {/* Error Breakdown (New) */}
        <ErrorBreakdown timeRange={timeRange} />

        {/* Performance Breakdown (Legacy) */}
        {analytics.performanceBreakdown ? (
          <PerformanceBreakdown
            analysis={analytics.performanceBreakdown.analysis}
            imageGeneration={analytics.performanceBreakdown.imageGeneration}
            rendering={analytics.performanceBreakdown.rendering}
            total={analytics.performanceBreakdown.total}
          />
        ) : (
          <Card variant="default">
            <div className="border-b border-outline-variant/20 px-6 py-4">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                ⚡ Performance Breakdown
              </h2>
            </div>
            <div className="px-6 py-12 text-center text-on-surface-variant">
              Complete at least one job to see performance metrics
            </div>
          </Card>
        )}

        {/* Jobs by Status */}
        <Card variant="default">
          <div className="border-b border-outline-variant/20 px-6 py-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              📊 Jobs by Status
            </h2>
          </div>
          <div className="divide-y divide-outline-variant/20">
            {analytics.jobsByStatus.length === 0 ? (
              <div className="px-6 py-12 text-center text-on-surface-variant">
                No jobs created yet
              </div>
            ) : (
              analytics.jobsByStatus.map((item) => (
                <div
                  key={item.status}
                  className="px-6 py-4 flex items-center justify-between hover:bg-surface-container transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`
                        px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full
                        ${
                          item.status === 'completed'
                            ? 'bg-green-900/20 text-green-400'
                            : item.status === 'failed'
                            ? 'bg-red-900/20 text-red-400'
                            : item.status === 'rendering'
                            ? 'bg-blue-900/20 text-blue-400'
                            : item.status === 'pending' || item.status === 'analyzing'
                            ? 'bg-yellow-900/20 text-yellow-400'
                            : 'bg-outline-variant/20 text-outline-variant'
                        }
                      `}
                    >
                      {item.status}
                    </span>
                    <span className="text-sm text-on-surface-variant uppercase tracking-wider">
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white">{item.count}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
