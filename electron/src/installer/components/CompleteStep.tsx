import React from 'react';
import type { WizardData } from '../index';

export interface CompleteStepProps {
  wizardData: WizardData;
  onLaunch: () => void;
}

/**
 * Complete step - Final page showing summary and launch button
 *
 * This is the last step of the wizard. It displays:
 * - Success message
 * - Installation summary
 * - Quick start information
 * - Launch button
 */
export function CompleteStep({ wizardData, onLaunch }: CompleteStepProps) {
  const [isLaunching, setIsLaunching] = React.useState(false);
  const [autoStart, setAutoStart] = React.useState(false);
  const [startMinimized, setStartMinimized] = React.useState(false);

  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      // Enable auto-start if user opted in
      if (autoStart && (window as any).electronAPI) {
        try {
          await (window as any).electronAPI.autoStart.enable(startMinimized);
        } catch (err) {
          console.error('Failed to enable auto-start:', err);
          // Don't block launch if auto-start fails
        }
      }

      await onLaunch();
    } catch (error) {
      console.error('Launch error:', error);
      alert('Failed to launch application. Please check the logs.');
      setIsLaunching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-900/30 text-5xl text-green-400 shadow-lg">
          ✓
        </div>
      </div>

      {/* Header */}
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold text-white">
          Installation Complete!
        </h2>
        <p className="text-gray-400">
          Obsidian News Desk is ready to use. Click "Launch Application" to start creating news videos.
        </p>
      </div>

      {/* Quick Start Guide */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6 shadow">
        <h3 className="mb-4 text-base font-semibold text-white">
          Quick Start Guide
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-3">
            <strong className="text-sm text-gray-300">Web Interface</strong>
            <span className="font-mono text-sm text-blue-400">
              http://localhost:8347
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-3">
            <strong className="text-sm text-gray-300">Storage Location</strong>
            <span className="truncate font-mono text-sm text-gray-400">
              {wizardData.storagePath}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-3">
            <strong className="text-sm text-gray-300">AI Provider</strong>
            <span className="text-sm capitalize text-gray-400">
              {wizardData.aiProvider}
            </span>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="rounded-lg border border-blue-700 bg-blue-900/20 p-4">
        <p className="text-sm text-blue-200">
          💡 <strong>Tip:</strong> The application will start automatically in your default browser.
          You can access it anytime at <span className="font-mono">http://localhost:8347</span>
        </p>
      </div>

      {/* Auto-Start Configuration (Phase 5) */}
      <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoStart}
            onChange={(e) => setAutoStart(e.target.checked)}
            className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-0"
          />
          <span className="text-sm font-medium text-gray-200">
            Start Obsidian News Desk when Windows starts
          </span>
        </label>

        {autoStart && (
          <label className="flex items-center space-x-3 cursor-pointer pl-8">
            <input
              type="checkbox"
              checked={startMinimized}
              onChange={(e) => setStartMinimized(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-0"
            />
            <span className="text-sm text-gray-300">
              Start minimized to system tray
            </span>
          </label>
        )}

        <p className="text-xs text-gray-500">
          You can change this later in Settings → Startup
        </p>
      </div>

      {/* Launch Button */}
      <div className="flex justify-center">
        <button
          onClick={handleLaunch}
          disabled={isLaunching}
          className="rounded-lg bg-green-600 px-10 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-green-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLaunching ? (
            <>
              <span className="inline-block animate-spin mr-2">⏳</span>
              Launching...
            </>
          ) : (
            'Launch Application'
          )}
        </button>
      </div>

      {/* Documentation Link */}
      <p className="text-center text-xs text-gray-500">
        For help and support, check the README.md in your installation directory
        <br />
        or visit our GitHub issues page.
      </p>
    </div>
  );
}
