/**
 * Analyze script and output JSON for manual insertion
 */

import 'dotenv/config';
import { createAIProvider } from '../src/lib/ai';
import { writeFileSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const JOB_ID = '61d374c9-8bf7-45f0-bfd6-c10b97de5196';

async function getScript() {
  const { stdout } = await execAsync(
    `docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -A -c "SELECT raw_script FROM news_jobs WHERE id = '${JOB_ID}';"`
  );
  return stdout.trim();
}

async function analyze() {
  console.log('🔍 Fetching script from database...');
  const rawScript = await getScript();
  console.log(`📝 Script length: ${rawScript.length} characters\n`);

  console.log('🤖 Calling Google AI provider...');
  const provider = createAIProvider('google');
  const analysis = await provider.analyzeScript(rawScript);

  console.log(`✅ Analysis complete:`);
  console.log(`   - Scenes: ${analysis.scenes.length}\n`);

  // Save to JSON file
  const output = {
    jobId: JOB_ID,
    scenes: analysis.scenes
  };

  writeFileSync('analysis-output.json', JSON.stringify(output, null, 2));
  console.log('💾 Saved to analysis-output.json');
  console.log('   Run: npx tsx scripts/insert-scenes.ts\n');

  process.exit(0);
}

analyze().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
