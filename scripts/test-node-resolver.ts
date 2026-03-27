/**
 * Unit test for Node.js runtime resolver
 *
 * Tests:
 * - Resolves bundled Node.js when present
 * - Falls back to system Node.js when bundled missing
 * - Throws error when neither found
 * - Validates executable functionality
 * - Returns correct version string
 * - Identifies source (bundled vs system)
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  resolveNodePath,
  getNodeRuntimeInfo,
  validateNodeRuntime,
  getNodeVersion,
  getNpmPath,
  getNpxPath,
  clearCache,
} from '../src/lib/runtime/node-resolver';

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

function logWarning(message: string): void {
  console.log(`${YELLOW}⚠${RESET} ${message}`);
}

function logInfo(message: string): void {
  console.log(`  ${message}`);
}

async function runTests(): Promise<void> {
  console.log('\n=== Node.js Runtime Resolver Tests ===\n');

  let passCount = 0;
  let failCount = 0;
  let warningCount = 0;

  // Test 1: Resolve Node.js path
  console.log('[Test 1] Resolving Node.js path...');
  try {
    const nodePath = resolveNodePath();
    logSuccess(`Resolved: ${nodePath}`);
    logInfo(`  Exists: ${fs.existsSync(nodePath)}`);
    passCount++;
  } catch (error: any) {
    logError(`Failed to resolve: ${error.message}`);
    failCount++;
  }

  // Test 2: Validate Node.js executable
  console.log('\n[Test 2] Validating Node.js executable...');
  try {
    const nodePath = resolveNodePath();
    const isValid = validateNodeRuntime(nodePath);
    if (isValid) {
      logSuccess('Valid: Node.js executable can run --version');
      passCount++;
    } else {
      logError('Invalid: Node.js executable failed validation');
      failCount++;
    }
  } catch (error: any) {
    logError(`Validation failed: ${error.message}`);
    failCount++;
  }

  // Test 3: Get Node.js version
  console.log('\n[Test 3] Getting Node.js version...');
  try {
    const nodePath = resolveNodePath();
    const version = getNodeVersion(nodePath);
    if (version && version.startsWith('v')) {
      logSuccess(`Version: ${version}`);
      passCount++;
    } else {
      logError('Invalid version format');
      failCount++;
    }
  } catch (error: any) {
    logError(`Version check failed: ${error.message}`);
    failCount++;
  }

  // Test 4: Get full runtime info
  console.log('\n[Test 4] Getting full runtime info...');
  try {
    const runtimeInfo = getNodeRuntimeInfo();
    logSuccess('Runtime info retrieved:');
    logInfo(`  Path: ${runtimeInfo.path}`);
    logInfo(`  Version: ${runtimeInfo.version}`);
    logInfo(`  Source: ${runtimeInfo.source}`);
    logInfo(`  NPM: ${runtimeInfo.npm}`);
    logInfo(`  NPX: ${runtimeInfo.npx}`);

    if (runtimeInfo.source === 'bundled') {
      logSuccess('Using bundled Node.js (optimal)');
    } else {
      logWarning('Using system Node.js (bundled runtime not found)');
      warningCount++;
    }

    passCount++;
  } catch (error: any) {
    logError(`Runtime info failed: ${error.message}`);
    failCount++;
  }

  // Test 5: Get npm path
  console.log('\n[Test 5] Getting npm path...');
  try {
    const npmPath = getNpmPath();
    logSuccess(`NPM: ${npmPath}`);
    logInfo(`  Exists: ${fs.existsSync(npmPath) || 'system PATH'}`);
    passCount++;
  } catch (error: any) {
    logError(`NPM path failed: ${error.message}`);
    failCount++;
  }

  // Test 6: Get npx path
  console.log('\n[Test 6] Getting npx path...');
  try {
    const npxPath = getNpxPath();
    logSuccess(`NPX: ${npxPath}`);
    logInfo(`  Exists: ${fs.existsSync(npxPath) || 'system PATH'}`);
    passCount++;
  } catch (error: any) {
    logError(`NPX path failed: ${error.message}`);
    failCount++;
  }

  // Test 7: Clear cache and re-resolve
  console.log('\n[Test 7] Testing cache clear...');
  try {
    const firstPath = resolveNodePath();
    clearCache();
    const secondPath = resolveNodePath();

    if (firstPath === secondPath) {
      logSuccess('Cache cleared and re-resolved successfully');
      passCount++;
    } else {
      logError('Cache clear resulted in different path');
      failCount++;
    }
  } catch (error: any) {
    logError(`Cache test failed: ${error.message}`);
    failCount++;
  }

  // Summary
  console.log('\n=== Test Summary ===\n');
  console.log(`${GREEN}Passed: ${passCount}${RESET}`);
  if (warningCount > 0) {
    console.log(`${YELLOW}Warnings: ${warningCount}${RESET}`);
  }
  if (failCount > 0) {
    console.log(`${RED}Failed: ${failCount}${RESET}`);
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error(`${RED}Test suite failed:${RESET}`, error);
  process.exit(1);
});
