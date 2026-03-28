/**
 * Test Utility: Promisified exec
 *
 * Provides async/await interface for child_process.exec
 * Used for FFmpeg/FFprobe commands in tests
 */

import { exec } from 'child_process';
import { promisify } from 'util';

export const execAsync = promisify(exec);
