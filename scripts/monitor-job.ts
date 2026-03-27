/**
 * Real-Time Job Progress Monitor
 * Tracks job status, queue activity, and detects stuck states
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface JobStatus {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  error_message: string | null;
}

interface SceneStatus {
  total: number;
  completed: number;
  generating: number;
  failed: number;
  pending: number;
}

const jobId = process.argv[2];

if (!jobId) {
  console.error('Usage: npx tsx scripts/monitor-job.ts <job-id>');
  process.exit(1);
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'pending': return '⏳';
    case 'analyzing': return '🧠';
    case 'generating_images': return '🎨';
    case 'review_assets': return '⏸️';
    case 'rendering': return '🎬';
    case 'completed': return '✅';
    case 'failed': return '❌';
    case 'cancelled': return '🚫';
    default: return '❓';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return colors.green;
    case 'failed': return colors.red;
    case 'cancelled': return colors.gray;
    case 'analyzing':
    case 'generating_images':
    case 'rendering': return colors.blue;
    case 'review_assets': return colors.yellow;
    default: return colors.cyan;
  }
}

async function queryDB(sql: string): Promise<any[]> {
  try {
    const cmd = `docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c "${sql.replace(/"/g, '\\"')}"`;
    const { stdout } = await execAsync(cmd, { cwd: 'obsidian-news-desk' });

    if (!stdout.trim()) return [];

    // Parse pipe-separated values
    return stdout.trim().split('\n').map(line => {
      const values = line.split('|').map(v => v.trim());
      return values;
    });
  } catch (error) {
    return [];
  }
}

async function getJobStatus(): Promise<JobStatus | null> {
  const result = await queryDB(
    `SELECT id, status, created_at, updated_at, error_message FROM news_jobs WHERE id = '${jobId}'`
  );

  if (result.length === 0) return null;

  const [id, status, created_at, updated_at, error_message] = result[0];
  return { id, status, created_at, updated_at, error_message };
}

async function getSceneStatus(): Promise<SceneStatus> {
  const result = await queryDB(
    `SELECT
       COUNT(*) as total,
       COUNT(CASE WHEN generation_status = 'completed' THEN 1 END) as completed,
       COUNT(CASE WHEN generation_status = 'generating' THEN 1 END) as generating,
       COUNT(CASE WHEN generation_status = 'failed' THEN 1 END) as failed,
       COUNT(CASE WHEN generation_status = 'pending' THEN 1 END) as pending
     FROM news_scenes
     WHERE job_id = '${jobId}'`
  );

  if (result.length === 0) return { total: 0, completed: 0, generating: 0, failed: 0, pending: 0 };

  const [total, completed, generating, failed, pending] = result[0];
  return {
    total: parseInt(total) || 0,
    completed: parseInt(completed) || 0,
    generating: parseInt(generating) || 0,
    failed: parseInt(failed) || 0,
    pending: parseInt(pending) || 0,
  };
}

async function getQueueCounts(): Promise<{ analyze: number; images: number; render: number }> {
  try {
    const cmd = `docker exec obsidian-redis redis-cli LLEN bull:queue_analyze:wait`;
    const { stdout: analyze } = await execAsync(cmd);

    const cmd2 = `docker exec obsidian-redis redis-cli LLEN bull:queue_images:wait`;
    const { stdout: images } = await execAsync(cmd2);

    const cmd3 = `docker exec obsidian-redis redis-cli LLEN bull:queue_render:wait`;
    const { stdout: render } = await execAsync(cmd3);

    return {
      analyze: parseInt(analyze.trim()) || 0,
      images: parseInt(images.trim()) || 0,
      render: parseInt(render.trim()) || 0,
    };
  } catch (error) {
    return { analyze: 0, images: 0, render: 0 };
  }
}

async function displayStatus() {
  console.clear();

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          JOB PROGRESS MONITOR - REAL-TIME TRACKING        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const job = await getJobStatus();

  if (!job) {
    console.log(`${colors.red}❌ Job ${jobId} not found${colors.reset}\n`);
    return false;
  }

  const scenes = await getSceneStatus();
  const queues = await getQueueCounts();

  const createdAt = new Date(job.created_at);
  const updatedAt = new Date(job.updated_at);
  const now = new Date();

  const totalDuration = now.getTime() - createdAt.getTime();
  const timeSinceUpdate = now.getTime() - updatedAt.getTime();

  // Job Status
  const statusColor = getStatusColor(job.status);
  const statusIcon = getStatusIcon(job.status);
  console.log(`${colors.cyan}📊 JOB STATUS${colors.reset}`);
  console.log(`   ${statusIcon} Status: ${statusColor}${job.status.toUpperCase()}${colors.reset}`);
  console.log(`   🆔 Job ID: ${colors.gray}${job.id}${colors.reset}`);
  console.log(`   ⏱️  Total Runtime: ${formatDuration(totalDuration)}`);
  console.log(`   🔄 Last Update: ${formatDuration(timeSinceUpdate)} ago`);

  if (job.error_message) {
    console.log(`   ${colors.red}❌ Error: ${job.error_message}${colors.reset}`);
  }

  // Scene Progress
  if (scenes.total > 0) {
    console.log(`\n${colors.cyan}🎨 SCENE GENERATION${colors.reset}`);
    const progress = Math.round((scenes.completed / scenes.total) * 100);
    const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));

    console.log(`   [${progressBar}] ${progress}%`);
    console.log(`   ✅ Completed: ${colors.green}${scenes.completed}${colors.reset}/${scenes.total}`);
    if (scenes.generating > 0) console.log(`   ⏳ Generating: ${colors.blue}${scenes.generating}${colors.reset}`);
    if (scenes.pending > 0) console.log(`   ⏸️  Pending: ${colors.yellow}${scenes.pending}${colors.reset}`);
    if (scenes.failed > 0) console.log(`   ❌ Failed: ${colors.red}${scenes.failed}${colors.reset}`);
  }

  // Queue Status
  console.log(`\n${colors.cyan}📋 QUEUE STATUS${colors.reset}`);
  console.log(`   Analyze Queue: ${queues.analyze > 0 ? colors.blue : colors.gray}${queues.analyze}${colors.reset} jobs`);
  console.log(`   Images Queue: ${queues.images > 0 ? colors.blue : colors.gray}${queues.images}${colors.reset} jobs`);
  console.log(`   Render Queue: ${queues.render > 0 ? colors.blue : colors.gray}${queues.render}${colors.reset} jobs`);

  // Stuck Detection
  console.log(`\n${colors.cyan}🔍 HEALTH CHECK${colors.reset}`);

  const isStuck = timeSinceUpdate > 300000; // 5 minutes
  const isAnalyzing = job.status === 'analyzing' && timeSinceUpdate > 120000; // 2 minutes
  const isGenerating = job.status === 'generating_images' && scenes.generating === 0 && scenes.pending > 0 && timeSinceUpdate > 60000;

  if (isStuck) {
    console.log(`   ${colors.red}⚠️  WARNING: No progress for ${formatDuration(timeSinceUpdate)}${colors.reset}`);
    console.log(`   ${colors.yellow}💡 Job may be stuck - check worker logs${colors.reset}`);
  } else if (isAnalyzing) {
    console.log(`   ${colors.yellow}⚠️  Analysis taking longer than expected (>${formatDuration(timeSinceUpdate)})${colors.reset}`);
  } else if (isGenerating) {
    console.log(`   ${colors.yellow}⚠️  Image generation queue not progressing${colors.reset}`);
  } else {
    console.log(`   ${colors.green}✅ System healthy - progressing normally${colors.reset}`);
  }

  // Expected Timeline
  console.log(`\n${colors.cyan}⏱️  EXPECTED TIMELINE${colors.reset}`);
  switch (job.status) {
    case 'pending':
      console.log(`   Next: Analysis starts soon`);
      break;
    case 'analyzing':
      console.log(`   Current: AI analyzing script (30-60s expected)`);
      console.log(`   Next: Image generation (15-20 min for ${scenes.total || '15-25'} scenes)`);
      break;
    case 'generating_images':
      const remainingScenes = scenes.total - scenes.completed;
      const estimatedMinutes = Math.ceil(remainingScenes * 2); // ~2 min per scene
      console.log(`   Current: Generating ${remainingScenes} remaining scenes (~${estimatedMinutes} min)`);
      console.log(`   Next: Manual avatar upload required`);
      break;
    case 'review_assets':
      console.log(`   ${colors.yellow}⏸️  WAITING FOR MANUAL ACTION${colors.reset}`);
      console.log(`   Required: Upload avatar MP4 via UI and click "COMPILE & RENDER"`);
      console.log(`   URL: http://localhost:8347`);
      break;
    case 'rendering':
      console.log(`   Current: Rendering final video (2-3 min expected)`);
      console.log(`   Next: Completion!`);
      break;
    case 'completed':
      console.log(`   ${colors.green}🎉 Job completed successfully!${colors.reset}`);
      console.log(`   Video: obsidian-news-desk/tmp/${jobId}.mp4`);
      break;
    case 'failed':
      console.log(`   ${colors.red}❌ Job failed - check error message above${colors.reset}`);
      break;
  }

  console.log(`\n${colors.gray}Press Ctrl+C to stop monitoring${colors.reset}\n`);

  return job.status !== 'completed' && job.status !== 'failed' && job.status !== 'cancelled';
}

async function monitor() {
  let shouldContinue = true;

  while (shouldContinue) {
    shouldContinue = await displayStatus();

    if (shouldContinue) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Update every 3 seconds
    }
  }

  console.log(`\n${colors.green}✅ Monitoring complete!${colors.reset}\n`);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\n\n${colors.yellow}⏸️  Monitoring stopped by user${colors.reset}\n`);
  process.exit(0);
});

monitor().catch(error => {
  console.error(`\n${colors.red}❌ Monitor error:${colors.reset}`, error);
  process.exit(1);
});
