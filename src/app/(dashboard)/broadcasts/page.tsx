'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable } from '@/components/data/DataTable';
import { Pagination } from '@/components/data/Pagination';
import { Badge } from '@/components/ui/Badge';
import { BulkActionToolbar } from '@/components/data/BulkActionToolbar';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ column: 'created_at', order: 'desc' as 'asc' | 'desc' });
  const [loading, setLoading] = useState(true);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchJobs = async (page: number, status: string, search: string, sort: typeof sortConfig) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy: sort.column,
        sortOrder: sort.order,
      });
      if (status !== 'all') params.append('status', status);
      if (search) params.append('search', search);

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
    const debounceTimer = setTimeout(() => {
      fetchJobs(pagination.page, statusFilter, searchQuery, sortConfig);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [pagination.page, statusFilter, searchQuery, sortConfig]);

  const handleBulkDelete = async () => {
    try {
      const res = await fetch('/api/jobs/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          jobIds: Array.from(selectedIds),
        }),
      });

      if (!res.ok) throw new Error('Failed to delete jobs');

      setSelectedIds(new Set());
      setShowDeleteModal(false);
      fetchJobs(pagination.page, statusFilter, searchQuery, sortConfig);
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('Failed to delete jobs');
    }
  };

  const handleBulkCancel = async () => {
    try {
      const res = await fetch('/api/jobs/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          jobIds: Array.from(selectedIds),
        }),
      });

      if (!res.ok) throw new Error('Failed to cancel jobs');

      setSelectedIds(new Set());
      setShowCancelModal(false);
      fetchJobs(pagination.page, statusFilter, searchQuery, sortConfig);
    } catch (error) {
      console.error('Bulk cancel error:', error);
      alert('Failed to cancel jobs');
    }
  };

  // Hotkeys
  const hotkeys = useHotkeys([
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
  ], jobs.length > 0);

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
      sortable: false,
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
        {/* Filters & Search Toolbar */}
        <div className="border-b border-outline-variant px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4 flex-1">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by script content or job ID..."
                className="min-w-[300px]"
              />

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase">
                  Status
                </label>
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="min-w-[140px]"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="analyzing">Analyzing</option>
                  <option value="generating_images">Generating</option>
                  <option value="review_assets">Review</option>
                  <option value="rendering">Rendering</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>
            </div>

            <BulkActionToolbar
              selectedCount={selectedIds.size}
              onDelete={() => setShowDeleteModal(true)}
              onCancel={() => setShowCancelModal(true)}
              onClearSelection={() => setSelectedIds(new Set())}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <div>
              {loading ? 'Loading...' : `${pagination.total} total jobs`}
            </div>
            <div>
              Use ↑ ↓ J K to navigate • Enter to open • Press ? for shortcuts
            </div>
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={jobs}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          sortable
          currentSort={sortConfig}
          onSort={(column, order) => setSortConfig({ column, order })}
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
            onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
          />
        )}
      </Card>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Delete Jobs"
        message={`Are you sure you want to permanently delete ${selectedIds.size} job(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      <ConfirmationModal
        isOpen={showCancelModal}
        title="Cancel Jobs"
        message={`Are you sure you want to cancel ${selectedIds.size} job(s)? This will stop any active processing.`}
        confirmText="Cancel Jobs"
        cancelText="Go Back"
        variant="warning"
        onConfirm={handleBulkCancel}
        onCancel={() => setShowCancelModal(false)}
      />

      {/* Hotkey Help Modal */}
      <HotkeyHelp hotkeys={hotkeys} />
    </div>
  );
}
