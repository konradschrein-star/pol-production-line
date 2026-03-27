import { queueAnalyze } from '../src/lib/queue/queues';
import { readFileSync } from 'fs';

const JOB_ID = '61d374c9-8bf7-45f0-bfd6-c10b97de5196';
const rawScript = readFileSync('/tmp/script.txt', 'utf-8').trim();

console.log('📤 Queueing job...');
console.log(`Script length: ${rawScript.length} characters`);

queueAnalyze.add('analyze-script', {
  jobId: JOB_ID,
  rawScript: rawScript,
  provider: 'google'
}).then(job => {
  console.log(`✅ Queued (Job ID: ${job.id})`);
  return queueAnalyze.close();
}).then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
