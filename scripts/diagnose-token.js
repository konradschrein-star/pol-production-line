/**
 * Quick diagnostic script to check Whisk API token configuration
 * Run: node scripts/diagnose-token.js
 */

require('dotenv').config();

console.log('🔍 Obsidian News Desk - Token Diagnostic\n');

const token = process.env.WHISK_API_TOKEN;

// Check if token exists
if (!token) {
  console.log('❌ CRITICAL BLOCKER FOUND:');
  console.log('   WHISK_API_TOKEN is not set in .env file\n');
  console.log('📋 TO FIX:');
  console.log('   1. Open https://labs.google.com/whisk in browser');
  console.log('   2. Press F12 → Network tab');
  console.log('   3. Generate a test image');
  console.log('   4. Find "generateImage" request');
  console.log('   5. Copy Authorization header: "Bearer XXX..."');
  console.log('   6. Edit .env and set: WHISK_API_TOKEN=ya29...');
  console.log('   7. Restart workers: npm run workers\n');
  process.exit(1);
}

// Check if token is placeholder
if (token === 'ya29.your_whisk_api_token_here') {
  console.log('❌ CRITICAL BLOCKER FOUND:');
  console.log('   WHISK_API_TOKEN is still the placeholder value from .env.example\n');
  console.log('📋 TO FIX: Follow steps above to get real token\n');
  process.exit(1);
}

// Check token format
if (!token.startsWith('ya29.')) {
  console.log('⚠️  WARNING:');
  console.log('   Token format looks suspicious (should start with "ya29.")');
  console.log('   Token starts with:', token.substring(0, 15) + '...');
  console.log('   Token length:', token.length, 'chars\n');
  console.log('   This might still work, but if image generation fails,');
  console.log('   try refreshing the token using the steps above.\n');
} else {
  console.log('✅ WHISK_API_TOKEN is configured');
  console.log('   Token prefix:', token.substring(0, 15) + '...');
  console.log('   Token length:', token.length, 'chars\n');
}

// Check Docker services
console.log('🐳 Checking Docker services...');
const { execSync } = require('child_process');

try {
  const postgresStatus = execSync('docker ps --filter "name=postgres" --format "{{.Status}}"', { encoding: 'utf-8' }).trim();
  if (postgresStatus) {
    console.log('   ✅ Postgres:', postgresStatus);
  } else {
    console.log('   ❌ Postgres: Not running');
    console.log('   Fix: Run START.bat to start Docker services');
  }
} catch (err) {
  console.log('   ❌ Docker: Cannot connect (is Docker Desktop running?)');
}

try {
  const redisStatus = execSync('docker ps --filter "name=redis" --format "{{.Status}}"', { encoding: 'utf-8' }).trim();
  if (redisStatus) {
    console.log('   ✅ Redis:', redisStatus);
  } else {
    console.log('   ❌ Redis: Not running');
    console.log('   Fix: Run START.bat to start Docker services');
  }
} catch (err) {
  console.log('   ❌ Docker: Cannot check Redis status');
}

console.log('\n✅ Diagnostic complete!');
console.log('\nNext steps:');
console.log('  1. If token is missing → Follow fix steps above');
console.log('  2. If Docker not running → Run START.bat');
console.log('  3. Test API connection → npm run test:whisk');
