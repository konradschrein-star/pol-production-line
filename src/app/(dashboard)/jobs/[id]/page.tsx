'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useJob } from '@/lib/hooks/useJob';
import { usePolling } from '@/lib/hooks/usePolling';
import { useHotkeys } from '@/lib/hooks/useHotkeys';
import { fetchJob } from '@/lib/utils/api';
import { isTerminalStatus } from '@/lib/utils/status';
import { JobStatusPanel } from '@/components/broadcast/JobStatusPanel';
import { SceneCard } from '@/components/broadcast/SceneCard';
import { AvatarUploadZone } from '@/components/broadcast/AvatarUploadZone';
import { HotkeyHelp } from '@/components/shared/HotkeyHelp';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

export default function StoryboardEditorPage() {
  const params = useParams();
  const jobId = params.id as string;

  const { job, scenes, loading, error, refetch } = useJob(jobId);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const sceneRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Poll every 3 seconds until job reaches terminal status
  usePolling(
    () => fetchJob(jobId),
    3000,
    (data) => {
      // Continue polling if not in terminal status
      return !isTerminalStatus(data.job.status);
    },
    !!job && !isTerminalStatus(job.status)
  );

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
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Icon name="autorenew" size="xl" className="animate-spin text-primary mb-4" />
          <div className="text-on-surface">Loading job...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card variant="default" className="max-w-md">
          <div className="p-6 text-center">
            <Icon name="error" size="xl" className="text-red-500 mb-4" />
            <div className="text-lg font-bold text-white mb-2">Error</div>
            <div className="text-sm text-on-surface-variant">{error}</div>
            <Button variant="primary" onClick={refetch} className="mt-4">
              RETRY
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
      {/* Status Panel */}
      <JobStatusPanel job={job} />

      <div className="p-6 space-y-6">
        {/* Avatar Script (if available) */}
        {job.avatar_script && (
          <Card variant="default">
            <div className="border-b border-outline-variant px-6 py-4">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                AVATAR SCRIPT
              </h2>
            </div>
            <div className="p-6">
              <div className="font-mono text-sm text-on-surface whitespace-pre-wrap">
                {job.avatar_script}
              </div>
            </div>
          </Card>
        )}

        {/* Scenes Grid */}
        {showScenes && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                SCENES ({scenes.length})
              </h2>
              <div className="text-xs text-on-surface-variant">
                Use ← → or J/K to navigate • Press ? for shortcuts
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scenes.map((scene, index) => (
                <div
                  key={scene.id}
                  ref={(el) => (sceneRefs.current[scene.id] = el)}
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
            onUploadComplete={refetch}
          />
        )}

        {/* Final Video Download */}
        {job.status === 'completed' && job.final_video_url && (
          <Card variant="default">
            <div className="border-b border-outline-variant px-6 py-4">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                FINAL VIDEO
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="aspect-video bg-surface-container-lowest">
                <video
                  src={job.final_video_url}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
              <a href={job.final_video_url} download>
                <Button variant="primary" className="w-full">
                  <Icon name="download" size="md" />
                  DOWNLOAD FINAL VIDEO
                </Button>
              </a>
            </div>
          </Card>
        )}
      </div>

      {/* Hotkey Help Modal */}
      <HotkeyHelp hotkeys={hotkeys} />
    </div>
  );
}
