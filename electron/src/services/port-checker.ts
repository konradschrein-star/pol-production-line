// Port availability checker
// Detects if required ports are already in use by other applications

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PortStatus {
  port: number;
  available: boolean;
  processName?: string;
  pid?: number;
}

const REQUIRED_PORTS = {
  nextjs: 8347,
  postgres: 5432,
  redis: 6379,
};

/**
 * Check if a specific port is available
 */
export async function checkPort(port: number): Promise<PortStatus> {
  try {
    // Use netstat to check if port is in use
    const { stdout } = await execAsync(
      `netstat -ano | findstr :${port}`,
      { timeout: 5000 }
    );

    if (stdout.trim()) {
      // Port is in use - try to extract PID
      const lines = stdout.trim().split('\n');
      const firstLine = lines[0];
      const parts = firstLine.trim().split(/\s+/);
      const pid = parseInt(parts[parts.length - 1], 10);

      // Try to get process name from PID
      let processName = 'Unknown';
      try {
        const { stdout: tasklistOutput } = await execAsync(
          `tasklist /FI "PID eq ${pid}" /FO CSV /NH`,
          { timeout: 5000 }
        );

        if (tasklistOutput.trim()) {
          // Parse CSV output: "processname.exe","PID","Session Name",...
          const match = tasklistOutput.match(/"([^"]+)"/);
          if (match) {
            processName = match[1];
          }
        }
      } catch (error) {
        // Ignore errors getting process name
      }

      return {
        port,
        available: false,
        processName,
        pid: isNaN(pid) ? undefined : pid,
      };
    }

    // Port is available
    return {
      port,
      available: true,
    };
  } catch (error) {
    // If netstat returns no output or error, port is likely available
    return {
      port,
      available: true,
    };
  }
}

/**
 * Check all required ports
 */
export async function checkAllPorts(): Promise<PortStatus[]> {
  const ports = Object.values(REQUIRED_PORTS);
  const results = await Promise.all(ports.map(port => checkPort(port)));
  return results;
}

/**
 * Get list of ports that are unavailable
 */
export async function getConflictingPorts(): Promise<PortStatus[]> {
  const allStatuses = await checkAllPorts();
  return allStatuses.filter(status => !status.available);
}

/**
 * Check if all required ports are available
 */
export async function areAllPortsAvailable(): Promise<boolean> {
  const conflicts = await getConflictingPorts();
  return conflicts.length === 0;
}

/**
 * Get human-readable port name
 */
export function getPortName(port: number): string {
  const entry = Object.entries(REQUIRED_PORTS).find(([_, p]) => p === port);
  return entry ? entry[0].toUpperCase() : `Port ${port}`;
}

/**
 * Get required ports mapping
 */
export function getRequiredPorts(): typeof REQUIRED_PORTS {
  return REQUIRED_PORTS;
}
