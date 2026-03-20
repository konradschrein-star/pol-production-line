'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';

interface AnalyticsData {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  pendingJobs: number;
  successRate: number;
  avgProcessingTime: string;
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
      <PageHeader
        title="ANALYTICS"
        subtitle="Production Performance Metrics"
      />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card variant="default">
            <div className="px-6 py-6 space-y-2">
              <div className="text-sm font-bold text-outline-variant uppercase tracking-wider">
                Total Jobs
              </div>
              <div className="text-4xl font-bold text-white">
                {analytics.totalJobs}
              </div>
            </div>
          </Card>

          <Card variant="default">
            <div className="px-6 py-6 space-y-2">
              <div className="text-sm font-bold text-outline-variant uppercase tracking-wider">
                Success Rate
              </div>
              <div className="text-4xl font-bold text-white">
                {analytics.successRate}%
              </div>
            </div>
          </Card>

          <Card variant="default">
            <div className="px-6 py-6 space-y-2">
              <div className="text-sm font-bold text-outline-variant uppercase tracking-wider">
                Completed
              </div>
              <div className="text-4xl font-bold text-green-400">
                {analytics.completedJobs}
              </div>
            </div>
          </Card>

          <Card variant="default">
            <div className="px-6 py-6 space-y-2">
              <div className="text-sm font-bold text-outline-variant uppercase tracking-wider">
                Failed
              </div>
              <div className="text-4xl font-bold text-red-400">
                {analytics.failedJobs}
              </div>
            </div>
          </Card>
        </div>

        {/* Processing Time */}
        <Card variant="default">
          <div className="border-b border-outline-variant/20 px-6 py-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              ⏱️ Average Processing Time
            </h2>
          </div>
          <div className="px-6 py-8 text-center">
            <div className="text-5xl font-bold text-primary">
              {analytics.avgProcessingTime}
            </div>
            <div className="text-sm text-on-surface-variant mt-2">
              For completed jobs (from submission to final render)
            </div>
          </div>
        </Card>

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
                        px-3 py-1 text-xs font-bold uppercase tracking-wider
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
