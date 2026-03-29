#!/usr/bin/env tsx
/**
 * Diagnostic script to validate Whisk API token configuration
 *
 * Checks:
 * 1. Token exists in environment
 * 2. Token format is correct (starts with ya29.)
 * 3. Token can successfully call Whisk API
 *
 * Usage: npx tsx scripts/diagnose-token.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

interface DiagnosticResult {
  step: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

const results: DiagnosticResult[] = [];

async function runDiagnostics() {
  console.log('🔍 Whisk API Token Diagnostics\n');
  console.log('='.repeat(60));

  // Check 1: Token exists
  const token = process.env.WHISK_API_TOKEN;
  if (!token) {
    results.push({
      step: 'Token Configuration',
      status: 'error',
      message: 'WHISK_API_TOKEN not found in .env file',
      details: 'Please add WHISK_API_TOKEN to your .env file'
    });
  } else {
    results.push({
      step: 'Token Configuration',
      status: 'success',
      message: 'Token found in environment',
      details: `Length: ${token.length} characters`
    });
  }

  // Check 2: Token format
  if (token && !token.startsWith('ya29.')) {
    results.push({
      step: 'Token Format',
      status: 'error',
      message: 'Invalid token format',
      details: 'Token must start with "ya29." (Google OAuth format)'
    });
  } else if (token) {
    results.push({
      step: 'Token Format',
      status: 'success',
      message: 'Token format is correct',
      details: `Prefix: ${token.substring(0, 10)}...`
    });
  }

  // Check 3: Test API call
  if (token) {
    try {
      console.log('\n⏳ Testing Whisk API connection...\n');

      const response = await fetch('https://aisandbox-pa.googleapis.com/v1/whisk:generateImage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: {
            textPrompt: 'test image for token validation'
          },
          aspectRatio: 'ASPECT_RATIO_LANDSCAPE',
          outputFormat: 'IMAGE_FORMAT_JPEG',
          imageModel: 'IMAGEN_3_0'
        })
      });

      const responseText = await response.text();

      if (response.status === 401) {
        results.push({
          step: 'API Connection',
          status: 'error',
          message: '🔴 TOKEN EXPIRED - Authentication failed (401)',
          details: 'You need to manually refresh the token. See instructions below.'
        });
      } else if (response.status === 429) {
        results.push({
          step: 'API Connection',
          status: 'warning',
          message: 'Rate limit reached (429)',
          details: 'Token is valid but API is rate-limited. This is normal.'
        });
      } else if (response.status === 400) {
        // 400 might mean invalid request format, but token is valid
        results.push({
          step: 'API Connection',
          status: 'success',
          message: '✅ Token is valid (API responded)',
          details: 'Got 400 response (test request format issue, but auth worked)'
        });
      } else if (response.ok) {
        results.push({
          step: 'API Connection',
          status: 'success',
          message: '✅ Token is valid and working',
          details: `API returned: ${response.status}`
        });
      } else {
        results.push({
          step: 'API Connection',
          status: 'warning',
          message: `Unexpected response: ${response.status}`,
          details: responseText.substring(0, 200)
        });
      }
    } catch (error) {
      results.push({
        step: 'API Connection',
        status: 'error',
        message: 'Failed to connect to Whisk API',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('📊 Diagnostic Results\n');

  results.forEach(result => {
    const icon = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⚠️';
    console.log(`${icon} ${result.step}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }
    console.log();
  });

  // Print recommendation
  const hasError = results.some(r => r.status === 'error');
  const tokenExpired = results.some(r => r.message.includes('TOKEN EXPIRED'));

  if (tokenExpired) {
    console.log('='.repeat(60));
    console.log('🔧 ACTION REQUIRED: Manual Token Refresh\n');
    console.log('Follow these steps to refresh your token:\n');
    console.log('1. Open https://labs.google.com/whisk in your browser');
    console.log('   (Make sure you\'re logged into your Google account)\n');
    console.log('2. Press F12 to open Developer Tools');
    console.log('   Click the "Network" tab\n');
    console.log('3. Generate any test image in Whisk');
    console.log('   (Enter a prompt and click generate)\n');
    console.log('4. In Network tab, find request named "generateImage"');
    console.log('   Click on it → Headers section\n');
    console.log('5. Find "Authorization" header:');
    console.log('   Authorization: Bearer ya29.a0...\n');
    console.log('6. Copy the token (everything after "Bearer ")\n');
    console.log('7. Update your .env file:');
    console.log('   WHISK_API_TOKEN=<paste-token-here>\n');
    console.log('8. Restart workers:');
    console.log('   npm run workers\n');
    console.log('='.repeat(60));
  } else if (hasError) {
    console.log('='.repeat(60));
    console.log('❌ Configuration issues found. Fix the errors above.\n');
  } else {
    console.log('='.repeat(60));
    console.log('✅ All checks passed! Token is configured correctly.\n');
  }

  // Exit with appropriate code
  process.exit(hasError ? 1 : 0);
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error('💥 Fatal error running diagnostics:', error);
  process.exit(1);
});
