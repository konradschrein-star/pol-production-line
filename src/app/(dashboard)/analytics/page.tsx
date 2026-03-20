import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { db } from '@/lib/db';

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

async function getAnalytics(): Promise<AnalyticsData> {
  try {
    // Total jobs
    const totalResult = await db.query('SELECT COUNT(*) as count FROM news_jobs');
    const totalJobs = parseInt(totalResult.rows[0].count);

    // Jobs by status
    const statusResult = await db.query(`
      SELECT status, COUNT(*) as count
      FROM news_jobs
      GROUP BY status
      ORDER BY count DESC
    `);

    const jobsByStatus = statusResult.rows.map((row) => ({
      status: row.status,
      count: parseInt(row.count),
    }));

    const completedJobs = jobsByStatus.find((s) => s.status === 'completed')?.count || 0;
    const failedJobs = jobsByStatus.find((s) => s.status === 'failed')?.count || 0;
    const pendingJobs =
      jobsByStatus.find((s) => s.status === 'pending')?.count ||
      jobsByStatus.find((s) => s.status === 'analyzing')?.count ||
      0;

    // Success rate
    const successRate =
      totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

    // Average processing time (for completed jobs)
    const timeResult = await db.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds
      FROM news_jobs
      WHERE status = 'completed'
    `);

    const avgSeconds = parseFloat(timeResult.rows[0]?.avg_seconds || '0');
    const avgMinutes = Math.round(avgSeconds / 60);
    const avgProcessingTime =
      avgMinutes > 60
        ? `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}m`
        : `${avgMinutes}m`;

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      pendingJobs,
      successRate,
      avgProcessingTime,
      jobsByStatus,
    };
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

export default async function AnalyticsPage() {
  const analytics = await getAnalytics();

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
