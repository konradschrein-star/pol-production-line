'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { StylePresetEditModal } from './StylePresetEditModal';

interface EnhancedStylePreset {
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

export function StylePresetManager() {
  const [presets, setPresets] = useState<EnhancedStylePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingPreset, setEditingPreset] = useState<EnhancedStylePreset | null>(null);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      setError(null);
      const response = await fetch('/api/style-presets');

      if (!response.ok) {
        throw new Error('Failed to load style presets');
      }

      const data = await response.json();
      setPresets(data.presets || []);
    } catch (error) {
      console.error('Failed to load presets:', error);
      setError(error instanceof Error ? error.message : 'Failed to load presets');
    } finally {
      setLoading(false);
    }
  };

  const deletePreset = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" style preset? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/style-presets?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadPresets();
      } else {
        const data = await response.json();
        alert(`Failed to delete: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete preset:', error);
      alert('Failed to delete preset. Check console for details.');
    }
  };

  if (loading) {
    return (
      <Card variant="default">
        <div className="p-8 text-center text-on-surface-variant">
          Loading style presets...
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="default">
        <div className="p-8">
          <div className="bg-error/10 border-l-4 border-error text-error p-4">
            <h3 className="font-bold mb-2">Failed to Load Style Presets</h3>
            <p className="text-sm mb-4">{error}</p>
            <Button variant="secondary" size="sm" onClick={loadPresets}>
              Retry
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* Edit Modal */}
      {editingPreset && (
        <StylePresetEditModal
          preset={editingPreset}
          isOpen={!!editingPreset}
          onClose={() => setEditingPreset(null)}
          onSave={() => {
            setEditingPreset(null);
            loadPresets(); // Refresh list after save
          }}
        />
      )}

      <Card variant="default">
        <div className="border-b border-outline-variant/30 px-8 py-5">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">
            🎨 Style Preset Library
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Manage visual styles for consistent imagery across broadcasts
          </p>
        </div>

      <div className="p-8 space-y-4">
        {presets.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant">
            No style presets found. Create one below to get started.
          </div>
        ) : (
          presets.map((preset) => (
            <div
              key={preset.id}
              className="border border-outline-variant/30 rounded-lg overflow-hidden hover:border-outline-variant/50 transition-colors"
            >
              {/* Preset Header */}
              <div
                className="p-6 cursor-pointer hover:bg-surface-container-low transition-colors"
                onClick={() => setExpandedId(expandedId === preset.id ? null : preset.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-bold text-white uppercase tracking-wider">
                        {preset.name}
                      </h3>
                      {preset.is_default && (
                        <Badge variant="default">Default</Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {preset.reference_strategy}
                      </Badge>
                    </div>
                    {preset.description && (
                      <p className="text-sm text-on-surface-variant">
                        {preset.description}
                      </p>
                    )}
                  </div>
                  <Icon
                    name={expandedId === preset.id ? 'expand_less' : 'expand_more'}
                    className="text-on-surface-variant"
                  />
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === preset.id && (
                <div className="border-t border-outline-variant/30 bg-surface-container-lowest p-6 space-y-6">
                  {preset.visual_guidelines && (
                    <div>
                      <h4 className="text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wider">
                        Visual Guidelines
                      </h4>
                      <p className="text-sm text-on-surface leading-relaxed">
                        {preset.visual_guidelines}
                      </p>
                    </div>
                  )}

                  {preset.composition_rules && (
                    <div>
                      <h4 className="text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wider">
                        Composition Rules
                      </h4>
                      <p className="text-sm text-on-surface leading-relaxed">
                        {preset.composition_rules}
                      </p>
                    </div>
                  )}

                  {preset.color_palette && Object.keys(preset.color_palette).length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wider">
                        Color Palette
                      </h4>
                      <div className="flex gap-4 flex-wrap">
                        {Object.entries(preset.color_palette).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <div
                              className="w-10 h-10 rounded-lg border border-outline shadow-sm"
                              style={{ backgroundColor: value as string }}
                              title={value as string}
                            />
                            <span className="text-xs text-on-surface-variant capitalize font-mono">
                              {key}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {preset.prompt_prefix || preset.prompt_suffix ? (
                    <div>
                      <h4 className="text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wider">
                        Prompt Modifiers
                      </h4>
                      <div className="space-y-2">
                        {preset.prompt_prefix && (
                          <div>
                            <span className="text-xs text-on-surface-variant block mb-1">Prefix:</span>
                            <code className="text-sm text-on-surface font-mono bg-surface-container p-3 rounded block">
                              {preset.prompt_prefix}
                            </code>
                          </div>
                        )}
                        {preset.prompt_suffix && (
                          <div>
                            <span className="text-xs text-on-surface-variant block mb-1">Suffix:</span>
                            <code className="text-sm text-on-surface font-mono bg-surface-container p-3 rounded block">
                              {preset.prompt_suffix}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {preset.example_prompts && preset.example_prompts.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wider">
                        Example Prompts
                      </h4>
                      <ul className="space-y-2">
                        {preset.example_prompts.map((prompt, idx) => (
                          <li
                            key={idx}
                            className="text-sm text-on-surface font-mono bg-surface-container p-3 rounded leading-relaxed"
                          >
                            {prompt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {preset.reference_image_urls && preset.reference_image_urls.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wider">
                        Reference Images
                      </h4>
                      <div className="flex gap-3 flex-wrap">
                        {preset.reference_image_urls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Reference ${idx + 1}`}
                            className="w-32 h-32 object-cover rounded-lg border border-outline shadow-sm"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {!preset.is_default && (
                    <div className="pt-4 border-t border-outline-variant/30 flex gap-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingPreset(preset)}
                      >
                        <Icon name="edit" size="sm" className="mr-2" />
                        Edit Preset
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePreset(preset.id, preset.name)}
                      >
                        <Icon name="delete" size="sm" className="mr-2" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
    </>
  );
}
