import { useState, useEffect } from 'react';

// Match the interface from electron/src/docker/check.ts
export interface DockerStatus {
  installed: boolean;
  running: boolean;
  version?: string;
  error?: string;
  requiresRestart?: boolean;
}

export interface UseDockerStatusResult {
  status: DockerStatus | null;
  isLoading: boolean;
  checkStatus: () => Promise<void>;
  startDocker: () => Promise<void>;
  installDocker: () => Promise<void>;
}

/**
 * React hook for monitoring Docker Desktop status via IPC
 *
 * @param pollInterval - Milliseconds between status checks (0 = no polling)
 * @returns Docker status and control functions
 *
 * @example
 * ```tsx
 * const { status, isLoading, checkStatus, startDocker } = useDockerStatus(5000);
 *
 * if (isLoading) return <Spinner />;
 * if (!status?.running) {
 *   return <button onClick={startDocker}>Start Docker</button>;
 * }
 * ```
 */
export function useDockerStatus(pollInterval: number = 0): UseDockerStatusResult {
  const [status, setStatus] = useState<DockerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkStatus = async () => {
    try {
      setIsLoading(true);

      // Call IPC handler (uses window.electron from preload script)
      const result = await (window as any).electron.invoke('docker:getStatus');

      setStatus(result);
    } catch (error) {
      console.error('[useDockerStatus] Failed to check Docker status:', error);
      setStatus({
        installed: false,
        running: false,
        error: (error as Error).message || 'Unknown error checking Docker status',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startDocker = async () => {
    try {
      await (window as any).electron.invoke('docker:start');

      // Wait a moment for Docker to start, then re-check status
      await new Promise(resolve => setTimeout(resolve, 2000));
      await checkStatus();
    } catch (error) {
      console.error('[useDockerStatus] Failed to start Docker:', error);
      throw error;
    }
  };

  const installDocker = async () => {
    try {
      await (window as any).electron.invoke('docker:install');

      // Note: Requires system restart after install
      await checkStatus();
    } catch (error) {
      console.error('[useDockerStatus] Failed to install Docker:', error);
      throw error;
    }
  };

  // Initial check on mount
  useEffect(() => {
    checkStatus();
  }, []);

  // Optional polling for status changes
  useEffect(() => {
    if (pollInterval <= 0) return;

    const interval = setInterval(checkStatus, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]);

  return { status, isLoading, checkStatus, startDocker, installDocker };
}
