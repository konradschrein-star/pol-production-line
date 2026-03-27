# Installer Wizard - Developer Guide

## Overview

The Obsidian News Desk installer wizard is a hybrid React + vanilla JavaScript application that guides users through the setup process. This document provides guidance for developers working with the wizard.

## Architecture

### Hybrid Approach

The wizard uses a "progressive React migration" approach:
- **Shell:** `wizard.html` + `wizard.js` (vanilla JS for navigation)
- **UI Components:** React components (TypeScript + Tailwind CSS)
- **State Bridge:** `window.wizardData` shared between vanilla JS and React

```
┌─────────────────────────────────────┐
│  wizard.html (Shell)                │
│  ├── Header + Progress Bar          │
│  ├── Page 0: <div id="welcome-root">  ← React
│  ├── Page 1: <div id="docker-root">   ← React
│  ├── Page 2: <div id="storage-root">  ← React
│  ├── Page 3: <div id="api-root">      ← React
│  ├── Page 4: <div id="database-root"> ← React
│  ├── Page 5: <div id="install-root">  ← React
│  ├── Page 6: <div id="complete-root"> ← React
│  └── Footer + Navigation Buttons     │
└─────────────────────────────────────┘
```

## Development Workflow

### Prerequisites

- Node.js 20+
- TypeScript knowledge
- React knowledge
- Familiarity with Electron IPC

### Building the Wizard

```bash
# Development: Build wizard bundle
npm run electron:wizard

# Output: electron/dist/installer/wizard-react.js
# Size: ~437 KB (111 KB gzipped)
```

### Testing the Wizard

```bash
# Option 1: Test in full Electron app
npm run electron:compile
npm run electron

# Option 2: Test wizard HTML directly (no Electron)
# Open: electron/src/installer/pages/wizard.html in browser
# Note: IPC calls will fail, but UI will render
```

### Development Tips

1. **Hot Reload:** After changing React components, run `npm run electron:wizard` to rebuild
2. **Debug:** Use Chrome DevTools in Electron (Ctrl+Shift+I)
3. **State Inspection:** Check `window.wizardData` in console
4. **IPC Testing:** Check `window.electronAPI` availability

## File Structure

```
electron/src/installer/
├── components/              # React step components
│   ├── WelcomeStep.tsx
│   ├── StorageStep.tsx
│   ├── ApiConfigStep.tsx
│   ├── DatabaseStep.tsx
│   ├── InstallationStep.tsx
│   ├── CompleteStep.tsx
│   └── index.ts            # Re-exports
├── pages/
│   ├── wizard.html         # Shell HTML
│   └── splash.html         # Splash screen
├── styles/
│   └── wizard.css          # Global wizard styles
├── index.tsx               # React entry point (mounting functions)
├── wizard.js               # Navigation logic
└── README.md               # This file

electron/dist/installer/
└── wizard-react.js         # Bundled React components (generated)

electron/vite.config.ts     # Vite bundler config
```

## Adding a New Step

### Step 1: Create React Component

```tsx
// electron/src/installer/components/MyNewStep.tsx
import React from 'react';

export interface MyNewStepProps {
  onNext: () => void;
  onBack: () => void;
  onValidate?: (valid: boolean) => void;
}

export function MyNewStep({ onNext, onBack, onValidate }: MyNewStepProps) {
  const [isValid, setIsValid] = React.useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          My New Step
        </h2>
        <p className="text-gray-400">
          Description of what this step does.
        </p>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6 shadow">
        {/* Your form/content here */}
      </div>

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
```

### Step 2: Export Component

```typescript
// electron/src/installer/components/index.ts
export { MyNewStep } from './MyNewStep';
export type { MyNewStepProps } from './MyNewStep';
```

### Step 3: Add Mounting Function

```typescript
// electron/src/installer/index.tsx
import { MyNewStep } from './components/MyNewStep';

window.mountMyNewStep = () => {
  mountComponent(
    'mynewstep-root',
    <MyNewStep
      onNext={() => window.nextPage()}
      onBack={() => window.prevPage()}
    />
  );
};
```

### Step 4: Update wizard.html

```html
<!-- Add new page div -->
<div class="wizard-page" id="page-mynewstep">
  <div id="mynewstep-root"></div>
</div>
```

