import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getVideoDuration } from './video-utils';
import { WordTimestamp } from './types';
import { getCachedBundle, cacheBundle, computeCompositionHash } from './cache';

export interface RenderJobData {
  jobId: string;
  avatarMp4Url: string;
  scenes: Array<{
    id: string;
    image_url: string;
    ticker_headline: string;
    scene_order: number;
    sentence_text: string | null;         // Exact sentence this scene visualizes
    narrative_position: string | null;    // 'opening', 'development', etc.
    shot_type: string | null;             // For logging/debugging
    word_start_time: number | null;       // NEW: Start time from database (stored after avatar upload)
    word_end_time: number | null;         // NEW: End time from database (stored after avatar upload)
  }>;
  wordTimestamps?: WordTimestamp[];
  onProgress?: (info: { renderedFrames: number; totalFrames: number; progress: number }) => void;
}

export interface RenderResult {
  outputPath: string;
  durationInSeconds: number;
  sizeInBytes: number;
}

/**
 * Render a news video using Remotion
 *
 * @param jobData - Job data including avatar and scenes
 * @returns Path to rendered video
 */
export async function renderNewsVideo(jobData: RenderJobData): Promise<RenderResult> {
  const { jobId, avatarMp4Url, scenes, wordTimestamps, onProgress } = jobData;

  console.log(`\n🎬 [Render] Starting video render for job ${jobId}...`);
  console.log(`   Avatar URL: ${avatarMp4Url}`);
  console.log(`   Scenes: ${scenes.length}`);
  console.log(`   Transcript mode: ${wordTimestamps ? 'ENABLED' : 'DISABLED (time-based fallback)'}`);

  // Log scene details for debugging
  console.log(`\n📋 [Render] Scene details:`);
  for (const scene of scenes) {
    console.log(`   Scene ${scene.scene_order + 1}: ${scene.image_url}`);
  }

  try {
    // 1. Get avatar duration
    console.log(`📏 [Render] Getting avatar duration...`);
    const avatarDurationSeconds = await getVideoDuration(avatarMp4Url);
    console.log(`   Duration: ${avatarDurationSeconds}s`);

    // 2. Bundle Remotion composition (with caching)
    const compositionHash = computeCompositionHash();
    let bundleLocation = getCachedBundle(compositionHash);

    if (!bundleLocation) {
      console.log(`📦 [Render] Bundling Remotion project (no cache)...`);

      bundleLocation = await bundle({
        entryPoint: join(__dirname, 'index.ts'),
        publicDir: join(process.cwd(), 'public'),
        webpackOverride: (config) => {
          // Ensure Remotion can access the public folder
          return {
            ...config,
            resolve: {
              ...config.resolve,
              fallback: {
                ...config.resolve?.fallback,
                path: false, // Don't polyfill path module
              },
            },
            devServer: {
              ...config.devServer,
              static: [
                ...(config.devServer?.static ? (Array.isArray(config.devServer.static) ? config.devServer.static : [config.devServer.static]) : []),
                {
                  directory: join(process.cwd(), 'public'),
                  publicPath: '/',
                },
              ],
            },
          };
        },
      });

      console.log(`✅ [Render] Bundled to: ${bundleLocation}`);

      // Cache the bundle for future renders
      cacheBundle(compositionHash, bundleLocation);
    } else {
      console.log(`✅ [Render] Using cached bundle (hash: ${compositionHash.substring(0, 8)}...)`);
    }

    // 3. Get compositions
    console.log(`🔍 [Render] Getting compositions...`);

    const inputProps = {
      avatarMp4Url,
      avatarDurationSeconds,
      scenes,
      wordTimestamps,
    };

    const compositions = await getCompositions(bundleLocation, {
      inputProps,
      timeoutInMilliseconds: 300000, // 5 min timeout for loading large videos (40+ min avatars can be 200-400MB)
    });

    console.log(`   Found ${compositions.length} compositions`);

    // Find NewsVideo composition
    const composition = compositions.find(c => c.id === 'NewsVideo');

    if (!composition) {
      // If not found, create it dynamically
      console.log(`⚠️  [Render] NewsVideo composition not found, creating dynamically...`);

      const fps = 30;
      const width = 1920;
      const height = 1080;
      const durationInFrames = Math.round(avatarDurationSeconds * fps);

      const dynamicComposition = {
        id: 'NewsVideo',
        width,
        height,
        fps,
        durationInFrames,
        defaultProps: inputProps,
      };

      console.log(`   Created dynamic composition: ${width}x${height} @ ${fps}fps, ${durationInFrames} frames`);

      // Use dynamic composition
      await performRender(bundleLocation, dynamicComposition, jobId, onProgress);

    } else {
      console.log(`✅ [Render] Using composition: ${composition.id}`);
      console.log(`   ${composition.width}x${composition.height} @ ${composition.fps}fps`);
      console.log(`   Duration: ${composition.durationInFrames} frames`);

      // Use found composition
      await performRender(bundleLocation, composition, jobId, onProgress);
    }

    // 4. Get output file info
    const outputDir = join(process.cwd(), 'tmp');
    const outputPath = join(outputDir, `${jobId}.mp4`);

    const fs = await import('fs');
    const stats = fs.statSync(outputPath);

    console.log(`✅ [Render] Video rendered successfully!`);
    console.log(`   Output: ${outputPath}`);
    console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    return {
      outputPath,
      durationInSeconds: avatarDurationSeconds,
      sizeInBytes: stats.size,
    };

  } catch (error) {
    console.error(`❌ [Render] Render failed:`, error);
    throw new Error(`Remotion render failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Perform the actual render
 */
async function performRender(
  bundleLocation: string,
  composition: any,
  jobId: string,
  onProgressCallback?: (info: { renderedFrames: number; totalFrames: number; progress: number }) => void
): Promise<void> {
  // Ensure output directory exists
  const outputDir = join(process.cwd(), 'tmp');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = join(outputDir, `${jobId}.mp4`);

  console.log(`🎥 [Render] Rendering to: ${outputPath}`);
  console.log(`   This may take several minutes...`);

  const startTime = Date.now();

  const totalFrames = composition.durationInFrames;

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: composition.defaultProps,
    concurrency: parseInt(process.env.REMOTION_CONCURRENCY || '4'),
    timeoutInMilliseconds: 300000, // 5 min timeout for loading large videos (40+ min avatars can be 200-400MB)
    publicDir: join(process.cwd(), 'public'), // CRITICAL: Specify public directory for staticFile()
    onProgress: ({ progress, renderedFrames }) => {
      const percent = (progress * 100).toFixed(1);
      process.stdout.write(`\r   Progress: ${percent}% (Frame ${renderedFrames}/${totalFrames})`);

      // Call callback if provided
      if (onProgressCallback) {
        onProgressCallback({
          renderedFrames: renderedFrames || Math.round(progress * totalFrames),
          totalFrames,
          progress,
        });
      }
    },
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n✅ [Render] Completed in ${elapsed}s`);
}
