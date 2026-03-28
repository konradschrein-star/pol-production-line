#!/usr/bin/env tsx
/**
 * Obsidian News Desk - First-Run Setup Wizard
 *
 * Interactive setup guide for new installations (USB installer / fresh laptop).
 * Walks users through API key configuration, validates tokens, and creates .env file.
 *
 * USAGE:
 *   npm run first-run
 *   OR
 *   npx tsx scripts/first-run-setup.ts
 *
 * PHILOSOPHY:
 * - User-friendly interactive prompts (not CLI arguments)
 * - Validate API keys immediately with test requests
 * - Generate secure random keys for API_KEY and ADMIN_API_KEY
 * - Clear error messages with helpful links
 * - Works on any machine without prerequisites (except Node.js)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as crypto from 'crypto';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function print(msg: string, color?: keyof typeof colors): void {
  const c = color ? colors[color] : '';
  console.log(`${c}${msg}${colors.reset}`);
}

function printHeader(title: string): void {
  const width = 70;
  const padding = Math.max(0, (width - title.length - 2) / 2);
  const line = '═'.repeat(width);

  console.log();
  print(line, 'cyan');
  print(' '.repeat(Math.floor(padding)) + title, 'bright');
  print(line, 'cyan');
  console.log();
}

function printSection(title: string): void {
  console.log();
  print(`▼ ${title}`, 'bright');
  print('─'.repeat(70), 'dim');
  console.log();
}

// ============================================
// Interactive Input Helpers
// ============================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(`${colors.cyan}${prompt}${colors.reset} `, answer => {
      resolve(answer.trim());
    });
  });
}

function confirm(prompt: string, defaultYes = false): Promise<boolean> {
  const suffix = defaultYes ? '[Y/n]' : '[y/N]';
  return new Promise(resolve => {
    rl.question(`${colors.cyan}${prompt} ${suffix}${colors.reset} `, answer => {
      const normalized = answer.trim().toLowerCase();
      if (normalized === '') {
        resolve(defaultYes);
      } else {
        resolve(normalized === 'y' || normalized === 'yes');
      }
    });
  });
}

// ============================================
// API Validation Functions
// ============================================

/**
 * Validate OpenAI API key
 */
async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      print('   ✓ OpenAI API key is valid', 'green');
      return true;
    } else {
      print(`   ✗ OpenAI API key is invalid (HTTP ${response.status})`, 'red');
      return false;
    }
  } catch (error) {
    print(`   ✗ Could not validate OpenAI key: ${(error as Error).message}`, 'red');
    return false;
  }
}

/**
 * Validate Google AI API key
 */
async function validateGoogleAIKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );

    if (response.ok) {
      print('   ✓ Google AI API key is valid', 'green');
      return true;
    } else {
      print(`   ✗ Google AI API key is invalid (HTTP ${response.status})`, 'red');
      return false;
    }
  } catch (error) {
    print(`   ✗ Could not validate Google AI key: ${(error as Error).message}`, 'red');
    return false;
  }
}

/**
 * Validate Whisk API token
 */
async function validateWhiskToken(token: string): Promise<boolean> {
  try {
    // Remove "Bearer " prefix if present
    const cleanToken = token.replace(/^Bearer\s+/i, '');

    // Test token with a simple image generation request (dry run)
    const response = await fetch(
      'https://aisandbox-pa.googleapis.com/v1/whisk:generateImage',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: { textPrompt: 'test' },
          aspectRatio: 'ASPECT_RATIO_SQUARE',
        }),
      }
    );

    if (response.ok) {
      print('   ✓ Whisk API token is valid', 'green');
      return true;
    } else if (response.status === 401) {
      print('   ✗ Whisk token is expired or invalid (401 Unauthorized)', 'red');
      print('   → Follow token refresh instructions below', 'yellow');
      return false;
    } else {
      // Other errors might be OK (e.g., 400 bad request for test payload)
      print(`   ⚠ Token accepted, but got HTTP ${response.status} (might be OK)`, 'yellow');
      return true;
    }
  } catch (error) {
    print(`   ✗ Could not validate Whisk token: ${(error as Error).message}`, 'red');
    return false;
  }
}

