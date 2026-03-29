'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { updateScene, regenerateScene, uploadSceneImage } from '@/lib/utils/api';
import { WhiskReferenceImages } from '@/lib/whisk/types';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/common/ToastContainer';
import { SceneErrorPanel } from './SceneErrorPanel';

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
  retry_count?: number;
  failed_permanently?: boolean;
  // New fields for sentence-to-scene mapping
  sentence_text?: string;
  narrative_position?: 'opening' | 'development' | 'evidence' | 'conclusion';
  shot_type?: 'establishing' | 'medium' | 'closeup' | 'detail';
  visual_continuity_notes?: string;
  // Error tracking fields (Phase 1)
  error_category?: 'policy_violation' | 'timeout' | 'api_error' | 'rate_limit' | 'auth_error' | 'unknown';
  error_message?: string;
  sanitization_attempts?: number;
  last_error_code?: string;
}

interface SceneCardProps {
  scene: Scene;
  onUpdate: () => void;
  isSelected?: boolean;
}

export function SceneCard({ scene, onUpdate, isSelected = false }: SceneCardProps) {
  const { toasts, showError, removeToast } = useToast();
  const [headline, setHeadline] = useState(scene.ticker_headline);
  const [prompt, setPrompt] = useState(scene.image_prompt);
  const [editingHeadline, setEditingHeadline] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [uploadingRef, setUploadingRef] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectInput = useRef<HTMLInputElement>(null);
  const sceneInputRef = useRef<HTMLInputElement>(null);
  const styleInput = useRef<HTMLInputElement>(null);

  const handleSaveHeadline = async () => {
    setSaving(true);
    try {
      await updateScene(scene.job_id, scene.id, {
        ticker_headline: headline,
      });
      setEditingHeadline(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update headline:', error);
      showError(`Failed to save headline: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrompt = async () => {
    setSaving(true);
    try {
      await updateScene(scene.job_id, scene.id, {
        image_prompt: prompt,
      });
      setEditingPrompt(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update prompt:', error);
      showError(`Failed to save prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = useCallback(async () => {
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
  }, [scene.job_id, scene.id, onUpdate]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadSceneImage(scene.job_id, scene.id, file);
      onUpdate();
    } catch (error) {
      console.error('Failed to upload image:', error);
      showError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  // Drag and drop handlers for scene image
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please drop an image file');
      return;
    }

    setUploading(true);
    try {
      await uploadSceneImage(scene.job_id, scene.id, file);
      onUpdate();
    } catch (error) {
      console.error('Failed to upload image:', error);
      showError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        setEditingHeadline(true);
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
  }, [scene.id, handleRegenerate]);

  return (
    <Card
      variant="default"
      className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-primary/60 shadow-lg' : 'hover:border-outline-variant/60'}`}
    >
      <div
        className={`aspect-video bg-surface-container-lowest relative overflow-hidden rounded-t-lg transition-all ${isDragging ? 'ring-2 ring-primary/60 bg-primary/5' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {scene.image_url ? (
          <img
            src={`/api/files?path=${encodeURIComponent(scene.image_url)}`}
            alt={`Scene ${scene.scene_order + 1}`}
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
            Scene {scene.scene_order + 1}
          </span>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <Badge
            status={
              scene.generation_status === 'completed'
                ? 'completed'
                : scene.generation_status === 'generating'
                ? 'generating_images'
                : scene.generation_status === 'failed'
                ? 'failed'
                : 'pending'
            }
          />
        </div>

        {/* Failed Permanently Warning Badge */}
        {scene.failed_permanently && (
          <div className="absolute bottom-3 left-3 right-3 bg-warning/90 backdrop-blur-sm px-4 py-2.5 rounded-lg border border-yellow-600/30">
            <div className="flex items-center gap-2.5">
              <Icon name="warning" size="sm" className="text-warning-foreground" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-warning-foreground">
                  Failed After {scene.retry_count || 3} Attempts
                </div>
                <div className="text-xs text-warning-foreground/80 mt-0.5">
                  Click "Regenerate" or upload custom image
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Drag-Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm flex items-center justify-center border-2 border-primary/60 border-dashed">
            <div className="text-center">
              <Icon name="upload" size="xl" className="text-primary mb-2" />
              <div className="text-sm font-medium text-primary">Drop image here</div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-5">
        {/* Error Panel - Displayed for failed scenes */}
        {scene.generation_status === 'failed' && scene.error_category && (
          <SceneErrorPanel
            sceneId={scene.id}
            jobId={scene.job_id}
            errorCategory={scene.error_category}
            errorMessage={scene.error_message}
            sanitizationAttempts={scene.sanitization_attempts}
            onEditAndRetry={() => setEditingPrompt(true)}
            onUploadImage={handleUploadClick}
          />
        )}

        {/* Sentence Text (NEW) */}
        {scene.sentence_text && (
          <div className="bg-surface-container-low border border-outline-variant/40 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="text-xs font-semibold text-primary">
                Source Sentence
              </div>
              <div className="flex gap-2">
                {scene.narrative_position && (
                  <Badge
                    variant={
                      scene.narrative_position === 'opening' ? 'primary' :
                      scene.narrative_position === 'conclusion' ? 'success' :
                      'default'
                    }
                    size="sm"
                  >
                    {scene.narrative_position}
                  </Badge>
                )}
                {scene.shot_type && (
                  <Badge variant="secondary" size="sm">
                    {scene.shot_type}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-sm text-on-surface leading-relaxed italic">
              "{scene.sentence_text}"
            </div>
            {scene.visual_continuity_notes && (
              <div className="mt-3 pt-3 border-t border-outline-variant/30">
                <div className="text-xs font-medium text-on-surface-variant mb-1.5">
                  Visual Continuity
                </div>
                <div className="text-xs text-on-surface-variant leading-relaxed">
                  {scene.visual_continuity_notes}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Image Prompt - NOW EDITABLE */}
        <div>
          <div className="text-xs font-medium text-on-surface-variant mb-2.5">
            Image Prompt
          </div>
          {editingPrompt ? (
            <div className="space-y-3">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-sm text-on-surface resize-none focus:border-primary focus:outline-none"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSavePrompt}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setPrompt(scene.image_prompt);
                    setEditingPrompt(false);
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setEditingPrompt(true)}
              className="text-sm text-on-surface cursor-pointer hover:text-primary transition-colors leading-relaxed p-2 -mx-2 rounded hover:bg-surface-container-low line-clamp-2"
            >
              {prompt}
            </div>
          )}
        </div>

        {/* Ticker Headline */}
        <div>
          <div className="text-xs font-medium text-on-surface-variant mb-2.5">
            Ticker Headline
          </div>
          {editingHeadline ? (
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
                  onClick={handleSaveHeadline}
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
                    setEditingHeadline(false);
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setEditingHeadline(true)}
              className="text-sm text-white cursor-pointer hover:text-primary transition-colors leading-relaxed p-2 -mx-2 rounded hover:bg-surface-container-low"
            >
              {headline}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {/* Enhanced retry button for failed scenes */}
          {scene.generation_status === 'failed' ? (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="flex-1"
                title="Retry image generation with current prompt"
              >
                <Icon name="refresh" size="sm" />
                {regenerating ? 'Retrying...' : 'Retry'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditingPrompt(true)}
                disabled={regenerating}
                className="flex-1"
                title="Edit prompt manually and retry"
              >
                <Icon name="edit" size="sm" />
                Edit & Retry
              </Button>
            </>
          ) : (
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
          )}

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
          aria-label={showReferences ? "Hide reference images" : "Show reference images"}
          aria-expanded={showReferences}
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
                    aria-label="Remove subject reference image"
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
                    aria-label="Remove scene reference image"
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

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </Card>
  );
}
