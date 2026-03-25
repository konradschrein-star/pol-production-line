import 'dotenv/config';
import { Worker } from 'bullmq';
import { redisConnection } from '../src/lib/queue';
import { analyzeWorker } from '../src/lib/queue/workers/analyze.worker';
import { imagesWorker } from '../src/lib/queue/workers/images.worker';
import { avatarWorker } from '../src/lib/queue/workers/avatar.worker';
import { renderWorker } from '../src/lib/queue/workers/render.worker';
import { initStorage } from '../src/lib/storage/local';
import { initQueueRecovery } from '../src/lib/queue/recovery';
import { queueAnalyze, queueImages, queueRender, queueAvatarAutomation } from '../src/lib/queue/queues';

(async () => {
  console.log('🚀 Starting BullMQ workers...');
  console.log(`📋 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔌 Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);

  // Initialize local storage directories
  console.log('📁 Initializing local storage...');
  await initStorage();

  // PRODUCTION HARDENING: Initialize queue recovery system
  console.log('🔧 Initializing queue recovery system...');
  await initQueueRecovery([queueAnalyze, queueImages, queueRender, queueAvatarAutomation]);

  // Phase 2: Analyze worker (IMPLEMENTED)
  console.log('✅ Analyze worker loaded');

  // Phase 3: Images worker (IMPLEMENTED)
  console.log('✅ Images worker loaded');

  // Phase 4: Avatar automation worker (IMPLEMENTED - OPTIONAL)
  const avatarMode = process.env.AVATAR_MODE || 'manual';
  if (avatarMode === 'automated') {
    console.log('✅ Avatar automation worker loaded (mode: automated)');
  } else {
    console.log('ℹ️  Avatar automation worker loaded (mode: manual - worker idle)');
  }

  // Phase 5: Render worker (IMPLEMENTED)
  console.log('✅ Render worker loaded');

  console.log('\n✅ Workers started:');
  console.log('   - queue_analyze: Ready (LIVE - AI Script Analyst)');
  console.log('   - queue_images: Ready (LIVE - Playwright Image Generator)');
  console.log(`   - queue_avatar_automation: Ready (${avatarMode === 'automated' ? 'LIVE' : 'IDLE'} - HeyGen Python Automation)`);
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
        avatarWorker.close(),
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
})().catch((error) => {
  console.error('❌ Fatal error starting workers:', error);
  process.exit(1);
});
