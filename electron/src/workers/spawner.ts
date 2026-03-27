// BullMQ worker process spawner

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

let workerProcess: ChildProcess | null = null;

export interface WorkerStatus {
  running: boolean;
  pid?: number;
  uptime?: number;
}

/**
 * Spawn BullMQ workers as a child process
 */
export function spawnWorkers(
  appDir: string,
  envVars: Record<string, string>,
  nodePath: string,
  onOutput?: (data: string) => void
): ChildProcess {
  // Kill existing worker process if running
  if (workerProcess) {
    killWorkers();
  }

  const workerScript = path.join(appDir, 'scripts', 'start-workers.ts');
  const tsxPath = path.join(appDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');

  // Use bundled Node.js to run tsx directly (no npx wrapper)
  workerProcess = spawn(nodePath, [tsxPath, workerScript], {
    cwd: appDir,
    shell: false, // Direct execution, no shell wrapper
    env: { ...process.env, ...envVars },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Handle stdout
  if (workerProcess.stdout) {
    workerProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (onOutput) {
        onOutput(output);
      }
      console.log('[Workers]', output);
    });
  }

  // Handle stderr
  if (workerProcess.stderr) {
    workerProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (onOutput) {
        onOutput(`[ERROR] ${output}`);
      }
      console.error('[Workers ERROR]', output);
    });
  }

  // Handle process exit
  workerProcess.on('exit', (code, signal) => {
    console.log(`[Workers] Process exited with code ${code}, signal ${signal}`);
    workerProcess = null;
  });

  // Handle process errors
  workerProcess.on('error', (error) => {
    console.error('[Workers] Process error:', error);
    workerProcess = null;
  });

  return workerProcess;
}

/**
 * Kill worker process gracefully
 */
export function killWorkers(): void {
  if (workerProcess) {
    console.log('[Workers] Stopping worker process...');

    // Try graceful shutdown first (SIGTERM)
    workerProcess.kill('SIGTERM');

    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (workerProcess && !workerProcess.killed) {
        console.log('[Workers] Force killing worker process...');
        workerProcess.kill('SIGKILL');
      }
    }, 5000);

    workerProcess = null;
  }
}

/**
 * Restart worker process
 */
export function restartWorkers(
  appDir: string,
  envVars: Record<string, string>,
  nodePath: string,
  onOutput?: (data: string) => void
): ChildProcess {
  killWorkers();

  // Wait a bit before restarting
  setTimeout(() => {
    spawnWorkers(appDir, envVars, nodePath, onOutput);
  }, 1000);

  return workerProcess!;
}

/**
 * Get worker process status
 */
export function getWorkerStatus(): WorkerStatus {
  if (!workerProcess || workerProcess.killed) {
    return { running: false };
  }

  return {
    running: true,
    pid: workerProcess.pid,
  };
}

/**
 * Check if workers are running
 */
export function areWorkersRunning(): boolean {
  return workerProcess !== null && !workerProcess.killed;
}

/**
 * Send message to worker process (if needed for future IPC)
 */
export function sendMessageToWorkers(message: any): boolean {
  if (workerProcess && workerProcess.stdin) {
    try {
      workerProcess.stdin.write(JSON.stringify(message) + '\n');
      return true;
    } catch (error) {
      console.error('[Workers] Failed to send message:', error);
      return false;
    }
  }
  return false;
}
