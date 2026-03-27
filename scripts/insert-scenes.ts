/**
 * Insert scenes from analysis-output.json into database
 */

import { readFileSync, writeFileSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function insertScenes() {
  console.log('📂 Loading analysis-output.json...');
  const data = JSON.parse(readFileSync('analysis-output.json', 'utf-8'));

  console.log(`📊 Job ID: ${data.jobId}`);
  console.log(`📝 Scenes to insert: ${data.scenes.length}\n`);

  // Build SQL file to avoid escaping issues
  let sql = `-- Update job status\nUPDATE news_jobs SET status = 'generating_images' WHERE id = '${data.jobId}';\n\n`;

  // Insert each scene
  for (const scene of data.scenes) {
    // Escape single quotes by doubling them
    const safePrompt = scene.image_prompt.replace(/'/g, "''");
    const safeHeadline = scene.ticker_headline.replace(/'/g, "''");

    sql += `INSERT INTO news_scenes (job_id, scene_order, image_prompt, ticker_headline, generation_status)
VALUES ('${data.jobId}', ${scene.id}, '${safePrompt}', '${safeHeadline}', 'pending');\n\n`;
  }

  // Write SQL file
  writeFileSync('insert-scenes.sql', sql);
  console.log('📝 Generated insert-scenes.sql');

  // Execute SQL file
  console.log('🔄 Executing SQL...');
  const { stdout, stderr } = await execAsync(
    `docker exec -i obsidian-postgres psql -U obsidian -d obsidian_news < insert-scenes.sql`
  );

  if (stderr && stderr.includes('ERROR')) {
    console.error('❌ SQL Error:', stderr);
    process.exit(1);
  }

  console.log('✅ Scenes inserted successfully!');
  console.log(`📊 Status: generating_images`);
  console.log(`   Images worker should pick up scenes automatically\n`);

  process.exit(0);
}

insertScenes().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
