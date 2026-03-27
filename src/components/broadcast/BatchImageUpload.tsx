'use client';

import { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { uploadSceneImage } from '@/lib/utils/api';

interface Scene {
  id: string;
  scene_order: number;
  ticker_headline: string;
  image_url?: string;
}

interface BatchImageUploadProps {
  jobId: string;
  scenes: Scene[];
  onComplete: () => void;
}

interface UploadSlot {
  sceneId: string;
  sceneOrder: number;
  file: File | null;
  preview: string | null;
  status: 'empty' | 'ready' | 'validating' | 'uploading' | 'success' | 'error';
  error?: string;
  progress?: number;
  validation?: {
    width?: number;
    height?: number;
    warnings?: string[];
  };
}

export function BatchImageUpload({ jobId, scenes, onComplete }: BatchImageUploadProps) {
  const [slots, setSlots] = useState<UploadSlot[]>(
    scenes.map((scene) => ({
      sceneId: scene.id,
      sceneOrder: scene.scene_order,
      file: null,
      preview: null,
      status: 'empty',
    }))
  );
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingAll, setUploadingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection for specific slot
  const handleFileSelect = useCallback(
    (slotIndex: number, file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSlots((prev) =>
          prev.map((slot, i) =>
            i === slotIndex
              ? {
                  ...slot,
                  file,
                  preview: e.target?.result as string,
                  status: 'ready',
                  error: undefined,
                }
              : slot
          )
        );
      };
      reader.readAsDataURL(file);
    },
    []
  );

  // Handle multi-file drop or selection
  const handleFiles = useCallback(
    (files: FileList) => {
      const fileArray = Array.from(files);
      const emptySlots = slots.filter((s) => s.status === 'empty');

      fileArray.forEach((file, index) => {
        if (index < emptySlots.length) {
          const slotIndex = slots.indexOf(emptySlots[index]);
          handleFileSelect(slotIndex, file);
        }
      });
    },
    [slots, handleFileSelect]
  );

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  // Upload single slot
  const uploadSlot = async (slotIndex: number): Promise<void> => {
    const slot = slots[slotIndex];
    if (!slot.file) return;

    setSlots((prev) =>
      prev.map((s, i) => (i === slotIndex ? { ...s, status: 'uploading', progress: 0 } : s))
    );

    try {
      const response = await uploadSceneImage(jobId, slot.sceneId, slot.file);

      setSlots((prev) =>
        prev.map((s, i) =>
          i === slotIndex
            ? {
                ...s,
                status: 'success',
                progress: 100,
                validation: response.validation,
              }
            : s
        )
      );
    } catch (error) {
      setSlots((prev) =>
        prev.map((s, i) =>
          i === slotIndex
            ? {
                ...s,
                status: 'error',
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : s
        )
      );
    }
  };

  // Upload all ready slots
  const handleUploadAll = async () => {
    const readySlots = slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.status === 'ready');

    if (readySlots.length === 0) {
      alert('No images ready to upload');
      return;
    }

    setUploadingAll(true);

    try {
      // Upload all in parallel
      await Promise.all(readySlots.map(({ index }) => uploadSlot(index)));

      // Check if all were successful
      const allSuccess = slots.every((s) => s.status === 'success' || s.status === 'empty');
      if (allSuccess) {
        onComplete();
      }
    } finally {
      setUploadingAll(false);
    }
  };

  // Clear slot
  const clearSlot = (slotIndex: number) => {
    setSlots((prev) =>
      prev.map((s, i) =>
        i === slotIndex
          ? {
              ...s,
              file: null,
              preview: null,
              status: 'empty',
              error: undefined,
              validation: undefined,
            }
          : s
      )
    );
  };

  // Clear all slots
  const handleClearAll = () => {
    if (!confirm('Clear all images?')) return;

    setSlots((prev) =>
      prev.map((s) => ({
        ...s,
        file: null,
        preview: null,
        status: 'empty',
        error: undefined,
        validation: undefined,
      }))
    );
  };

  const readyCount = slots.filter((s) => s.status === 'ready').length;
  const successCount = slots.filter((s) => s.status === 'success').length;
  const errorCount = slots.filter((s) => s.status === 'error').length;

  return (
    <Card variant="default" className="p-8">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-on-surface mb-2">Batch Image Upload</h3>
        <p className="text-sm text-on-surface-variant">
          Upload images for all scenes at once. Drag and drop or select multiple files.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 mb-6 transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-outline-variant/40 hover:border-outline-variant/60'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <Icon name="cloud_upload" size="xl" className="text-on-surface-variant mb-4 mx-auto" />
          <p className="text-sm text-on-surface mb-2">
            Drag and drop images here or click to browse
          </p>
          <p className="text-xs text-on-surface-variant mb-4">
            Supports: PNG, JPG, WebP • Max 10MB per file • Auto-resized to 1920x1080
          </p>
          <Button
            variant="secondary"
            size="md"
            onClick={() => fileInputRef.current?.click()}
            className="mx-auto"
          >
            <Icon name="folder_open" size="sm" />
            Select Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Status Summary */}
      {(readyCount > 0 || successCount > 0 || errorCount > 0) && (
        <div className="flex gap-3 mb-6">
          {readyCount > 0 && (
            <Badge variant="info" size="md">
              {readyCount} Ready
            </Badge>
          )}
          {successCount > 0 && (
            <Badge variant="success" size="md">
              {successCount} Uploaded
            </Badge>
          )}
          {errorCount > 0 && (
            <Badge variant="error" size="md">
              {errorCount} Failed
            </Badge>
          )}
        </div>
      )}

      {/* Upload Slots Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {slots.map((slot, index) => (
          <div key={slot.sceneId} className="relative">
            <div
              className={`aspect-video rounded-lg border-2 overflow-hidden transition-all ${
                slot.status === 'ready'
                  ? 'border-primary/60'
                  : slot.status === 'success'
                  ? 'border-success/60'
                  : slot.status === 'error'
                  ? 'border-error/60'
                  : 'border-outline-variant/40'
              }`}
            >
              {slot.preview ? (
                <div className="relative w-full h-full">
                  <img
                    src={slot.preview}
                    alt={`Scene ${slot.sceneOrder}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Status Overlay */}
                  {slot.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <Icon name="autorenew" size="lg" className="text-white animate-spin" />
                    </div>
                  )}

                  {slot.status === 'success' && (
                    <div className="absolute top-2 right-2 bg-success/90 p-1.5 rounded-lg">
                      <Icon name="check" size="sm" className="text-white" />
                    </div>
                  )}

                  {slot.status === 'error' && (
                    <div className="absolute top-2 right-2 bg-error/90 p-1.5 rounded-lg">
                      <Icon name="error" size="sm" className="text-white" />
                    </div>
                  )}

                  {/* Remove Button */}
                  {(slot.status === 'ready' || slot.status === 'error') && (
                    <button
                      onClick={() => clearSlot(index)}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-error/90 p-1.5 rounded-lg transition-colors"
                    >
                      <Icon name="close" size="xs" className="text-white" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-surface-container-lowest text-on-surface-variant">
                  <Icon name="image" size="lg" className="mb-2" />
                  <div className="text-xs">Scene {slot.sceneOrder}</div>
                </div>
              )}
            </div>

            {/* Scene Label */}
            <div className="mt-2 text-xs text-on-surface-variant truncate">
              Scene {slot.sceneOrder}
            </div>

            {/* Error Message */}
            {slot.error && (
              <div className="mt-1 text-xs text-error truncate" title={slot.error}>
                {slot.error}
              </div>
            )}

            {/* Validation Warnings */}
            {slot.validation?.warnings && slot.validation.warnings.length > 0 && (
              <div className="mt-1 text-xs text-warning truncate" title={slot.validation.warnings.join(', ')}>
                {slot.validation.warnings[0]}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="primary"
          size="md"
          onClick={handleUploadAll}
          disabled={readyCount === 0 || uploadingAll}
          className="flex-1"
        >
          <Icon name="upload" size="sm" />
          {uploadingAll ? 'Uploading...' : `Upload ${readyCount > 0 ? `${readyCount} ` : ''}Images`}
        </Button>

        <Button
          variant="ghost"
          size="md"
          onClick={handleClearAll}
          disabled={slots.every((s) => s.status === 'empty') || uploadingAll}
        >
          <Icon name="delete" size="sm" />
          Clear All
        </Button>
      </div>
    </Card>
  );
}
