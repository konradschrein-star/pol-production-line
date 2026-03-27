import 'dotenv/config';
import { db } from '../src/lib/db';

const jobId = 'e2d3cc06-1cfe-49cd-961e-5c0f4f572036';

async function run() {
  // Get job info
  const jobResult = await db.query('SELECT avatar_script FROM news_jobs WHERE id = $1', [jobId]);
  const avatarScript = jobResult.rows[0]?.avatar_script;

  console.log('📋 Avatar Script:');
  console.log(avatarScript);
  console.log(`\n📊 Avatar script length: ${avatarScript?.length || 0} characters\n`);

  // Get scenes
  const scenesResult = await db.query(
    'SELECT id, scene_order, ticker_headline, image_url, image_prompt FROM news_scenes WHERE job_id = $1 ORDER BY scene_order',
    [jobId]
  );

  console.log(`🖼️  Total scenes generated: ${scenesResult.rows.length}\n`);
  console.log('Scenes:');
  scenesResult.rows.forEach(s => {
    console.log(`\n${s.scene_order}. ${s.ticker_headline}`);
    console.log(`   Prompt: ${s.image_prompt?.substring(0, 80)}...`);
    console.log(`   Image: ${s.image_url}`);
  });

  process.exit(0);
}

run();
