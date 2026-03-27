/**
 * Integration test for portable Node.js worker spawning
 *
 * Tests:
 * - Spawns worker using bundled Node.js
 * - Worker can import TypeScript modules via tsx
 * - Environment variables passed correctly
 * - stdout/stderr captured properly
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { resolveNodePath, getNodeRuntimeInfo } from '../src/lib/runtime/node-resolver';

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function logSuccess(message: string): void {
  console.log(`${GREEN}✓${RESET} ${message}`);
}

function logError(message: string): void {
  console.error(`${RED}✗${RESET} ${message}`);
}

function logInfo(message: string): void {
  console.log(`  ${message}`);
}

async function runTest(): Promise<void> {
  console.log('\n=== Portable Node.js Integration Test ===\n');

  // Step 1: Resolve Node.js runtime
  console.log('[Step 1] Resolving Node.js runtime...');
  let nodePath: string;
  let nodeInfo;

  try {
    nodeInfo = getNodeRuntimeInfo();
    nodePath = nodeInfo.path;
    logSuccess(`Resolved: ${nodePath}`);
    logInfo(`Version: ${nodeInfo.version}`);
    logInfo(`Source: ${nodeInfo.source}`);
  } catch (error: any) {
    logError(`Failed to resolve Node.js: ${error.message}`);
    process.exit(1);
  }

  // Step 2: Prepare worker script paths
  console.log('\n[Step 2] Preparing worker script paths...');
  const appDir = process.cwd();
  const workerScript = path.join(appDir, 'scripts', 'test-worker-simple.ts');
  const tsxPath = path.join(appDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');

  logInfo(`App directory: ${appDir}`);
  logInfo(`Worker script: ${workerScript}`);
  logInfo(`TSX path: ${tsxPath}`);

  // Step 3: Spawn worker process
  console.log('\n[Step 3] Spawning worker process...');

  const envVars = {
    ...process.env,
    TEST_VAR: 'integration_test',
    NODE_ENV: 'test',
  };

  const workerProcess: ChildProcess = spawn(nodePath, [tsxPath, workerScript], {
    cwd: appDir,
    shell: false,
    env: envVars,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  logSuccess('Worker process spawned');
  logInfo(`PID: ${workerProcess.pid}`);

  // Step 4: Capture output
  console.log('\n[Step 4] Capturing output...');

  let stdoutData = '';
  let stderrData = '';
  let hasOutput = false;

  if (workerProcess.stdout) {
    workerProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutData += output;
      hasOutput = true;
      console.log(`  [stdout] ${output.trim()}`);
    });
  }

  if (workerProcess.stderr) {
    workerProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderrData += output;
      console.error(`  [stderr] ${output.trim()}`);
    });
  }

  // Step 5: Wait for process to complete
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      workerProcess.kill('SIGKILL');
      reject(new Error('Worker process timeout (10 seconds)'));
    }, 10000);

    workerProcess.on('exit', (code, signal) => {
      clearTimeout(timeout);

      console.log(`\n[Step 5] Worker process completed`);
      logInfo(`Exit code: ${code}`);
      logInfo(`Signal: ${signal || 'none'}`);

      if (code === 0) {
        logSuccess('Worker exited successfully');
      } else {
        logError(`Worker exited with code ${code}`);
        reject(new Error(`Worker process failed with exit code ${code}`));
        return;
      }

      resolve();
    });

    workerProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  }).catch((error: any) => {
    logError(`Worker process error: ${error.message}`);
    process.exit(1);
  });

  // Step 6: Verify output
  console.log('\n[Step 6] Verifying output...');

  if (!hasOutput) {
    logError('No output received from worker');
    process.exit(1);
  }

  if (stdoutData.match(/v\d+\.\d+\.\d+/)) {
    logSuccess('Node.js version detected in output');
  } else {
    logError('Node.js version not found in output');
    process.exit(1);
  }

  if (stdoutData.includes('integration_test')) {
    logSuccess('Environment variable passed correctly');
  } else {
    logError('Environment variable not found in output');
    process.exit(1);
  }

  if (stderrData.length > 0) {
    logError('Unexpected stderr output detected');
    console.error(stderrData);
    process.exit(1);
  }

  // Summary
  console.log('\n=== Test Summary ===\n');
  console.log(`${GREEN}✅ All integration tests passed!${RESET}\n`);
  process.exit(0);
}

// Run test
runTest().catch((error) => {
  console.error(`${RED}Integration test failed:${RESET}`, error);
  process.exit(1);
});