// ============================================
// Setup Steps
// ============================================

async function welcomeMessage() {
  printHeader('Obsidian News Desk - First-Run Setup');

  print('Welcome! This wizard will help you configure your system.', 'bright');
  console.log();
  print('What you\'ll need:', 'cyan');
  print('  • OpenAI API key (for script analysis)', 'dim');
  print('  • Google Whisk API token (for image generation)', 'dim');
  print('  • Optional: Google AI, Anthropic, or Groq API keys', 'dim');
  console.log();
  print('Estimated time: 5-10 minutes', 'dim');
  console.log();

  const proceed = await confirm('Ready to start?', true);
  if (!proceed) {
    print('Setup cancelled.', 'red');
    process.exit(0);
  }
}

async function selectAIProvider(): Promise<string> {
  printSection('AI Provider Selection');

  print('Which AI provider would you like to use for script analysis?', 'bright');
  console.log();
  print('  1. OpenAI (GPT-4) - Recommended, best quality', 'cyan');
  print('  2. Google (Gemini) - Fast, good quality', 'cyan');
  print('  3. Anthropic (Claude) - High quality, good reasoning', 'cyan');
  print('  4. Groq (Mixtral) - Fastest, lower quality', 'cyan');
  console.log();

  const choice = await question('Enter number [1-4]:');

  const providers: Record<string, string> = {
    '1': 'openai',
    '2': 'google',
    '3': 'anthropic',
    '4': 'groq',
  };

  return providers[choice] || 'openai';
}

async function configureOpenAI(): Promise<string> {
  printSection('OpenAI API Key');

  print('Get your API key: https://platform.openai.com/api-keys', 'dim');
  console.log();

  let apiKey = '';
  let isValid = false;

  while (!isValid) {
    apiKey = await question('Enter your OpenAI API key (starts with sk-):');

    if (!apiKey.startsWith('sk-')) {
      print('   ⚠ Warning: OpenAI keys usually start with "sk-"', 'yellow');
    }

    print('   Validating...', 'dim');
    isValid = await validateOpenAIKey(apiKey);

    if (!isValid) {
      const retry = await confirm('Try again?', true);
      if (!retry) {
        apiKey = 'sk-your_openai_api_key_here';
        print('   Using placeholder value. You can update it later in .env', 'yellow');
        break;
      }
    }
  }

  return apiKey;
}

async function configureGoogleAI(): Promise<string> {
  printSection('Google AI API Key (Optional)');

  const useGoogle = await confirm('Do you want to configure Google AI?', false);
  if (!useGoogle) {
    return 'your_google_ai_api_key_here';
  }

  print('Get your API key: https://makersuite.google.com/app/apikey', 'dim');
  console.log();

  let apiKey = '';
  let isValid = false;

  while (!isValid) {
    apiKey = await question('Enter your Google AI API key:');

    print('   Validating...', 'dim');
    isValid = await validateGoogleAIKey(apiKey);

    if (!isValid) {
      const retry = await confirm('Try again?', true);
      if (!retry) {
        apiKey = 'your_google_ai_api_key_here';
        break;
      }
    }
  }

  return apiKey;
}

async function configureWhisk(): Promise<string> {
  printSection('Google Whisk API Token');

  print('⚠ IMPORTANT: Whisk tokens expire every ~1 hour', 'yellow');
  print('   You will need to refresh the token regularly.', 'yellow');
  console.log();
  print('How to get your token:', 'bright');
  print('  1. Open https://labs.google.com/whisk in your browser', 'cyan');
  print('  2. Press F12 to open Developer Tools', 'cyan');
  print('  3. Go to the Network tab', 'cyan');
  print('  4. Generate a test image on the Whisk page', 'cyan');
  print('  5. Find the "generateImage" request in the Network tab', 'cyan');
  print('  6. Click on it and find the "Authorization" header', 'cyan');
  print('  7. Copy the value after "Bearer " (starts with ya29.)', 'cyan');
  console.log();

  let token = '';
  let isValid = false;

  while (!isValid) {
    token = await question('Enter your Whisk token (starts with ya29.):');

    // Remove "Bearer " prefix if user copied the whole header
    token = token.replace(/^Bearer\s+/i, '');

    if (!token.startsWith('ya29.')) {
      print('   ⚠ Warning: Whisk tokens usually start with "ya29."', 'yellow');
    }

    print('   Validating...', 'dim');
    isValid = await validateWhiskToken(token);

    if (!isValid) {
      const retry = await confirm('Try again?', true);
      if (!retry) {
        token = 'ya29.your_whisk_api_token_here';
        print('   Using placeholder value. You MUST update it before generating images.', 'yellow');
        break;
      }
    }
  }

  return token;
}

