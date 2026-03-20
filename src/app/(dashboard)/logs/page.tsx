'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';

export default function LogsPage() {
  return (
    <div>
      <PageHeader
        title="SYSTEM LOGS"
        subtitle="Worker Activity & System Events"
      />

      <div className="max-w-6xl mx-auto space-y-6">
        <Card variant="default">
          <div className="px-6 py-12 text-center space-y-4">
            <div className="text-6xl text-outline-variant">📋</div>

            <h2 className="text-xl font-bold text-white uppercase tracking-wider">
              System Logs
            </h2>

            <p className="text-on-surface-variant max-w-lg mx-auto">
              Live system logs and worker activity monitoring coming soon.
            </p>

            <p className="text-sm text-outline-variant mt-6">
              This feature will stream BullMQ job queue events, worker status, and system-level logs in real-time.
            </p>

            <div className="mt-8 text-left bg-surface-container-lowest p-6 font-mono text-xs text-outline-variant max-w-2xl mx-auto">
              <div className="space-y-1">
                <div>✅ Workers: Ready</div>
                <div>✅ Database: Connected</div>
                <div>✅ Redis: Active</div>
                <div>✅ Queue Status: Listening</div>
                <div className="mt-4 text-on-surface-variant">
                  → Check worker terminal for detailed logs
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
