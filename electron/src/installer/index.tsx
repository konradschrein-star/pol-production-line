/**
 * React mounting entry point for the setup wizard
 *
 * This file exposes mounting functions on the window object
 * that are called by wizard.js when navigating between pages.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';

// Import components
import { ErrorBoundary } from './components/ErrorBoundary';
import { WelcomeStep } from './components/WelcomeStep';
import { PrerequisitesStep } from '../../../src/installer/components/PrerequisitesStep';
import { StorageStep } from './components/StorageStep';
import { ApiConfigStep } from './components/ApiConfigStep';
import { DatabaseStep } from './components/DatabaseStep';
import { InstallationStep } from './components/InstallationStep';
import { CompleteStep } from './components/CompleteStep';

// Type definitions for wizard data
export interface WizardData {
  storagePath: string;
  aiProvider: 'openai' | 'claude' | 'google' | 'groq';
  openaiKey?: string;
  claudeKey?: string;
  googleKey?: string;
  groqKey?: string;
  whiskToken?: string;
  databaseUrl?: string;
  redisUrl?: string;
}

// Extend window interface
declare global {
  interface Window {
    wizardData: WizardData;
    currentPage: number;
    nextPage: () => void;
    prevPage: () => void;
    mountWelcomeStep: () => void;
    mountPrerequisitesStep: () => void;
    mountStorageStep: () => void;
    mountApiConfigStep: () => void;
    mountDatabaseStep: () => void;
    mountInstallationStep: () => void;
    mountCompleteStep: () => void;
    electronAPI: any;
  }
}

// Root instances (for cleanup)
const roots = new Map<string, ReactDOM.Root>();

function mountComponent(elementId: string, component: React.ReactElement) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element #${elementId} not found`);
    return;
  }

  // Cleanup existing root if present
  const existingRoot = roots.get(elementId);
  if (existingRoot) {
    existingRoot.unmount();
  }

  // Create new root and render with error boundary
  const root = ReactDOM.createRoot(element);
  root.render(
    <ErrorBoundary>
      {component}
    </ErrorBoundary>
  );
  roots.set(elementId, root);
}

/**
 * Mount Welcome Step (Page 0)
 */
window.mountWelcomeStep = () => {
  mountComponent(
    'welcome-root',
    <WelcomeStep onNext={() => window.nextPage()} />
  );
};

/**
 * Mount Prerequisites Step (Page 1 - Docker Check)
 */
window.mountPrerequisitesStep = () => {
  mountComponent(
    'docker-root',
    <PrerequisitesStep
      onNext={() => window.nextPage()}
      onBack={() => window.prevPage()}
    />
  );
};

/**
 * Mount Storage Step (Page 2)
 */
window.mountStorageStep = () => {
  mountComponent(
    'storage-root',
    <StorageStep
      initialPath={window.wizardData.storagePath}
      onValidate={(path, valid) => {
        if (valid) {
          window.wizardData.storagePath = path;
        }
      }}
      onNext={() => window.nextPage()}
      onBack={() => window.prevPage()}
    />
  );
};

/**
 * Mount API Config Step (Page 3)
 */
window.mountApiConfigStep = () => {
  mountComponent(
    'api-root',
    <ApiConfigStep
      initialData={{
        aiProvider: window.wizardData.aiProvider,
        openaiKey: window.wizardData.openaiKey,
        claudeKey: window.wizardData.claudeKey,
        googleKey: window.wizardData.googleKey,
        groqKey: window.wizardData.groqKey,
        whiskToken: window.wizardData.whiskToken,
      }}
      onValidate={(data, valid) => {
        if (valid) {
          Object.assign(window.wizardData, data);
        }
      }}
      onNext={() => window.nextPage()}
      onBack={() => window.prevPage()}
    />
  );
};

/**
 * Mount Database Step (Page 4)
 */
window.mountDatabaseStep = () => {
  mountComponent(
    'database-root',
    <DatabaseStep
      onValidate={(valid) => {
        // Database validation complete
        console.log('Database validation:', valid);
      }}
      onNext={() => window.nextPage()}
      onBack={() => window.prevPage()}
    />
  );
};

/**
 * Mount Installation Step (Page 5)
 */
window.mountInstallationStep = () => {
  mountComponent(
    'install-root',
    <InstallationStep
      onComplete={() => window.nextPage()}
      onError={(error) => {
        console.error('Installation error:', error);
        alert(`Installation failed: ${error}`);
      }}
    />
  );
};

/**
 * Mount Complete Step (Page 6)
 */
window.mountCompleteStep = () => {
  mountComponent(
    'complete-root',
    <CompleteStep
      wizardData={window.wizardData}
      onLaunch={async () => {
        // Save config and close wizard
        await window.electronAPI.config.save(window.wizardData);
      }}
    />
  );
};

console.log('[WizardReact] Mounting functions registered');
