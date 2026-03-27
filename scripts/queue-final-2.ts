import 'dotenv/config';
import { queueImages } from '../src/lib/queue/queues';

const JOB_ID = '61d374c9-8bf7-45f0-bfd6-c10b97de5196';

const scenes = [
  {
    id: 'a70216af-70a5-40bc-a0b4-b36bf9c4d0b2',
    prompt: 'Natural gas pipeline infrastructure against a clear sky, symbolizing energy transition debates, industrial photography'
  },
  {
    id: '35a726e6-abc3-48c0-ba2f-11fec3e02673',
    prompt: 'Geopolitical map highlighting the South China Sea region with overlapping naval symbols, news graphic style'
  }
];

(async () => {
  console.log('📋 Queueing final 2 scenes...\n');

  for (const scene of scenes) {
    await queueImages.add('generate-image', {
      sceneId: scene.id,
      imagePrompt: scene.prompt,
      jobId: JOB_ID,
    });
    console.log(`✅ Queued scene ${scene.id.substring(0, 8)}...`);
  }

  console.log('\n✅ Both scenes queued\n');
  await queueImages.close();
  process.exit(0);
})();
