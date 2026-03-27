'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export function StylePresetCreator() {
  const [isOpen, setIsOpen] = useState(false);
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
      primary: '#2C3E50',
      secondary: '#34495E',
      accent: '#3498DB',
      temperature: 'cool',
    },
    example_prompts: ['', '', ''],
    reference_image_urls: [''],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Filter out empty example prompts and reference URLs
      const cleanedData = {
        ...formData,
        example_prompts: formData.example_prompts.filter((p) => p.trim()),
        reference_image_urls: formData.reference_image_urls.filter((u) => u.trim()),
      };

      const response = await fetch('/api/style-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create preset');
      }

      // Success - reset form and close
      setFormData({
        name: '',
        description: '',
        visual_guidelines: '',
        composition_rules: '',
        prompt_prefix: '',
        prompt_suffix: '',
        reference_strategy: 'none',
        color_palette: {
          primary: '#2C3E50',
          secondary: '#34495E',
          accent: '#3498DB',
          temperature: 'cool',
        },
        example_prompts: ['', '', ''],
        reference_image_urls: [''],
      });
      setIsOpen(false);

      // Trigger a reload of the preset list
      window.location.reload();
    } catch (error) {
      console.error('Failed to create preset:', error);
      alert(`Failed to create preset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div>
        <Button variant="primary" onClick={() => setIsOpen(true)} className="w-full">
          <Icon name="add" size="sm" className="mr-2" />
          Create Custom Style Preset
        </Button>
      </div>
    );
  }

  return (
    <Card variant="default">
      <div className="border-b border-outline-variant/30 px-8 py-5">
        <h2 className="text-lg font-bold text-white uppercase tracking-wider">
          ✨ Create Custom Style Preset
        </h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Define a new visual style with custom guidelines and preferences
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {/* Basic Info */}
        <div>
          <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">
            Preset Name <span className="text-error">*</span>
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Political Commentary Dark"
            required
          />
          <p className="text-xs text-on-surface-variant mt-2">
            Choose a descriptive name that identifies the visual style
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">
            Description
          </label>
          <TextArea
            value={formData.description}
            onChange={(value) => setFormData({ ...formData, description: value })}
            placeholder="Brief description of this visual style..."
            rows={2}
          />
        </div>

        {/* Visual Guidelines */}
        <div>
          <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">
            Visual Guidelines
          </label>
          <TextArea
            value={formData.visual_guidelines}
            onChange={(value) => setFormData({ ...formData, visual_guidelines: value })}
            placeholder="Detailed instructions for AI about visual aesthetic, mood, lighting preferences, etc..."
            rows={4}
          />
          <p className="text-xs text-on-surface-variant mt-2">
            Describe the overall visual aesthetic, mood, lighting style, and any specific preferences
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">
            Composition Rules
          </label>
          <TextArea
            value={formData.composition_rules}
            onChange={(value) => setFormData({ ...formData, composition_rules: value })}
            placeholder="Framing guidelines, perspective preferences, rule of thirds, symmetry, etc..."
            rows={3}
          />
          <p className="text-xs text-on-surface-variant mt-2">
            Define composition preferences like framing, camera angles, use of negative space, etc.
          </p>
        </div>

        {/* Color Palette */}
        <div>
          <label className="block text-sm font-bold text-on-surface-variant mb-4 uppercase tracking-wider">
            Color Palette
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-on-surface-variant mb-2">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.color_palette.primary}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      color_palette: { ...formData.color_palette, primary: e.target.value },
                    })
                  }
                  className="w-16 h-10 rounded border border-outline cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.color_palette.primary}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      color_palette: { ...formData.color_palette, primary: e.target.value },
                    })
                  }
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-on-surface-variant mb-2">Secondary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.color_palette.secondary}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      color_palette: { ...formData.color_palette, secondary: e.target.value },
                    })
                  }
                  className="w-16 h-10 rounded border border-outline cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.color_palette.secondary}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      color_palette: { ...formData.color_palette, secondary: e.target.value },
                    })
                  }
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-on-surface-variant mb-2">Accent Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.color_palette.accent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      color_palette: { ...formData.color_palette, accent: e.target.value },
                    })
                  }
                  className="w-16 h-10 rounded border border-outline cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.color_palette.accent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      color_palette: { ...formData.color_palette, accent: e.target.value },
                    })
                  }
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-on-surface-variant mb-2">Temperature</label>
              <Select
                value={formData.color_palette.temperature}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    color_palette: { ...formData.color_palette, temperature: e.target.value },
                  })
                }
              >
                <option value="cool">Cool</option>
                <option value="warm">Warm</option>
                <option value="neutral">Neutral</option>
                <option value="cool_dramatic">Cool Dramatic</option>
                <option value="warm_dramatic">Warm Dramatic</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Prompt Modifiers */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">
              Prompt Prefix
            </label>
            <Input
              value={formData.prompt_prefix}
              onChange={(e) => setFormData({ ...formData, prompt_prefix: e.target.value })}
              placeholder="Prepended to all prompts..."
            />
            <p className="text-xs text-on-surface-variant mt-2">
              Text added at the beginning of every prompt
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">
              Prompt Suffix
            </label>
            <Input
              value={formData.prompt_suffix}
              onChange={(e) => setFormData({ ...formData, prompt_suffix: e.target.value })}
              placeholder="Appended to all prompts..."
            />
            <p className="text-xs text-on-surface-variant mt-2">
              Text added at the end of every prompt
            </p>
          </div>
        </div>

        {/* Reference Strategy */}
        <div>
          <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">
            Reference Image Strategy
          </label>
          <Select
            value={formData.reference_strategy}
            onChange={(e) => setFormData({ ...formData, reference_strategy: e.target.value })}
          >
            <option value="none">None - Text prompts only</option>
            <option value="style_only">Style Only - Use reference images for visual consistency</option>
            <option value="adaptive">Adaptive - Combine style + scene-specific references</option>
          </Select>
          <p className="text-xs text-on-surface-variant mt-2">
            How reference images should be used during generation
          </p>
        </div>

        {/* Example Prompts */}
        <div>
          <label className="block text-sm font-bold text-on-surface-variant mb-4 uppercase tracking-wider">
            Example Prompts (Optional)
          </label>
          <p className="text-xs text-on-surface-variant mb-3">
            Provide 3 example prompts that demonstrate this style
          </p>
          {formData.example_prompts.map((prompt, idx) => (
            <Input
              key={idx}
              value={prompt}
              onChange={(e) => {
                const updated = [...formData.example_prompts];
                updated[idx] = e.target.value;
                setFormData({ ...formData, example_prompts: updated });
              }}
              placeholder={`Example prompt ${idx + 1}...`}
              className="mb-3"
            />
          ))}
        </div>

        {/* Reference Image URLs */}
        {formData.reference_strategy !== 'none' && (
          <div>
            <label className="block text-sm font-bold text-on-surface-variant mb-4 uppercase tracking-wider">
              Reference Image URLs (Optional)
            </label>
            <p className="text-xs text-on-surface-variant mb-3">
              Provide URLs to reference images for this style
            </p>
            {formData.reference_image_urls.map((url, idx) => (
              <Input
                key={idx}
                type="url"
                value={url}
                onChange={(e) => {
                  const updated = [...formData.reference_image_urls];
                  updated[idx] = e.target.value;
                  setFormData({ ...formData, reference_image_urls: updated });
                }}
                placeholder={`https://example.com/reference-${idx + 1}.jpg`}
                className="mb-3"
              />
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFormData({
                  ...formData,
                  reference_image_urls: [...formData.reference_image_urls, ''],
                });
              }}
            >
              <Icon name="add" size="sm" className="mr-2" />
              Add Another URL
            </Button>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-4 pt-4 border-t border-outline-variant/30">
          <Button type="submit" variant="primary" disabled={loading || !formData.name}>
            {loading ? 'Creating...' : 'Create Style Preset'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
