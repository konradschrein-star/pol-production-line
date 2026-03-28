'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

export function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateReady, setUpdateReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if running in Electron
    if (typeof window === 'undefined' || !(window as any).electronAPI) {
      return;
    }

    const api = (window as any).electronAPI.updates;

    // Listen for update available
    api.onAvailable((info: any) => {
      setUpdateInfo({
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate,
      });
      setDismissed(false);
      setError(null);
    });

    // Listen for update not available
    api.onNotAvailable(() => {
      // User manually checked, no update found
      setUpdateInfo(null);
      setDismissed(true);
    });

    // Listen for download progress
    api.onProgress((progress: any) => {
      setDownloading(true);
      setDownloadProgress(Math.round(progress.percent));
      setError(null);
    });

    // Listen for update downloaded
    api.onDownloaded((info: any) => {
      setDownloading(false);
      setUpdateReady(true);
      setError(null);
    });

    // Listen for errors
    api.onError((errorMessage: string) => {
      setDownloading(false);
      setError(errorMessage);
    });

    // Cleanup listeners on unmount
    return () => {
      api.removeUpdateListeners();
    };
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const result = await (window as any).electronAPI.updates.downloadUpdate();
      if (!result.success) {
        setError(result.error || 'Download failed');
        setDownloading(false);
      }
    } catch (err) {
      setError('Failed to start download');
      setDownloading(false);
    }
  };

  const handleInstall = () => {
    // Quit and install update (restart app)
    if ((window as any).electronAPI) {
      (window as any).electronAPI.updates.installUpdate();
    }
  };

  if (dismissed || !updateInfo) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-96 bg-surface_container border border-outline_variant rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-primary/10 px-4 py-2 border-b border-outline_variant">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">
            system_update
          </span>
          <span className="font-bold text-sm text-on_surface">
            {error ? 'Update Error' : updateReady ? 'Update Ready' : 'Update Available'}
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-on_surface_variant hover:text-on_surface transition-colors"
          aria-label="Dismiss notification"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Error Display */}
        {error && (
          <div className="bg-error/10 border-l-4 border-error p-3 rounded">
            <p className="text-sm text-error font-medium">
              {error}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setError(null);
                setDismissed(true);
              }}
              className="mt-2"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Update Info */}
        {!error && updateInfo && (
          <div>
            <p className="text-sm text-on_surface">
              Version <strong>{updateInfo.version}</strong> is now available.
            </p>
            {updateInfo.releaseDate && (
              <p className="text-xs text-on_surface_variant mt-1">
                Released: {new Date(updateInfo.releaseDate).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Download Progress */}
        {downloading && !error && (
          <div>
            <div className="flex items-center justify-between text-xs text-on_surface_variant mb-1">
              <span>Downloading update...</span>
              <span>{downloadProgress}%</span>
            </div>
            <div className="w-full bg-surface_container_high rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        {!downloading && !updateReady && !error && updateInfo && (
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownload}
              className="flex-1"
            >
              <span className="material-symbols-outlined text-lg mr-1">download</span>
              Download Update
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDismissed(true)}
              className="flex-1"
            >
              Later
            </Button>
          </div>
        )}

        {updateReady && !error && (
          <div>
            <p className="text-sm text-on_surface mb-2">
              Update downloaded. Restart to install.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={handleInstall}
              className="w-full"
            >
              <span className="material-symbols-outlined text-lg mr-1">restart_alt</span>
              Restart Now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
