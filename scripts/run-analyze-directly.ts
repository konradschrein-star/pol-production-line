import 'dotenv/config';
import { db } from '../src/lib/db';
import { analyzeScript } from '../src/lib/ai';

const jobId = '51065529-2613-43e9-b36a-99c05247013d';

async function run() {
  console.log('🔍 Running analyze worker directly on job:', jobId);

  // Get raw script
  const result = await db.query(
    'SELECT raw_script FROM news_jobs WHERE id = $1',
    [jobId]
  );

  const rawScript = result.rows[0].raw_script;
  console.log(`\n📄 Script length: ${rawScript.length} characters\n`);

  // Run analysis
  console.log('⏳ Analyzing script...\n');

  try {
    const analysis = await analyzeScript(rawScript);

    console.log(`✅ Analysis complete!`);
    console.log(`   Scenes generated: ${analysis.scenes.length}\n`);

    // Show first 3 scenes
    console.log('Sample scenes:\n');
    analysis.scenes.slice(0, 3).forEach(scene => {
      console.log(`${scene.id}. ${scene.ticker_headline}`);
      console.log(`   Prompt: ${scene.image_prompt}\n`);
    });

    // Save to database
    console.log('💾 Saving to database...');

    // Update job
    await db.query(
      'UPDATE news_jobs SET status = $1, avatar_script = $2 WHERE id = $3',
      ['generating_images', rawScript, jobId]
    );

    // Insert scenes
    for (const scene of analysis.scenes) {
      await db.query(
        `INSERT INTO news_scenes (job_id, scene_order, image_prompt, ticker_headline, image_url)
         VALUES ($1, $2, $3, $4, $5)`,
        [jobId, scene.id, scene.image_prompt, scene.ticker_headline, null]
      );
    }

    console.log('✅ Saved to database\n');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

run();
