#!/usr/bin/env node
/**
 * Automated Code Patches for Critical Fixes
 * Applies fixes to middleware.ts, headers.ts, and docker-compose.yml
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

// Color codes for terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function applyPatch(filePath, searchText, replaceText, description) {
  const fullPath = path.join(ROOT_DIR, filePath);

  if (!fs.existsSync(fullPath)) {
    log(`❌ File not found: ${filePath}`, 'red');
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Check if already patched
  if (content.includes(replaceText) || content.includes('isBrowserRequest')) {
    log(`✅ ${description} - Already patched`, 'green');
    return true;
  }

  // Apply patch
  if (content.includes(searchText)) {
    content = content.replace(searchText, replaceText);
    fs.writeFileSync(fullPath, content, 'utf8');
    log(`✅ ${description} - Patched successfully`, 'green');
    return true;
  } else {
    log(`⚠️  ${description} - Search text not found (manual patch needed)`, 'yellow');
    return false;
  }
}

console.log('========================================');
console.log('Obsidian News Desk - Code Patches');
console.log('========================================\n');

let patchCount = 0;
let failCount = 0;

// ==========================================
// PATCH 1: Middleware - Allow same-origin requests
// ==========================================
log('🔧 Patching middleware.ts...', 'cyan');

const middlewarePatch = applyPatch(
  'src/middleware.ts',
  `  if (!isPublicEndpoint) {
    const isAuthenticated = verifyAuthentication(req);`,
  `  // Allow same-origin browser requests (no Bearer token needed from the UI)
  const referer = req.headers.get('referer') || '';
  const origin = req.headers.get('origin') || '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8347';
  const isBrowserRequest =
    referer.startsWith(appUrl) ||
    origin.startsWith(appUrl) ||
    req.headers.get('sec-fetch-site') === 'same-origin' ||
    req.headers.get('sec-fetch-mode') === 'navigate';

  if (!isPublicEndpoint && !isBrowserRequest) {
    const isAuthenticated = verifyAuthentication(req);`,
  'Middleware: Allow same-origin requests'
);

if (middlewarePatch) patchCount++;
else failCount++;

console.log('');

// ==========================================
// PATCH 2: CSP Headers - Allow Google Fonts
// ==========================================
log('🔧 Patching security headers...', 'cyan');

const cspStylePatch = applyPatch(
  'src/lib/security/headers.ts',
  `      "style-src 'self' 'unsafe-inline'", // TailwindCSS inline styles`,
  `      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // TailwindCSS + Google Fonts`,
  'CSP: Allow Google Fonts stylesheets'
);

if (cspStylePatch) patchCount++;
else failCount++;

// Add font-src directive
const headersPath = path.join(ROOT_DIR, 'src/lib/security/headers.ts');
let headersContent = fs.readFileSync(headersPath, 'utf8');

if (!headersContent.includes('font-src')) {
  headersContent = headersContent.replace(
    `      "connect-src 'self' ws: wss:", // WebSocket for HMR`,
    `      "connect-src 'self' ws: wss:", // WebSocket for HMR
      "font-src 'self' https://fonts.gstatic.com", // Google Fonts files`
  );
  fs.writeFileSync(headersPath, headersContent, 'utf8');
  log('✅ CSP: Added font-src directive', 'green');
  patchCount++;
} else {
  log('✅ CSP: font-src already exists', 'green');
}

console.log('');

// ==========================================
// PATCH 3: Docker Compose - Fix healthcheck
// ==========================================
log('🔧 Patching docker-compose.yml...', 'cyan');

const dockerPatch = applyPatch(
  'docker-compose.yml',
  `      test: ["CMD-SHELL", "pg_isready -U obsidian"]`,
  `      test: ["CMD-SHELL", "pg_isready -U obsidian -d obsidian_news"]`,
  'Docker: Fix PostgreSQL healthcheck'
);

if (dockerPatch) patchCount++;
else failCount++;

console.log('');

// ==========================================
// PATCH 4: START.bat - Kill stale processes
// ==========================================
log('🔧 Patching START.bat...', 'cyan');

const startBatPath = path.join(ROOT_DIR, 'START.bat');
if (fs.existsSync(startBatPath)) {
  let startContent = fs.readFileSync(startBatPath, 'utf8');

  if (!startContent.includes('taskkill /F /IM node.exe')) {
    // Add cleanup at the beginning
    startContent = startContent.replace(
      `@echo off`,
      `@echo off
echo Cleaning up old Node processes...
taskkill /F /IM node.exe /T 2>nul
echo.`
    );
    fs.writeFileSync(startBatPath, startContent, 'utf8');
    log('✅ START.bat: Added process cleanup', 'green');
    patchCount++;
  } else {
    log('✅ START.bat: Already has cleanup', 'green');
  }
} else {
  log('⚠️  START.bat not found (skipping)', 'yellow');
}

console.log('');

// Summary
console.log('========================================');
if (failCount === 0) {
  log(`✅ All patches applied successfully! (${patchCount} patches)`, 'green');
} else {
  log(`⚠️  ${patchCount} patches succeeded, ${failCount} need manual intervention`, 'yellow');
}
console.log('========================================\n');

console.log('NEXT STEPS:');
console.log('  1. Restart Docker containers: docker compose restart');
console.log('  2. Restart dev server and workers: STOP.bat && START.bat');
console.log('  3. Test at http://localhost:8347\n');