### Step 5: Update wizard.js

```javascript
// Update totalPages
const totalPages = 8; // Was 7, now 8

// Add case to mountReactComponentForPage
function mountReactComponentForPage(pageIndex) {
  switch (pageIndex) {
    // ... existing cases ...
    case 7: // New step
      window.mountMyNewStep();
      break;
  }
}
```

### Step 6: Rebuild and Test

```bash
npm run electron:wizard
npm run electron
```

## Design System Guidelines

### Colors

Use Tailwind classes with the dark theme:

```tsx
// Background colors
className="bg-gray-800"      // Card background
className="bg-gray-900"      // Input background
className="bg-blue-900/20"   // Info banner

// Text colors
className="text-white"       // Primary text
className="text-gray-400"    // Secondary text
className="text-blue-400"    // Links/accents

// Border colors
className="border-gray-700"  // Standard borders
className="border-blue-600"  // Active/focused
```

### Border Radius

```tsx
className="rounded-lg"       // 8px - inputs, buttons
className="rounded-xl"       // 12px - cards, containers
className="rounded-full"     // 9999px - pills, badges
```

### Shadows

```tsx
className="shadow"           // Standard card elevation
className="shadow-md"        // Elevated elements
className="shadow-lg"        // Modals, important elements
```

### Status Colors

```tsx
// Success
className="border-green-700 bg-green-900/20 text-green-200"

// Warning
className="border-yellow-700 bg-yellow-900/20 text-yellow-200"

// Error
className="border-red-700 bg-red-900/20 text-red-200"

// Info
className="border-blue-700 bg-blue-900/20 text-blue-200"
```

## IPC Communication

### Available IPC Handlers

All IPC handlers are accessed via `window.electronAPI`:

```typescript
// Config
await window.electronAPI.config.getDiskSpace(path: string)
await window.electronAPI.config.validateStoragePath(path: string)
await window.electronAPI.config.createStorageDirectories(path: string)
await window.electronAPI.config.validateAPIKey(provider: string, key: string)
await window.electronAPI.config.save(wizardData: WizardData)

// Docker
await window.electronAPI.docker.getStatus()
await window.electronAPI.docker.start()
await window.electronAPI.docker.startCompose()
await window.electronAPI.docker.waitForServices()
await window.electronAPI.docker.getContainerStatus()

// Workers
await window.electronAPI.workers.start()

// Progress Events
const unsubscribe = window.electronAPI.onProgress((message: string) => {
  console.log(message);
});
// Later: unsubscribe()
```

### Adding New IPC Handlers

If you need a new IPC handler:

1. **Add handler in `electron/src/main.ts`:**

```typescript
ipcMain.handle('config:myNewAction', async (event, arg1, arg2) => {
  // Your logic here
  return { success: true, data: result };
});
```

