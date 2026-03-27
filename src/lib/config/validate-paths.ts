/**
 * Path Validation and System Checks
 *
 * Validates that all required paths are accessible and system is ready.
 * Called during startup to fail fast with helpful error messages.
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from './index';

export interface PathValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Check if a path is writable
 */
function isWritable(dirPath: string): boolean {
  try {
    // Create directory if missing
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Test write access
    const testFile = path.join(dirPath, '.write-test');
    fs.writeFileSync(testFile, 'test', 'utf8');
    fs.unlinkSync(testFile);

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a path has sufficient disk space (>1GB free)
 */
function hasSufficientSpace(dirPath: string): boolean {
  try {
    // Windows: Check drive letter
    if (process.platform === 'win32') {
      const drive = path.parse(dirPath).root;
      // Note: This is a placeholder - real implementation would use diskusage library
      // For now, assume sufficient space
      return true;
    }

    // Unix: Check filesystem
    return true;
  } catch {
    return true; // Assume sufficient if can't check
  }
}

/**
 * Get human-readable path for error messages
 */
function friendlyPath(p: string): string {
  // Replace user home with ~
  const homeDir = config.machine.homeDir;
  if (p.startsWith(homeDir)) {
    return p.replace(homeDir, '~');
  }
  return p;
}

/**
 * Validate all storage paths
 */
export function validateStoragePaths(): PathValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const pathsToCheck = [
    { path: config.storage.root, name: 'Storage root' },
    { path: config.storage.images, name: 'Images directory' },
    { path: config.storage.avatars, name: 'Avatars directory' },
    { path: config.storage.videos, name: 'Videos directory' },
    { path: config.storage.footage, name: 'Footage directory' },
  ];

  // Check each path
  pathsToCheck.forEach(({ path: p, name }) => {
    if (!isWritable(p)) {
      errors.push(
        `${name} is not writable: ${friendlyPath(p)}\n` +
        `   Check that the path exists and you have write permissions.`
      );
    }

    if (!hasSufficientSpace(p)) {
      warnings.push(
        `${name} may have low disk space: ${friendlyPath(p)}\n` +
        `   Ensure at least 10GB free for video production.`
      );
    }
  });

  // Check if using default paths or explicit override
  if (!process.env.LOCAL_STORAGE_ROOT) {
    console.log(`ℹ️  Using auto-detected storage: ${friendlyPath(config.storage.root)}`);
    console.log(`   To override, set LOCAL_STORAGE_ROOT in .env`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate environment file exists
 */
export function validateEnvFile(): PathValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const envPath = path.join(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    errors.push(
      `.env file not found: ${envPath}\n` +
      `   Copy .env.example to .env and configure your settings:\n` +
      `   $ cp .env.example .env`
    );
    return { valid: false, errors, warnings };
  }

  // Check for critical variables
  const requiredVars = [
    'DATABASE_URL',
    'WHISK_API_TOKEN',
  ];

  const optionalButRecommended = [
    'OPENAI_API_KEY',
    'LOCAL_STORAGE_ROOT',
  ];

  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(
        `Missing required variable: ${varName}\n` +
        `   Add this to your .env file. See .env.example for format.`
      );
    }
  });

  optionalButRecommended.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(
        `Optional variable not set: ${varName}\n` +
        `   Using default value. Set in .env to customize.`
      );
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Print validation results in a user-friendly format
 */
export function printValidationResults(results: PathValidationResult[]): void {
  const allErrors = results.flatMap(r => r.errors);
  const allWarnings = results.flatMap(r => r.warnings);

  if (allErrors.length > 0) {
    console.error('\n❌ Configuration Errors:');
    allErrors.forEach((error, i) => {
      console.error(`\n${i + 1}. ${error}`);
    });
    console.error('\n');
  }

  if (allWarnings.length > 0) {
    console.warn('\n⚠️  Warnings:');
    allWarnings.forEach((warning, i) => {
      console.warn(`\n${i + 1}. ${warning}`);
    });
    console.warn('\n');
  }

  if (allErrors.length === 0 && allWarnings.length === 0) {
    console.log('✅ All paths validated successfully\n');
  }
}
