import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getVideoDuration } from './pacing';

export interface RenderJobData {
  jobId: string;
  avatarMp4Url: string;
  scenes: Array<{
    id: string;
    image_url: string;
    ticker_headline: string;
    scene_order: number;
  }>;
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
  const { jobId, avatarMp4Url, scenes } = jobData;

  console.log(`\n🎬 [Render] Starting video render for job ${jobId}...`);
  console.log(`   Avatar URL: ${avatarMp4Url}`);
  console.log(`   Scenes: ${scenes.length}`);

  try {
    // 1. Get avatar duration
    console.log(`📏 [Render] Getting avatar duration...`);
    const avatarDurationSeconds = await getVideoDuration(avatarMp4Url);
    console.log(`   Duration: ${avatarDurationSeconds}s`);

    // 2. Bundle Remotion composition
    console.log(`📦 [Render] Bundling Remotion project...`);

    const bundleLocation = await bundle({
      entryPoint: join(__dirname, 'index.ts'),
      webpackOverride: (config) => config,
    });

    console.log(`✅ [Render] Bundled to: ${bundleLocation}`);

    // 3. Get compositions
    console.log(`🔍 [Render] Getting compositions...`);

    const inputProps = {
      avatarMp4Url,
      avatarDurationSeconds,
      scenes,
    };

    const compositions = await getCompositions(bundleLocation, {
      inputProps,
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
      await performRender(bundleLocation, dynamicComposition, jobId);

    } else {
      console.log(`✅ [Render] Using composition: ${composition.id}`);
      console.log(`   ${composition.width}x${composition.height} @ ${composition.fps}fps`);
      console.log(`   Duration: ${composition.durationInFrames} frames`);

      // Use found composition
      await performRender(bundleLocation, composition, jobId);
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
  jobId: string
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

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: composition.defaultProps,
    concurrency: parseInt(process.env.REMOTION_CONCURRENCY || '2'),
    onProgress: ({ progress }) => {
      const percent = (progress * 100).toFixed(1);
      process.stdout.write(`\r   Progress: ${percent}%`);
    },
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n✅ [Render] Completed in ${elapsed}s`);
}