2. **Add to preload in `electron/src/preload.ts`:**

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  config: {
    myNewAction: (arg1, arg2) => ipcRenderer.invoke('config:myNewAction', arg1, arg2),
  },
});
```

3. **Use in React component:**

```typescript
const result = await window.electronAPI.config.myNewAction(arg1, arg2);
```

## State Management

### Wizard Data Schema

```typescript
interface WizardData {
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
```

### Reading Wizard Data

```typescript
// In React component
const currentPath = window.wizardData.storagePath;
const provider = window.wizardData.aiProvider;
```

### Updating Wizard Data

```typescript
// Via callback in props
function MyComponent({ onValidate }) {
  const handleUpdate = () => {
    const newData = { /* ... */ };
    onValidate(newData, true); // Updates window.wizardData
  };
}
```

## Validation Patterns

### Three-Tier Validation

1. **Client-side (Instant):**
   ```typescript
   const isValidKey = /^sk-[a-zA-Z0-9]{32,}$/.test(apiKey);
   ```

2. **Server-side (IPC):**
   ```typescript
   const result = await window.electronAPI.config.validateAPIKey(provider, key);
   setIsValid(result.valid);
   ```

3. **Installation-time (Final):**
   ```typescript
   // Validation happens during actual installation
   // Show errors in InstallationStep with retry
   ```

## Error Handling

### Visual Error Patterns

```tsx
// Inline field error
{error && (
  <div className="text-sm text-red-200 mt-2">
    ❌ <strong>Error:</strong> {error}
  </div>
)}

// Warning banner
<div className="rounded-lg border border-yellow-700 bg-yellow-900/20 p-4">
  <p className="text-sm text-yellow-200">
    ⚠️ {warningMessage}
  </p>
</div>

// Blocking modal
{criticalError && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
    <div className="bg-gray-800 rounded-xl p-6 max-w-md shadow-xl">
      <h3 className="text-xl font-bold text-red-400 mb-4">
        {errorTitle}
      </h3>
      <p className="text-gray-300 mb-6">{criticalError}</p>
      <button onClick={retry}>Retry</button>
    </div>
  </div>
)}
```

### Error Recovery Actions

Always provide recovery options:
- Network errors → **Retry** button
- Permission errors → **Open Folder** button
- Docker failures → **Open Docker Desktop** button

## Testing

### Manual Testing Checklist

- [ ] All 7 steps render without errors
- [ ] Navigation works (Back/Next buttons)
- [ ] Validation blocks invalid inputs
- [ ] IPC calls succeed (check logs)
- [ ] Design matches existing components
- [ ] Progress bar updates correctly
- [ ] Error messages are helpful
- [ ] Window transitions work (wizard → splash → main)

### Debugging Tips

```javascript
// Check React mounting
console.log('Mounting functions:', {
  welcome: !!window.mountWelcomeStep,
  docker: !!window.mountPrerequisitesStep,
  storage: !!window.mountStorageStep,
  api: !!window.mountApiConfigStep,
  database: !!window.mountDatabaseStep,
  install: !!window.mountInstallationStep,
  complete: !!window.mountCompleteStep,
});

// Check wizard data
console.log('Wizard data:', window.wizardData);

// Check IPC availability
console.log('IPC available:', !!window.electronAPI);

// Simulate page change
window.showPage(3); // Jump to API config page
```

## Common Issues

### 1. React Components Not Rendering

**Symptom:** Page shows empty `<div>` instead of React component

**Causes:**
- React bundle not loaded (`wizard-react.js` missing)
- Mounting function not called
- JavaScript error in component

**Solution:**
```bash
# Rebuild bundle
npm run electron:wizard

# Check browser console for errors
# Verify: electron/dist/installer/wizard-react.js exists
```

### 2. Tailwind Classes Not Working

**Symptom:** Components render but styling is broken

**Cause:** Tailwind CDN not loaded in wizard.html

**Solution:**
```html
<!-- Check wizard.html has this -->
<script src="https://cdn.tailwindcss.com"></script>
```

### 3. IPC Calls Failing

**Symptom:** `window.electronAPI is undefined` error

**Cause:** Running HTML outside Electron context

**Solution:**
- Must run via `npm run electron` (not directly in browser)
- Check `electron/src/preload.ts` is loaded

### 4. State Not Persisting

**Symptom:** Data resets when navigating between pages

**Cause:** Component not calling `onValidate` callback

**Solution:**
```typescript
// In component:
const handleChange = (value) => {
  onValidate({ myField: value }, true);
};
```

## Performance Optimization

### Bundle Size

Current: 437.84 KB (111.47 KB gzipped)

**If bundle exceeds 500KB:**
1. Code splitting (lazy load components)
2. Tree-shaking (remove unused Tailwind classes)
3. Minify with terser

### Load Time

Current: <500ms per step

**If load time exceeds 2s:**
1. Compile Tailwind CSS (remove CDN)
2. Lazy load components
3. Use React.memo() for expensive components

## Resources

- **React Docs:** https://react.dev
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Electron IPC:** https://www.electronjs.org/docs/latest/api/ipc-main
- **Vite:** https://vite.dev

## Support

For issues or questions:
1. Check `docs/PHASE3_IMPLEMENTATION_SUMMARY.md`
2. Check `docs/PHASE3_CHANGELOG.md`
3. Review existing components for patterns
4. Create GitHub issue with details

---

**Last Updated:** March 27, 2026
**Phase:** 3 of 7
**Status:** ✅ Implementation Complete
