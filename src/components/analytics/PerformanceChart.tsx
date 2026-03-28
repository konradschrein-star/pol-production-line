'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface PerformanceChartProps {
  timeRange?: '24h' | '7d' | '30d';
}

interface DashboardMetrics {
  timeRange: string;
  timestamp: string;
  throughput: Array<{
    date: string;
    job_count: number;
    completed_count: number;
    failed_count: number;
    cancelled_count: number;
  }>;
  stageDuration: {
    avg_analysis_time_seconds: number | null;
    avg_image_time_seconds: number | null;
    avg_render_time_seconds: number | null;
    avg_total_time_seconds: number | null;
    sample_size: number;
  };
  successRate: Array<{
    date: string;
    total: number;
    completed: number;
    success_rate_percent: number;
  }>;
  processingTimesByDuration: Array<{
    duration_bucket: string;
    job_count: number;
    avg_processing_seconds: number;
    avg_render_seconds: number;
  }>;
}

export function PerformanceChart({ timeRange = '7d' }: PerformanceChartProps) {
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
        <div className="text-gray-400">Loading metrics...</div>
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

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">No data available</div>
      </div>
    );
  }

  // Job Throughput Chart Data
  const throughputChartData = {
    labels: data.throughput.map((d) =>
      new Date(d.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    ),
    datasets: [
      {
        label: 'Completed',
        data: data.throughput.map((d) => d.completed_count),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Failed',
        data: data.throughput.map((d) => d.failed_count),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Cancelled',
        data: data.throughput.map((d) => d.cancelled_count),
        borderColor: 'rgb(156, 163, 175)',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const throughputOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#d1d5db',
          font: { family: 'Inter', size: 12 },
          padding: 12,
        },
      },
      title: {
        display: true,
        text: 'Job Throughput Over Time',
        color: '#f9fafb',
        font: { family: 'Inter', size: 16, weight: 'bold' },
        padding: { bottom: 20 },
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
      },
    },
    scales: {
      x: {
        grid: { color: '#374151', drawTicks: false },
        ticks: {
          color: '#9ca3af',
          font: { family: 'Inter', size: 11 },
          padding: 8,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#374151', drawTicks: false },
        ticks: {
          color: '#9ca3af',
          font: { family: 'Inter', size: 11 },
          padding: 8,
          precision: 0,
        },
      },
    },
  };

  // Success Rate Chart Data
  const successRateChartData = {
    labels: data.successRate.map((d) =>
      new Date(d.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    ),
    datasets: [
      {
        label: 'Success Rate (%)',
        data: data.successRate.map((d) => d.success_rate_percent),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const successRateOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#d1d5db',
          font: { family: 'Inter', size: 12 },
          padding: 12,
        },
      },
      title: {
        display: true,
        text: 'Success Rate Over Time',
        color: '#f9fafb',
        font: { family: 'Inter', size: 16, weight: 'bold' },
        padding: { bottom: 20 },
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
          label: (context) => `Success Rate: ${context.parsed.y.toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#374151', drawTicks: false },
        ticks: {
          color: '#9ca3af',
          font: { family: 'Inter', size: 11 },
          padding: 8,
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: '#374151', drawTicks: false },
        ticks: {
          color: '#9ca3af',
          font: { family: 'Inter', size: 11 },
          padding: 8,
          callback: (value) => `${value}%`,
        },
      },
    },
  };

  // Stage Duration Chart Data
  const stageDurationChartData = {
    labels: ['Analysis', 'Image Generation', 'Rendering', 'Total'],
    datasets: [
      {
        label: 'Average Duration (seconds)',
        data: [
          data.stageDuration.avg_analysis_time_seconds || 0,
          data.stageDuration.avg_image_time_seconds || 0,
          data.stageDuration.avg_render_time_seconds || 0,
          data.stageDuration.avg_total_time_seconds || 0,
        ],
        backgroundColor: [
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
        borderColor: [
          'rgb(139, 92, 246)',
          'rgb(236, 72, 153)',
          'rgb(234, 179, 8)',
          'rgb(59, 130, 246)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const stageDurationOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `Stage Duration Averages (${data.stageDuration.sample_size} jobs)`,
        color: '#f9fafb',
        font: { family: 'Inter', size: 16, weight: 'bold' },
        padding: { bottom: 20 },
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
            const seconds = context.parsed.y;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.round(seconds % 60);
            return `${minutes}m ${remainingSeconds}s`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#9ca3af',
          font: { family: 'Inter', size: 11 },
          padding: 8,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#374151', drawTicks: false },
        ticks: {
          color: '#9ca3af',
          font: { family: 'Inter', size: 11 },
          padding: 8,
          callback: (value) => {
            const num = Number(value);
            return num >= 60 ? `${Math.floor(num / 60)}m` : `${num}s`;
          },
        },
      },
    },
  };

  // Processing Times by Duration Chart Data
  const processingTimesChartData = {
    labels: data.processingTimesByDuration.map((d) => d.duration_bucket),
    datasets: [
      {
        label: 'Total Processing Time',
        data: data.processingTimesByDuration.map((d) => d.avg_processing_seconds),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      {
        label: 'Render Time Only',
        data: data.processingTimesByDuration.map((d) => d.avg_render_seconds),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
    ],
  };

  const processingTimesOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#d1d5db',
          font: { family: 'Inter', size: 12 },
          padding: 12,
        },
      },
      title: {
        display: true,
        text: 'Processing Times by Video Duration',
        color: '#f9fafb',
        font: { family: 'Inter', size: 16, weight: 'bold' },
        padding: { bottom: 20 },
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
            const seconds = context.parsed.y;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.round(seconds % 60);
            return `${context.dataset.label}: ${minutes}m ${remainingSeconds}s`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#9ca3af',
          font: { family: 'Inter', size: 11 },
          padding: 8,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#374151', drawTicks: false },
        ticks: {
          color: '#9ca3af',
          font: { family: 'Inter', size: 11 },
          padding: 8,
          callback: (value) => {
            const num = Number(value);
            return num >= 60 ? `${Math.floor(num / 60)}m` : `${num}s`;
          },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Job Throughput Chart */}
      <div className="bg-surface_container rounded-xl shadow-md p-6">
        <div className="h-80">
          <Line data={throughputChartData} options={throughputOptions} />
        </div>
      </div>

      {/* Success Rate Chart */}
      <div className="bg-surface_container rounded-xl shadow-md p-6">
        <div className="h-64">
          <Line data={successRateChartData} options={successRateOptions} />
        </div>
      </div>

      {/* Stage Duration Chart */}
      <div className="bg-surface_container rounded-xl shadow-md p-6">
        <div className="h-64">
          <Bar data={stageDurationChartData} options={stageDurationOptions} />
        </div>
      </div>

      {/* Processing Times by Duration Chart */}
      <div className="bg-surface_container rounded-xl shadow-md p-6">
        <div className="h-64">
          <Bar data={processingTimesChartData} options={processingTimesOptions} />
        </div>
      </div>
    </div>
  );
}
