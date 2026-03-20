'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { launchBrowser, uploadAvatar } from '@/lib/utils/api';

interface AvatarUploadZoneProps {
  jobId: string;
  avatarUrl?: string;
  onUploadComplete: () => void;
}

export function AvatarUploadZone({
  jobId,
  avatarUrl,
  onUploadComplete,
}: AvatarUploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [dragActive, setDragActive] = useState(false);

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
      alert('Please upload a video file (MP4)');
      return;
    }

    setUploading(true);
    try {
      await uploadAvatar(jobId, file);
      onUploadComplete();
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('Failed to upload avatar. Please try again.');
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
            <div className="space-y-3">
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
    </Card>
  );
}
