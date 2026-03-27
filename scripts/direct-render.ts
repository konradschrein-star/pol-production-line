/**
 * Direct Remotion render bypassing workers
 */

import 'dotenv/config';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const JOB_ID = '61d374c9-8bf7-45f0-bfd6-c10b97de5196';

async function getJobData() {
  const { stdout } = await execAsync(
    `docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -A -F"|" -c "SELECT avatar_mp4_url FROM news_jobs WHERE id = '${JOB_ID}';"`
  );
  const avatarUrl = stdout.trim();

  const { stdout: scenesData } = await execAsync(
    `docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -A -F"|" -c "SELECT image_url, ticker_headline, scene_order FROM news_scenes WHERE job_id = '${JOB_ID}' ORDER BY scene_order;"`
  );

  const scenes = scenesData
    .trim()
    .split('\n')
    .map(line => {
      const [image_url, ticker_headline, scene_order] = line.split('|');
      return { image_url, ticker_headline, scene_order: parseInt(scene_order) };
    });

  return { avatarUrl, scenes };
}

async function render() {
  console.log('🎬 Direct Remotion Render');
  console.log(`Job ID: ${JOB_ID}\n`);

  // Get job data
  console.log('📋 Fetching job data...');
  const { avatarUrl, scenes } = await getJobData();
  console.log(`   Avatar: ${avatarUrl}`);
  console.log(`   Scenes: ${scenes.length}\n`);

  // Bundle Remotion
  console.log('📦 Bundling Remotion composition...');
  const bundleLocation = await bundle({
    entryPoint: path.join(__dirname, '../src/lib/remotion/index.ts'),
    webpackOverride: (config) => config,
  });
  console.log(`✅ Bundle created: ${bundleLocation}\n`);

  // Select composition
  console.log('🎯 Selecting composition...');
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'NewsVideo',
    inputProps: {
      jobId: JOB_ID,
      avatarMp4Url: avatarUrl,
      scenes: scenes.map(s => ({
        imageUrl: s.image_url,
        tickerHeadline: s.ticker_headline,
      })),
    },
  });
  console.log(`✅ Composition selected: ${composition.width}x${composition.height}, ${composition.durationInFrames} frames\n`);

  // Render
  const outputPath = path.join('C:\\Users\\konra\\ObsidianNewsDesk\\videos', `${JOB_ID}.mp4`);
  console.log('🎥 Rendering video...');
  console.log(`   Output: ${outputPath}\n`);

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: {
      jobId: JOB_ID,
      avatarMp4Url: avatarUrl,
      scenes: scenes.map(s => ({
        imageUrl: s.image_url,
        tickerHeadline: s.ticker_headline,
      })),
    },
    onProgress: ({ progress, renderedFrames, encodedFrames }) => {
      const percent = (progress * 100).toFixed(1);
      process.stdout.write(`\r   Progress: ${percent}% (${renderedFrames}/${composition.durationInFrames} frames)`);
    },
  });

  console.log('\n\n✅ Render complete!');
  console.log(`📹 Video: ${outputPath}\n`);

  // Update database
  await execAsync(
    `docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "UPDATE news_jobs SET status = 'completed', final_video_url = '${outputPath.replace(/\\/g, '\\\\')}' WHERE id = '${JOB_ID}';"`
  );
  console.log('💾 Database updated\n');

  process.exit(0);
}

render().catch(err => {
  console.error('\n❌ Render failed:', err);
  process.exit(1);
});
