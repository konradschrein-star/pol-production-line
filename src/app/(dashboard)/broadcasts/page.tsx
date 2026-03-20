'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { DataTable } from '@/components/data/DataTable';
import { Pagination } from '@/components/data/Pagination';
import { Badge } from '@/components/ui/Badge';
import { HotkeyHelp } from '@/components/shared/HotkeyHelp';
import { useHotkeys } from '@/lib/hooks/useHotkeys';
import { formatRelativeTime } from '@/lib/utils/format';
import type { JobStatus } from '@/lib/utils/status';

interface Job {
  id: string;
  status: JobStatus;
  raw_script: string;
  created_at: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function BroadcastsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0);

  const fetchJobs = async (page: number, status: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (status !== 'all') params.append('status', status);

      const res = await fetch(`/api/jobs?${params}`);
      if (!res.ok) throw new Error('Failed to fetch jobs');

      const data = await res.json();
      setJobs(data.jobs);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(pagination.page, statusFilter);
  }, [pagination.page, statusFilter]);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Hotkeys for navigation
  const hotkeys = useHotkeys(
    [
      {
        key: 'ArrowDown',
        description: 'Select next job',
        handler: () => {
          if (selectedRowIndex < jobs.length - 1) {
            setSelectedRowIndex((prev) => prev + 1);
          }
        },
      },
      {
        key: 'ArrowUp',
        description: 'Select previous job',
        handler: () => {
          if (selectedRowIndex > 0) {
            setSelectedRowIndex((prev) => prev - 1);
          }
        },
      },
      {
        key: 'j',
        description: 'Select next job',
        handler: () => {
          if (selectedRowIndex < jobs.length - 1) {
            setSelectedRowIndex((prev) => prev + 1);
          }
        },
      },
      {
        key: 'k',
        description: 'Select previous job',
        handler: () => {
          if (selectedRowIndex > 0) {
            setSelectedRowIndex((prev) => prev - 1);
          }
        },
      },
      {
        key: 'Enter',
        description: 'Open selected job',
        handler: () => {
          const selectedJob = jobs[selectedRowIndex];
          if (selectedJob) {
            router.push(`/jobs/${selectedJob.id}`);
          }
        },
      },
      {
        key: 'n',
        description: 'New broadcast',
        handler: () => router.push('/broadcasts/new'),
      },
      {
        key: 'ArrowRight',
        description: 'Next page',
        handler: () => {
          if (pagination.page < pagination.totalPages) {
            handlePageChange(pagination.page + 1);
          }
        },
      },
      {
        key: 'ArrowLeft',
        description: 'Previous page',
        handler: () => {
          if (pagination.page > 1) {
            handlePageChange(pagination.page - 1);
          }
        },
      },
    ],
    jobs.length > 0
  );

  const columns = [
    {
      key: 'status',
      label: 'Status',
      width: '150px',
      render: (job: Job) => <Badge status={job.status} />,
    },
    {
      key: 'id',
      label: 'Job ID',
      width: '120px',
      render: (job: Job) => (
        <span className="font-mono text-xs">{job.id.slice(0, 8)}</span>
      ),
    },
    {
      key: 'script',
      label: 'Script Preview',
      render: (job: Job) => (
        <div className="line-clamp-2">{job.raw_script.slice(0, 200)}...</div>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      width: '150px',
      render: (job: Job) => (
        <span className="font-mono text-xs">
          {formatRelativeTime(job.created_at)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="BROADCASTS"
        subtitle="Manage Video Production Jobs"
        actions={
          <Link href="/broadcasts/new">
            <Button variant="primary">NEW BROADCAST</Button>
          </Link>
        }
      />

      <Card variant="default">
        {/* Filters */}
        <div className="border-b border-outline-variant px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">
              STATUS
            </label>
            <Select value={statusFilter} onChange={(e) => handleStatusChange(e.target.value)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="analyzing">Analyzing</option>
              <option value="generating_images">Generating</option>
              <option value="review_assets">Review</option>
              <option value="rendering">Rendering</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-xs text-on-surface-variant">
              Use ↑ ↓ J K to navigate • Enter to open • Press ? for shortcuts
            </div>
            <div className="text-sm text-on-surface-variant">
              {loading ? 'Loading...' : `${pagination.total} total jobs`}
            </div>
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={jobs}
          onRowClick={(job, index) => {
            setSelectedRowIndex(index);
            router.push(`/jobs/${job.id}`);
          }}
          selectedIndex={selectedRowIndex}
          emptyMessage="No broadcasts found. Create your first one to get started."
        />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </Card>

      {/* Hotkey Help Modal */}
      <HotkeyHelp hotkeys={hotkeys} />
    </div>
  );
}
