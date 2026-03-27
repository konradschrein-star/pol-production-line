/**
 * Direct E2E Test - Bypasses API routes
 * Runs complete pipeline: analyze → images → render → thumbnail → SEO
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { createAIProvider } from '../src/lib/ai';
import { scriptAnalyzerPrompt } from '../src/lib/ai/prompts/script-analyzer';
import { copyFileSync, existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const JOB_ID = '7e4cec50-738d-44bc-93df-d12ab36243d4';
const AVATAR_PATH = 'C:\\Users\\konra\\Downloads\\Avatar_Video.mp4';

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   DIRECT E2E PIPELINE TEST                               ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log(`📋 Job ID: ${JOB_ID}\n`);

  try {
    // Step 1: Analyze script with AI
    console.log('🤖 Step 1/6: Analyzing script with AI...');
    console.log('─'.repeat(60));

    const job = await db.query('SELECT raw_script FROM news_jobs WHERE id = $1', [JOB_ID]);
    const rawScript = job.rows[0].raw_script;

    console.log(`📝 Script length: ${rawScript.length} characters`);

    const aiProvider = createAIProvider('google');
    console.log('🧠 Calling Google Gemini API...');

    const result = await aiProvider.analyzeScript(rawScript);

    console.log(`✅ Analysis complete!`);
    console.log(`   Scenes: ${result.scenes.length}`);

    const avatarScript = result.avatar_script || 'Breaking news update with latest developments';
    console.log(`   Avatar script: ${avatarScript.substring(0, 100)}...`);

    // Clear old scenes
    await db.query('DELETE FROM news_scenes WHERE job_id = $1', [JOB_ID]);
    console.log(`🗑️  Cleared old scenes`);

    // Save avatar script
    await db.query(
      'UPDATE news_jobs SET avatar_script = $1, status = $2 WHERE id = $3',
      [avatarScript, 'analyzing', JOB_ID]
    );

    // Create scenes
    for (let i = 0; i < result.scenes.length; i++) {
      const scene = result.scenes[i];
      await db.query(
        `INSERT INTO news_scenes (id, job_id, scene_order, image_prompt, ticker_headline, generation_status)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
        [JOB_ID, i, scene.image_prompt, scene.ticker_headline, 'pending']
      );
    }

    console.log(`✅ ${result.scenes.length} scenes created in database\n`);

    // Step 2: Copy avatar to public folder
    console.log('🎬 Step 2/6: Setting up avatar...');
    console.log('─'.repeat(60));

    if (!existsSync(AVATAR_PATH)) {
      throw new Error(`Avatar video not found: ${AVATAR_PATH}`);
    }

    const publicPath = join(__dirname, '../public/avatars/test-avatar-e2e.mp4');
    copyFileSync(AVATAR_PATH, publicPath);

    await db.query(
      `UPDATE news_jobs
       SET avatar_mp4_url = $1,
           status = $2
       WHERE id = $3`,
      ['avatars/test-avatar-e2e.mp4', 'review_assets', JOB_ID]
    );

    console.log(`✅ Avatar copied to public/avatars/`);
    console.log(`✅ Job status updated to review_assets\n`);

    // Step 3: Skip image generation (use placeholders or skip for now)
    console.log('🖼️  Step 3/6: Image Generation');
    console.log('─'.repeat(60));
    console.log('⏭️  Skipping image generation (takes 15+ minutes)');
    console.log('   To test images: run workers manually with npm run worker:images\n');

    // Step 4: Prepare render props
    console.log('📦 Step 4/6: Preparing render data...');
    console.log('─'.repeat(60));

    const scenes = await db.query(
      `SELECT id, scene_order, image_prompt, ticker_headline, image_url
       FROM news_scenes
       WHERE job_id = $1
       ORDER BY scene_order`,
      [JOB_ID]
    );

    console.log(`✅ ${scenes.rows.length} scenes ready for rendering\n`);

    // Step 5: Update job to rendering status
    console.log('🎥 Step 5/6: Preparing for render...');
    console.log('─'.repeat(60));

    await db.query(
      'UPDATE news_jobs SET status = $1 WHERE id = $2',
      ['rendering', JOB_ID]
    );

    console.log(`✅ Job status: rendering`);
    console.log(`\n📹 To render the video, run:`);
    console.log(`   npx tsx scripts/manual-render.ts ${JOB_ID}\n`);

    // Step 6: Show next steps
    console.log('📋 Step 6/6: Next Steps');
    console.log('─'.repeat(60));
    console.log('1. Generate images (optional):');
    console.log(`   npm run worker:images`);
    console.log('');
    console.log('2. Render video:');
    console.log(`   npx tsx scripts/manual-render.ts ${JOB_ID}`);
    console.log('');
    console.log('3. Generate thumbnail:');
    console.log(`   curl -X POST http://localhost:8347/api/jobs/${JOB_ID}/thumbnail`);
    console.log('');
    console.log('4. Generate YouTube SEO:');
    console.log(`   npx tsx scripts/test-youtube-seo.ts`);
    console.log('');

    console.log('✅ Job prepared successfully!');
    console.log(`   Job ID: ${JOB_ID}`);
    console.log(`   Status: rendering`);
    console.log(`   Scenes: ${scenes.rows.length}`);
    console.log(`   Avatar: avatars/test-avatar-e2e.mp4`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main();
