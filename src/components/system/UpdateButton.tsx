'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export function UpdateButton() {
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Listen for update responses
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const api = (window as any).electronAPI.updates;

      api.onAvailable(() => {
        setMessage('Update available! Check the notification banner.');
        setChecking(false);
      });

      api.onNotAvailable(() => {
        setMessage('You are running the latest version.');
        setChecking(false);
        setTimeout(() => setMessage(null), 5000);
      });

      api.onError((error: string) => {
        setMessage(`Error: ${error}`);
        setChecking(false);
      });
    }
  }, []);

  const handleCheckForUpdates = async () => {
    if (typeof window === 'undefined' || !(window as any).electronAPI) {
      setMessage('Updates not available (not running in Electron)');
      return;
    }

    setChecking(true);
    setMessage('Checking for updates...');

    try {
      const result = await (window as any).electronAPI.updates.checkForUpdates();
      if (!result.success) {
        setMessage(`Error: ${result.error}`);
        setChecking(false);
      }
      // Response will come via events (onAvailable or onNotAvailable)
    } catch (err) {
      setMessage('Failed to check for updates');
      setChecking(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        onClick={handleCheckForUpdates}
        disabled={checking}
      >
        {checking ? (
          <>
            <span className="material-symbols-outlined text-lg mr-2 animate-spin">
              autorenew
            </span>
            Checking...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-lg mr-2">
              system_update
            </span>
            Check for Updates
          </>
        )}
      </Button>

      {message && (
        <p className="text-sm text-on_surface_variant">{message}</p>
      )}
    </div>
  );
}
