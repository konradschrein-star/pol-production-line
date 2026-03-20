import Link from 'next/link';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DiskSpaceWidget } from '@/components/system/DiskSpaceWidget';
import { formatRelativeTime } from '@/lib/utils/format';
import type { JobStatus } from '@/lib/utils/status';

async function getMetrics() {
  const totalResult = await db.query('SELECT COUNT(*) FROM news_jobs');
  const total = parseInt(totalResult.rows[0].count);

  const completedResult = await db.query(
    "SELECT COUNT(*) FROM news_jobs WHERE status = 'completed'"
  );
  const completed = parseInt(completedResult.rows[0].count);

  const renderingResult = await db.query(
    "SELECT COUNT(*) FROM news_jobs WHERE status = 'rendering'"
  );
  const rendering = parseInt(renderingResult.rows[0].count);

  const failedResult = await db.query(
    "SELECT COUNT(*) FROM news_jobs WHERE status = 'failed'"
  );
  const failed = parseInt(failedResult.rows[0].count);

  return { total, completed, rendering, failed };
}

async function getRecentJobs() {
  const result = await db.query(
    'SELECT * FROM news_jobs ORDER BY created_at DESC LIMIT 10'
  );
  return result.rows;
}

export default async function DashboardPage() {
  const metrics = await getMetrics();
  const recentJobs = await getRecentJobs();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="System Overview"
        actions={
          <Link href="/broadcasts/new">
            <Button variant="primary">New Broadcast</Button>
          </Link>
        }
      />

      {/* System Warnings */}
      <div className="mb-8">
        <DiskSpaceWidget />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card variant="default">
          <div className="p-6">
            <div className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              TOTAL JOBS
            </div>
            <div className="text-4xl font-bold text-white">{metrics.total}</div>
          </div>
        </Card>

        <Card variant="default">
          <div className="p-6">
            <div className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              COMPLETED
            </div>
            <div className="text-4xl font-bold text-green-500">
              {metrics.completed}
            </div>
          </div>
        </Card>

        <Card variant="default">
          <div className="p-6">
            <div className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              RENDERING
            </div>
            <div className="text-4xl font-bold text-blue-400">
              {metrics.rendering}
            </div>
          </div>
        </Card>

        <Card variant="default">
          <div className="p-6">
            <div className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              FAILED
            </div>
            <div className="text-4xl font-bold text-red-500">
              {metrics.failed}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Jobs */}
      <Card variant="default">
        <div className="border-b border-outline-variant px-6 py-4">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">
            RECENT JOBS
          </h2>
        </div>

        <div className="divide-y divide-outline-variant">
          {recentJobs.length === 0 ? (
            <div className="px-6 py-12 text-center text-on-surface-variant">
              No jobs yet. Create your first broadcast to get started.
            </div>
          ) : (
            recentJobs.map((job: any) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="block px-6 py-4 hover:bg-surface-container transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge status={job.status as JobStatus} />
                      <span className="text-xs font-mono text-on-surface-variant">
                        {job.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="text-sm text-on-surface line-clamp-2">
                      {job.raw_script.slice(0, 150)}...
                    </div>
                  </div>
                  <div className="text-xs font-mono text-on-surface-variant ml-4">
                    {formatRelativeTime(job.created_at)}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="border-t border-outline-variant px-6 py-4">
          <Link href="/broadcasts">
            <Button variant="ghost" className="w-full">
              VIEW ALL BROADCASTS
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
