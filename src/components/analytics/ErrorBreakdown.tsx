'use client';

import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartOptions } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ErrorBreakdownProps {
  timeRange?: '24h' | '7d' | '30d';
}

interface DashboardMetrics {
  errors: Array<{
    error_type: string;
    count: number;
  }>;
  timestamp: string;
}

const ERROR_COLORS = [
  'rgba(239, 68, 68, 0.8)', // red
  'rgba(249, 115, 22, 0.8)', // orange
  'rgba(234, 179, 8, 0.8)', // yellow
  'rgba(34, 197, 94, 0.8)', // green
  'rgba(59, 130, 246, 0.8)', // blue
  'rgba(139, 92, 246, 0.8)', // purple
  'rgba(236, 72, 153, 0.8)', // pink
  'rgba(156, 163, 175, 0.8)', // gray
  'rgba(20, 184, 166, 0.8)', // teal
  'rgba(251, 146, 60, 0.8)', // amber
];

const ERROR_BORDER_COLORS = [
  'rgb(239, 68, 68)',
  'rgb(249, 115, 22)',
  'rgb(234, 179, 8)',
  'rgb(34, 197, 94)',
  'rgb(59, 130, 246)',
  'rgb(139, 92, 246)',
  'rgb(236, 72, 153)',
  'rgb(156, 163, 175)',
  'rgb(20, 184, 166)',
  'rgb(251, 146, 60)',
];

export function ErrorBreakdown({ timeRange = '7d' }: ErrorBreakdownProps) {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/metrics/dashboard?range=${timeRange}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading error breakdown...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">Error loading metrics: {error}</div>
      </div>
    );
  }

  if (!data || data.errors.length === 0) {
    return (
      <div className="bg-surface_container rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Error Breakdown</h3>
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <svg
            className="w-16 h-16 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-lg font-medium">No errors in this period</div>
          <div className="text-sm">All jobs completed successfully!</div>
        </div>
      </div>
    );
  }

  const totalErrors = data.errors.reduce((sum, err) => sum + err.count, 0);

  // Prepare chart data
  const chartData = {
    labels: data.errors.map((err) => {
      const errorMessage = err.error_type || 'Unknown error';
      return errorMessage.length > 40
        ? errorMessage.substring(0, 37) + '...'
        : errorMessage;
    }),
    datasets: [
      {
        label: 'Error Count',
        data: data.errors.map((err) => err.count),
        backgroundColor: ERROR_COLORS,
        borderColor: ERROR_BORDER_COLORS,
        borderWidth: 2,
      },
    ],
  };

  const chartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#d1d5db',
          font: { family: 'Inter', size: 11 },
          padding: 12,
          boxWidth: 12,
          boxHeight: 12,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 12,
        titleFont: { family: 'Inter', size: 13, weight: 'bold' },
        bodyFont: { family: 'Inter', size: 12 },
        callbacks: {
          label: (context) => {
            const count = context.parsed;
            const percentage = ((count / totalErrors) * 100).toFixed(1);
            return `${context.label}: ${count} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Error Summary Card */}
      <div className="bg-surface_container rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Error Breakdown</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Total Errors:</span>
            <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-500/20 text-red-400">
              {totalErrors}
            </span>
          </div>
        </div>

        {/* Doughnut Chart */}
        <div className="h-80">
          <Doughnut data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Error List */}
      <div className="bg-surface_container rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Top 10 Errors</h3>
        <div className="space-y-2">
          {data.errors.map((err, index) => {
            const percentage = ((err.count / totalErrors) * 100).toFixed(1);
            const errorMessage = err.error_type || 'Unknown error';

            return (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-surface_container_low rounded-lg hover:bg-surface_container_high transition-colors"
              >
                {/* Rank Badge */}
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: ERROR_COLORS[index % ERROR_COLORS.length],
                    color: '#1a1a1a',
                  }}
                >
                  {index + 1}
                </div>

                {/* Error Details */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-200 break-words">
                    {errorMessage}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">
                      Occurred {err.count} {err.count === 1 ? 'time' : 'times'}
                    </span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">{percentage}% of all errors</span>
                  </div>
                </div>

                {/* Count Badge */}
                <div className="flex-shrink-0">
                  <div className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-bold">
                    {err.count}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Categories (if applicable) */}
      <div className="bg-surface_container rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Common Error Patterns</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* API Errors */}
          <ErrorCategoryCard
            title="API Errors"
            errors={data.errors.filter(
              (err) =>
                err.error_type?.includes('API') ||
                err.error_type?.includes('401') ||
                err.error_type?.includes('429') ||
                err.error_type?.includes('timeout')
            )}
            icon="🌐"
          />

          {/* Processing Errors */}
          <ErrorCategoryCard
            title="Processing Errors"
            errors={data.errors.filter(
              (err) =>
                err.error_type?.includes('render') ||
                err.error_type?.includes('analysis') ||
                err.error_type?.includes('generation')
            )}
            icon="⚙️"
          />

          {/* File Errors */}
          <ErrorCategoryCard
            title="File Errors"
            errors={data.errors.filter(
              (err) =>
                err.error_type?.includes('file') ||
                err.error_type?.includes('ENOENT') ||
                err.error_type?.includes('storage')
            )}
            icon="📁"
          />

          {/* Unknown Errors */}
          <ErrorCategoryCard
            title="Unknown Errors"
            errors={data.errors.filter(
              (err) =>
                err.error_type?.includes('Unknown') ||
                err.error_type?.includes('undefined') ||
                !err.error_type
            )}
            icon="❓"
          />
        </div>
      </div>
    </div>
  );
}

interface ErrorCategoryCardProps {
  title: string;
  errors: Array<{ error_type: string; count: number }>;
  icon: string;
}

function ErrorCategoryCard({ title, errors, icon }: ErrorCategoryCardProps) {
  const totalCount = errors.reduce((sum, err) => sum + err.count, 0);

  return (
    <div className="p-4 bg-surface_container_high rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-sm font-medium text-gray-200">{title}</div>
          <div className="text-xs text-gray-500">{errors.length} unique errors</div>
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold text-white">{totalCount}</div>
      {totalCount > 0 && (
        <div className="mt-2 text-xs text-gray-400">
          Most common: {errors[0]?.error_type?.substring(0, 40) || 'N/A'}
          {errors[0]?.error_type && errors[0].error_type.length > 40 ? '...' : ''}
        </div>
      )}
    </div>
  );
}
