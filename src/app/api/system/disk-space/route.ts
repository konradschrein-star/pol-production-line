import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ErrorCode, createErrorResponse, logError } from '@/lib/errors/error-codes';

const execAsync = promisify(exec);

/**
 * GET /api/system/disk-space
 * Returns disk space information for the C: drive
 */
export async function GET() {
  try {
    // Windows command to check C: drive space
    const { stdout } = await execAsync(
      'wmic logicaldisk where "DeviceID=\'C:\'" get FreeSpace,Size /format:value'
    );

    const freeMatch = stdout.match(/FreeSpace=(\d+)/);
    const sizeMatch = stdout.match(/Size=(\d+)/);

    if (!freeMatch || !sizeMatch) {
      throw new Error('Failed to parse disk space output');
    }

    const freeBytes = parseInt(freeMatch[1]);
    const totalBytes = parseInt(sizeMatch[1]);

    const freeGB = freeBytes / 1024 ** 3;
    const totalGB = totalBytes / 1024 ** 3;
    const usedGB = totalGB - freeGB;
    const usedPercent = (usedGB / totalGB) * 100;

    const result = {
      freeGB: Math.round(freeGB * 10) / 10,
      totalGB: Math.round(totalGB * 10) / 10,
      usedGB: Math.round(usedGB * 10) / 10,
      usedPercent: Math.round(usedPercent),
      warning: freeGB < 10, // Warn if less than 10GB free
      critical: freeGB < 5, // Critical if less than 5GB free
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    logError('API/DiskSpace', ErrorCode.UNKNOWN_ERROR, error);
    return NextResponse.json(
      createErrorResponse(ErrorCode.UNKNOWN_ERROR, 'Failed to check disk space'),
      { status: 500 }
    );
  }
}
