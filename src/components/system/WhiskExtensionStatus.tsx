'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

interface ExtensionStatus {
  installed: boolean;
  active: boolean;
  lastTokenUpdate: number | null;
  error?: string;
}

export function WhiskExtensionStatus({ showOnError = false }: { showOnError?: boolean }) {
  const [status, setStatus] = useState<ExtensionStatus>({
    installed: false,
    active: false,
    lastTokenUpdate: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkExtensionStatus();

    // Poll every 30 seconds
    const interval = setInterval(checkExtensionStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkExtensionStatus = async () => {
    try {
      const response = await fetch('/api/whisk/extension-status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setStatus({
        installed: false,
        active: false,
        lastTokenUpdate: null,
        error: 'Failed to check extension status',
      });
    } finally {
      setLoading(false);
    }
  };

  // Only show if there's an error and showOnError is true
  if (showOnError && status.active) {
    return null;
  }

  if (loading) {
    return null;
  }

  // Not installed - show warning
  if (!status.installed) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <Icon name="alert-triangle" className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-amber-200 font-medium mb-1">
              Whisk Token Extension Not Installed
            </h3>
            <p className="text-amber-100/70 text-sm mb-3">
              Install the Chrome extension for automatic Whisk token management. Without it, you'll need to manually refresh tokens every hour.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="/api/whisk/install-guide"
                target="_blank"
                className="text-sm bg-amber-500 text-black px-4 py-2 rounded-lg hover:bg-amber-400 transition-colors font-medium"
              >
                📖 Install Guide
              </a>
              <button
                onClick={checkExtensionStatus}
                className="text-sm text-amber-200 hover:text-amber-100 underline"
              >
                Recheck Status
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Installed but no recent token
  if (!status.active || !status.lastTokenUpdate) {
    return (
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <Icon name="alert-circle" className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-orange-200 font-medium mb-1">
              Whisk Extension Needs Activation
            </h3>
            <p className="text-orange-100/70 text-sm mb-3">
              Extension is installed but hasn't captured a token yet. It should auto-activate in the background.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  // Trigger manual refresh via API
                  await fetch('/api/whisk/trigger-refresh', { method: 'POST' });
                  setTimeout(checkExtensionStatus, 3000);
                }}
                className="text-sm bg-orange-500 text-black px-4 py-2 rounded-lg hover:bg-orange-400 transition-colors font-medium"
              >
                🔄 Activate Now
              </button>
              <button
                onClick={checkExtensionStatus}
                className="text-sm text-orange-200 hover:text-orange-100 underline"
              >
                Recheck Status
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // All good - show success (compact)
  const timeAgo = status.lastTokenUpdate
    ? Math.floor((Date.now() - status.lastTokenUpdate) / 1000 / 60)
    : null;

  return (
    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-3">
        <Icon name="check-circle" className="w-4 h-4 text-green-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-green-200 text-sm">
            Whisk Extension Active
            {timeAgo !== null && (
              <span className="text-green-100/60 ml-2">
                (token refreshed {timeAgo}m ago)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={checkExtensionStatus}
          className="text-xs text-green-200/60 hover:text-green-200"
        >
          ↻
        </button>
      </div>
    </div>
  );
}
