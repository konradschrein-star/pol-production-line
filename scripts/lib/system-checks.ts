/**
 * System Requirements Validation
 *
 * Checks CPU, RAM, disk space, and software dependencies.
 */

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface SystemCheckResult {
  passed: boolean;
  message: string;
  fix?: string;
  value?: string | number;
}

/**
 * Check CPU cores (minimum 4 for video rendering)
 */
export function checkCPUCores(): SystemCheckResult {
  const cores = os.cpus().length;
  const minimum = 4;

  if (cores >= minimum) {
    return {
      passed: true,
      message: `CPU cores: ${cores} (min: ${minimum})`,
      value: cores,
    };
  }

  return {
    passed: false,
    message: `CPU cores: ${cores} (min: ${minimum})`,
    fix: 'Video rendering requires at least 4 CPU cores. Consider upgrading your hardware.',
    value: cores,
  };
}

/**
 * Check RAM (minimum 8GB for video rendering)
 */
export function checkRAM(): SystemCheckResult {
  const totalMemoryBytes = os.totalmem();
  const totalMemoryGB = Math.round(totalMemoryBytes / (1024 ** 3));
  const minimum = 8;

  if (totalMemoryGB >= minimum) {
    return {
      passed: true,
      message: `RAM available: ${totalMemoryGB}GB (min: ${minimum}GB)`,
      value: totalMemoryGB,
    };
  }

  return {
    passed: false,
    message: `RAM available: ${totalMemoryGB}GB (min: ${minimum}GB)`,
    fix: 'Video rendering requires at least 8GB of RAM. Consider upgrading your hardware.',
    value: totalMemoryGB,
  };
}

/**
 * Check free disk space (minimum 10GB for video storage)
 */
export function checkDiskSpace(directoryPath: string): SystemCheckResult {
  try {
    let freeSpaceGB: number;

    if (process.platform === 'win32') {
      // Windows: Use wmic to get free space
      const drive = path.parse(directoryPath).root;
      const output = execSync(`wmic logicaldisk where "DeviceID='${drive.replace('\\', '')}'" get FreeSpace`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      const lines = output.trim().split('\n').filter(line => line.trim() && !line.includes('FreeSpace'));
      if (lines.length > 0) {
        const freeSpaceBytes = parseInt(lines[0].trim(), 10);
        freeSpaceGB = Math.round(freeSpaceBytes / (1024 ** 3));
      } else {
        throw new Error('Could not parse wmic output');
      }
    } else {
      // Unix-like: Use df command
      const output = execSync(`df -k "${directoryPath}" | tail -1 | awk '{print $4}'`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      const freeSpaceKB = parseInt(output.trim(), 10);
      freeSpaceGB = Math.round(freeSpaceKB / (1024 ** 2));
    }

    const minimum = 10;

    if (freeSpaceGB >= minimum) {
      return {
        passed: true,
        message: `Free disk space: ${freeSpaceGB}GB (min: ${minimum}GB)`,
        value: freeSpaceGB,
      };
    }

    return {
      passed: false,
      message: `Free disk space: ${freeSpaceGB}GB (min: ${minimum}GB)`,
      fix: 'Video production requires at least 10GB of free disk space. Clear some files and try again.',
      value: freeSpaceGB,
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Could not check disk space',
      fix: 'Unable to determine free disk space. Ensure the storage directory is accessible.',
    };
  }
}

/**
 * Check Node.js version (minimum 20.0.0)
 */
export function checkNodeVersion(): SystemCheckResult {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);
  const minimum = 20;

  if (major >= minimum) {
    return {
      passed: true,
      message: `Node.js version: ${version} (min: ${minimum}.0.0)`,
      value: version,
    };
  }

  return {
    passed: false,
    message: `Node.js version: ${version} (min: ${minimum}.0.0)`,
    fix: `Download Node.js ${minimum}.x or later from: https://nodejs.org/`,
    value: version,
  };
}

/**
 * Check if Docker is installed
 */
export function checkDockerInstalled(): SystemCheckResult {
  try {
    const output = execSync('docker --version', { encoding: 'utf8', stdio: 'pipe' });
    return {
      passed: true,
      message: `Docker installed: ${output.trim()}`,
      value: output.trim(),
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Docker is not installed',
      fix: 'Install Docker Desktop from: https://www.docker.com/products/docker-desktop/',
    };
  }
}

/**
 * Check if Docker daemon is running
 */
export function checkDockerRunning(): SystemCheckResult {
  try {
    execSync('docker ps', { encoding: 'utf8', stdio: 'pipe' });
    return {
      passed: true,
      message: 'Docker daemon is running',
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Docker daemon is not running',
      fix: 'Start Docker Desktop and wait for it to be ready, then try again.',
    };
  }
}

/**
 * Run all system checks
 */
export interface SystemRequirements {
  cpu: SystemCheckResult;
  ram: SystemCheckResult;
  disk: SystemCheckResult;
  node: SystemCheckResult;
  dockerInstalled: SystemCheckResult;
  dockerRunning: SystemCheckResult;
}

export function checkSystemRequirements(storageDir: string): SystemRequirements {
  return {
    cpu: checkCPUCores(),
    ram: checkRAM(),
    disk: checkDiskSpace(storageDir),
    node: checkNodeVersion(),
    dockerInstalled: checkDockerInstalled(),
    dockerRunning: checkDockerRunning(),
  };
}
