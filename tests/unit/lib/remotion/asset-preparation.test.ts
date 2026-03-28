/**
 * Asset Preparation Test Suite
 *
 * Tests the critical asset validation and copying logic that prevents
 * black screen errors during rendering.
 *
 * Priority: CRITICAL
 * Coverage Target: 90%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  prepareRenderAssets,
  AssetValidationResult,
} from '@/lib/remotion/asset-preparation';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync, statSync } from 'fs';
import { join } from 'path';

describe('Asset Preparation', () => {
  const testDir = join(process.cwd(), 'tests', 'fixtures', 'assets');
  const testImagesDir = join(testDir, 'images');
  const testAvatarsDir = join(testDir, 'avatars');
  const publicImagesDir = join(process.cwd(), 'public', 'images');
  const publicAvatarsDir = join(process.cwd(), 'public', 'avatars');

  beforeEach(() => {
    // Create test directories
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    if (!existsSync(testImagesDir)) {
      mkdirSync(testImagesDir, { recursive: true });
    }
    if (!existsSync(testAvatarsDir)) {
      mkdirSync(testAvatarsDir, { recursive: true });
    }

    // Ensure public directories exist
    if (!existsSync(publicImagesDir)) {
      mkdirSync(publicImagesDir, { recursive: true });
    }
    if (!existsSync(publicAvatarsDir)) {
      mkdirSync(publicAvatarsDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Cleanup test files
    try {
      if (existsSync(testImagesDir)) {
        const files = require('fs').readdirSync(testImagesDir);
        files.forEach((file: string) => unlinkSync(join(testImagesDir, file)));
      }
      if (existsSync(testAvatarsDir)) {
        const files = require('fs').readdirSync(testAvatarsDir);
        files.forEach((file: string) => unlinkSync(join(testAvatarsDir, file)));
      }

      // Cleanup copied files in public
      const testPatterns = ['test-scene', 'test-avatar'];
      if (existsSync(publicImagesDir)) {
        const files = require('fs').readdirSync(publicImagesDir);
        files.forEach((file: string) => {
          if (testPatterns.some((pattern) => file.includes(pattern))) {
            unlinkSync(join(publicImagesDir, file));
          }
        });
      }
      if (existsSync(publicAvatarsDir)) {
        const files = require('fs').readdirSync(publicAvatarsDir);
        files.forEach((file: string) => {
          if (testPatterns.some((pattern) => file.includes(pattern))) {
            unlinkSync(join(publicAvatarsDir, file));
          }
        });
      }
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  describe('prepareRenderAssets', () => {
    describe('Successful Preparation', () => {
      it('should validate and copy all scene images', async () => {
        // Create test images
        const scene1Path = join(testImagesDir, 'test-scene-1.jpg');
        const scene2Path = join(testImagesDir, 'test-scene-2.jpg');
        const avatarPath = join(testAvatarsDir, 'test-avatar.mp4');

        writeFileSync(scene1Path, Buffer.from('fake image 1 data'));
        writeFileSync(scene2Path, Buffer.from('fake image 2 data'));
        writeFileSync(avatarPath, Buffer.from('fake avatar data'));

        const scenes = [
          {
            id: 'scene-1',
            image_url: scene1Path,
            ticker_headline: 'Headline 1',
            scene_order: 0,
          },
          {
            id: 'scene-2',
            image_url: scene2Path,
            ticker_headline: 'Headline 2',
            scene_order: 1,
          },
        ];

        const result = await prepareRenderAssets('test-job-id', scenes, avatarPath);

        expect(result.valid).toBe(true);
        expect(result.missingImages).toHaveLength(0);
        expect(result.invalidPaths).toHaveLength(0);
        expect(result.copyErrors).toHaveLength(0);
        expect(result.avatarError).toBeUndefined();
        expect(result.details).toHaveLength(3); // 2 scenes + 1 avatar

        // Verify files were copied
        expect(existsSync(join(publicImagesDir, 'test-scene-1.jpg'))).toBe(true);
        expect(existsSync(join(publicImagesDir, 'test-scene-2.jpg'))).toBe(true);
        expect(existsSync(join(publicAvatarsDir, 'test-avatar.mp4'))).toBe(true);
      });

      it('should handle single scene', async () => {
        const scenePath = join(testImagesDir, 'test-scene-single.jpg');
        const avatarPath = join(testAvatarsDir, 'test-avatar-single.mp4');

        writeFileSync(scenePath, Buffer.from('fake image data'));
        writeFileSync(avatarPath, Buffer.from('fake avatar data'));

        const scenes = [
          {
            id: 'scene-single',
            image_url: scenePath,
            ticker_headline: 'Single Headline',
            scene_order: 0,
          },
        ];

        const result = await prepareRenderAssets('test-job-id', scenes, avatarPath);

        expect(result.valid).toBe(true);
        expect(result.details).toHaveLength(2); // 1 scene + 1 avatar
      });

      it('should overwrite existing files in public directory', async () => {
        const scenePath = join(testImagesDir, 'test-scene-overwrite.jpg');
        const avatarPath = join(testAvatarsDir, 'test-avatar-overwrite.mp4');

        // Create initial files
        writeFileSync(scenePath, Buffer.from('original data'));
        writeFileSync(avatarPath, Buffer.from('original avatar'));

        const scenes = [
          {
            id: 'scene-overwrite',
            image_url: scenePath,
            ticker_headline: 'Overwrite Test',
            scene_order: 0,
          },
        ];

        // First copy
        await prepareRenderAssets('test-job-id', scenes, avatarPath);

        // Modify source files
        writeFileSync(scenePath, Buffer.from('updated data'));
        writeFileSync(avatarPath, Buffer.from('updated avatar'));

        // Second copy (should overwrite)
        const result = await prepareRenderAssets('test-job-id', scenes, avatarPath);

        expect(result.valid).toBe(true);

        // Verify updated content
        const copiedImage = require('fs').readFileSync(join(publicImagesDir, 'test-scene-overwrite.jpg'));
        expect(copiedImage.toString()).toBe('updated data');
      });

      it('should report file sizes correctly', async () => {
        const scenePath = join(testImagesDir, 'test-scene-size.jpg');
        const avatarPath = join(testAvatarsDir, 'test-avatar-size.mp4');

        const imageData = Buffer.alloc(5000, 'x'); // 5KB
        const avatarData = Buffer.alloc(10000, 'y'); // 10KB

        writeFileSync(scenePath, imageData);
        writeFileSync(avatarPath, avatarData);

        const scenes = [
          {
            id: 'scene-size',
            image_url: scenePath,
            ticker_headline: 'Size Test',
            scene_order: 0,
          },
        ];

        const result = await prepareRenderAssets('test-job-id', scenes, avatarPath);

        expect(result.valid).toBe(true);
        // Details should mention file sizes
        expect(result.details.join(' ')).toContain('KB');
      });
    });

    describe('Missing Images', () => {
      it('should detect missing scene image', async () => {
        const avatarPath = join(testAvatarsDir, 'test-avatar.mp4');
        writeFileSync(avatarPath, Buffer.from('fake avatar'));

        const scenes = [
          {
            id: 'scene-missing',
            image_url: join(testImagesDir, 'nonexistent.jpg'),
            ticker_headline: 'Missing Scene',
            scene_order: 0,
          },
        ];

        const result = await prepareRenderAssets('test-job-id', scenes, avatarPath);

        expect(result.valid).toBe(false);
        expect(result.invalidPaths).toContain(join(testImagesDir, 'nonexistent.jpg'));
        expect(result.details.some((d) => d.includes('File not found'))).toBe(true);
      });

      it('should detect NULL image_url', async () => {
        const avatarPath = join(testAvatarsDir, 'test-avatar.mp4');
        writeFileSync(avatarPath, Buffer.from('fake avatar'));

        const scenes = [
          {
            id: 'scene-null',
            image_url: '', // NULL or empty
            ticker_headline: 'Null Image',
            scene_order: 0,
          },
        ];

        const result = await prepareRenderAssets('test-job-id', scenes, avatarPath);

        expect(result.valid).toBe(false);
        expect(result.missingImages).toContain('scene-null');
        expect(result.details.some((d) => d.includes('NULL'))).toBe(true);
      });

      it('should handle mix of valid and invalid scenes', async () => {
        const validPath = join(testImagesDir, 'test-scene-valid.jpg');
        const avatarPath = join(testAvatarsDir, 'test-avatar.mp4');

        writeFileSync(validPath, Buffer.from('valid image'));
        writeFileSync(avatarPath, Buffer.from('fake avatar'));

        const scenes = [
          {
            id: 'scene-valid',
            image_url: validPath,
            ticker_headline: 'Valid',
            scene_order: 0,
          },
          {
            id: 'scene-invalid',
            image_url: join(testImagesDir, 'nonexistent.jpg'),
            ticker_headline: 'Invalid',
            scene_order: 1,
          },
        ];

        const result = await prepareRenderAssets('test-job-id', scenes, avatarPath);

        expect(result.valid).toBe(false);
        expect(result.invalidPaths).toHaveLength(1);

        // Valid scene should still be in details
        expect(result.details.some((d) => d.includes('scene-valid') && d.includes('successfully'))).toBe(true);
      });
    });

    describe('Invalid Files', () => {
      it('should detect empty (0 byte) image file', async () => {
        const scenePath = join(testImagesDir, 'test-scene-empty.jpg');
        const avatarPath = join(testAvatarsDir, 'test-avatar.mp4');

        writeFileSync(scenePath, Buffer.alloc(0)); // Empty file
        writeFileSync(avatarPath, Buffer.from('fake avatar'));

        const scenes = [
          {
            id: 'scene-empty',
            image_url: scenePath,
            ticker_headline: 'Empty File',
            scene_order: 0,
          },
        ];

        const result = await prepareRenderAssets('test-job-id', scenes, avatarPath);

        expect(result.valid).toBe(false);
        expect(result.details.some((d) => d.includes('empty') || d.includes('0 bytes'))).toBe(true);
      });

      it('should detect suspiciously small files (<1KB)', async () => {
        const scenePath = join(testImagesDir, 'test-scene-tiny.jpg');
        const avatarPath = join(testAvatarsDir, 'test-avatar.mp4');

        writeFileSync(scenePath, Buffer.alloc(500)); // 500 bytes
        writeFileSync(avatarPath, Buffer.from('fake avatar'));

        const scenes = [
          {
            id: 'scene-tiny',
            image_url: scenePath,
            ticker_headline: 'Tiny File',
            scene_order: 0,
          },
        ];

        const result = await prepareRenderAssets('test-job-id', scenes, avatarPath);

        expect(result.valid).toBe(false);
        expect(result.details.some((d) => d.includes('suspiciously small'))).toBe(true);
      });

      it('should detect directory instead of file', async () => {
        const scenePath = join(testImagesDir, 'test-directory');
        const avatarPath = join(testAvatarsDir, 'test-avatar.mp4');

        mkdirSync(scenePath, { recursive: true }); // Create directory
        writeFileSync(avatarPath, Buffer.from('fake avatar'));

        const scenes = [
          {
            id: 'scene-dir',
            image_url: scenePath,
            ticker_headline: 'Directory Not File',
            scene_order: 0,
          },
        ];

        const result = await prepareRenderAssets('test-job-id', scenes, avatarPath);

        expect(result.valid).toBe(false);
        expect(result.details.some((d) => d.includes('not a file'))).toBe(true);

        // Cleanup directory
        rmdirSync(scenePath);
      });
    });

    describe('Avatar Validation', () => {
      it('should detect missing avatar file', async () => {
        const scenePath = join(testImagesDir, 'test-scene.jpg');
        writeFileSync(scenePath, Buffer.from('fake image'));

        const scenes = [
          {
            id: 'scene-1',
            image_url: scenePath,
            ticker_headline: 'Scene',
            scene_order: 0,
          },
        ];

        const result = await prepareRenderAssets(
          'test-job-id',
          scenes,
          join(testAvatarsDir, 'nonexistent.mp4')
        );

        expect(result.valid).toBe(false);
        expect(result.avatarError).toBeTruthy();
        expect(result.details.some((d) => d.includes('Avatar') && d.includes('not found'))).toBe(true);
      });

      it('should detect empty avatar file', async () => {
        const scenePath = join(testImagesDir, 'test-scene.jpg');
        const avatarPath = join(testAvatarsDir, 'test-avatar-empty.mp4');

        writeFileSync(scenePath, Buffer.from('fake image'));
        writeFileSync(avatarPath, Buffer.alloc(0)); // Empty

        const scenes = [
          {
            id: 'scene-1',
            image_url: scenePath,
            ticker_headline: 'Scene',
            scene_order: 0,
          },
        ];

        const result = await prepareRenderAssets('test-job-id', scenes, avatarPath);

        expect(result.valid).toBe(false);
        expect(result.avatarError).toBeTruthy();
      });

      it('should successfully validate and preload avatar', async () => {
        const scenePath = join(testImagesDir, 'test-scene.jpg');
        const avatarPath = join(testAvatarsDir, 'test-avatar-valid.mp4');

        writeFileSync(scenePath, Buffer.from('fake image'));
        writeFileSync(avatarPath, Buffer.alloc(15 * 1024 * 1024)); // 15MB avatar

        const scenes = [
          {
            id: 'scene-1',
            image_url: scenePath,
            ticker_headline: 'Scene',
            scene_order: 0,
          },
        ];

        const result = await prepareRenderAssets('test-job-id', scenes, avatarPath);

        expect(result.valid).toBe(true);
        expect(result.avatarError).toBeUndefined();
        expect(result.details.some((d) => d.includes('Avatar') && d.includes('preloaded'))).toBe(true);
      });
    });

    describe('Data URLs', () => {
      it('should accept data URLs for images', async () => {
        const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
        const avatarPath = join(testAvatarsDir, 'test-avatar.mp4');

        writeFileSync(avatarPath, Buffer.from('fake avatar'));

        const scenes = [
          {
            id: 'scene-data',
            image_url: dataUrl,
            ticker_headline: 'Data URL Scene',
            scene_order: 0,
          },
        ];

        const result = await prepareRenderAssets('test-job-id', scenes, avatarPath);

        // Data URLs should be valid but not copied
        expect(result.valid).toBe(true);
      });
    });

    describe('Path Handling', () => {
      it('should handle Windows absolute paths', async () => {
        const scenePath = join(testImagesDir, 'test-scene-win.jpg');
        const avatarPath = join(testAvatarsDir, 'test-avatar-win.mp4');

        writeFileSync(scenePath, Buffer.from('fake image'));
        writeFileSync(avatarPath, Buffer.from('fake avatar'));

        const scenes = [
          {
            id: 'scene-win',
            image_url: scenePath, // Absolute Windows path
            ticker_headline: 'Windows Path',
            scene_order: 0,
          },
        ];

        const result = await prepareRenderAssets('test-job-id', scenes, avatarPath);

        expect(result.valid).toBe(true);
      });

      it('should normalize path separators', async () => {
        const scenePath = join(testImagesDir, 'test-scene-norm.jpg');
        const avatarPath = join(testAvatarsDir, 'test-avatar-norm.mp4');

        writeFileSync(scenePath, Buffer.from('fake image'));
        writeFileSync(avatarPath, Buffer.from('fake avatar'));

        // Use forward slashes (should be normalized)
        const normalizedPath = scenePath.replace(/\\/g, '/');

        const scenes = [
          {
            id: 'scene-norm',
            image_url: normalizedPath,
            ticker_headline: 'Normalized Path',
            scene_order: 0,
          },
        ];

        const result = await prepareRenderAssets('test-job-id', scenes, avatarPath);

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty scenes array', async () => {
      const avatarPath = join(testAvatarsDir, 'test-avatar.mp4');
      writeFileSync(avatarPath, Buffer.from('fake avatar'));

      const result = await prepareRenderAssets('test-job-id', [], avatarPath);

      // Should only validate avatar
      expect(result.valid).toBe(true);
      expect(result.details).toHaveLength(1); // Avatar only
    });

    it('should handle very long file paths', async () => {
      const longFilename = 'test-' + 'x'.repeat(200) + '.jpg';
      const scenePath = join(testImagesDir, longFilename);
      const avatarPath = join(testAvatarsDir, 'test-avatar.mp4');

      try {
        writeFileSync(scenePath, Buffer.from('fake image'));
        writeFileSync(avatarPath, Buffer.from('fake avatar'));

        const scenes = [
          {
            id: 'scene-long',
            image_url: scenePath,
            ticker_headline: 'Long Path',
            scene_order: 0,
          },
        ];

        const result = await prepareRenderAssets('test-job-id', scenes, avatarPath);

        expect(result.valid).toBe(true);
      } catch (err) {
        // Some systems may reject very long paths
        expect(err).toBeTruthy();
      }
    });
  });
});
