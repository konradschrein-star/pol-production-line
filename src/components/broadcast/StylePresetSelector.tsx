'use client';

import { useState, useEffect } from 'react';
import { Select } from '@/components/ui/Select';
import { Icon } from '@/components/ui/Icon';

interface StylePreset {
  id: string;
  name: string;
  description: string | null;
  prompt_prefix: string | null;
  prompt_suffix: string | null;
  is_default: boolean;
}

interface StylePresetSelectorProps {
  value: string;
  onChange: (presetId: string) => void;
  className?: string;
}

export function StylePresetSelector({ value, onChange, className = '' }: StylePresetSelectorProps) {
  const [presets, setPresets] = useState<StylePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPresets = async () => {
      try {
        const response = await fetch('/api/style-presets');
        if (!response.ok) {
          throw new Error('Failed to load style presets');
        }

        const data = await response.json();
        setPresets(data.presets || []);

        // If no value is set and there's a default, use it
        if (!value && data.presets.length > 0) {
          const defaultPreset = data.presets.find((p: StylePreset) => p.is_default);
          if (defaultPreset) {
            onChange(defaultPreset.id);
          }
        }
      } catch (err) {
        console.error('Failed to load style presets:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadPresets();
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-on-surface-variant ${className}`}>
        <Icon name="autorenew" size="sm" className="animate-spin" />
        <span>Loading style presets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`px-4 py-3 bg-red-900/20 border-l-4 border-red-500 text-red-400 rounded ${className}`}>
        <div className="text-sm">{error}</div>
      </div>
    );
  }

  const selectedPreset = presets.find(p => p.id === value);

  return (
    <div className={className}>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>
          Select a visual style...
        </option>
        {presets.map(preset => (
          <option key={preset.id} value={preset.id} title={preset.description || preset.name}>
            {preset.name}{preset.is_default ? ' (Recommended)' : ''}
          </option>
        ))}
      </Select>

      {selectedPreset && selectedPreset.description && (
        <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
          {selectedPreset.description}
        </p>
      )}

      {selectedPreset && (
        <div className="mt-4 p-4 bg-surface-container-low rounded-lg border border-outline-variant/20">
          <div className="text-xs font-semibold text-on-surface-variant mb-2.5">
            Style Preview
          </div>
          <div className="space-y-2 text-xs font-mono text-on-surface-variant/70">
            {selectedPreset.prompt_prefix && (
              <div>
                <span className="text-primary">Prefix:</span> {selectedPreset.prompt_prefix}
              </div>
            )}
            <div>
              <span className="text-on-surface">Your prompt will appear here</span>
            </div>
            {selectedPreset.prompt_suffix && (
              <div>
                <span className="text-primary">Suffix:</span> {selectedPreset.prompt_suffix}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
