import chokidar from 'chokidar';
import { existsSync, statSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { EventEmitter } from 'events';

export interface FileDetectedEvent {
  filePath: string;
  fileName: string;
  timestamp: number;
}

/**
 * Monitor a folder for new image files
 * Emits 'file' event when a new image is detected
 */
export class FolderMonitor extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private watchPath: string;
  private detectedFiles: Set<string> = new Set();
  private extensions: string[];

  constructor(
    watchPath: string,
    extensions: string[] = ['.png', '.jpg', '.jpeg', '.webp']
  ) {
    super();
    this.watchPath = watchPath;
    this.extensions = extensions.map(ext => ext.toLowerCase());
  }

  /**
   * Start monitoring the folder
   */
  start(): void {
    if (this.watcher) {
      console.warn('⚠️ [FolderMonitor] Already watching');
      return;
    }

    console.log(`👀 [FolderMonitor] Starting watch on: ${this.watchPath}`);
    console.log(`   Extensions: ${this.extensions.join(', ')}`);

    // Check if folder exists
    if (!existsSync(this.watchPath)) {
      console.warn(`⚠️ [FolderMonitor] Folder does not exist: ${this.watchPath}`);
      console.log('   Will create it when first file is detected');
    }

    // Get existing files to ignore them
    if (existsSync(this.watchPath)) {
      const existingFiles = readdirSync(this.watchPath);
      existingFiles.forEach(file => {
        const filePath = join(this.watchPath, file);
        this.detectedFiles.add(filePath);
      });

      console.log(`📁 [FolderMonitor] Ignoring ${existingFiles.length} existing files`);
    }

    // Start watching
    this.watcher = chokidar.watch(this.watchPath, {
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
      persistent: true,
      ignoreInitial: true, // Don't trigger for existing files
      awaitWriteFinish: {
        stabilityThreshold: 2000, // Wait 2s after last change
        pollInterval: 100,
      },
    });

    // Listen for new files
    this.watcher.on('add', (filePath: string) => {
      this.handleNewFile(filePath);
    });

    this.watcher.on('error', (error) => {
      console.error('❌ [FolderMonitor] Watcher error:', error);
      this.emit('error', error);
    });

    this.watcher.on('ready', () => {
      console.log('✅ [FolderMonitor] Watching for new files...');
    });
  }

  /**
   * Handle a newly detected file
   */
  private handleNewFile(filePath: string): void {
    try {
      // Check if already detected
      if (this.detectedFiles.has(filePath)) {
        return;
      }

      // Check extension
      const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
      if (!this.extensions.includes(ext)) {
        console.log(`⏩ [FolderMonitor] Skipping non-image file: ${basename(filePath)}`);
        return;
      }

      // Mark as detected
      this.detectedFiles.add(filePath);

      // Get file info
      const stats = statSync(filePath);
      const fileName = basename(filePath);

      console.log(`✨ [FolderMonitor] New file detected: ${fileName}`);
      console.log(`   Path: ${filePath}`);
      console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);

      // Emit event
      const event: FileDetectedEvent = {
        filePath,
        fileName,
        timestamp: Date.now(),
      };

      this.emit('file', event);

    } catch (error) {
      console.error(`❌ [FolderMonitor] Error handling file ${filePath}:`, error);
      this.emit('error', error);
    }
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    if (!this.watcher) {
      return;
    }

    console.log('🛑 [FolderMonitor] Stopping watch...');

    await this.watcher.close();
    this.watcher = null;

    console.log('✅ [FolderMonitor] Stopped');
  }

  /**
   * Get the list of detected file paths
   */
  getDetectedFiles(): string[] {
    return Array.from(this.detectedFiles);
  }

  /**
   * Clear detected files list
   */
  clearDetectedFiles(): void {
    this.detectedFiles.clear();
    console.log('🗑️ [FolderMonitor] Cleared detected files list');
  }

  /**
   * Check if monitoring is active
   */
  isWatching(): boolean {
    return this.watcher !== null;
  }
}

/**
 * Wait for N files to be detected
 * Returns array of file paths in order detected
 *
 * @param monitor - FolderMonitor instance
 * @param count - Number of files to wait for
 * @param timeout - Maximum wait time in ms (default: 300000 = 5 minutes)
 */
export function waitForFiles(
  monitor: FolderMonitor,
  count: number,
  timeout: number = 300000
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const files: string[] = [];
    let timeoutHandle: NodeJS.Timeout;

    const fileHandler = (event: FileDetectedEvent) => {
      files.push(event.filePath);

      console.log(`📥 [FolderMonitor] Collected ${files.length}/${count} files`);

      if (files.length >= count) {
        cleanup();
        resolve(files);
      }
    };

    const errorHandler = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      monitor.off('file', fileHandler);
      monitor.off('error', errorHandler);
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    };

    // Set timeout
    timeoutHandle = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout: Only ${files.length}/${count} files detected in ${timeout}ms`));
    }, timeout);

    // Listen for files
    monitor.on('file', fileHandler);
    monitor.on('error', errorHandler);
  });
}
