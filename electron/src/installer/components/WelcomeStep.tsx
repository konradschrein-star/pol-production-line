import React from 'react';

export interface WelcomeStepProps {
  onNext: () => void;
}

/**
 * Welcome step - Static intro page with system requirements
 *
 * This is the first step of the wizard. It displays:
 * - Welcome message
 * - System requirements checklist
 * - What will be installed
 */
export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Welcome to Obsidian News Desk
        </h2>
        <p className="text-gray-400">
          This wizard will guide you through the installation process. The setup takes approximately 5-10 minutes
          and will configure everything you need to start producing professional news videos.
        </p>
      </div>

      {/* System Requirements */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6 shadow">
        <h3 className="mb-4 text-base font-semibold text-white">
          System Requirements
        </h3>

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-500 text-gray-500">
              ○
            </div>
            <span className="text-sm text-gray-300">
              At least 10GB free disk space
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-500 text-gray-500">
              ○
            </div>
            <span className="text-sm text-gray-300">
              Minimum 8GB RAM recommended
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-500 text-gray-500">
              ○
            </div>
            <span className="text-sm text-gray-300">
              Node.js 18+ (bundled with installer)
            </span>
          </div>
        </div>
      </div>

      {/* What Will Be Installed */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6 shadow">
        <h3 className="mb-4 text-base font-semibold text-white">
          What will be installed
        </h3>

        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start">
            <span className="mr-2 mt-1 text-blue-400">→</span>
            <span>Next.js web application</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 mt-1 text-blue-400">→</span>
            <span>Docker containers (PostgreSQL and Redis)</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 mt-1 text-blue-400">→</span>
            <span>BullMQ job queue system</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 mt-1 text-blue-400">→</span>
            <span>Remotion video rendering engine</span>
          </li>
        </ul>
      </div>

      {/* Get Started Button */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-medium text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg"
        >
          Get Started →
        </button>
      </div>
    </div>
  );
}
