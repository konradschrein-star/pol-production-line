'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { updateScene, regenerateScene, uploadSceneImage } from '@/lib/utils/api';
import { WhiskReferenceImages } from '@/lib/whisk/types';

interface Scene {
  id: string;
  job_id: string;
  scene_order: number;
  image_prompt: string;
  ticker_headline: string;
  image_url?: string;
  generation_status: string;
  reference_images?: WhiskReferenceImages;
  generation_params?: any;
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
  const [showReferences, setShowReferences] = useState(false);
  const [uploadingRef, setUploadingRef] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectInput = useRef<HTMLInputElement>(null);
  const sceneInputRef = useRef<HTMLInputElement>(null);
  const styleInput = useRef<HTMLInputElement>(null);

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

  const handleRefUpload = async (
    type: 'subject' | 'scene' | 'style',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingRef(type);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', type);

      const res = await fetch(
        `/api/jobs/${scene.job_id}/scenes/${scene.id}/references`,
        { method: 'POST', body: formData }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      onUpdate(); // Refresh scene data
    } catch (err: any) {
      alert(`Failed to upload ${type}: ${err.message}`);
    } finally {
      setUploadingRef(null);
    }
  };

  const handleRefRemove = async (type: 'subject' | 'scene' | 'style') => {
    if (!confirm(`Remove ${type} reference?`)) return;

    try {
      const res = await fetch(
        `/api/jobs/${scene.job_id}/scenes/${scene.id}/references?type=${type}`,
        { method: 'DELETE' }
      );

      if (!res.ok) throw new Error('Delete failed');

      onUpdate();
    } catch (err) {
      alert(`Failed to remove ${type} reference`);
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
      className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-primary/60 shadow-lg' : 'hover:border-outline-variant/60'}`}
    >
      <div className="aspect-video bg-surface-container-lowest relative overflow-hidden rounded-t-lg">
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
                <Icon name="autorenew" size="xl" className="animate-spin mb-3" />
                <div className="text-sm">Generating...</div>
              </div>
            ) : scene.generation_status === 'failed' ? (
              <div className="text-center text-red-400">
                <Icon name="error" size="xl" className="mb-3" />
                <div className="text-sm">Generation Failed</div>
              </div>
            ) : (
              <div className="text-center">
                <Icon name="image" size="xl" className="mb-3" />
                <div className="text-sm">No Image</div>
              </div>
            )}
          </div>
        )}

        {/* Scene Number Badge */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
          <span className="text-xs font-semibold text-white">
            Scene {scene.scene_order}
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

      <div className="p-6 space-y-5">
        {/* Image Prompt */}
        <div>
          <div className="text-xs font-medium text-on-surface-variant mb-2.5">
            Image Prompt
          </div>
          <div className="text-sm text-on-surface leading-relaxed line-clamp-2">
            {scene.image_prompt}
          </div>
        </div>

        {/* Ticker Headline */}
        <div>
          <div className="text-xs font-medium text-on-surface-variant mb-2.5">
            Ticker Headline
          </div>
          {editing ? (
            <div className="space-y-3">
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
                  {saving ? 'Saving...' : 'Save'}
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
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setEditing(true)}
              className="text-sm text-white cursor-pointer hover:text-primary transition-colors leading-relaxed p-2 -mx-2 rounded hover:bg-surface-container-low"
            >
              {headline}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleRegenerate}
            disabled={regenerating || scene.generation_status === 'generating'}
            className="flex-1"
            title="Re-queue scene for generation. ⚠️ Warning: >5 regenerations in 5 minutes may trigger ban detection"
          >
            <Icon name="refresh" size="sm" />
            {regenerating ? 'Regenerating...' : 'Regenerate'}
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
              title="Upload custom image (PNG, JPG, WebP, max 10MB, 16:9 recommended)"
            >
              <Icon name="upload" size="sm" />
              {uploading ? 'Uploading...' : 'Upload'}
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

      {/* Reference Images Section */}
      <div className="border-t border-outline-variant/30 px-6 pb-6">
        <button
          onClick={() => setShowReferences(!showReferences)}
          className="flex items-center justify-between w-full py-3 text-sm font-medium hover:text-primary transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-on-surface-variant">Reference Images</span>
            <a
              href="/docs/USER_GUIDE.md#using-reference-images"
              target="_blank"
              rel="noopener noreferrer"
              title="Learn about subject, scene, and style references"
              className="text-on-surface-variant hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Icon name="help_outline" size="sm" />
            </a>
          </div>
          <div className="flex items-center gap-2">
            {scene.reference_images && Object.keys(scene.reference_images).length > 0 && (
              <Badge variant="success" size="sm">
                {Object.keys(scene.reference_images).length} active
              </Badge>
            )}
            <Icon
              name={showReferences ? "expand_less" : "expand_more"}
              size="sm"
            />
          </div>
        </button>

        {showReferences && (
          <div className="grid grid-cols-3 gap-3 mt-3">
            {/* Subject Reference */}
            <div>
              <label
                className="block text-xs font-medium text-on-surface-variant mb-2"
                title="Subject: Person, object, or character to feature consistently"
              >
                Subject
              </label>
              {scene.reference_images?.subject ? (
                <div className="relative group">
                  <img
                    src={`/api/files?path=${encodeURIComponent(scene.reference_images.subject)}`}
                    alt="Subject ref"
                    className="w-full h-20 object-cover rounded-lg border border-outline"
                  />
                  <button
                    onClick={() => handleRefRemove('subject')}
                    className="absolute top-1 right-1 bg-error/90 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icon name="close" size="xs" />
                  </button>
                </div>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={uploadingRef === 'subject'}
                    onClick={() => subjectInput.current?.click()}
                    className="w-full h-20"
                  >
                    <Icon name="add_photo_alternate" size="sm" />
                    {uploadingRef === 'subject' ? 'Uploading...' : 'Add'}
                  </Button>
                  <input
                    ref={subjectInput}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleRefUpload('subject', e)}
                    className="hidden"
                  />
                </>
              )}
            </div>

            {/* Scene Reference */}
            <div>
              <label
                className="block text-xs font-medium text-on-surface-variant mb-2"
                title="Scene: Background, setting, or location style"
              >
                Scene
              </label>
              {scene.reference_images?.scene ? (
                <div className="relative group">
                  <img
                    src={`/api/files?path=${encodeURIComponent(scene.reference_images.scene)}`}
                    alt="Scene ref"
                    className="w-full h-20 object-cover rounded-lg border border-outline"
                  />
                  <button
                    onClick={() => handleRefRemove('scene')}
                    className="absolute top-1 right-1 bg-error/90 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icon name="close" size="xs" />
                  </button>
                </div>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={uploadingRef === 'scene'}
                    onClick={() => sceneInputRef.current?.click()}
                    className="w-full h-20"
                  >
                    <Icon name="add_photo_alternate" size="sm" />
                    {uploadingRef === 'scene' ? 'Uploading...' : 'Add'}
                  </Button>
                  <input
                    ref={sceneInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleRefUpload('scene', e)}
                    className="hidden"
                  />
                </>
              )}
            </div>

            {/* Style Reference */}
            <div>
              <label
                className="block text-xs font-medium text-on-surface-variant mb-2"
                title="Style: Artistic style, mood, or aesthetic direction"
              >
                Style
              </label>
              {scene.reference_images?.style ? (
                <div className="relative group">
                  <img
                    src={`/api/files?path=${encodeURIComponent(scene.reference_images.style)}`}
                    alt="Style ref"
                    className="w-full h-20 object-cover rounded-lg border border-outline"
                  />
                  <button
                    onClick={() => handleRefRemove('style')}
                    className="absolute top-1 right-1 bg-error/90 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icon name="close" size="xs" />
                  </button>
                </div>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={uploadingRef === 'style'}
                    onClick={() => styleInput.current?.click()}
                    className="w-full h-20"
                  >
                    <Icon name="add_photo_alternate" size="sm" />
                    {uploadingRef === 'style' ? 'Uploading...' : 'Add'}
                  </Button>
                  <input
                    ref={styleInput}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleRefUpload('style', e)}
                    className="hidden"
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
