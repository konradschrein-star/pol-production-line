#!/usr/bin/env tsx
/**
 * Installer Test Runner
 *
 * Orchestrates the complete installer validation test suite.
 * Runs in three phases: prerequisites check, sequential test sections, summary report.
 *
 * USAGE:
 *   npm run test:installer
 *   npm run test:installer:no-cleanup (preserve test artifacts)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { InstallerTestReporter } from './lib/test-reporter';
import { checkSystemRequirements } from './lib/system-checks';
import { waitForAllServices, getDockerServiceStatus } from './lib/docker-health';

const reporter = new InstallerTestReporter();

// ============================================
// Phase 1: Prerequisites Check
// ============================================

async function checkPrerequisites(): Promise<boolean> {
  reporter.printHeader('OBSIDIAN NEWS DESK - INSTALLER VALIDATION');

  console.log('Phase 1: Prerequisites Check');
  console.log();

  const projectRoot = process.cwd();
  const envPath = path.join(projectRoot, '.env');

  // Get storage directory for disk check
  let storageDir = path.join(require('os').homedir(), 'ObsidianNewsDesk');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^LOCAL_STORAGE_ROOT=(.*)$/m);
    if (match) {
      storageDir = match[1].trim();
    }
  }

  // Run system checks
  const systemReqs = checkSystemRequirements(storageDir);

  const checks = [
    systemReqs.dockerInstalled,
    systemReqs.dockerRunning,
    systemReqs.node,
    { passed: fs.existsSync(envPath), message: '.env file exists' },
  ];

  let allPassed = true;

  checks.forEach(check => {
    reporter.reportTest({
      name: check.message,
      passed: check.passed,
      value: check.value,
    });

    if (!check.passed) {
      allPassed = false;
      if (check.fix) {
        reporter.reportWarning(check.fix);
      }
    }
  });

  console.log();

  // Check if web server is running
  try {
    const response = await fetch('http://localhost:8347/api/health', {
      method: 'GET',
    });

    if (response.ok) {
      reporter.reportTest({
        name: 'Web server responding',
        passed: true,
      });
    } else {
      reporter.reportTest({
        name: 'Web server responding',
        passed: false,
      });
      reporter.reportWarning('Start the web server with: npm run dev (or START.bat)');
      allPassed = false;
    }
  } catch (error) {
    reporter.reportTest({
      name: 'Web server responding',
      passed: false,
    });
    reporter.reportWarning('Start the web server with: npm run dev (or START.bat)');
    allPassed = false;
  }

  console.log();

  if (!allPassed) {
    reporter.reportError(
      'Prerequisites check failed',
      'Some prerequisites are not met. Please fix the issues above and try again.',
      'Run: npm run setup -- to validate and fix common issues'
    );
    return false;
  }

  // Wait for Docker services to be healthy
  console.log('Waiting for Docker services to be healthy...');
  const services = await waitForAllServices(30);

  if (!services.allHealthy) {
    reporter.reportError(
      'Docker services not healthy',
      services.postgres.healthy ? services.redis.message : services.postgres.message,
      'Ensure Docker containers are running: docker compose up -d (or run START.bat)'
    );
    return false;
  }

  reporter.reportTest({
    name: services.postgres.message,
    passed: services.postgres.healthy,
  });

  reporter.reportTest({
    name: services.redis.message,
    passed: services.redis.healthy,
  });

  console.log();

  return true;
}

// ============================================
// Phase 2: Sequential Test Sections
// ============================================

interface TestSectionResult {
  name: string;
  passed: number;
  failed: number;
  duration: number;
  critical: boolean;
}

async function runTestSection(
  sectionName: string,
  testPattern: string,
  critical = false
): Promise<TestSectionResult> {
  reporter.startSection(sectionName);

  const startTime = Date.now();

  try {
    // Run vitest with specific test pattern
    const output = execSync(
      `npx vitest run tests/integration/installer-validation.test.ts -t "${testPattern}" --reporter=verbose`,
      {
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: process.cwd(),
      }
    );

    const duration = Date.now() - startTime;

    // Parse output for pass/fail counts
    const passMatch = output.match(/(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);

    const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
    const failed = failMatch ? parseInt(failMatch[1], 10) : 0;

    reporter.endSection(passed, failed);

    return {
      name: sectionName,
      passed,
      failed,
      duration,
      critical,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Parse vitest error output
    const output = error.stdout || error.stderr || error.message;

    const passMatch = output.match(/(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);

    const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
    const failed = failMatch ? parseInt(failMatch[1], 10) : 1;

    reporter.endSection(passed, failed);

    return {
      name: sectionName,
      passed,
      failed,
      duration,
      critical,
    };
  }
}

async function runAllTestSections(): Promise<TestSectionResult[]> {
  console.log('Phase 2: Test Sections');
  console.log();

  const sections: Array<{ name: string; pattern: string; critical: boolean }> = [
    { name: 'Section A: Bundled Dependencies', pattern: 'Section A', critical: true },
    { name: 'Section B: Configuration System', pattern: 'Section B', critical: true },
    { name: 'Section C: End-to-End Production', pattern: 'Section C', critical: false },
    { name: 'Section D: Performance Benchmarks', pattern: 'Section D', critical: false },
  ];

  const results: TestSectionResult[] = [];

  for (const section of sections) {
    const result = await runTestSection(section.name, section.pattern, section.critical);
    results.push(result);

    // Stop if critical section failed
    if (section.critical && result.failed > 0) {
      console.log();
      reporter.reportError(
        'Critical test section failed',
        `${section.name} failed with ${result.failed} error(s). Cannot continue.`,
        'Fix the critical issues above before running remaining tests.'
      );
      break;
    }
  }

  return results;
}

// ============================================
// Phase 3: Summary Report
// ============================================

function printSummaryReport(results: TestSectionResult[]): boolean {
  reporter.printSummary();

  const totals = reporter.getTotals();

  // Print additional performance info
  if (totals.failed === 0) {
    console.log('✅ All installer validation tests passed!');
    console.log();
    console.log('The system is ready for packaging and distribution.');
    console.log();
  } else {
    console.log('❌ Some installer validation tests failed.');
    console.log();
    console.log('Please fix the issues above before packaging for distribution.');
    console.log();

    // Print specific guidance
    const failedCritical = results.filter(r => r.critical && r.failed > 0);
    if (failedCritical.length > 0) {
      console.log('CRITICAL FAILURES:');
      failedCritical.forEach(r => {
        console.log(`  - ${r.name}: ${r.failed} test(s) failed`);
      });
      console.log();
    }
  }

  return totals.failed === 0;
}

// ============================================
// Main Execution
// ============================================

async function main() {
  const startTime = Date.now();

  try {
    // Phase 1: Check prerequisites
    const prereqsPassed = await checkPrerequisites();
    if (!prereqsPassed) {
      console.log();
      process.exit(1);
    }

    // Phase 2: Run test sections
    const results = await runAllTestSections();

    // Phase 3: Print summary
    const allPassed = printSummaryReport(results);

    const totalDuration = Date.now() - startTime;
    console.log(`Total execution time: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log();

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error();
    console.error('❌ Test runner failed with error:');
    console.error(error);
    console.error();
    process.exit(1);
  }
}

// Run tests
main();
