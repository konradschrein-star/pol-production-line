const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'obsidian_redis_password',
  maxRetriesPerRequest: null,
});

const renderQueue = new Queue('queue_render', { connection });

const jobId = process.argv[2];

renderQueue.add('render-video', {
  jobId: jobId,
}).then(() => {
  console.log(`✅ Job ${jobId} queued for rendering`);
  process.exit(0);
}).catch((err) => {
  console.error('❌ Failed to queue render:', err.message);
  process.exit(1);
});
