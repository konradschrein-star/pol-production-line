'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SecurityTimeline } from '@/components/security/SecurityTimeline';

type TimeRange = '24h' | '7d' | '30d';

export default function SecurityPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="SECURITY EVENTS" subtitle="Audit Log & Security Monitoring" />

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

      <div className="max-w-7xl mx-auto">
        <SecurityTimeline timeRange={timeRange} refreshInterval={30000} />
      </div>
    </div>
  );
}
