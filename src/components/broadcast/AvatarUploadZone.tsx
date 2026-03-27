'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { launchBrowser, uploadAvatar } from '@/lib/utils/api';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/common/ToastContainer';

interface AvatarUploadZoneProps {
  jobId: string;
  avatarUrl?: string;
  onUploadComplete: () => void;
  jobStatus?: string; // Add job status to determine if already rendering
}

export function AvatarUploadZone({
  jobId,
  avatarUrl,
  onUploadComplete,
  jobStatus,
}: AvatarUploadZoneProps) {
  const { toasts, showError, showWarning, showSuccess, removeToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Keyboard shortcut for approve (Ctrl/Cmd + Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && avatarUrl && jobStatus === 'review_assets') {
        e.preventDefault();
        handleCompileAndRender();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [avatarUrl, jobStatus]);

  const handleLaunchBrowser = async () => {
    setLaunching(true);
    try {
      await launchBrowser(jobId);
    } catch (error) {
      console.error('Failed to launch browser:', error);
    } finally {
      setLaunching(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      showWarning('Please upload a video file (MP4)');
      return;
    }

    setUploading(true);
    try {
      await uploadAvatar(jobId, file);
      onUploadComplete();
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      showError('Failed to upload avatar. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleCompileAndRender = async () => {
    if (!avatarUrl) {
      showWarning('Please upload an avatar first');
      return;
    }

    setCompiling(true);
    try {
      console.log(`🎬 [UI] Starting compile for job ${jobId}...`);

      const response = await fetch(`/api/jobs/${jobId}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to compile and render');
      }

      const result = await response.json();
      console.log(`✅ [UI] Compile successful:`, result);

      showSuccess('🎉 Rendering started! Video will be ready in ~2-3 minutes.');

      // Refresh parent to show updated status
      setTimeout(() => {
        onUploadComplete();
      }, 500);
    } catch (error) {
      console.error('❌ [UI] Compile failed:', error);
      showError(error instanceof Error ? error.message : 'Failed to start rendering');
    } finally {
      setCompiling(false);
    }
  };

  return (
    <Card variant="default">
      <div className="border-b border-outline-variant/30 px-8 py-5">
        <h2 className="text-base font-semibold text-white">
          Avatar Generation
        </h2>
      </div>

      <div className="p-8 space-y-8">
        {/* Launch Browser Button */}
        <div>
          <Button
            variant="secondary"
            onClick={handleLaunchBrowser}
            disabled={launching}
            className="w-full"
          >
            <Icon name="open_in_new" size="md" />
            {launching ? 'Launching...' : 'Launch HeyGen Browser'}
          </Button>
          <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
            Opens HeyGen in your browser for avatar video generation. Make sure
            to use 48kHz audio sample rate.
          </p>
        </div>

        {/* Upload Zone */}
        <div>
          <div className="text-sm font-semibold text-on-surface-variant mb-3">
            Upload Avatar MP4
          </div>

          {avatarUrl ? (
            <div className="space-y-4">
              <div className="aspect-video bg-surface-container-lowest rounded-lg overflow-hidden">
                <video
                  src={`/api/files?path=${encodeURIComponent(avatarUrl)}`}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-sm text-green-400 flex items-center gap-2">
                <Icon name="check_circle" size="sm" />
                Avatar uploaded successfully
              </div>

              {/* Approve & Render Button */}
              {jobStatus === 'review_assets' && (
                <div className="border-t border-outline-variant/30 pt-4 mt-4">
                  <Button
                    variant="primary"
                    onClick={handleCompileAndRender}
                    disabled={compiling}
                    className="w-full text-lg py-6 font-bold"
                  >
                    <Icon name="play_arrow" size="lg" />
                    {compiling ? 'STARTING RENDER...' : 'APPROVE & START RENDERING'}
                  </Button>
                  <p className="mt-3 text-xs text-on-surface-variant text-center">
                    Keyboard shortcut: <kbd className="px-2 py-1 bg-surface-container-high rounded text-white font-mono">Ctrl+Enter</kbd> or <kbd className="px-2 py-1 bg-surface-container-high rounded text-white font-mono">Cmd+Enter</kbd>
                  </p>
                </div>
              )}

              {jobStatus === 'rendering' && (
                <div className="border-t border-outline-variant/30 pt-4 mt-4">
                  <div className="flex items-center justify-center gap-3 py-4 text-blue-400">
                    <Icon name="autorenew" size="md" className="animate-spin" />
                    <span className="font-semibold">Rendering in progress...</span>
                  </div>
                </div>
              )}

              {jobStatus === 'completed' && (
                <div className="border-t border-outline-variant/30 pt-4 mt-4">
                  <div className="flex items-center justify-center gap-3 py-4 text-green-400">
                    <Icon name="check_circle" size="md" />
                    <span className="font-semibold">Rendering completed!</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg ${
                dragActive ? 'border-primary bg-surface-container' : 'border-outline-variant'
              } p-12 text-center transition-all duration-200`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Icon name="autorenew" size="xl" className="animate-spin text-primary" />
                  <div className="text-sm text-on-surface">
                    Uploading and processing...
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Icon name="cloud_upload" size="xl" className="text-on-surface-variant" />
                  <div className="text-sm text-on-surface">
                    Drag & drop avatar MP4 here
                  </div>
                  <div className="text-xs text-on-surface-variant">or</div>
                  <label>
                    <Button variant="secondary" size="sm">
                      Select File
                    </Button>
                    <input
                      type="file"
                      accept="video/mp4"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </Card>
  );
}
