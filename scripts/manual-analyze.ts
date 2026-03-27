/**
 * Manually run analyze logic without BullMQ
 */

import 'dotenv/config';
import { createAIProvider } from '../src/lib/ai';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const JOB_ID = '61d374c9-8bf7-45f0-bfd6-c10b97de5196';

async function queryDB(sql: string, params: any[] = []) {
  const paramStr = params.map((p, i) => `'${String(p).replace(/'/g, "''")}'`).join(', ');
  const finalSql = sql.replace(/\$(\d+)/g, (_, num) => params[parseInt(num) - 1] ? `'${String(params[parseInt(num) - 1]).replace(/'/g, "''")}'` : 'NULL');

  const { stdout } = await execAsync(
    `docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c "${finalSql.replace(/"/g, '\\"')}"`
  );
  return stdout.trim();
}

async function manualAnalyze() {
  console.log('🔍 Starting manual analysis...');
  console.log(`Job ID: ${JOB_ID}\n`);

  try {
    // Fetch raw_script from database
    const rawScript = await queryDB(
      `SELECT raw_script FROM news_jobs WHERE id = '${JOB_ID}'`
    );

    if (!rawScript) {
      console.error('❌ Job not found or has no script');
      process.exit(1);
    }

    console.log(`📝 Script length: ${rawScript.length} characters`);

    // Update job status to analyzing
    await queryDB(
      `UPDATE news_jobs SET status = 'analyzing' WHERE id = '${JOB_ID}'`
    );
    console.log('📊 Status updated to: analyzing');

    // Call AI provider
    console.log('🤖 Calling Google AI provider...\n');
    const provider = createAIProvider('google');
    const analysis = await provider.analyzeScript(rawScript);

    console.log(`✅ AI analysis complete:`);
    console.log(`   - Scenes generated: ${analysis.scenes.length}\n`);

    // Insert scenes into news_scenes
    console.log('💾 Storing scenes in database...');
    for (const scene of analysis.scenes) {
      const safePrompt = scene.image_prompt.replace(/'/g, "''");
      const safeHeadline = scene.ticker_headline.replace(/'/g, "''");

      await queryDB(
        `INSERT INTO news_scenes (job_id, scene_order, image_prompt, ticker_headline, generation_status)
         VALUES ('${JOB_ID}', ${scene.id}, '${safePrompt}', '${safeHeadline}', 'pending')`
      );
    }

    console.log(`💾 Stored ${analysis.scenes.length} scenes`);

    // Update job status to generating_images
    await queryDB(
      `UPDATE news_jobs SET status = 'generating_images' WHERE id = '${JOB_ID}'`
    );
    console.log('📊 Status updated to: generating_images\n');

    console.log('✅ Manual analysis complete!');
    console.log('   Next: Images worker should pick up scenes automatically\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Analysis failed:', error);

    await queryDB(
      `UPDATE news_jobs SET status = 'failed', error_message = '${String(error).replace(/'/g, "''")}' WHERE id = '${JOB_ID}'`
    );

    process.exit(1);
  }
}

manualAnalyze();
