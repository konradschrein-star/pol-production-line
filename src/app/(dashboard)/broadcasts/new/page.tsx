'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { TextArea } from '@/components/ui/TextArea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { createJob } from '@/lib/utils/api';
import { StylePresetSelector } from '@/components/broadcast/StylePresetSelector';

export default function NewBroadcastPage() {
  const router = useRouter();
  const [script, setScript] = useState('');
  const [provider, setProvider] = useState('google'); // Default to google, will be loaded from settings
  const [stylePresetId, setStylePresetId] = useState(''); // Style preset for visual consistency
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Load AI provider from settings on mount
  useEffect(() => {
    const loadProvider = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const settings = await response.json();
          if (settings.AI_PROVIDER) {
            setProvider(settings.AI_PROVIDER);
            console.log('📋 Loaded AI provider from settings:', settings.AI_PROVIDER);
          }
        }
      } catch (err) {
        console.warn('Failed to load provider from settings, using default:', err);
      }
    };

    loadProvider();
  }, []);

  const handleAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setAvatarFile(file);
    } else {
      setError('Please upload a video file (MP4)');
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!script.trim()) {
      setError('Script cannot be empty');
      return;
    }

    if (script.trim().length < 100) {
      setError('Script must be at least 100 characters');
      return;
    }

    if (!avatarFile) {
      setError('Please upload the HeyGen avatar video');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Create FormData with script, avatar file, AI provider, style preset, and auto-approve flag
      const formData = new FormData();
      formData.append('raw_script', script);
      formData.append('provider', provider);
      formData.append('avatar', avatarFile);
      if (stylePresetId) {
        formData.append('style_preset_id', stylePresetId);
      }

      console.log('📤 Submitting with provider:', provider);
      if (stylePresetId) {
        console.log('📐 Using style preset:', stylePresetId);
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create job');
      }

      const result = await response.json();
      router.push(`/jobs/${result.job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="New Broadcast"
        subtitle="Create a new video production job"
      />

      <div className="max-w-3xl">
        <form onSubmit={handleSubmit}>
          <Card variant="default" className="mb-8">
            <div className="border-b border-outline-variant/30 px-8 py-5">
              <h2 className="text-base font-semibold text-white">
                Script Input
              </h2>
            </div>

            <div className="p-8 space-y-8">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant mb-2">
                  AI Provider
                  <a
                    href="/docs/USER_GUIDE.md#ai-providers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                    title="Learn about AI provider options"
                  >
                    <Icon name="help_outline" size="sm" />
                  </a>
                </label>
                <Select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  <option value="openai" title="ChatGPT models, balanced quality and speed">OpenAI (ChatGPT)</option>
                  <option value="claude" title="Premium quality, best for news analysis, requires paid API key">Claude (Anthropic)</option>
                  <option value="google" title="Free tier friendly (60 req/min), good quality, recommended for beginners">Google AI (Recommended)</option>
                  <option value="groq" title="Fastest processing, good for testing, may have rate limits">Groq</option>
                </Select>
                <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
                  This provider will analyze your script and generate scene
                  descriptions.
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant mb-2">
                  Visual Style Preset
                  <a
                    href="/docs/USER_GUIDE.md#style-presets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                    title="Learn about style presets"
                  >
                    <Icon name="help_outline" size="sm" />
                  </a>
                </label>
                <StylePresetSelector
                  value={stylePresetId}
                  onChange={setStylePresetId}
                />
                <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
                  Apply a consistent visual style to all generated images. This helps maintain a professional look across your entire broadcast.
                </p>
              </div>

              {/* Auto-approve temporarily disabled due to backend issues */}
              {/* TODO: Re-enable after fixing job_metadata column conflict */}

              <div>
                <label className="block text-sm font-semibold text-on-surface-variant mb-2">
                  Raw Script
                </label>
                <TextArea
                  value={script}
                  onChange={setScript}
                  placeholder="Paste your news script here...

Example:
Breaking news from Washington today as the Senate passes landmark legislation on climate policy. The bill, which has been months in the making, received bipartisan support with a final vote of 62-38. Environmental groups are calling this a historic victory, while industry leaders express concerns about implementation costs.

In other news, tensions continue to rise in Eastern Europe as diplomatic talks between neighboring nations have stalled. International observers are closely monitoring the situation..."
                  maxLength={10000}
                  rows={20}
                  className="font-mono text-sm"
                />
                <div className="mt-3 flex items-center justify-between text-xs text-on-surface-variant">
                  <span>Minimum 100 characters required</span>
                  <span>
                    {script.length} / 10,000 characters
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface-variant mb-2">
                  HeyGen Avatar Video
                </label>
                {avatarFile ? (
                  <div className="border-2 border-green-500 bg-green-900/10 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon name="check_circle" size="lg" className="text-green-500" />
                        <div>
                          <div className="text-sm font-medium text-white">
                            {avatarFile.name}
                          </div>
                          <div className="text-xs text-on-surface-variant mt-1">
                            {(avatarFile.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAvatarFile(null)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleAvatarDrop}
                    className={`border-2 border-dashed ${
                      dragActive ? 'border-primary bg-surface-container' : 'border-outline'
                    } p-12 text-center transition-colors`}
                  >
                    <Icon name="cloud_upload" size="xl" className="text-on-surface-variant mx-auto mb-4" />
                    <div className="text-sm text-on-surface mb-2">
                      Drag & drop your HeyGen avatar MP4 here
                    </div>
                    <div className="text-xs text-on-surface-variant mb-4">or</div>
                    <label>
                      <Button type="button" variant="secondary" size="sm">
                        Select File
                      </Button>
                      <input
                        type="file"
                        accept="video/mp4,video/quicktime"
                        onChange={handleAvatarSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
                <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
                  Upload the avatar video you created in HeyGen using this script. <span className="text-yellow-400 font-medium">⚠️ Critical: Must be MP4 with H.264 codec and 48kHz audio for proper sync.</span>
                  {' '}
                  <a
                    href="/docs/USER_GUIDE.md#avatar-generation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary"
                  >
                    See requirements
                  </a>
                </p>
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-900/20 border-l-4 border-red-500 text-red-400 rounded">
                  {error}
                </div>
              )}
            </div>
          </Card>

          <div className="flex items-center gap-4 pb-6">
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Creating Job...' : 'Create Broadcast'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
