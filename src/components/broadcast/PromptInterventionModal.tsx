'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface FailedScene {
  id: string;
  scene_order: number;
  image_prompt: string;
  sanitization_attempts: number;
  error_message?: string;
}

interface PromptInterventionModalProps {
  jobId: string;
  failedScenes: FailedScene[];
  onClose: () => void;
  onRetry: (sceneId: string, newPrompt: string) => Promise<void>;
  onUpload: (sceneId: string) => void;
  onSkip: (sceneId: string) => void;
}

export function PromptInterventionModal({
  jobId,
  failedScenes,
  onClose,
  onRetry,
  onUpload,
  onSkip,
}: PromptInterventionModalProps) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);

  const currentScene = failedScenes[currentSceneIndex];
  const hasMultipleScenes = failedScenes.length > 1;

  useEffect(() => {
    if (currentScene) {
      setEditedPrompt(currentScene.image_prompt);
    }
  }, [currentScene]);

  const handleRetry = async () => {
    if (!editedPrompt.trim()) {
      return;
    }

    setIsRetrying(true);
    try {
      await onRetry(currentScene.id, editedPrompt);

      // Move to next scene or close if this was the last one
      if (currentSceneIndex < failedScenes.length - 1) {
        setCurrentSceneIndex(currentSceneIndex + 1);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Failed to retry scene:', error);
      // Error handling is done in parent component
    } finally {
      setIsRetrying(false);
    }
  };

  const handleUpload = () => {
    onUpload(currentScene.id);

    // Move to next scene or close
    if (currentSceneIndex < failedScenes.length - 1) {
      setCurrentSceneIndex(currentSceneIndex + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    onSkip(currentScene.id);

    // Move to next scene or close
    if (currentSceneIndex < failedScenes.length - 1) {
      setCurrentSceneIndex(currentSceneIndex + 1);
    } else {
      onClose();
    }
  };

  if (!currentScene) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface_container border-2 border-red-500/40 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-red-500/10 border-b border-red-500/30 p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Icon name="alert-triangle" size="lg" className="text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-red-200">Manual Intervention Required</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {hasMultipleScenes
                    ? `Scene ${currentSceneIndex + 1} of ${failedScenes.length} needs attention`
                    : 'This scene needs your attention'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              <Icon name="close" size="md" />
            </button>
          </div>

          {/* Progress Indicator (if multiple scenes) */}
          {hasMultipleScenes && (
            <div className="flex gap-2 mt-4">
              {failedScenes.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    index === currentSceneIndex
                      ? 'bg-red-400'
                      : index < currentSceneIndex
                      ? 'bg-green-500'
                      : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Scene Information */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge color="red" size="sm">
                Scene {currentScene.scene_order + 1}
              </Badge>
              <Badge color="yellow" size="sm">
                {currentScene.sanitization_attempts} / 3 attempts
              </Badge>
            </div>
            <h3 className="text-lg font-semibold text-gray-200">
              All automated fixes have failed
            </h3>
          </div>

          {/* What Went Wrong */}
          <div className="bg-surface_container_low rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="info" size="sm" className="text-blue-400" />
              <h4 className="text-sm font-semibold text-gray-300">What went wrong?</h4>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Our AI attempted to sanitize this prompt {currentScene.sanitization_attempts} times, but the
              image generation API continues to reject it due to content policy violations. This
              typically happens with politically sensitive or controversial references.
            </p>
            {currentScene.error_message && (
              <div className="mt-3 text-xs text-gray-500 font-mono bg-surface_container p-2 rounded">
                {currentScene.error_message.substring(0, 150)}...
              </div>
            )}
          </div>

          {/* Original Prompt */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Original Prompt
            </label>
            <div className="bg-surface_container_low border border-outline-variant/40 rounded-lg p-3 text-sm text-gray-400">
              {currentScene.image_prompt}
            </div>
          </div>

          {/* Edited Prompt */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block flex items-center gap-2">
              <Icon name="edit" size="sm" className="text-primary" />
              Edit Prompt
              <span className="text-xs text-gray-500 font-normal">
                ({editedPrompt.length} characters)
              </span>
            </label>
            <textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              className="w-full h-32 px-4 py-3 bg-surface_container_low border border-outline-variant rounded-lg text-sm text-gray-200 resize-none focus:border-primary focus:outline-none transition-colors"
              placeholder="Rewrite the prompt to avoid policy violations..."
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 Tip: Remove specific names, political terms, or controversial references. Use
              generic descriptions instead.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleRetry}
              disabled={!editedPrompt.trim() || isRetrying}
              className="flex-1"
            >
              {isRetrying ? (
                <>
                  <Icon name="refresh-cw" size="sm" className="animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <Icon name="refresh-cw" size="sm" />
                  Try Again with This Edit
                </>
              )}
            </Button>
            <Button variant="secondary" size="md" onClick={handleUpload} className="flex-1">
              <Icon name="upload" size="sm" />
              Upload Custom Image
            </Button>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={handleSkip} className="flex-1">
              <Icon name="skip-forward" size="sm" />
              Skip This Scene
            </Button>
            {hasMultipleScenes && currentSceneIndex > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentSceneIndex(currentSceneIndex - 1)}
                className="flex-1"
              >
                <Icon name="arrow-left" size="sm" />
                Previous Scene
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