async function generateSecurityKeys(): Promise<{ apiKey: string; adminKey: string }> {
  printSection('Security Keys');

  print('Generating random security keys...', 'dim');
  const apiKey = crypto.randomBytes(32).toString('hex');
  const adminKey = crypto.randomBytes(32).toString('hex');

  print('   ✓ API_KEY: ' + apiKey.slice(0, 16) + '...', 'green');
  print('   ✓ ADMIN_API_KEY: ' + adminKey.slice(0, 16) + '...', 'green');

  return { apiKey, adminKey };
}

async function createEnvFile(config: Record<string, string>): Promise<void> {
  printSection('Creating .env File');

  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  // Read .env.example as template
  if (!fs.existsSync(envExamplePath)) {
    throw new Error('.env.example file not found. Installation may be corrupted.');
  }

  let envContent = fs.readFileSync(envExamplePath, 'utf8');

  // Replace placeholders with user values
  const replacements: Record<string, string> = {
    'AI_PROVIDER=openai': `AI_PROVIDER=${config.aiProvider}`,
    'OPENAI_API_KEY=sk-proj-your_openai_api_key_here': `OPENAI_API_KEY=${config.openaiKey}`,
    'GOOGLE_AI_API_KEY=your_google_ai_api_key_here': `GOOGLE_AI_API_KEY=${config.googleKey}`,
    'WHISK_API_TOKEN=ya29.your_whisk_api_token_here': `WHISK_API_TOKEN=${config.whiskToken}`,
    'API_KEY=your_secure_random_64_char_api_key_here': `API_KEY=${config.apiKey}`,
    'ADMIN_API_KEY=your_secure_random_32_char_admin_key': `ADMIN_API_KEY=${config.adminKey}`,
  };

  for (const [oldValue, newValue] of Object.entries(replacements)) {
    envContent = envContent.replace(oldValue, newValue);
  }

  // Write .env file
  fs.writeFileSync(envPath, envContent, 'utf8');

  print('   ✓ Created .env file', 'green');
  print(`   → ${envPath}`, 'dim');
}

async function finalInstructions() {
  printSection('Setup Complete!');

  print('✓ Your system is now configured', 'green');
  console.log();
  print('Next steps:', 'bright');
  print('  1. Install Docker Desktop (if not already installed)', 'cyan');
  print('     → https://www.docker.com/products/docker-desktop/', 'dim');
  console.log();
  print('  2. Start the system:', 'cyan');
  print('     → Run: START.bat (Windows) or npm run start', 'dim');
  console.log();
  print('  3. Open the web interface:', 'cyan');
  print('     → http://localhost:8347', 'dim');
  console.log();
  print('⚠ Remember: Whisk tokens expire every hour!', 'yellow');
  print('   When images fail to generate, follow the token refresh process.', 'dim');
  print('   See: docs/WHISK_TOKEN_SETUP.md', 'dim');
  console.log();
}

// ============================================
// Main Setup Flow
// ============================================

async function main() {
  try {
    await welcomeMessage();

    const aiProvider = await selectAIProvider();

    // Configure required API keys
    const openaiKey = await configureOpenAI();
    const whiskToken = await configureWhisk();

    // Configure optional keys
    const googleKey = await configureGoogleAI();

    // Generate security keys
    const { apiKey, adminKey } = await generateSecurityKeys();

    // Create .env file
    await createEnvFile({
      aiProvider,
      openaiKey,
      googleKey,
      whiskToken,
      apiKey,
      adminKey,
    });

    await finalInstructions();

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error();
    print('Setup failed with error:', 'red');
    console.error(error);
    console.error();
    rl.close();
    process.exit(1);
  }
}

// Run setup wizard
main();
