import 'dotenv/config';
import { db } from '../src/lib/db';

const jobId = process.argv[2] || '51065529-2613-43e9-b36a-99c05247013d';

async function run() {
  const result = await db.query(
    'SELECT scene_order, ticker_headline, image_prompt FROM news_scenes WHERE job_id = $1 ORDER BY scene_order',
    [jobId]
  );

  console.log(`\n📋 All ${result.rows.length} scenes for job ${jobId}:\n`);

  result.rows.forEach(s => {
    console.log(`${s.scene_order}. ${s.ticker_headline}`);
    console.log(`   ${s.image_prompt.substring(0, 90)}...`);
    console.log();
  });

  process.exit(0);
}

run();
