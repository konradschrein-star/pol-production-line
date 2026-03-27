const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'obsidian_redis_password',
  maxRetriesPerRequest: null,
});

const analyzeQueue = new Queue('queue_analyze', { connection });

const jobId = process.argv[2];
const script = process.argv[3];

analyzeQueue.add('analyze-script', {
  jobId: jobId,
  rawScript: script,
  provider: 'google',
}).then(() => {
  console.log(`✅ Job ${jobId} queued for analysis`);
  process.exit(0);
}).catch((err) => {
  console.error('❌ Failed to queue job:', err.message);
  process.exit(1);
});
