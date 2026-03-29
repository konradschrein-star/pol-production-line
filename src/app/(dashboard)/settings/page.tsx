'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StylePresetManager } from '@/components/settings/StylePresetManager';
import { StylePresetCreator } from '@/components/settings/StylePresetCreator';
import { UpdateButton } from '@/components/system/UpdateButton';

export default function SettingsPage() {
  // Active tab state
  const [activeTab, setActiveTab] = useState<'general' | 'styles'>('general');

  // AI Provider Settings
  const [aiProvider, setAiProvider] = useState('google');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [groqKey, setGroqKey] = useState('');

  // Database Settings
  const [databaseUrl, setDatabaseUrl] = useState('');

  // Redis Settings
  const [redisHost, setRedisHost] = useState('localhost');
  const [redisPort, setRedisPort] = useState('6379');
  const [redisPassword, setRedisPassword] = useState('');

  // Browser Settings
  const [defaultBrowser, setDefaultBrowser] = useState('edge');
  const [autoWhiskExtId, setAutoWhiskExtId] = useState('');

  // Avatar Generation Settings
  const [avatarMode, setAvatarMode] = useState('manual');
  const [heygenProfilePath, setHeygenProfilePath] = useState('');
  const [pythonExecutable, setPythonExecutable] = useState('python');

  // Remotion Settings
  const [remotionTimeout, setRemotionTimeout] = useState('300000');
  const [remotionConcurrency, setRemotionConcurrency] = useState('2');

  // Whisk Settings
  const [whiskToken, setWhiskToken] = useState('');
  const [whiskModel, setWhiskModel] = useState('IMAGEN_3_5');

  // Auto-Start Settings (Phase 5)
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [startMinimized, setStartMinimized] = useState(false);
  const [loadingAutoStart, setLoadingAutoStart] = useState(true);

  // Token Refresh State
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [tokenRefreshSuccess, setTokenRefreshSuccess] = useState(false);
  const [tokenRefreshError, setTokenRefreshError] = useState<string | null>(null);
  const [lastTokenRefresh, setLastTokenRefresh] = useState<number | null>(null);

  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Load current settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Load auto-start status (Electron only)
  useEffect(() => {
    loadAutoStartStatus();
  }, []);

  const loadAutoStartStatus = async () => {
    // Check if running in Electron
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        const result = await (window as any).electronAPI.autoStart.getStatus();
        if (result.success) {
          setAutoStartEnabled(result.enabled || false);
        }
        setLoadingAutoStart(false);
      } catch (err) {
        console.error('Failed to load auto-start status:', err);
        setLoadingAutoStart(false);
      }
    } else {
      // Not in Electron, hide auto-start controls
      setLoadingAutoStart(false);
    }
  };

  const handleToggleAutoStart = async (enabled: boolean) => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        const result = await (window as any).electronAPI.autoStart.toggle(
          enabled,
          startMinimized
        );
        if (result.success) {
          setAutoStartEnabled(enabled);
        } else {
          console.error('Failed to toggle auto-start:', result.error);
          setMessage({
            type: 'error',
            text: `❌ Failed to toggle auto-start: ${result.error}`,
          });
        }
      } catch (err) {
        console.error('Failed to toggle auto-start:', err);
        setMessage({
          type: 'error',
          text: '❌ Failed to toggle auto-start. Check console for details.',
        });
      }
    }
  };

  const handleToggleStartMinimized = async (minimized: boolean) => {
    setStartMinimized(minimized);
    // Re-apply auto-start with new minimized setting
    if (autoStartEnabled) {
      handleToggleAutoStart(true);
    }
  };

  const loadSettings = async () => {
    try {
      setError(null);
      setLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch('/api/settings', {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}: Failed to load settings`);
      }

      const data = await response.json();

      // Populate form with current values
      setAiProvider(data.AI_PROVIDER || 'google');
      setAnthropicKey(data.ANTHROPIC_API_KEY || '');
      setGoogleKey(data.GOOGLE_AI_API_KEY || '');
      setGroqKey(data.GROQ_API_KEY || '');
      setDatabaseUrl(data.DATABASE_URL || '');
      setRedisHost(data.REDIS_HOST || 'localhost');
      setRedisPort(data.REDIS_PORT || '6379');
      setRedisPassword(data.REDIS_PASSWORD || '');
      setDefaultBrowser(data.DEFAULT_BROWSER || 'edge');
      setAutoWhiskExtId(data.AUTO_WHISK_EXTENSION_ID || 'gcgblhgncmhjchllkcpcneeibddhmbbe');
      setAvatarMode(data.AVATAR_MODE || 'manual');
      setHeygenProfilePath(data.HEYGEN_PROFILE_PATH || './integrations/heygen-automation/heygen-chrome-profile');
      setPythonExecutable(data.PYTHON_EXECUTABLE || 'python');
      setRemotionTimeout(data.REMOTION_TIMEOUT_MS || '300000');
      setRemotionConcurrency(data.REMOTION_CONCURRENCY || '2');
      setWhiskToken(data.WHISK_API_TOKEN || '');
      setWhiskModel(data.WHISK_IMAGE_MODEL || 'IMAGEN_3_5');

      setLoading(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.name === 'AbortError'
            ? 'Request timed out after 10 seconds. The API may be slow or unresponsive.'
            : error.message
          : 'Unknown error occurred';

      console.error('Failed to load settings:', error);
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    setIsRefreshingToken(true);
    setTokenRefreshError(null);
    setTokenRefreshSuccess(false);

    try {
      const response = await fetch('/api/whisk/refresh-token', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setTokenRefreshSuccess(true);
        setLastTokenRefresh(data.timestamp);

        // Auto-hide success message after 5 seconds
        setTimeout(() => setTokenRefreshSuccess(false), 5000);

        // Reload settings to show updated token
        await loadSettings();
      } else {
        setTokenRefreshError(data.error || 'Token refresh failed');
      }
    } catch (err) {
      setTokenRefreshError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsRefreshingToken(false);
    }
  };

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
          DATABASE_URL: databaseUrl,
          REDIS_HOST: redisHost,
          REDIS_PORT: redisPort,
          REDIS_PASSWORD: redisPassword,
          DEFAULT_BROWSER: defaultBrowser,
          AUTO_WHISK_EXTENSION_ID: autoWhiskExtId,
          AVATAR_MODE: avatarMode,
          HEYGEN_PROFILE_PATH: heygenProfilePath,
          PYTHON_EXECUTABLE: pythonExecutable,
          REMOTION_TIMEOUT_MS: remotionTimeout,
          REMOTION_CONCURRENCY: remotionConcurrency,
          WHISK_API_TOKEN: whiskToken,
          WHISK_IMAGE_MODEL: whiskModel,
        }),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      setMessage({
        type: 'success',
        text: '✅ Settings saved to .env file! Restart workers for changes to take effect.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: '❌ Failed to save settings. Check console for details.',
      });
      console.error('Settings save error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !error) {
    return (
      <div>
        <PageHeader title="SETTINGS" subtitle="Loading..." />
        <div className="text-center py-12 text-on-surface-variant">
          Loading settings...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="SETTINGS" subtitle="Error Loading Settings" />
        <div className="max-w-3xl mx-auto">
          <div className="bg-error/10 border-l-4 border-error text-error p-6">
            <h3 className="font-bold text-lg mb-2">Failed to Load Settings</h3>
            <p className="mb-4">{error}</p>
            <button
              onClick={() => loadSettings()}
              className="bg-primary text-on-primary px-4 py-2 font-bold uppercase text-sm tracking-widest hover:bg-on-primary hover:text-primary border border-primary transition-colors duration-75"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="SETTINGS"
        subtitle="Configure system preferences and visual styles"
      />

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 border-b border-outline-variant/30">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 uppercase tracking-wider ${
            activeTab === 'general'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab('styles')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 uppercase tracking-wider ${
            activeTab === 'styles'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Visual Styles
        </button>
      </div>

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <div className="max-w-3xl space-y-6">
        {/* Auto-Start Section (Phase 5 - Electron only) */}
        {typeof window !== 'undefined' && (window as any).electronAPI && !loadingAutoStart && (
          <Card variant="default">
            <div className="border-b border-outline-variant px-6 py-4">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                🚀 STARTUP
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Automatically launch Obsidian News Desk when Windows starts
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-6">
                  <h3 className="font-bold text-on-surface mb-1">Start with Windows</h3>
                  <p className="text-sm text-on-surface-variant">
                    Automatically launch the app when you log in to Windows
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoStartEnabled}
                    onChange={(e) => handleToggleAutoStart(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-surface-container-high peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary shadow-md"></div>
                </label>
              </div>

              {autoStartEnabled && (
                <div className="flex items-center justify-between pl-4 border-l-2 border-outline-variant">
                  <div className="flex-1 mr-6">
                    <h3 className="font-bold text-on-surface mb-1">Start minimized to tray</h3>
                    <p className="text-sm text-on-surface-variant">
                      Launch app in system tray without showing the main window
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={startMinimized}
                      onChange={(e) => handleToggleStartMinimized(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-surface-container-high peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary shadow-md"></div>
                  </label>
                </div>
              )}

              <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-lg">
                <h4 className="font-bold text-blue-400 mb-2">💡 About Auto-Start</h4>
                <p className="text-xs text-blue-200 mb-2">
                  When enabled, the app will launch automatically when you log in to Windows. This is useful for keeping the system always ready for video production.
                </p>
                <ul className="text-xs text-blue-200 space-y-1 ml-4">
                  <li>• Windows registry entry: HKCU\Software\Microsoft\Windows\CurrentVersion\Run</li>
                  <li>• No admin privileges required</li>
                  <li>• Can be disabled anytime from this page</li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Software Updates Section (Phase 6) */}
        {typeof window !== 'undefined' && (window as any).electronAPI && (
          <Card variant="default">
            <div className="border-b border-outline-variant px-6 py-4">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                🔄 SOFTWARE UPDATES
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Keep Obsidian News Desk up to date with the latest features and fixes
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-bold text-on-surface mb-2">Current Version</h3>
                <p className="text-sm text-on-surface-variant">
                  Obsidian News Desk v1.0.0
                </p>
              </div>

              <div>
                <h3 className="font-bold text-on-surface mb-2">Check for Updates</h3>
                <p className="text-sm text-on-surface-variant mb-3">
                  The app automatically checks for updates every 6 hours. You can also check manually.
                </p>
                <UpdateButton />
              </div>

              <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-lg">
                <h4 className="font-bold text-blue-400 mb-2">📦 Auto-Update System</h4>
                <p className="text-xs text-blue-200 mb-2">
                  Updates are downloaded from GitHub Releases and installed automatically:
                </p>
                <ul className="text-xs text-blue-200 space-y-1 ml-4">
                  <li>• Checks on startup and every 6 hours</li>
                  <li>• Downloads in background with user consent</li>
                  <li>• Installs on app restart</li>
                  <li>• Release notes shown before download</li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* AI Provider Section */}
        <Card variant="default">
          <div className="border-b border-outline-variant px-6 py-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              🤖 AI SCRIPT ANALYSIS
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Choose which AI model analyzes your news scripts and generates scene descriptions
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                AI Provider
              </label>
              <Select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
              >
                <option value="claude">Claude 3.5 Sonnet (Anthropic) - Recommended</option>
                <option value="google">Gemini Pro (Google AI)</option>
                <option value="groq">Llama 3 (Groq)</option>
              </Select>
              <p className="text-xs text-on-surface-variant mt-2">
                Claude is most accurate for news analysis. Groq is fastest. Google is free tier friendly.
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Anthropic API Key
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Get your Claude API key from Anthropic Console"
                  className="text-on-surface-variant hover:text-primary transition-colors"
                >
                  <Icon name="help_outline" size="sm" />
                </a>
              </label>
              <Input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-api03-..."
              />
              <p className="text-xs text-on-surface-variant mt-2">
                Get your key at: <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com</a>
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Google AI API Key
                <a
                  href="https://ai.google.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Get your free Google AI API key"
                  className="text-on-surface-variant hover:text-primary transition-colors"
                >
                  <Icon name="help_outline" size="sm" />
                </a>
              </label>
              <Input
                type="password"
                value={googleKey}
                onChange={(e) => setGoogleKey(e.target.value)}
                placeholder="AIzaSy..."
              />
              <p className="text-xs text-on-surface-variant mt-2">
                Get your key at: <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a>
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Groq API Key
                <a
                  href="https://console.groq.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Get your Groq API key from Console"
                  className="text-on-surface-variant hover:text-primary transition-colors"
                >
                  <Icon name="help_outline" size="sm" />
                </a>
              </label>
              <Input
                type="password"
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
              />
              <p className="text-xs text-on-surface-variant mt-2">
                Get your key at: <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="underline">console.groq.com</a>
              </p>
            </div>
          </div>
        </Card>

        {/* Database Configuration */}
        <Card variant="default">
          <div className="border-b border-outline-variant px-6 py-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              💾 DATABASE
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              PostgreSQL connection for storing jobs and scenes
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Database URL
              </label>
              <Input
                type="text"
                value={databaseUrl}
                onChange={(e) => setDatabaseUrl(e.target.value)}
                placeholder="postgresql://user:password@localhost:5432/dbname"
              />
              <p className="text-xs text-on-surface-variant mt-2">
                Default (Docker): <code className="bg-surface px-1">postgresql://obsidian:obsidian_password@localhost:5433/obsidian_news</code>
              </p>
            </div>
          </div>
        </Card>

        {/* Redis Configuration */}
        <Card variant="default">
          <div className="border-b border-outline-variant px-6 py-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              🔄 REDIS QUEUE
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Redis connection for BullMQ job queues
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Host
                </label>
                <Input
                  type="text"
                  value={redisHost}
                  onChange={(e) => setRedisHost(e.target.value)}
                  placeholder="localhost"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Port
                </label>
                <Input
                  type="text"
                  value={redisPort}
                  onChange={(e) => setRedisPort(e.target.value)}
                  placeholder="6379"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Password
              </label>
              <Input
                type="password"
                value={redisPassword}
                onChange={(e) => setRedisPassword(e.target.value)}
                placeholder="redis_password"
              />
              <p className="text-xs text-on-surface-variant mt-2">
                Default (Docker): <code className="bg-surface px-1">obsidian_redis_password</code>
              </p>
            </div>
          </div>
        </Card>

        {/* Browser Automation */}
        <Card variant="default">
          <div className="border-b border-outline-variant px-6 py-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              🌐 BROWSER AUTOMATION
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Browser settings for HeyGen avatar generation and Google Wisk image generation
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Default Browser
              </label>
              <Select
                value={defaultBrowser}
                onChange={(e) => setDefaultBrowser(e.target.value)}
              >
                <option value="chrome">Chrome</option>
                <option value="edge">Edge (Recommended for Windows)</option>
                <option value="chromium">Chromium</option>
              </Select>
              <p className="text-xs text-on-surface-variant mt-2">
                Used when launching HeyGen for avatar creation. Make sure it's installed.
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                AutoWhisk Extension ID
              </label>
              <Input
                type="text"
                value={autoWhiskExtId}
                onChange={(e) => setAutoWhiskExtId(e.target.value)}
                placeholder="gcgblhgncmhjchllkcpcneeibddhmbbe"
              />
              <p className="text-xs text-on-surface-variant mt-2">
                Default ID works for most users. Only change if you have a custom version.
              </p>
            </div>
          </div>
        </Card>

        {/* Avatar Generation */}
        <Card variant="default">
          <div className="border-b border-outline-variant px-6 py-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              🎭 AVATAR GENERATION
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Choose between manual HeyGen browser launch or automated Python-based generation
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Avatar Generation Mode
              </label>
              <Select
                value={avatarMode}
                onChange={(e) => setAvatarMode(e.target.value)}
              >
                <option value="manual">Manual (Default) - Launch browser, generate manually</option>
                <option value="automated">Automated - Python browser automation (requires setup)</option>
              </Select>
              <p className="text-xs text-on-surface-variant mt-2">
                Manual mode: You control HeyGen browser. Automated mode: Python script handles everything.
              </p>
            </div>

            {avatarMode === 'automated' && (
              <>
                <div className="bg-yellow-900/20 border-l-4 border-yellow-500 p-4">
                  <h4 className="font-bold text-yellow-400 mb-2">⚠️ Automated Mode Prerequisites</h4>
                  <ul className="text-xs text-yellow-200 space-y-1">
                    <li>• Python 3.8+ installed</li>
                    <li>• Clone repository: <code className="bg-surface px-1">cd integrations && git clone https://github.com/marifaceless/heygen-web-automation.git heygen-automation</code></li>
                    <li>• Install dependencies: <code className="bg-surface px-1">cd integrations/heygen-automation && pip install -r requirements.txt && playwright install chromium</code></li>
                    <li>• One-time HeyGen login: <code className="bg-surface px-1">python setup_profile.py</code></li>
                    <li>• Verify setup: <code className="bg-surface px-1">npm run validate:python</code></li>
                  </ul>
                  <p className="text-xs text-yellow-200 mt-3">
                    See <code className="bg-surface px-1">integrations/heygen-automation/README.md</code> for full instructions.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                    HeyGen Chrome Profile Path
                  </label>
                  <Input
                    type="text"
                    value={heygenProfilePath}
                    onChange={(e) => setHeygenProfilePath(e.target.value)}
                    placeholder="./integrations/heygen-automation/heygen-chrome-profile"
                  />
                  <p className="text-xs text-on-surface-variant mt-2">
                    Created by <code className="bg-surface px-1">setup_profile.py</code>. Contains HeyGen login session.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                    Python Executable
                  </label>
                  <Input
                    type="text"
                    value={pythonExecutable}
                    onChange={(e) => setPythonExecutable(e.target.value)}
                    placeholder="python"
                  />
                  <p className="text-xs text-on-surface-variant mt-2">
                    Windows: Try <code className="bg-surface px-1">python</code>, <code className="bg-surface px-1">python3</code>, or full path like <code className="bg-surface px-1">C:\Python39\python.exe</code>
                  </p>
                </div>

                <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4">
                  <h4 className="font-bold text-blue-400 mb-2">💡 Tips for Automated Mode</h4>
                  <ul className="text-xs text-blue-200 space-y-1">
                    <li>• Test validation: <code className="bg-surface px-1">npm run validate:python</code></li>
                    <li>• Check worker logs: <code className="bg-surface px-1">npm run workers</code></li>
                    <li>• HeyGen UI changes may break automation (switch to manual if needed)</li>
                    <li>• Average generation time: 2-5 minutes per avatar</li>
                  </ul>
                </div>
              </>
            )}

            {avatarMode === 'manual' && (
              <div className="bg-green-900/20 border-l-4 border-green-500 p-4">
                <h4 className="font-bold text-green-400 mb-2">✅ Manual Mode (Current)</h4>
                <p className="text-xs text-green-200">
                  After images complete, you'll see a "LAUNCH HEYGEN BROWSER" button. Click it, generate the avatar in HeyGen web UI, then upload the .mp4 file. No Python setup required.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Whisk Configuration */}
        <Card variant="default">
          <div className="border-b border-outline-variant px-6 py-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              🎨 WHISK IMAGE GENERATION
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Google Whisk API for AI-powered image generation with reference support
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                API Token
                <a
                  href="/docs/REFERENCE.md#whisk-token-refresh"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Token expires every ~1 hour. See how to refresh."
                  className="text-on-surface-variant hover:text-primary transition-colors"
                >
                  <Icon name="help_outline" size="sm" />
                </a>
              </label>
              <Input
                type="password"
                value={whiskToken}
                onChange={(e) => setWhiskToken(e.target.value)}
                placeholder="ya29.a0..."
              />
              <div className="mt-2 text-xs text-on-surface-variant space-y-1">
                <p>Expires hourly. Get fresh token: F12 → Network → Generate image → Copy "Authorization" header</p>
                <p className="pt-1">1. Open <a href="https://labs.google.com/whisk" target="_blank" rel="noopener noreferrer" className="text-primary underline">labs.google.com/whisk</a></p>
                <p>2. Open DevTools (F12) → Network tab</p>
                <p>3. Generate a test image</p>
                <p>4. Find the request → Copy Authorization header value</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Image Model
              </label>
              <Select
                value={whiskModel}
                onChange={(e) => setWhiskModel(e.target.value)}
              >
                <option value="IMAGEN_3_5">Imagen 3.5 (Stable, Fast)</option>
                <option value="IMAGEN_4">Imagen 4 (Higher Quality, Beta)</option>
              </Select>
            </div>

            <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-lg">
              <h4 className="font-bold text-blue-400 mb-2">✨ Reference Images</h4>
              <p className="text-xs text-blue-200 mb-2">
                Upload references in the storyboard editor to guide image generation:
              </p>
              <ul className="text-xs text-blue-200 space-y-1 ml-4">
                <li><strong>Subject:</strong> Main object/character appearance</li>
                <li><strong>Scene:</strong> Background/environment style</li>
                <li><strong>Style:</strong> Overall visual aesthetic</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Token Management */}
        <Card variant="default">
          <div className="border-b border-outline-variant px-6 py-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              🔑 TOKEN MANAGEMENT
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Whisk API tokens expire every hour. The system automatically refreshes
              tokens when needed, but you can also refresh manually.
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleRefreshToken}
                disabled={isRefreshingToken}
                variant="secondary"
              >
                {isRefreshingToken ? (
                  <>
                    <Icon name="autorenew" size="sm" className="animate-spin mr-2" />
                    Refreshing Token...
                  </>
                ) : (
                  <>
                    <Icon name="refresh" size="sm" className="mr-2" />
                    Refresh Token Now
                  </>
                )}
              </Button>

              {lastTokenRefresh && (
                <span className="text-sm text-on-surface-variant">
                  Last refreshed: {new Date(lastTokenRefresh).toLocaleString()}
                </span>
              )}
            </div>

            {tokenRefreshError && (
              <div className="p-4 bg-error/10 border-l-4 border-error rounded-lg">
                <div className="flex items-start gap-3">
                  <Icon name="error" size="sm" className="text-error flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-error mb-1">Token Refresh Failed</h4>
                    <p className="text-sm text-error/90">{tokenRefreshError}</p>
                    <p className="text-xs text-error/70 mt-2">
                      Try signing in to Google in your Chrome browser, then retry.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {tokenRefreshSuccess && (
              <div className="p-4 bg-green-500/10 border-l-4 border-green-500 rounded-lg">
                <div className="flex items-start gap-3">
                  <Icon name="check_circle" size="sm" className="text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-green-400 mb-1">Token Refreshed Successfully</h4>
                    <p className="text-sm text-green-300">
                      Your Whisk API token has been updated and will expire in ~60 minutes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-lg">
              <h4 className="font-bold text-blue-400 mb-2">🤖 Automatic Refresh</h4>
              <p className="text-xs text-blue-200 mb-2">
                The system automatically refreshes expired tokens using your Chrome profile:
              </p>
              <ul className="text-xs text-blue-200 space-y-1 ml-4 mb-3">
                <li>• Detects 401 errors during image generation</li>
                <li>• Launches Chrome in headless mode (invisible)</li>
                <li>• Navigates to Whisk and captures fresh token</li>
                <li>• Updates .env file automatically</li>
                <li>• Retries failed image generation</li>
              </ul>
              <p className="text-xs text-blue-200">
                <strong>Requirements:</strong> Must be signed in to Google in Chrome (one-time setup)
              </p>
            </div>
          </div>
        </Card>

        {/* Remotion Rendering */}
        <Card variant="default">
          <div className="border-b border-outline-variant px-6 py-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              🎬 VIDEO RENDERING
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Remotion video rendering performance settings
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2"
                  title="Maximum time for video rendering (default: 300000ms = 5 minutes)"
                >
                  Timeout (ms)
                </label>
                <Input
                  type="text"
                  value={remotionTimeout}
                  onChange={(e) => setRemotionTimeout(e.target.value)}
                  placeholder="300000"
                />
                <p className="text-xs text-on-surface-variant mt-2">
                  Default: 5 minutes (300000 ms)
                </p>
              </div>

              <div>
                <label
                  className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2"
                  title="Number of parallel frames to render (2-8). Higher = faster but more CPU/RAM"
                >
                  Concurrency
                </label>
                <Input
                  type="text"
                  value={remotionConcurrency}
                  onChange={(e) => setRemotionConcurrency(e.target.value)}
                  placeholder="2"
                />
                <p className="text-xs text-on-surface-variant mt-2">
                  CPU cores to use (default: 2)
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Message Display */}
        {message && (
          <div
            className={`px-4 py-3 border-l-4 ${
              message.type === 'success'
                ? 'bg-green-900/20 border-green-500 text-green-400'
                : 'bg-red-900/20 border-red-500 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Save Button */}
        <div className="space-y-4">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? 'SAVING TO .ENV FILE...' : 'SAVE ALL SETTINGS'}
          </Button>

          <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Icon name="info" size="sm" className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-200">
                <strong className="block mb-1">Changes require worker restart (30-60 seconds)</strong>
                <p>After saving, restart workers for changes to take effect:</p>
                <div className="flex items-center gap-2 mt-2 font-mono">
                  <code className="bg-surface-container px-2 py-1 rounded">STOP.bat</code>
                  <span>→</span>
                  <code className="bg-surface-container px-2 py-1 rounded">START.bat</code>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Visual Styles Tab */}
      {activeTab === 'styles' && (
        <div className="max-w-6xl space-y-8">
          <StylePresetManager />
          <StylePresetCreator />
        </div>
      )}
    </div>
  );
}
