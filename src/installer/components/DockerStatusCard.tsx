import React from 'react';
import { useDockerStatus } from '../hooks/useDockerStatus';

export interface DockerStatusCardProps {
  /**
   * Callback when Docker status changes
   * @param status - Current status: checking, installed, not-installed, or error
   */
  onStatusChange?: (status: 'checking' | 'installed' | 'not-installed' | 'error') => void;
}

/**
 * Visual status indicator for Docker Desktop installation and running state
 *
 * Displays one of four states:
 * 1. Loading: Checking Docker status (spinner)
 * 2. Success: Docker installed and running (green checkmark)
 * 3. Warning: Docker installed but not running (yellow, with "Start Docker" button)
 * 4. Error: Docker not installed (red, with "Download" button)
 *
 * @example
 * ```tsx
 * <DockerStatusCard
 *   onStatusChange={(status) => {
 *     setCanProceed(status === 'installed');
 *   }}
 * />
 * ```
 */
export function DockerStatusCard({ onStatusChange }: DockerStatusCardProps) {
  const { status, isLoading, checkStatus, startDocker } = useDockerStatus(0);

  // Notify parent of status changes
  React.useEffect(() => {
    if (!status || isLoading) {
      onStatusChange?.('checking');
      return;
    }

    if (status.error && !status.installed) {
      onStatusChange?.('not-installed');
    } else if (status.installed && status.running) {
      onStatusChange?.('installed');
    } else if (status.installed && !status.running) {
      onStatusChange?.('error'); // Not running counts as error for workflow blocking
    } else {
      onStatusChange?.('not-installed');
    }
  }, [status, isLoading, onStatusChange]);

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-6 shadow">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500" />
          <span className="text-gray-300">Checking Docker Desktop...</span>
        </div>
      </div>
    );
  }

  if (!status) return null;

  // Success: Docker installed and running
  if (status.installed && status.running) {
    return (
      <div className="rounded-xl border border-green-700 bg-green-900/20 p-6 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">Docker Desktop Installed</h3>
              <p className="text-sm text-gray-300">
                {status.version ? `Version ${status.version}` : 'Running'}
              </p>
            </div>
          </div>
          <button
            onClick={checkStatus}
            className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-gray-600"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  // Warning: Docker installed but not running
  if (status.installed && !status.running) {
    return (
      <div className="rounded-xl border border-yellow-700 bg-yellow-900/20 p-6 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500 shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">Docker Desktop Not Running</h3>
              <p className="text-sm text-gray-300">Please start Docker Desktop to continue</p>
            </div>
          </div>
          <button
            onClick={startDocker}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700"
          >
            Start Docker
          </button>
        </div>
      </div>
    );
  }

  // Error: Docker not installed
  return (
    <div className="rounded-xl border border-red-700 bg-red-900/20 p-6 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 shadow-lg">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-white">Docker Desktop Not Installed</h3>
          <p className="text-sm text-gray-300">Required for running database and queue services</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => {
            const url = 'https://www.docker.com/products/docker-desktop/';
            (window as any).electron?.shell?.openExternal?.(url) ||
              window.open(url, '_blank', 'noopener,noreferrer');
          }}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700"
        >
          Download Docker Desktop
        </button>
        <button
          onClick={checkStatus}
          className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-gray-600"
        >
          Refresh
        </button>
      </div>

      {status.requiresRestart && (
        <div className="mt-4 rounded-lg border border-yellow-700 bg-yellow-900/40 p-3">
          <p className="text-sm text-yellow-200">⚠️ System restart required after Docker installation</p>
        </div>
      )}
    </div>
  );
}
