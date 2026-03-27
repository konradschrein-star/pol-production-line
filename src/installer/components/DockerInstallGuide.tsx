import React from 'react';

export interface DockerInstallGuideProps {
  /**
   * Callback when user dismisses the guide (e.g., after completing installation)
   */
  onDismiss?: () => void;
}

/**
 * Step-by-step visual guide for installing Docker Desktop on Windows
 *
 * Provides a 4-step wizard with:
 * 1. Download Docker Desktop
 * 2. Run the installer
 * 3. Restart computer
 * 4. Verify installation
 *
 * Includes system requirements, installation tips, and screenshot placeholders
 *
 * @example
 * ```tsx
 * const [showGuide, setShowGuide] = useState(false);
 *
 * {showGuide && (
 *   <DockerInstallGuide onDismiss={() => setShowGuide(false)} />
 * )}
 * ```
 */
export function DockerInstallGuide({ onDismiss }: DockerInstallGuideProps) {
  const [currentStep, setCurrentStep] = React.useState(0);

  const steps = [
    {
      title: 'Download Docker Desktop',
      description: 'Get the official Docker Desktop installer for Windows.',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Docker Desktop is a free application that provides containerization for Windows. You'll need it to run
            the Obsidian News Desk database and queue services.
          </p>
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
            <h4 className="mb-2 font-medium text-white">System Requirements:</h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-300">
              <li>Windows 10 64-bit: Pro, Enterprise, or Education (Build 19041 or higher)</li>
              <li>Windows 11 64-bit (all editions)</li>
              <li>WSL 2 backend (recommended)</li>
              <li>4GB RAM minimum (8GB+ recommended)</li>
            </ul>
          </div>
          <button
            onClick={() => {
              const url = 'https://www.docker.com/products/docker-desktop/';
              (window as any).electron?.shell?.openExternal?.(url) ||
                window.open(url, '_blank', 'noopener,noreferrer');
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download Docker Desktop for Windows
          </button>
          <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
            <p className="text-xs text-gray-400">[SCREENSHOT PLACEHOLDER: Docker Desktop download page]</p>
          </div>
        </div>
      ),
    },
    {
      title: 'Run the Installer',
      description: 'Launch the Docker Desktop installer and follow the setup wizard.',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Once the download completes, run the{' '}
            <code className="rounded bg-gray-800 px-2 py-1 text-sm text-blue-400">
              Docker Desktop Installer.exe
            </code>{' '}
            file.
          </p>
          <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-800 p-4">
            <div>
              <h4 className="mb-1 font-medium text-white">Installation Options:</h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-300">
                <li>
                  ✅ <strong>Use WSL 2 instead of Hyper-V</strong> (Recommended)
                </li>
                <li>✅ Add shortcut to desktop (optional)</li>
              </ul>
            </div>
            <div className="border-t border-gray-700 pt-3">
              <h4 className="mb-1 font-medium text-white">Installation Time:</h4>
              <p className="text-sm text-gray-300">
                ~5-10 minutes (downloads ~500MB of container runtime components)
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-yellow-700 bg-yellow-900/40 p-3">
            <p className="text-sm text-yellow-200">
              ⚠️ <strong>System restart required</strong> after installation
            </p>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
            <p className="text-xs text-gray-400">
              [SCREENSHOT PLACEHOLDER: Docker Desktop installer window with WSL 2 option checked]
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Restart Your Computer',
      description: 'Reboot Windows to complete Docker Desktop installation.',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Docker Desktop requires a system restart to enable container support (WSL 2 or Hyper-V).
          </p>
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
            <h4 className="mb-2 font-medium text-white">After Restart:</h4>
            <ol className="list-inside list-decimal space-y-1 text-sm text-gray-300">
              <li>Docker Desktop will launch automatically</li>
              <li>Accept the service agreement (if prompted)</li>
              <li>Skip Docker Hub sign-in (not required)</li>
              <li>Wait for "Docker Desktop is running" status</li>
            </ol>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
            <p className="text-xs text-gray-400">
              [SCREENSHOT PLACEHOLDER: Docker Desktop system tray icon showing "Docker Desktop is running"]
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Verify Installation',
      description: 'Confirm Docker Desktop is running and ready.',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Return to this installer to verify Docker Desktop is working correctly.
          </p>
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
            <h4 className="mb-2 font-medium text-white">Verification Checklist:</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-500">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                Docker Desktop installed
              </li>
              <li className="flex items-center gap-2">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-500">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                Docker engine running
              </li>
              <li className="flex items-center gap-2">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-500">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                System tray icon visible
              </li>
            </ul>
          </div>
          <button
            onClick={onDismiss}
            className="w-full rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white shadow transition-colors hover:bg-green-700"
          >
            I've Installed Docker Desktop
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
      <h2 className="mb-6 text-xl font-semibold text-white">Docker Desktop Installation Guide</h2>

      {/* Progress indicator */}
      <div className="mb-6 flex items-center gap-2">
        {steps.map((_, index) => (
          <React.Fragment key={index}>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
              }`}
            >
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 transition-colors ${
                  index < currentStep ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Current step content */}
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold text-white">
          Step {currentStep + 1}: {steps[currentStep].title}
        </h3>
        <p className="mb-4 text-sm text-gray-400">{steps[currentStep].description}</p>
        <div>{steps[currentStep].content}</div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
          disabled={currentStep === steps.length - 1}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
