import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync } from 'fs';

const execAsync = promisify(exec);
const JOB_ID = '61d374c9-8bf7-45f0-bfd6-c10b97de5196';

async function createProps() {
  console.log('📋 Fetching job data...');

  const { stdout } = await execAsync(
    `docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -A -F"|" -c "SELECT image_url, ticker_headline, scene_order FROM news_scenes WHERE job_id = '${JOB_ID}' ORDER BY scene_order;"`
  );

  const scenes = stdout.trim().split('\n').map(line => {
    const [image_url, ticker_headline, scene_order] = line.split('|');
    return { id: `scene-${scene_order}`, image_url, ticker_headline, scene_order: parseInt(scene_order) };
  });

  console.log(`   Scenes: ${scenes.length}`);

  const props = {
    avatarMp4Url: 'avatars/test-avatar-99s.mp4',
    avatarDurationSeconds: 99,
    avatarAspectRatio: 0.5625,
    avatarWidth: 1080,
    avatarHeight: 1920,
    scenes,
  };

  writeFileSync('render-props.json', JSON.stringify(props, null, 2));
  console.log('✅ Created render-props.json');
  process.exit(0);
}

createProps();
