#!/usr/bin/env tsx
/**
 * Node.js wrapper for Python validation script.
 * Checks if HeyGen automation setup is complete.
 *
 * Usage: npm run validate:python
 */

import { spawn } from 'child_process';
import path from 'path';

const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || 'python';
const SCRIPT_PATH = path.join(
  process.cwd(),
  'integrations',
  'heygen-automation',
  'verify-setup.py'
);

function validatePythonSetup(): Promise<boolean> {
  return new Promise((resolve) => {
    console.log('🔍 Validating Python setup for HeyGen automation...\n');

    const python = spawn(PYTHON_EXECUTABLE, [SCRIPT_PATH], {
      stdio: 'inherit', // Show Python output directly
      cwd: process.cwd(),
      env: process.env
    });

    python.on('error', (error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.error('\n❌ Python not found!');
        console.error('   Install Python 3.8+ from https://www.python.org/downloads/');
        console.error(`   Or set PYTHON_EXECUTABLE in .env (currently: ${PYTHON_EXECUTABLE})\n`);
      } else {
        console.error('\n❌ Error running validation:', error.message);
      }
      resolve(false);
    });

    python.on('exit', (code) => {
      if (code === 0) {
        console.log('\n✅ Python setup validated successfully\n');
        resolve(true);
      } else {
        console.log('\n⚠️  Python setup incomplete - see errors above\n');
        resolve(false);
      }
    });
  });
}

// Run validation
validatePythonSetup()
  .then((isValid) => {
    process.exit(isValid ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
