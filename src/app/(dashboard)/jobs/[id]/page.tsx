'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useJob } from '@/lib/hooks/useJob';
import { usePolling } from '@/lib/hooks/usePolling';
import { useHotkeys } from '@/lib/hooks/useHotkeys';
import { useToast } from '@/lib/hooks/useToast';
import { fetchJob } from '@/lib/utils/api';
import { isTerminalStatus } from '@/lib/utils/status';
import { JobStatusPanel } from '@/components/broadcast/JobStatusPanel';
import { SceneCard } from '@/components/broadcast/SceneCard';
import { AvatarUploadZone } from '@/components/broadcast/AvatarUploadZone';
import { BatchImageUpload } from '@/components/broadcast/BatchImageUpload';
import { HotkeyHelp } from '@/components/shared/HotkeyHelp';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { ToastContainer } from '@/components/common/ToastContainer';
import { ConsoleLog } from '@/components/broadcast/ConsoleLog';
import { RenderingProgress } from '@/components/broadcast/RenderingProgress';

export default function StoryboardEditorPage() {
  const params = useParams();
  const jobId = params.id as string;

  const { job, scenes, loading, error, refetch } = useJob(jobId);
  const { toasts, showError, showSuccess, removeToast } = useToast();
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const sceneRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [queuePaused, setQueuePaused] = useState(false);
  const [resumingQueue, setResumingQueue] = useState(false);
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [approvingJob, setApprovingJob] = useState(false);

  // Manual refresh only - no auto-polling to avoid scroll issues
  // User can refresh via button or Ctrl+R
  const handleManualRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Detect if queue is paused (scenes stuck in generating for > 5 minutes)
  useEffect(() => {
    if (!job || job.status !== 'generating_images') {
      setQueuePaused(false);
      return;
    }

    const stuckScenes = scenes.filter((scene) => {
      if (scene.generation_status !== 'generating') return false;

      const updatedAt = new Date(scene.updated_at).getTime();
      const now = Date.now();
      const elapsedMinutes = (now - updatedAt) / 1000 / 60;

      return elapsedMinutes > 5;
    });

    setQueuePaused(stuckScenes.length > 0);
  }, [job, scenes]);

  // Handler to resume queue (wrapped in useCallback to prevent unnecessary re-renders)
  const handleResumeQueue = useCallback(async () => {
    setResumingQueue(true);
    try {
      const response = await fetch('/api/queue/resume', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        setQueuePaused(false);
        setTimeout(() => refetch(), 2000); // Refresh after 2 seconds
      } else {
        showError('Failed to resume queue. Check worker logs.');
      }
    } catch (error) {
      console.error('Failed to resume queue:', error);
      showError('Failed to resume queue. Check that workers are running.');
    } finally {
      setResumingQueue(false);
    }
  }, [refetch, showError]);

  // Handler to approve and start rendering
  const handleApproveAndRender = useCallback(async () => {
    setApprovingJob(true);
    try {
      console.log(`🎬 [UI] Approving job ${jobId}...`);

      const response = await fetch(`/api/jobs/${jobId}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start rendering');
      }

      const result = await response.json();
      console.log(`✅ [UI] Job approved:`, result);

      showSuccess('🎉 Rendering started! Video will be ready in ~2-3 minutes.');

      // Refresh to show updated status
      setTimeout(() => {
        refetch();
      }, 500);
    } catch (error) {
      console.error('❌ [UI] Approve failed:', error);
      showError(error instanceof Error ? error.message : 'Failed to start rendering');
    } finally {
      setApprovingJob(false);
    }
  }, [jobId, refetch, showError, showSuccess]);

  // Scroll to selected scene
  useEffect(() => {
    const selectedScene = scenes[selectedSceneIndex];
    if (selectedScene && sceneRefs.current[selectedScene.id]) {
      sceneRefs.current[selectedScene.id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [selectedSceneIndex, scenes]);

  // Hotkeys for scene navigation and actions
  const hotkeys = useHotkeys(
    [
      {
        key: 'ArrowRight',
        description: 'Next scene',
        handler: () => {
          if (selectedSceneIndex < scenes.length - 1) {
            setSelectedSceneIndex((prev) => prev + 1);
          }
        },
      },
      {
        key: 'ArrowLeft',
        description: 'Previous scene',
        handler: () => {
          if (selectedSceneIndex > 0) {
            setSelectedSceneIndex((prev) => prev - 1);
          }
        },
      },
      {
        key: 'j',
        description: 'Next scene',
        handler: () => {
          if (selectedSceneIndex < scenes.length - 1) {
            setSelectedSceneIndex((prev) => prev + 1);
          }
        },
      },
      {
        key: 'k',
        description: 'Previous scene',
        handler: () => {
          if (selectedSceneIndex > 0) {
            setSelectedSceneIndex((prev) => prev - 1);
          }
        },
      },
      {
        key: 'r',
        description: 'Regenerate selected scene',
        handler: () => {
          const scene = scenes[selectedSceneIndex];
          if (scene) {
            const event = new CustomEvent('regenerateScene', {
              detail: { sceneId: scene.id },
            });
            window.dispatchEvent(event);
          }
        },
      },
      {
        key: 'u',
        description: 'Upload image for selected scene',
        handler: () => {
          const scene = scenes[selectedSceneIndex];
          if (scene) {
            const event = new CustomEvent('uploadSceneImage', {
              detail: { sceneId: scene.id },
            });
            window.dispatchEvent(event);
          }
        },
      },
      {
        key: 'e',
        description: 'Edit ticker headline',
        handler: () => {
          const scene = scenes[selectedSceneIndex];
          if (scene) {
            const event = new CustomEvent('editSceneHeadline', {
              detail: { sceneId: scene.id },
            });
            window.dispatchEvent(event);
          }
        },
      },
      {
        key: '1',
        description: 'Select scene 1',
        handler: () => scenes.length >= 1 && setSelectedSceneIndex(0),
      },
      {
        key: '2',
        description: 'Select scene 2',
        handler: () => scenes.length >= 2 && setSelectedSceneIndex(1),
      },
      {
        key: '3',
        description: 'Select scene 3',
        handler: () => scenes.length >= 3 && setSelectedSceneIndex(2),
      },
      {
        key: '4',
        description: 'Select scene 4',
        handler: () => scenes.length >= 4 && setSelectedSceneIndex(3),
      },
      {
        key: '5',
        description: 'Select scene 5',
        handler: () => scenes.length >= 5 && setSelectedSceneIndex(4),
      },
      {
        key: '6',
        description: 'Select scene 6',
        handler: () => scenes.length >= 6 && setSelectedSceneIndex(5),
      },
      {
        key: '7',
        description: 'Select scene 7',
        handler: () => scenes.length >= 7 && setSelectedSceneIndex(6),
      },
      {
        key: '8',
        description: 'Select scene 8',
        handler: () => scenes.length >= 8 && setSelectedSceneIndex(7),
      },
      {
        key: '9',
        description: 'Select scene 9',
        handler: () => scenes.length >= 9 && setSelectedSceneIndex(8),
      },
    ],
    scenes.length > 0
  );

  if (loading && !job) {
    return (
      <div className="flex items-center justify-center h-96 p-8">
        <div className="text-center">
          <Icon name="autorenew" size="xl" className="animate-spin text-primary mb-4" />
          <div className="text-on-surface">Loading job...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 p-8">
        <Card variant="default" className="max-w-md">
          <div className="p-6 text-center">
            <Icon name="error" size="xl" className="text-red-500 mb-4" />
            <div className="text-lg font-semibold text-white mb-2">Error</div>
            <div className="text-sm text-on-surface-variant">{error}</div>
            <Button variant="primary" onClick={refetch} className="mt-4">
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!job) return null;

  const showAvatarUpload =
    job.status === 'review_assets' ||
    job.status === 'rendering' ||
    job.status === 'completed';

  const showScenes = scenes.length > 0;

  return (
    <div>
      {/* Status Panel with Manual Refresh Button */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-on-surface">
            Job {job.id.substring(0, 8)}
          </h1>
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg transition-colors"
            title="Refresh job data"
          >
            <Icon name="refresh" size="sm" />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>
        <JobStatusPanel
          job={{
            ...job,
            total_scenes: scenes.length,
            completed_scenes: scenes.filter(s => s.image_url).length,
          }}
        />
      </div>

      {/* Rendering Progress Panel - Show for rendering/completed/failed jobs */}
      {job.render_logs && job.render_logs.length > 0 && (
        <RenderingProgress logs={job.render_logs} status={job.status} />
      )}

      {/* Top Approve Button (Sticky) - Only shown in review_assets state */}
      {job.status === 'review_assets' && job.avatar_mp4_url && (
        <div className="sticky top-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-outline-variant/30 py-4 px-6 mb-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              {approvingJob ? (
                <Icon name="autorenew" size="md" className="text-blue-400 animate-spin" />
              ) : (
                <Icon name="check_circle" size="md" className="text-green-400" />
              )}
              <div>
                <div className="text-white font-semibold">
                  {approvingJob ? 'Starting render...' : 'Ready to approve'}
                </div>
                <div className="text-on-surface-variant text-xs">
                  {approvingJob
                    ? 'Queueing job for rendering...'
                    : 'All images generated and avatar uploaded'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xs text-on-surface-variant">
                <kbd className="px-2 py-1 bg-surface-container-high rounded text-white font-mono">Ctrl+Enter</kbd> or <kbd className="px-2 py-1 bg-surface-container-high rounded text-white font-mono">Cmd+Enter</kbd>
              </div>
              <Button
                variant="primary"
                onClick={handleApproveAndRender}
                disabled={approvingJob}
                className="text-lg py-4 px-8 font-bold"
              >
                {approvingJob ? (
                  <>
                    <Icon name="autorenew" size="md" className="animate-spin" />
                    STARTING...
                  </>
                ) : (
                  <>
                    <Icon name="play_arrow" size="md" />
                    APPROVE & START RENDERING
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-10 mt-8">
        {/* Avatar Script (if available) */}
        {job.avatar_script && (
          <Card variant="default">
            <div className="border-b border-outline-variant/30 px-8 py-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">
                  Avatar Script
                </h2>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(job.avatar_script);
                  }}
                  title="Copy script to clipboard for pasting in HeyGen"
                  className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors"
                >
                  <Icon name="content_copy" size="sm" />
                  Copy
                </button>
              </div>
            </div>
            <div className="p-8">
              <div className="font-mono text-sm text-on-surface whitespace-pre-wrap leading-relaxed">
                {job.avatar_script}
              </div>
            </div>
          </Card>
        )}

        {/* Queue Paused Warning */}
        {queuePaused && (
          <div className="p-8 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
            <div className="flex items-start gap-4">
              <Icon name="warning" size="lg" className="text-yellow-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-yellow-400 text-lg mb-3">
                  Queue Appears to be Paused
                </div>
                <div className="text-sm text-on-surface mb-4">
                  Some scenes have been generating for more than 5 minutes. This usually means:
                </div>
                <ul className="list-disc list-inside text-sm text-on-surface mb-4 space-y-1">
                  <li>Google Wisk requires manual login (cookie expired)</li>
                  <li>Ban detection paused the queue</li>
                  <li>Worker process crashed</li>
                </ul>
                <div className="text-sm text-on-surface mb-4">
                  <strong>Try this first:</strong> Log into{' '}
                  <a
                    href="https://labs.google.com/wisk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-500 underline hover:text-yellow-400"
                  >
                    Google Wisk
                  </a>{' '}
                  manually, then click the button below. Or{' '}
                  <a
                    href="/docs/USER_GUIDE.md#troubleshooting-queue-paused"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-500 underline hover:text-yellow-400"
                  >
                    see troubleshooting guide
                  </a>.
                </div>
                <Button
                  variant="primary"
                  onClick={handleResumeQueue}
                  disabled={resumingQueue}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black"
                >
                  <Icon name="play_arrow" size="md" />
                  {resumingQueue ? 'RESUMING QUEUE...' : 'RESUME QUEUE'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Batch Upload Section */}
        {showScenes && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Batch Upload
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBatchUpload(!showBatchUpload)}
              >
                <Icon name={showBatchUpload ? 'expand_less' : 'expand_more'} size="sm" />
                {showBatchUpload ? 'Hide' : 'Show'}
              </Button>
            </div>
            {showBatchUpload && (
              <BatchImageUpload
                jobId={jobId}
                scenes={scenes}
                onComplete={() => {
                  refetch();
                  setShowBatchUpload(false);
                }}
              />
            )}
          </div>
        )}

        {/* Scenes Grid */}
        {showScenes && (
          <div>
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Scenes <span className="text-on-surface-variant text-base">({scenes.length})</span>
              </h2>
              <button
                onClick={() => {
                  const event = new KeyboardEvent('keydown', { key: '?' });
                  document.dispatchEvent(event);
                }}
                className="text-xs text-on-surface-variant bg-surface-container-low px-4 py-2 rounded-lg border border-outline-variant/30 hover:text-primary hover:border-primary/50 cursor-pointer underline decoration-dotted transition-colors"
              >
                Use ← → or J/K to navigate • Press ? for all shortcuts
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {scenes.map((scene, index) => (
                <div
                  key={scene.id}
                  ref={(el) => { sceneRefs.current[scene.id] = el; }}
                  onClick={() => setSelectedSceneIndex(index)}
                >
                  <SceneCard
                    scene={scene}
                    onUpdate={refetch}
                    isSelected={index === selectedSceneIndex}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Avatar Upload Zone */}
        {showAvatarUpload && (
          <AvatarUploadZone
            jobId={jobId}
            avatarUrl={job.avatar_mp4_url}
            jobStatus={job.status}
            onUploadComplete={refetch}
          />
        )}

        {/* Final Video Download */}
        {job.status === 'completed' && job.final_video_url && (
          <Card variant="default">
            <div className="border-b border-outline-variant/30 px-8 py-5">
              <h2 className="text-base font-semibold text-white">
                Final Video
              </h2>
            </div>
            <div className="p-8 space-y-6">
              <div className="aspect-video bg-surface-container-lowest rounded-lg overflow-hidden">
                <video
                  src={`/api/files?path=${encodeURIComponent(job.final_video_url)}`}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                <span>1920×1080 @ 30fps</span>
                <span>•</span>
                <span>H.264 + AAC 48kHz</span>
                <a
                  href="/docs/USER_GUIDE.md#final-video-export"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-primary ml-auto"
                >
                  Export Guide
                </a>
              </div>
              <a
                href={`/api/files?path=${encodeURIComponent(job.final_video_url)}&filename=${encodeURIComponent(
                  `${new Date(job.completed_at || job.created_at).toISOString().split('T')[0]}_${job.id.substring(0, 8)}.mp4`
                )}`}
                download
              >
                <Button variant="primary" className="w-full">
                  <Icon name="download" size="md" />
                  Download Final Video
                </Button>
              </a>
            </div>
          </Card>
        )}
      </div>

      {/* Hotkey Help Modal */}
      <HotkeyHelp hotkeys={hotkeys} />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
