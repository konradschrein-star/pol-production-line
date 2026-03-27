import React from 'react';
import { DockerStatusCard } from './DockerStatusCard';
import { DockerInstallGuide } from './DockerInstallGuide';

export interface PrerequisitesStepProps {
  /**
   * Callback when user clicks "Next" button
   */
  onNext?: () => void;

  /**
   * Callback when user clicks "Back" button
   */
  onBack?: () => void;
}

/**
 * Prerequisites checking step for the setup wizard
 *
 * Verifies that Docker Desktop is installed and running before allowing
 * the user to proceed to the next step.
 *
 * Features:
 * - Real-time Docker status checking
 * - Collapsible installation guide
 * - "Next" button disabled until Docker is running
 *
 * @example
 * ```tsx
 * <PrerequisitesStep
 *   onNext={() => setCurrentStep('configuration')}
 *   onBack={() => setCurrentStep('welcome')}
 * />
 * ```
 */
export function PrerequisitesStep({ onNext, onBack }: PrerequisitesStepProps) {
  const [dockerStatus, setDockerStatus] = React.useState<'checking' | 'installed' | 'not-installed' | 'error'>(
    'checking'
  );
  const [showGuide, setShowGuide] = React.useState(false);

  const canProceed = dockerStatus === 'installed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">Prerequisites Check</h2>
        <p className="text-gray-400">
          Obsidian News Desk requires Docker Desktop to run database and queue services.
        </p>
      </div>

      {/* Docker Status Card */}
      <DockerStatusCard onStatusChange={setDockerStatus} />

      {/* Show installation guide toggle */}
      {dockerStatus === 'not-installed' && !showGuide && (
        <button
          onClick={() => setShowGuide(true)}
          className="text-sm text-blue-400 underline transition-colors hover:text-blue-300"
        >
          Show Installation Guide
        </button>
      )}

      {/* Installation guide (collapsible) */}
      {showGuide && <DockerInstallGuide onDismiss={() => setShowGuide(false)} />}

      {/* Additional prerequisites can be added here */}
      {/* Example: Node.js check, Chrome extension, etc. */}

      {/* Navigation buttons */}
      <div className="flex justify-between border-t border-gray-700 pt-6">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-600 bg-gray-700 px-6 py-2 text-sm text-white shadow-sm transition-colors hover:bg-gray-600"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Help text when blocked */}
      {!canProceed && dockerStatus !== 'checking' && (
        <div className="rounded-lg border border-blue-700 bg-blue-900/20 p-4">
          <p className="text-sm text-blue-200">
            💡 <strong>Tip:</strong> Once Docker Desktop is installed and running, click the "Refresh" button above,
            then click "Next" to continue.
          </p>
        </div>
      )}
    </div>
  );
}
