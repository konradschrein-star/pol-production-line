/**
 * Automated Installer Validation Script
 *
 * Basic automated checks for the Electron installer package.
 * Full end-to-end testing should follow the manual checklist in docs/INSTALLER_TEST_CHECKLIST.md
 *
 * Usage:
 *   npm run test:installer
 *
 * Tests:
 * - Verifies installer file exists in dist/
 * - Checks file size is reasonable (~200-300 MB)
 * - Validates bundled Node.js runtime exists
 * - Verifies critical files are included
 * - Checks electron-builder configuration
 */

import * as fs from 'fs';
import * as path from 'path';

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string, details?: string) {
  const icon = passed ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  console.log(`${icon} ${name}: ${message}`);
  if (details) {
    console.log(`  ${details}`);
  }
  results.push({ name, passed, message, details });
}

function logSection(title: string) {
  console.log(`\n${BLUE}━━━ ${title} ━━━${RESET}\n`);
}

async function main() {
  console.log(`\n${BLUE}╔════════════════════════════════════════════╗${RESET}`);
  console.log(`${BLUE}║  Obsidian News Desk - Installer Tests     ║${RESET}`);
  console.log(`${BLUE}╚════════════════════════════════════════════╝${RESET}\n`);

  const projectRoot = path.join(__dirname, '..');
  const distDir = path.join(projectRoot, 'dist');

  // Test 1: Verify dist directory exists
  logSection('Build Artifacts');

  const distExists = fs.existsSync(distDir);
  logTest(
    'Dist Directory',
    distExists,
    distExists ? 'Build output directory exists' : 'Build output directory not found',
    distExists ? `Path: ${distDir}` : 'Run: npm run electron:build'
  );

  if (!distExists) {
    console.log(`\n${YELLOW}⚠ Cannot proceed without build artifacts. Run: npm run electron:build${RESET}\n`);
    process.exit(1);
  }

  // Test 2: Find installer executable
  const installerPattern = /^Obsidian News Desk-Setup-.*\.exe$/;
  let installerFile: string | null = null;
  let installerPath: string | null = null;

  try {
    const files = fs.readdirSync(distDir);
    installerFile = files.find(file => installerPattern.test(file)) || null;
    if (installerFile) {
      installerPath = path.join(distDir, installerFile);
    }
  } catch (error: any) {
    logTest('Installer Executable', false, 'Failed to read dist directory', error.message);
  }

  const installerExists = installerFile !== null && installerPath !== null;
  logTest(
    'Installer Executable',
    installerExists,
    installerExists ? `Found: ${installerFile}` : 'Installer .exe not found in dist/',
    installerExists ? `Path: ${installerPath}` : 'Expected: Obsidian News Desk-Setup-*.exe'
  );

  // Test 3: Check installer file size
  if (installerExists && installerPath) {
    const stats = fs.statSync(installerPath);
    const sizeMB = stats.size / (1024 * 1024);
    const sizeOK = sizeMB >= 150 && sizeMB <= 500; // Reasonable range

    logTest(
      'Installer Size',
      sizeOK,
      sizeOK ? `Size: ${sizeMB.toFixed(1)} MB (within expected range)` : `Size: ${sizeMB.toFixed(1)} MB (unexpected)`,
      sizeOK ? '150-500 MB expected with bundled Node.js' : 'Expected: 150-500 MB'
    );
  }

  // Test 4: Verify bundled Node.js runtime
  logSection('Bundled Dependencies');

  const nodeRuntimePath = path.join(projectRoot, 'resources', 'node', 'node.exe');
  const nodeExists = fs.existsSync(nodeRuntimePath);

  let nodeVersion = 'unknown';
  if (nodeExists) {
    try {
      const { execSync } = require('child_process');
      nodeVersion = execSync(`"${nodeRuntimePath}" --version`, { encoding: 'utf-8' }).trim();
    } catch (error) {
      // Failed to get version
    }
  }

  logTest(
    'Bundled Node.js',
    nodeExists,
    nodeExists ? `Runtime found: ${nodeVersion}` : 'Node.js runtime not found',
    nodeExists ? nodeRuntimePath : 'Expected: resources/node/node.exe'
  );

  // Test 5: Verify FFmpeg binaries
  const ffmpegPath = path.join(projectRoot, 'resources', 'bin', 'ffmpeg.exe');
  const ffmpegExists = fs.existsSync(ffmpegPath);

  logTest(
    'FFmpeg Binary',
    ffmpegExists,
    ffmpegExists ? 'FFmpeg found' : 'FFmpeg binary not found',
    ffmpegExists ? ffmpegPath : 'Expected: resources/bin/ffmpeg.exe'
  );

  // Test 6: Verify critical project files
  logSection('Project Files');

  const criticalFiles = [
    { name: 'package.json', path: path.join(projectRoot, 'package.json') },
    { name: 'electron-builder.yml', path: path.join(projectRoot, 'electron-builder.yml') },
    { name: 'LICENSE', path: path.join(projectRoot, 'LICENSE') },
    { name: '.env.example', path: path.join(projectRoot, '.env.example') },
    { name: 'docker-compose.yml', path: path.join(projectRoot, 'docker-compose.yml') },
    { name: 'launcher.bat', path: path.join(projectRoot, 'launcher.bat') },
  ];

  criticalFiles.forEach(({ name, path: filePath }) => {
    const exists = fs.existsSync(filePath);
    logTest(
      name,
      exists,
      exists ? 'Present' : 'Missing',
      exists ? filePath : `Expected: ${filePath}`
    );
  });

  // Test 7: Verify Electron build output
  logSection('Electron Build');

  const electronDist = path.join(projectRoot, 'electron', 'dist');
  const electronDistExists = fs.existsSync(electronDist);

  if (electronDistExists) {
    const mainJs = path.join(electronDist, 'main.js');
    const preloadJs = path.join(electronDist, 'preload.js');
    const mainExists = fs.existsSync(mainJs);
    const preloadExists = fs.existsSync(preloadJs);

    logTest(
      'Electron Main Process',
      mainExists,
      mainExists ? 'Compiled' : 'Not compiled',
      mainExists ? 'electron/dist/main.js' : 'Run: npm run electron:compile'
    );

    logTest(
      'Electron Preload Script',
      preloadExists,
      preloadExists ? 'Compiled' : 'Not compiled',
      preloadExists ? 'electron/dist/preload.js' : 'Run: npm run electron:compile'
    );
  } else {
    logTest(
      'Electron Build Output',
      false,
      'Directory not found',
      'Run: npm run electron:compile'
    );
  }

  // Test 8: Verify wizard UI build
  const wizardDist = path.join(projectRoot, 'electron', 'dist', 'installer');
  const wizardDistExists = fs.existsSync(wizardDist);

  if (wizardDistExists) {
    const wizardJs = path.join(wizardDist, 'wizard-react.js');
    const wizardCss = path.join(wizardDist, 'wizard-styles.css');
    const wizardJsExists = fs.existsSync(wizardJs);
    const wizardCssExists = fs.existsSync(wizardCss);

    logTest(
      'Wizard React Bundle',
      wizardJsExists,
      wizardJsExists ? 'Built' : 'Not built',
      wizardJsExists ? 'electron/dist/installer/wizard-react.js' : 'Run: npm run electron:wizard'
    );

    logTest(
      'Wizard Styles',
      wizardCssExists,
      wizardCssExists ? 'Built' : 'Not built',
      wizardCssExists ? 'electron/dist/installer/wizard-styles.css' : 'Run: npm run electron:wizard'
    );
  } else {
    logTest(
      'Wizard UI Build',
      false,
      'Directory not found',
      'Run: npm run electron:wizard'
    );
  }

  // Test 9: Verify Next.js build
  logSection('Next.js Build');

  const nextBuild = path.join(projectRoot, '.next');
  const nextBuildExists = fs.existsSync(nextBuild);

  logTest(
    'Next.js Build Output',
    nextBuildExists,
    nextBuildExists ? 'Built' : 'Not built',
    nextBuildExists ? '.next/' : 'Run: npm run build'
  );

  // Test 10: Check electron-builder configuration
  logSection('Configuration');

  const electronBuilderConfig = path.join(projectRoot, 'electron-builder.yml');
  if (fs.existsSync(electronBuilderConfig)) {
    const config = fs.readFileSync(electronBuilderConfig, 'utf-8');

    const hasNsis = config.includes('nsis:');
    const hasIcon = config.includes('icon: electron/build/icon.ico');
    const hasNodeBundle = config.includes('from: "resources/node"');

    logTest(
      'NSIS Installer Config',
      hasNsis,
      hasNsis ? 'Configured' : 'Not configured',
      'NSIS installer settings present'
    );

    logTest(
      'Application Icon',
      hasIcon,
      hasIcon ? 'Configured' : 'Not configured',
      hasIcon ? 'electron/build/icon.ico' : 'Icon path not found in config'
    );

    logTest(
      'Bundled Node.js Config',
      hasNodeBundle,
      hasNodeBundle ? 'Configured' : 'Not configured',
      hasNodeBundle ? 'Node.js runtime will be bundled' : 'Node.js bundling not configured'
    );
  }

  // Summary
  logSection('Test Summary');

  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);

  console.log(`Total Tests: ${totalTests}`);
  console.log(`${GREEN}Passed: ${passedTests}${RESET}`);
  console.log(`${RED}Failed: ${failedTests}${RESET}`);
  console.log(`Pass Rate: ${passRate}%\n`);

  if (failedTests === 0) {
    console.log(`${GREEN}✅ All automated tests passed!${RESET}`);
    console.log(`\n${BLUE}Next Steps:${RESET}`);
    console.log(`1. Run the full manual test checklist: docs/INSTALLER_TEST_CHECKLIST.md`);
    console.log(`2. Test the installer on a clean Windows VM`);
    console.log(`3. Verify end-to-end workflow (create broadcast → render video)\n`);
    process.exit(0);
  } else {
    console.log(`${RED}❌ ${failedTests} test(s) failed.${RESET}`);
    console.log(`\nFailed tests:`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`);
      if (r.details) {
        console.log(`    ${r.details}`);
      }
    });
    console.log();
    process.exit(1);
  }
}

// Run tests
main().catch((error) => {
  console.error(`${RED}Test script crashed:${RESET}`, error);
  process.exit(1);
});
