import { Queue } from 'bullmq';
import { redisOptions } from './index';

// Queue for AI script analysis
export const queueAnalyze = new Queue('queue_analyze', {
  connection: redisOptions,
});

// Queue for image generation via Playwright
export const queueImages = new Queue('queue_images', {
  connection: redisOptions,
});

// Queue for video rendering
export const queueRender = new Queue('queue_render', {
  connection: redisOptions,
});

console.log('✅ BullMQ queues initialized');

export default {
  queueAnalyze,
  queueImages,
  queueRender,
};
