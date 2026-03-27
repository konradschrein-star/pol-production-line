/**
 * Test YouTube SEO generation
 */

import 'dotenv/config';
import { generateYouTubeSEO } from '../src/lib/ai/youtube-seo';
import { db } from '../src/lib/db';

async function main() {
  const jobId = '61d374c9-8bf7-45f0-bfd6-c10b97de5196';

  console.log('🎯 Fetching job and scenes...');

  const jobResult = await db.query(
    'SELECT raw_script FROM news_jobs WHERE id = $1',
    [jobId]
  );

  if (jobResult.rows.length === 0) {
    console.error('❌ Job not found');
    process.exit(1);
  }

  const scenesResult = await db.query(
    'SELECT ticker_headline FROM news_scenes WHERE job_id = $1 ORDER BY scene_order',
    [jobId]
  );

  console.log(`📊 Found ${scenesResult.rows.length} scenes`);
  console.log(`📝 Script length: ${jobResult.rows[0].raw_script.length} chars`);

  try {
    console.log('🤖 Calling Google Gemini API...');
    const startTime = Date.now();

    const metadata = await generateYouTubeSEO(
      jobResult.rows[0].raw_script,
      scenesResult.rows,
      'google'
    );

    const elapsed = Date.now() - startTime;
    console.log(`✅ SEO generated in ${elapsed}ms`);
    console.log('\n📊 Results:');
    console.log(`Title: "${metadata.title}" (${metadata.title.length} chars)`);
    console.log(`Tags: ${metadata.tags.length} tags`);
    console.log(`Keywords: ${metadata.keywords.join(', ')}`);
    console.log(`Hashtags: ${metadata.hashtags.join(' ')}`);
    console.log(`Category: ${metadata.category}`);

  } catch (error) {
    console.error('❌ Error generating SEO:', error);
    process.exit(1);
  }

  await db.end();
}

main();
