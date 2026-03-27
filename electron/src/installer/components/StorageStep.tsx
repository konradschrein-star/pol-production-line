import React from 'react';

export interface StorageStepProps {
  initialPath: string;
  onValidate: (path: string, valid: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

interface DiskSpace {
  free: number;
  total: number;
}

/**
 * Storage step - Display fixed storage path and validate disk space
 *
 * NOTE: Storage path is FIXED at C:\Users\{username}\ObsidianNewsDesk\
 * Making it dynamic would require updating 15+ files in main app.
 */
export function StorageStep({ initialPath, onValidate, onNext, onBack }: StorageStepProps) {
  const [diskSpace, setDiskSpace] = React.useState<DiskSpace | null>(null);
  const [isValidating, setIsValidating] = React.useState(false);
  const [isValid, setIsValid] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isCreatingDirs, setIsCreatingDirs] = React.useState(false);

  // Get disk space on mount
  React.useEffect(() => {
    checkDiskSpace();
  }, [initialPath]);

  const checkDiskSpace = async () => {
    try {
      const space = await window.electronAPI.config.getDiskSpace(initialPath);
      setDiskSpace(space);
    } catch (err) {
      console.error('Failed to get disk space:', err);
    }
  };

  const validatePath = async () => {
    setIsValidating(true);
    setError(null);

    try {
      const result = await window.electronAPI.config.validateStoragePath(initialPath);

      if (result.valid) {
        setIsValid(true);
        onValidate(initialPath, true);
      } else {
        setIsValid(false);
        setError(result.error || 'Invalid storage path');
        onValidate(initialPath, false);
      }
    } catch (err) {
      setError('Failed to validate storage path');
      setIsValid(false);
      onValidate(initialPath, false);
    } finally {
      setIsValidating(false);
    }
  };

  const createDirectories = async () => {
    setIsCreatingDirs(true);
    setError(null);

    try {
      await window.electronAPI.config.createStorageDirectories(initialPath);
      setIsValid(true);
      onValidate(initialPath, true);
    } catch (err: any) {
      setError(err.message || 'Failed to create directories');
      setIsValid(false);
    } finally {
      setIsCreatingDirs(false);
    }
  };

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 ** 3);
    return `${gb.toFixed(1)} GB`;
  };

  const freeSpacePercentage = diskSpace
    ? ((diskSpace.free / diskSpace.total) * 100).toFixed(0)
    : 0;

  const hasEnoughSpace = diskSpace && diskSpace.free >= 10 * (1024 ** 3); // 10GB minimum

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Storage Location
        </h2>
        <p className="text-gray-400">
          All generated videos, images, and avatars will be stored in the location below.
          Make sure you have at least 10GB of free space.
        </p>
      </div>

      {/* Fixed Path Display */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6 shadow">
        <label className="mb-2 block text-sm font-medium text-gray-300">
          Storage Directory
        </label>

        <div className="flex items-center space-x-3">
          <div className="flex-1 rounded-lg border border-gray-600 bg-gray-900/50 px-4 py-3 font-mono text-sm text-gray-300">
            {initialPath}
          </div>

          <button
            onClick={validatePath}
            disabled={isValidating}
            className="rounded-lg border border-blue-600 bg-blue-600/20 px-4 py-3 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isValidating ? '⏳' : 'Validate'}
          </button>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          Note: Path is fixed to ensure compatibility with the main application
        </div>
      </div>

      {/* Disk Space Display */}
      {diskSpace && (
        <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6 shadow">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Disk Space</h3>
            <span className="text-sm text-gray-400">
              {formatBytes(diskSpace.free)} free of {formatBytes(diskSpace.total)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative h-3 overflow-hidden rounded-full bg-gray-700">
            <div
              className={`h-full transition-all ${
                hasEnoughSpace ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ width: `${100 - Number(freeSpacePercentage)}%` }}
            />
          </div>

          {!hasEnoughSpace && (
            <div className="mt-3 rounded-lg border border-yellow-700 bg-yellow-900/20 p-3">
              <p className="text-sm text-yellow-200">
                ⚠️ Warning: Less than 10GB free space available. Video production may fail.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Directory Structure Info */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6 shadow">
        <h3 className="mb-3 text-sm font-semibold text-white">
          Directory Structure
        </h3>

        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex items-start">
            <span className="mr-2 font-mono text-blue-400">images/</span>
            <span className="text-gray-400">Scene background images from Whisk API</span>
          </div>
          <div className="flex items-start">
            <span className="mr-2 font-mono text-blue-400">avatars/</span>
            <span className="text-gray-400">HeyGen avatar MP4 files (30-60 MB each)</span>
          </div>
          <div className="flex items-start">
            <span className="mr-2 font-mono text-blue-400">videos/</span>
            <span className="text-gray-400">Final rendered broadcast videos</span>
          </div>
        </div>

        <button
          onClick={createDirectories}
          disabled={isCreatingDirs || isValid}
          className="mt-4 w-full rounded-lg border border-green-600 bg-green-600/20 px-4 py-2 text-sm font-medium text-green-400 transition-colors hover:bg-green-600/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreatingDirs ? 'Creating...' : isValid ? '✓ Directories Ready' : 'Create Directories'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-700 bg-red-900/20 p-4">
          <p className="text-sm text-red-200">
            ❌ <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Success Display */}
      {isValid && (
        <div className="rounded-lg border border-green-700 bg-green-900/20 p-4">
          <p className="text-sm text-green-200">
            ✓ <strong>Success:</strong> Storage path is valid and directories are ready.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between border-t border-gray-700 pt-6">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-600 bg-gray-700 px-6 py-2 text-sm text-white shadow-sm transition-colors hover:bg-gray-600"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
