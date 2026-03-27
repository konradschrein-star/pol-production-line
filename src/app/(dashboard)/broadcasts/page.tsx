'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Icon } from '@/components/ui/Icon';
import { BulkActionToolbar } from '@/components/data/BulkActionToolbar';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { HotkeyHelp } from '@/components/shared/HotkeyHelp';
import { useHotkeys } from '@/lib/hooks/useHotkeys';
import { formatRelativeTime } from '@/lib/utils/format';
import type { JobStatus } from '@/lib/utils/status';
import { calculateJobProgress, calculateOverallProgress, formatTimeRemaining } from '@/lib/utils/progress';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface Job {
  id: string;
  status: JobStatus;
  raw_script: string;
  created_at: string;
  thumbnail_url: string | null;
  thumbnail_generated_at: string | null;
  final_video_url: string | null;
  total_scenes?: number;
  completed_scenes?: number;
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
  const [currentPage, setCurrentPage] = useState(1);
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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
      setCurrentPage(data.pagination.page);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchJobs(currentPage, statusFilter, searchQuery, sortConfig);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [currentPage, statusFilter, searchQuery, sortConfig]);

  // Auto-refresh every 10 seconds (slower to reduce scroll interference)
  // Only updates data, doesn't force scroll position
  useEffect(() => {
    const interval = setInterval(() => {
      // Silently refetch without showing loading state
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sortBy: sortConfig.column,
        sortOrder: sortConfig.order,
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      fetch(`/api/jobs?${params}`)
        .then(res => res.json())
        .then(data => {
          setJobs(data.jobs);
          setPagination(data.pagination);
        })
        .catch(err => console.error('Auto-refresh failed:', err));
    }, 10000); // Increased to 10 seconds

    return () => clearInterval(interval);
  }, [currentPage, statusFilter, searchQuery, sortConfig]);

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

  const handleDirectDelete = async (jobId: string) => {
    try {
      const res = await fetch('/api/jobs/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          jobIds: [jobId],
        }),
      });

      if (!res.ok) throw new Error('Failed to delete job');

      setPendingDeleteId(null);
      fetchJobs(pagination.page, statusFilter, searchQuery, sortConfig);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete job');
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
          setPendingDeleteId(null); // Clear pending deletion when navigating
        }
      },
    },
    {
      key: 'ArrowUp',
      description: 'Select previous job',
      handler: () => {
        if (selectedRowIndex > 0) {
          setSelectedRowIndex((prev) => prev - 1);
          setPendingDeleteId(null); // Clear pending deletion when navigating
        }
      },
    },
    {
      key: 'j',
      description: 'Select next job',
      handler: () => {
        if (selectedRowIndex < jobs.length - 1) {
          setSelectedRowIndex((prev) => prev + 1);
          setPendingDeleteId(null); // Clear pending deletion when navigating
        }
      },
    },
    {
      key: 'k',
      description: 'Select previous job',
      handler: () => {
        if (selectedRowIndex > 0) {
          setSelectedRowIndex((prev) => prev - 1);
          setPendingDeleteId(null); // Clear pending deletion when navigating
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
      key: 'd',
      description: 'Download selected job (if completed)',
      handler: () => {
        const selectedJob = jobs[selectedRowIndex];
        if (selectedJob && selectedJob.status === 'completed' && selectedJob.final_video_url) {
          // Trigger download
          const link = document.createElement('a');
          link.href = `/api/files?path=${encodeURIComponent(selectedJob.final_video_url)}`;
          link.download = `broadcast-${selectedJob.id.slice(0, 8)}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      },
    },
    {
      key: 'Delete',
      description: 'Delete selected job (press twice to confirm)',
      handler: () => {
        const selectedJob = jobs[selectedRowIndex];
        if (selectedJob) {
          // Two-press delete: first press marks, second press deletes
          if (pendingDeleteId === selectedJob.id) {
            // Second press - delete directly without modal
            handleDirectDelete(selectedJob.id);
          } else {
            // First press - mark for deletion
            setPendingDeleteId(selectedJob.id);
          }
        }
      },
    },
    {
      key: 'x',
      description: 'Toggle selection',
      handler: () => {
        const selectedJob = jobs[selectedRowIndex];
        if (selectedJob) {
          const newSelection = new Set(selectedIds);
          if (newSelection.has(selectedJob.id)) {
            newSelection.delete(selectedJob.id);
          } else {
            newSelection.add(selectedJob.id);
          }
          setSelectedIds(newSelection);
        }
      },
    },
  ], jobs.length > 0);

  const columns = [
    {
      key: 'thumbnail',
      label: 'Thumbnail',
      width: '120px',
      sortable: false,
      render: (job: Job) => (
        <div className="flex items-center justify-center">
          {job.thumbnail_url ? (
            <img
              src={`/api/media/serve?path=${encodeURIComponent(job.thumbnail_url)}`}
              alt={`Thumbnail for job ${job.id}`}
              className="w-20 h-12 object-cover rounded border border-outline-variant"
              onError={(e) => {
                // Fallback to placeholder on error
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-20 h-12 rounded border border-outline-variant bg-surface-container-low flex items-center justify-center">
              <span className="text-xs text-on-surface-variant">No thumb</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '130px',
      render: (job: Job) => <Badge status={job.status} />,
    },
    {
      key: 'id',
      label: 'Job ID',
      width: '100px',
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
      width: '130px',
      render: (job: Job) => (
        <span className="font-mono text-xs">
          {formatRelativeTime(job.created_at)}
        </span>
      ),
    },
    {
      key: 'time_remaining',
      label: 'Time Left',
      width: '110px',
      sortable: false,
      render: (job: Job) => {
        const progress = calculateJobProgress({
          id: job.id,
          status: job.status,
          created_at: job.created_at,
          total_scenes: job.total_scenes,
          completed_scenes: job.completed_scenes,
        });

        if (!progress.isActive || progress.estimatedSecondsRemaining === null) {
          return <span className="font-mono text-xs text-on-surface-variant">--</span>;
        }

        return (
          <div className="flex items-center gap-2">
            <Icon name="schedule" size="sm" className="text-on-surface-variant" />
            <span className="font-mono text-xs text-primary">
              {formatTimeRemaining(progress.estimatedSecondsRemaining)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      sortable: false,
      render: (job: Job) => (
        <div className="flex items-center justify-center gap-2">
          {job.status === 'completed' && job.final_video_url ? (
            <a
              href={`/api/files?path=${encodeURIComponent(job.final_video_url)}`}
              download
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-3 py-2 bg-primary hover:bg-primary/80 text-on-primary rounded-lg transition-colors text-xs font-medium"
              title="Download final video"
            >
              <Icon name="download" size="sm" />
              Download
            </a>
          ) : (
            <span className="text-xs text-on-surface-variant">N/A</span>
          )}
        </div>
      ),
    },
  ];

  // Calculate overall progress for all jobs
  const overallProgress = calculateOverallProgress(jobs);
  const showOverallProgress = overallProgress.activeJobsCount > 0;

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

      {/* Overall Progress Bar - Show when there are active jobs */}
      {showOverallProgress && (
        <div className="mb-6 px-8 py-6 bg-surface-container border border-primary/30 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-bold text-white">Overall Progress</h3>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                  <span className="text-on-surface-variant">
                    {overallProgress.activeJobsCount} active
                  </span>
                </div>
                <div className="h-4 w-px bg-outline-variant/30"></div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-on-surface-variant">
                    {overallProgress.completedJobsCount} completed
                  </span>
                </div>
                {overallProgress.failedJobsCount > 0 && (
                  <>
                    <div className="h-4 w-px bg-outline-variant/30"></div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      <span className="text-on-surface-variant">
                        {overallProgress.failedJobsCount} failed
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="text-sm text-on-surface-variant">
              {overallProgress.totalEstimatedSecondsRemaining > 0 && (
                <div className="flex items-center gap-2">
                  <Icon name="schedule" size="sm" />
                  <span className="font-mono">
                    Total time remaining: {formatTimeRemaining(overallProgress.totalEstimatedSecondsRemaining)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <ProgressBar
            percentage={overallProgress.overallPercentage}
            label="Combined progress across all active jobs"
            size="lg"
            animated={true}
            showPercentage={true}
          />
        </div>
      )}

      {/* Keyboard Shortcuts Guide */}
      <div className="mb-6 px-6 py-4 bg-surface-container-low border border-outline-variant/30 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-surface-container-high rounded text-white font-mono text-xs">↑</kbd>
              <kbd className="px-2 py-1 bg-surface-container-high rounded text-white font-mono text-xs">↓</kbd>
              <span className="text-on-surface-variant">or</span>
              <kbd className="px-2 py-1 bg-surface-container-high rounded text-white font-mono text-xs">J</kbd>
              <kbd className="px-2 py-1 bg-surface-container-high rounded text-white font-mono text-xs">K</kbd>
              <span className="text-on-surface-variant">Navigate</span>
            </div>
            <div className="h-4 w-px bg-outline-variant/30"></div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-surface-container-high rounded text-white font-mono text-xs">Enter</kbd>
              <span className="text-on-surface-variant">Open</span>
            </div>
            <div className="h-4 w-px bg-outline-variant/30"></div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-surface-container-high rounded text-white font-mono text-xs">X</kbd>
              <span className="text-on-surface-variant">Select</span>
            </div>
            <div className="h-4 w-px bg-outline-variant/30"></div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-surface-container-high rounded text-white font-mono text-xs">D</kbd>
              <span className="text-on-surface-variant">Download</span>
            </div>
            <div className="h-4 w-px bg-outline-variant/30"></div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-surface-container-high rounded text-white font-mono text-xs">Del</kbd>
              <kbd className="px-2 py-1 bg-surface-container-high rounded text-white font-mono text-xs">Del</kbd>
              <span className="text-on-surface-variant">Delete (2×)</span>
            </div>
            <div className="h-4 w-px bg-outline-variant/30"></div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-surface-container-high rounded text-white font-mono text-xs">N</kbd>
              <span className="text-on-surface-variant">New</span>
            </div>
          </div>
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: '?' });
              document.dispatchEvent(event);
            }}
            className="text-xs text-on-surface-variant hover:text-primary transition-colors underline decoration-dotted whitespace-nowrap"
          >
            Press ? for all shortcuts
          </button>
        </div>
      </div>

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
          pendingDeleteId={pendingDeleteId}
          emptyMessage="No broadcasts found. Create your first one to get started."
        />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setCurrentPage(page)}
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
