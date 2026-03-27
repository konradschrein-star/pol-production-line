/**
 * Fast Job Creation with Streaming Upload
 * Uses FormData with file streams for efficient upload
 */

import { createReadStream, readFileSync, statSync } from 'fs';
import { basename } from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:8347';
const AVATAR_PATH = 'C:\\Users\\konra\\Downloads\\Avatar_Video.mp4';
const SCRIPT_PATH = 'C:\\Users\\konra\\OneDrive\\Projekte\\20260319 Political content automation\\obsidian-news-desk\\test-script.txt';

async function createJobFast() {
  console.log('🚀 Creating job with streaming upload...\n');

  // Read script
  const script = readFileSync(SCRIPT_PATH, 'utf-8');
  console.log(`📝 Script: ${script.length} characters`);

  // Check avatar file
  const avatarStats = statSync(AVATAR_PATH);
  console.log(`🎥 Avatar: ${(avatarStats.size / 1024 / 1024).toFixed(2)} MB`);

  // Create FormData with stream
  const formData = new FormData();
  formData.append('raw_script', script);
  formData.append('provider', 'google');
  formData.append('style_preset_id', ''); // Will use default
  formData.append('avatar', createReadStream(AVATAR_PATH), {
    filename: basename(AVATAR_PATH),
    contentType: 'video/mp4',
  });

  console.log('\n⏳ Uploading (this may take 1-2 minutes for 52MB)...');

  const startTime = Date.now();

  try {
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      body: formData as any,
      headers: formData.getHeaders(),
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Upload complete in ${elapsed}s\n`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    console.log('✅ Job created successfully!');
    console.log(`   Job ID: ${result.job.id}`);
    console.log(`   Status: ${result.job.status}`);
    console.log(`\n🔗 Monitor at: http://localhost:8347/jobs/${result.job.id}`);

    return result.job.id;

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Run it
createJobFast()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
