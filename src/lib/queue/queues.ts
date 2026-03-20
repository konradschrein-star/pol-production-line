import { Queue } from 'bullmq';
import { redisConnection } from './index';

// Queue for AI script analysis
export const queueAnalyze = new Queue('queue_analyze', {
  connection: redisConnection,
});

// Queue for image generation via Playwright
export const queueImages = new Queue('queue_images', {
  connection: redisConnection,
});

// Queue for video rendering
export const queueRender = new Queue('queue_render', {
  connection: redisConnection,
});

console.log('✅ BullMQ queues initialized');

export default {
  queueAnalyze,
  queueImages,
  queueRender,
};
