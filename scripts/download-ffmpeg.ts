#!/usr/bin/env tsx

/**
 * Downloads FFmpeg binaries for current platform
 * Usage: npm run download-ffmpeg
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';
import { promisify } from 'util';
import stream from 'stream';

const pipeline = promisify(stream.pipeline);

const PLATFORM_CONFIGS = {
  win32: {
    url: 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
    binDir: 'resources/bin/windows',
    binaries: ['ffmpeg.exe', 'ffprobe.exe'],
    extractCmd: (zipPath: string, extractDir: string) =>
      `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`,
  },
  darwin: {
    url: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
    probeUrl: 'https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip',
    binDir: 'resources/bin/macos',
    binaries: ['ffmpeg', 'ffprobe'],
    extractCmd: (zipPath: string, extractDir: string) =>
      `unzip -q "${zipPath}" -d "${extractDir}"`,
  },
  linux: {
    url: 'https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz',
    binDir: 'resources/bin/linux',
    binaries: ['ffmpeg', 'ffprobe'],
    extractCmd: (tarPath: string, extractDir: string) =>
      `tar -xJf "${tarPath}" -C "${extractDir}" --strip-components=1`,
  },
} as const;

async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Handle all redirect status codes (301, 302, 303, 307, 308)
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
        // Follow redirect
        const redirectUrl = response.headers.location!;
        if (!redirectUrl) {
          reject(new Error(`Redirect received but no location header provided`));
          return;
        }
        downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(destPath);
      pipeline(response, fileStream).then(resolve).catch(reject);
    }).on('error', reject);
  });
}

async function downloadFFmpeg(): Promise<void> {
  const platform = process.platform as keyof typeof PLATFORM_CONFIGS;
  const config = PLATFORM_CONFIGS[platform];

  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  console.log(`\n🎬 Downloading FFmpeg for ${platform}...\n`);

  // Create directories
  const binDir = path.join(process.cwd(), config.binDir);
  const tempDir = path.join(process.cwd(), 'temp-ffmpeg');

  fs.mkdirSync(binDir, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Download and extract
    // Add proper extension for PowerShell Expand-Archive to work
    const archiveExt = config.url.endsWith('.zip') ? '.zip' : config.url.endsWith('.7z') ? '.7z' : '';
    const archivePath = path.join(tempDir, 'ffmpeg-archive' + archiveExt);
    console.log(`📥 Downloading from ${config.url}...`);
    await downloadFile(config.url, archivePath);
    console.log('✅ Download complete\n');

    console.log('📦 Extracting binaries...');
    execSync(config.extractCmd(archivePath, tempDir), { stdio: 'inherit' });

    // Find and copy binaries (they may be nested in subdirectories)
    const findBinary = (name: string): string | null => {
      const findCmd = platform === 'win32'
        ? `dir /s /b "${tempDir}\\${name}"`
        : `find "${tempDir}" -name "${name}" -type f`;

      try {
        const result = execSync(findCmd, { encoding: 'utf8' });
        return result.trim().split('\n')[0];
      } catch {
        return null;
      }
    };

    for (const binary of config.binaries) {
      const sourcePath = findBinary(binary);
      if (!sourcePath) {
        throw new Error(`Binary not found: ${binary}`);
      }

      const destPath = path.join(binDir, binary);
      fs.copyFileSync(sourcePath, destPath);

      // Set executable permissions (Unix)
      if (platform !== 'win32') {
        fs.chmodSync(destPath, 0o755);
      }

      console.log(`✅ Installed: ${binary}`);
    }

    // Remove macOS quarantine (prevents "cannot verify developer" error)
    if (platform === 'darwin') {
      console.log('\n🔓 Removing macOS quarantine...');
      execSync(`xattr -d com.apple.quarantine "${binDir}"/* || true`, { stdio: 'inherit' });
    }

    console.log('\n✅ FFmpeg installation complete!');
    console.log(`   Location: ${binDir}`);
    console.log('\n🧪 Run "npm run test:ffmpeg" to verify installation\n');

  } finally {
    // Cleanup temp files
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Run
downloadFFmpeg().catch((error) => {
  console.error('❌ Failed to download FFmpeg:', error.message);
  process.exit(1);
});
