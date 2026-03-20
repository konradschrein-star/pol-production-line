import 'dotenv/config';
import { Worker } from 'bullmq';
import { redisConnection } from '../src/lib/queue';
import { analyzeWorker } from '../src/lib/queue/workers/analyze.worker';
import { imagesWorker } from '../src/lib/queue/workers/images.worker';
import { renderWorker } from '../src/lib/queue/workers/render.worker';
import { initStorage } from '../src/lib/storage/local';

console.log('🚀 Starting BullMQ workers...');
console.log(`📋 Environment: ${process.env.NODE_ENV}`);
console.log(`🔌 Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);

// Initialize local storage directories
console.log('📁 Initializing local storage...');
await initStorage();

// Phase 2: Analyze worker (IMPLEMENTED)
console.log('✅ Analyze worker loaded');

// Phase 3: Images worker (IMPLEMENTED)
console.log('✅ Images worker loaded');

// Phase 5: Render worker (IMPLEMENTED)
console.log('✅ Render worker loaded');

console.log('\n✅ Workers started:');
console.log('   - queue_analyze: Ready (LIVE - AI Script Analyst)');
console.log('   - queue_images: Ready (LIVE - Playwright Image Generator)');
console.log('   - queue_render: Ready (LIVE - Remotion Video Renderer)');

// Keep process running
console.log('\n🔄 Workers are now listening for jobs...');
console.log('   Press Ctrl+C to stop\n');

// Keep process alive with interval
const keepAliveInterval = setInterval(() => {
  // Just keep the process running
}, 10000);

const shutdown = async () => {
  console.log('\n🛑 Shutting down workers...');
  clearInterval(keepAliveInterval);
  try {
    await Promise.all([
      analyzeWorker.close(),
      imagesWorker.close(),
      renderWorker.close(),
    ]);
    console.log('✅ Workers shut down');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
