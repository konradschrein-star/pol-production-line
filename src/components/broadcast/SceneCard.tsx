'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { updateScene, regenerateScene, uploadSceneImage } from '@/lib/utils/api';

interface Scene {
  id: string;
  job_id: string;
  scene_order: number;
  image_prompt: string;
  ticker_headline: string;
  image_url?: string;
  generation_status: string;
}

interface SceneCardProps {
  scene: Scene;
  onUpdate: () => void;
  isSelected?: boolean;
}

export function SceneCard({ scene, onUpdate, isSelected = false }: SceneCardProps) {
  const [headline, setHeadline] = useState(scene.ticker_headline);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateScene(scene.job_id, scene.id, {
        ticker_headline: headline,
      });
      setEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update scene:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Regenerate this scene image? This will queue a new generation.'))
      return;

    setRegenerating(true);
    try {
      await regenerateScene(scene.job_id, scene.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to regenerate scene:', error);
    } finally {
      setRegenerating(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadSceneImage(scene.job_id, scene.id, file);
      onUpdate();
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setUploading(false);
    }
  };

  // Listen for hotkey events
  useEffect(() => {
    const handleRegenerateEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.sceneId === scene.id) {
        handleRegenerate();
      }
    };

    const handleUploadEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.sceneId === scene.id) {
        fileInputRef.current?.click();
      }
    };

    const handleEditEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.sceneId === scene.id) {
        setEditing(true);
      }
    };

    window.addEventListener('regenerateScene', handleRegenerateEvent);
    window.addEventListener('uploadSceneImage', handleUploadEvent);
    window.addEventListener('editSceneHeadline', handleEditEvent);

    return () => {
      window.removeEventListener('regenerateScene', handleRegenerateEvent);
      window.removeEventListener('uploadSceneImage', handleUploadEvent);
      window.removeEventListener('editSceneHeadline', handleEditEvent);
    };
  }, [scene.id]);

  return (
    <Card
      variant="default"
      className={isSelected ? 'ring-4 ring-primary ring-offset-2 ring-offset-surface' : ''}
    >
      <div className="aspect-video bg-surface-container-lowest relative overflow-hidden">
        {scene.image_url ? (
          <img
            src={`/api/files?path=${encodeURIComponent(scene.image_url)}`}
            alt={`Scene ${scene.scene_order}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-on-surface-variant">
            {scene.generation_status === 'generating' ? (
              <div className="text-center">
                <Icon name="autorenew" size="xl" className="animate-spin mb-2" />
                <div>Generating...</div>
              </div>
            ) : scene.generation_status === 'failed' ? (
              <div className="text-center text-red-500">
                <Icon name="error" size="xl" className="mb-2" />
                <div>Generation Failed</div>
              </div>
            ) : (
              <div className="text-center">
                <Icon name="image" size="xl" className="mb-2" />
                <div>No Image</div>
              </div>
            )}
          </div>
        )}

        {/* Scene Number Badge */}
        <div className="absolute top-3 left-3 bg-surface-bright px-3 py-1">
          <span className="text-xs font-bold text-white">
            SCENE {scene.scene_order}
          </span>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <Badge
            status={
              scene.generation_status === 'completed'
                ? 'completed'
                : scene.generation_status === 'generating'
                ? 'analyzing'
                : scene.generation_status === 'failed'
                ? 'failed'
                : 'pending'
            }
          />
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Image Prompt */}
        <div>
          <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
            Image Prompt
          </div>
          <div className="text-xs text-on-surface line-clamp-2">
            {scene.image_prompt}
          </div>
        </div>

        {/* Ticker Headline */}
        <div>
          <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
            Ticker Headline
          </div>
          {editing ? (
            <div className="space-y-2">
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                maxLength={200}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? 'SAVING...' : 'SAVE'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setHeadline(scene.ticker_headline);
                    setEditing(false);
                  }}
                  disabled={saving}
                >
                  CANCEL
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setEditing(true)}
              className="text-sm text-white cursor-pointer hover:text-primary transition-colors"
            >
              {headline}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleRegenerate}
            disabled={regenerating || scene.generation_status === 'generating'}
            className="flex-1"
          >
            <Icon name="refresh" size="sm" />
            {regenerating ? 'REGENERATING...' : 'REGENERATE'}
          </Button>

          <label className="flex-1">
            <Button
              size="sm"
              variant="secondary"
              disabled={uploading}
              className="w-full"
              onClick={(e) => {
                e.preventDefault();
                fileInputRef.current?.click();
              }}
            >
              <Icon name="upload" size="sm" />
              {uploading ? 'UPLOADING...' : 'UPLOAD'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </Card>
  );
}
