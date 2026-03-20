'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export default function SettingsPage() {
  const [aiProvider, setAiProvider] = useState('google');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          AI_PROVIDER: aiProvider,
          ANTHROPIC_API_KEY: anthropicKey,
          GOOGLE_AI_API_KEY: googleKey,
          GROQ_API_KEY: groqKey,
        }),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to save settings. Check console for details.',
      });
      console.error('Settings save error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="SETTINGS"
        subtitle="Configure API Keys and Preferences"
      />

      <div className="max-w-3xl">
        {/* AI Provider Section */}
        <Card variant="default" className="mb-6">
          <div className="border-b border-outline-variant px-6 py-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              AI PROVIDER
            </h2>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Default Provider
              </label>
              <Select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
              >
                <option value="claude">Claude (Anthropic)</option>
                <option value="google">Google AI</option>
                <option value="groq">Groq</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Anthropic API Key
              </label>
              <Input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Google AI API Key
              </label>
              <Input
                type="password"
                value={googleKey}
                onChange={(e) => setGoogleKey(e.target.value)}
                placeholder="AI..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Groq API Key
              </label>
              <Input
                type="password"
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
              />
            </div>
          </div>
        </Card>

        {/* Browser Configuration */}
        <Card variant="default" className="mb-6">
          <div className="border-b border-outline-variant px-6 py-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              BROWSER AUTOMATION
            </h2>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Default Browser
              </label>
              <Select defaultValue="edge">
                <option value="chrome">Chrome</option>
                <option value="edge">Edge</option>
                <option value="chromium">Chromium</option>
              </Select>
            </div>

            <div className="text-sm text-on-surface-variant">
              <p>
                Browser automation is used for launching HeyGen for avatar
                generation. Make sure the selected browser is installed on your
                system.
              </p>
            </div>
          </div>
        </Card>

        {/* Message Display */}
        {message && (
          <div
            className={`px-4 py-3 mb-6 border-l-4 ${
              message.type === 'success'
                ? 'bg-green-900/20 border-green-500 text-green-400'
                : 'bg-red-900/20 border-red-500 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Save Button */}
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          className="w-full"
        >
          {saving ? 'SAVING...' : 'SAVE SETTINGS'}
        </Button>
      </div>
    </div>
  );
}
