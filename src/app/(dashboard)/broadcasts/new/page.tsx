'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { TextArea } from '@/components/ui/TextArea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { createJob } from '@/lib/utils/api';

export default function NewBroadcastPage() {
  const router = useRouter();
  const [script, setScript] = useState('');
  const [provider, setProvider] = useState('google');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setSubmitting(true);
    setError(null);

    try {
      const result = await createJob(script);
      router.push(`/jobs/${result.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="NEW BROADCAST"
        subtitle="Create a New Video Production Job"
      />

      <div className="max-w-4xl">
        <form onSubmit={handleSubmit}>
          <Card variant="default" className="mb-6">
            <div className="border-b border-outline-variant px-6 py-4">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                SCRIPT INPUT
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  AI Provider
                </label>
                <Select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="google">Google AI</option>
                  <option value="groq">Groq</option>
                </Select>
                <p className="mt-2 text-xs text-on-surface-variant">
                  This provider will analyze your script and generate scene
                  descriptions.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Raw Script
                </label>
                <TextArea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Paste your news script here...

Example:
Breaking news from Washington today as the Senate passes landmark legislation on climate policy. The bill, which has been months in the making, received bipartisan support with a final vote of 62-38. Environmental groups are calling this a historic victory, while industry leaders express concerns about implementation costs.

In other news, tensions continue to rise in Eastern Europe as diplomatic talks between neighboring nations have stalled. International observers are closely monitoring the situation..."
                  maxLength={10000}
                  rows={20}
                  className="font-mono text-sm"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-on-surface-variant">
                  <span>Minimum 100 characters required</span>
                  <span>
                    {script.length} / 10,000 characters
                  </span>
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-900/20 border-l-4 border-red-500 text-red-400">
                  {error}
                </div>
              )}
            </div>
          </Card>

          <div className="flex items-center gap-4">
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'CREATING JOB...' : 'CREATE BROADCAST'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={submitting}
            >
              CANCEL
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
