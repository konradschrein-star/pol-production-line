/**
 * Style Preset Edit Modal
 *
 * Reusable modal component for editing existing style presets.
 * Uses controlled form pattern for production-grade state management.
 *
 * @module StylePresetEditModal
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface StylePreset {
  id: string;
  name: string;
  description: string | null;
  visual_guidelines: string | null;
  color_palette: {
    primary?: string;
    secondary?: string;
    accent?: string;
    temperature?: string;
  } | null;
  composition_rules: string | null;
  prompt_prefix: string | null;
  prompt_suffix: string | null;
  example_prompts: string[] | null;
  reference_strategy: string;
  reference_image_urls: string[] | null;
  is_default: boolean;
}

interface StylePresetEditModalProps {
  preset: StylePreset;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Callback after successful save
}

export function StylePresetEditModal({
  preset,
  isOpen,
  onClose,
  onSave,
}: StylePresetEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visual_guidelines: '',
    composition_rules: '',
    prompt_prefix: '',
    prompt_suffix: '',
    reference_strategy: 'none',
    color_palette: {
      primary: '',
      secondary: '',
      accent: '',
      temperature: '',
    },
    example_prompts: ['', '', ''],
    reference_image_urls: [''],
  });

  // Initialize form with preset data when modal opens
  useEffect(() => {
    if (isOpen && preset) {
      setFormData({
        name: preset.name || '',
        description: preset.description || '',
        visual_guidelines: preset.visual_guidelines || '',
        composition_rules: preset.composition_rules || '',
        prompt_prefix: preset.prompt_prefix || '',
        prompt_suffix: preset.prompt_suffix || '',
        reference_strategy: preset.reference_strategy || 'none',
        color_palette: preset.color_palette || {
          primary: '',
          secondary: '',
          accent: '',
          temperature: '',
        },
        example_prompts: preset.example_prompts && preset.example_prompts.length > 0
          ? preset.example_prompts
          : ['', '', ''],
        reference_image_urls: preset.reference_image_urls && preset.reference_image_urls.length > 0
          ? preset.reference_image_urls
          : [''],
      });
    }
  }, [isOpen, preset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Filter out empty arrays
      const cleanedData = {
        id: preset.id,
        name: formData.name,
        description: formData.description || null,
        visual_guidelines: formData.visual_guidelines || null,
        composition_rules: formData.composition_rules || null,
        prompt_prefix: formData.prompt_prefix || null,
        prompt_suffix: formData.prompt_suffix || null,
        reference_strategy: formData.reference_strategy,
        color_palette: formData.color_palette,
        example_prompts: formData.example_prompts.filter((p) => p.trim()),
        reference_image_urls: formData.reference_image_urls.filter((u) => u.trim()),
      };

      const response = await fetch('/api/style-presets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update preset');
      }

      // Success - close modal and trigger refresh
      onSave();
      onClose();

    } catch (error) {
      console.error('Failed to update preset:', error);
      alert(`Failed to update preset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (loading) return; // Prevent closing during save
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <Card variant="elevated">
          {/* Header */}
          <div className="border-b border-outline-variant/30 px-8 py-5 flex items-center justify-between sticky top-0 bg-surface-container z-10">
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                ✏️ Edit Style Preset
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Modify {preset.name}
              </p>
            </div>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="text-on-surface-variant hover:text-white transition-colors disabled:opacity-50"
            >
              <Icon name="close" size="md" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20 pb-2">
                Basic Information
              </h3>

              <Input
                label="Preset Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Cinematic News, Retro Broadcast"
                required
                disabled={loading}
              />

              <TextArea
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this visual style..."
                rows={2}
                disabled={loading}
              />
            </div>

            {/* Visual Guidelines */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20 pb-2">
                Visual Guidelines
              </h3>

              <TextArea
                label="Visual Guidelines"
                value={formData.visual_guidelines}
                onChange={(e) => setFormData({ ...formData, visual_guidelines: e.target.value })}
                placeholder="Overall visual aesthetic, mood, lighting style..."
                rows={3}
                disabled={loading}
              />

              <TextArea
                label="Composition Rules"
                value={formData.composition_rules}
                onChange={(e) => setFormData({ ...formData, composition_rules: e.target.value })}
                placeholder="Framing, camera angles, depth of field rules..."
                rows={3}
                disabled={loading}
              />
            </div>

            {/* Prompt Modifiers */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20 pb-2">
                Prompt Modifiers
              </h3>

              <Input
                label="Prompt Prefix"
                value={formData.prompt_prefix}
                onChange={(e) => setFormData({ ...formData, prompt_prefix: e.target.value })}
                placeholder="e.g., cinematic, photorealistic, 8k"
                disabled={loading}
              />

              <Input
                label="Prompt Suffix"
                value={formData.prompt_suffix}
                onChange={(e) => setFormData({ ...formData, prompt_suffix: e.target.value })}
                placeholder="e.g., professional lighting, high contrast"
                disabled={loading}
              />
            </div>

            {/* Reference Strategy */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20 pb-2">
                Reference Images Strategy
              </h3>

              <Select
                label="Reference Strategy"
                value={formData.reference_strategy}
                onChange={(e) => setFormData({ ...formData, reference_strategy: e.target.value })}
                disabled={loading}
              >
                <option value="none">None - No references</option>
                <option value="style_only">Style Only - Use preset references</option>
                <option value="scene_based">Scene Based - Use scene-specific references</option>
                <option value="adaptive">Adaptive - Merge preset + scene references</option>
              </Select>

              <p className="text-xs text-on-surface-variant">
                {formData.reference_strategy === 'style_only' && 'Uses only the preset reference images below'}
                {formData.reference_strategy === 'scene_based' && 'Uses only scene-specific references (ignores preset)'}
                {formData.reference_strategy === 'adaptive' && 'Merges preset references with scene-specific references'}
                {formData.reference_strategy === 'none' && 'No reference images will be used'}
              </p>

              {/* Reference Image URLs */}
              {formData.reference_strategy !== 'none' && (
                <div className="space-y-2">
                  <label className="text-sm text-on-surface-variant block">
                    Reference Image URLs
                  </label>
                  {formData.reference_image_urls.map((url, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={url}
                        onChange={(e) => {
                          const updated = [...formData.reference_image_urls];
                          updated[idx] = e.target.value;
                          setFormData({ ...formData, reference_image_urls: updated });
                        }}
                        placeholder="https://... or file path"
                        disabled={loading}
                      />
                      {idx === formData.reference_image_urls.length - 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({
                            ...formData,
                            reference_image_urls: [...formData.reference_image_urls, ''],
                          })}
                          disabled={loading}
                        >
                          <Icon name="add" size="sm" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-outline-variant/30">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !formData.name.trim()}
                className="ml-auto"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
