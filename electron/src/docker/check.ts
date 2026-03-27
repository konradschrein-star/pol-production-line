// Docker Desktop detection and startup management

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface DockerStatus {
  installed: boolean;
  running: boolean;
  version?: string;
  error?: string;
}

/**
 * Check if Docker Desktop is installed on Windows
 */
export async function isDockerInstalled(): Promise<boolean> {
  try {
    // Check for Docker Desktop executable
    const dockerPaths = [
      'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Docker', 'Docker', 'Docker Desktop.exe'),
    ];

    for (const dockerPath of dockerPaths) {
      if (fs.existsSync(dockerPath)) {
        return true;
      }
    }

    // Also check if docker CLI is available
    const { stdout } = await execAsync('docker --version', { timeout: 5000 });
    return stdout.includes('Docker version');
  } catch (error) {
    return false;
  }
}

/**
 * Check if Docker daemon is running
 */
export async function isDockerRunning(): Promise<boolean> {
  try {
    await execAsync('docker info', { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get Docker version information
 */
export async function getDockerVersion(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('docker --version', { timeout: 5000 });
    const match = stdout.match(/Docker version ([\d.]+)/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Get comprehensive Docker status
 */
export async function getDockerStatus(): Promise<DockerStatus> {
  const status: DockerStatus = {
    installed: false,
    running: false,
  };

  try {
    // Check if installed
    status.installed = await isDockerInstalled();

    if (!status.installed) {
      status.error = 'Docker Desktop is not installed';
      return status;
    }

    // Check if running
    status.running = await isDockerRunning();

    if (!status.running) {
      status.error = 'Docker Desktop is installed but not running';
      return status;
    }

    // Get version
    status.version = await getDockerVersion() || undefined;

    return status;
  } catch (error: any) {
    status.error = error.message || 'Unknown error checking Docker status';
    return status;
  }
}

/**
 * Start Docker Desktop application
 */
export async function startDockerDesktop(): Promise<void> {
  const dockerPath = 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe';

  if (!fs.existsSync(dockerPath)) {
    throw new Error('Docker Desktop executable not found');
  }

  // Start Docker Desktop
  await execAsync(`"${dockerPath}"`);

  // Wait for Docker daemon to be ready (up to 60 seconds)
  const maxWaitTime = 60000; // 60 seconds
  const checkInterval = 1000; // 1 second
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    if (await isDockerRunning()) {
      return;
    }
    await sleep(checkInterval);
  }

  throw new Error('Docker Desktop failed to start within 60 seconds');
}

/**
 * Stop Docker Desktop (graceful shutdown)
 */
export async function stopDockerDesktop(): Promise<void> {
  try {
    // On Windows, we can't easily stop Docker Desktop programmatically
    // But we can stop all containers which is safer
    await execAsync('docker stop $(docker ps -aq)', { timeout: 30000 });
  } catch (error) {
    // Ignore errors - containers might already be stopped
  }
}

/**
 * Check if Docker Desktop requires a restart (e.g., after installation)
 */
export async function requiresRestart(): Promise<boolean> {
  // Check if Docker service is installed but daemon not responding
  const installed = await isDockerInstalled();
  const running = await isDockerRunning();

  // If installed but not running, might need restart
  if (installed && !running) {
    try {
      // Try to start it
      await execAsync('"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"', { timeout: 5000 });
      await sleep(3000);

      // Check again
      const stillNotRunning = !(await isDockerRunning());
      return stillNotRunning;
    } catch (error) {
      return true;
    }
  }

  return false;
}

/**
 * Utility function to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Download and install Docker Desktop
 * This launches the installer and waits for completion
 */
export async function installDockerDesktop(onProgress?: (message: string) => void): Promise<void> {
  const installerUrl = 'https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe';
  const installerPath = path.join(process.env.TEMP || 'C:\\Temp', 'DockerDesktopInstaller.exe');

  try {
    onProgress?.('Downloading Docker Desktop installer...');

    // Download installer (using PowerShell)
    await execAsync(
      `powershell -Command "Invoke-WebRequest -Uri '${installerUrl}' -OutFile '${installerPath}'"`,
      { timeout: 300000 } // 5 minutes for download
    );

    onProgress?.('Installing Docker Desktop...');

    // Run installer silently
    await execAsync(
      `"${installerPath}" install --quiet --accept-license`,
      { timeout: 600000 } // 10 minutes for installation
    );

    onProgress?.('Docker Desktop installed successfully');

    // Clean up installer
    try {
      fs.unlinkSync(installerPath);
    } catch (error) {
      // Ignore cleanup errors
    }

    // Note: System restart is typically required after first Docker install
    onProgress?.('Note: Windows may require a restart to complete Docker installation');
  } catch (error: any) {
    throw new Error(`Failed to install Docker Desktop: ${error.message}`);
  }
}
