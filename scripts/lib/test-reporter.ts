/**
 * Installer Test Reporter
 *
 * Provides colored console output for test results with timing and summaries.
 * Matches the style of scripts/setup.ts for consistency.
 */

// ANSI color codes (matching setup.ts)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

type Color = keyof typeof colors;

function checkMark(): string {
  return process.platform === 'win32' ? '√' : '✓';
}

function crossMark(): string {
  return process.platform === 'win32' ? 'X' : '✗';
}

function print(msg: string, color?: Color): void {
  const c = color ? colors[color] : '';
  console.log(`${c}${msg}${colors.reset}`);
}

export interface TestResult {
  name: string;
  passed: boolean;
  duration?: number;
  error?: string;
  fix?: string;
  value?: string | number;
}

export interface SectionSummary {
  name: string;
  passed: number;
  failed: number;
  duration: number;
}

export class InstallerTestReporter {
  private currentSection: string | null = null;
  private sectionStartTime: number | null = null;
  private sections: SectionSummary[] = [];

  /**
   * Print the main header
   */
  printHeader(title: string): void {
    const width = 70;
    const padding = Math.max(0, (width - title.length - 2) / 2);
    const line = '═'.repeat(width);

    console.log();
    print(line, 'cyan');
    print(' '.repeat(Math.floor(padding)) + title, 'bright');
    print(line, 'cyan');
    console.log();
  }

  /**
   * Start a new test section
   */
  startSection(name: string): void {
    this.currentSection = name;
    this.sectionStartTime = Date.now();
    console.log();
    print(`[${name}]`, 'cyan');
  }

  /**
   * Report a single test result
   */
  reportTest(result: TestResult): void {
    const mark = result.passed ? checkMark() : crossMark();
    const color: Color = result.passed ? 'green' : 'red';

    let message = `  ${mark} ${result.name}`;

    if (result.value !== undefined) {
      message += ` ${colors.gray}(${result.value})${colors.reset}`;
    }

    if (result.duration !== undefined && result.duration > 100) {
      message += ` ${colors.gray}(${(result.duration / 1000).toFixed(1)}s)${colors.reset}`;
    }

    print(message, color);

    // Print error details if test failed
    if (!result.passed && result.error) {
      print(`    Error: ${result.error}`, 'red');
    }

    // Print fix suggestion if available
    if (!result.passed && result.fix) {
      print(`    Fix: ${result.fix}`, 'yellow');
    }
  }

  /**
   * Report an error with actionable guidance
   */
  reportError(name: string, error: Error | string, fix?: string): void {
    const errorMessage = error instanceof Error ? error.message : error;

    print(`  ${crossMark()} ${name}`, 'red');
    print(`    Error: ${errorMessage}`, 'red');

    if (fix) {
      print(`    Fix: ${fix}`, 'yellow');
    }
  }

  /**
   * Report a warning (non-critical issue)
   */
  reportWarning(message: string): void {
    print(`  ⚠ ${message}`, 'yellow');
  }

  /**
   * End the current section and print summary
   */
  endSection(passed: number, failed: number): void {
    if (!this.currentSection || !this.sectionStartTime) return;

    const duration = Date.now() - this.sectionStartTime;
    const summary: SectionSummary = {
      name: this.currentSection,
      passed,
      failed,
      duration,
    };

    this.sections.push(summary);

    const totalTests = passed + failed;
    const status = failed === 0 ? 'PASSED' : 'FAILED';
    const color: Color = failed === 0 ? 'green' : 'red';

    print(`  ${status}: ${passed}/${totalTests} tests (${(duration / 1000).toFixed(1)}s)`, color);

    this.currentSection = null;
    this.sectionStartTime = null;
  }

  /**
   * Print final summary of all sections
   */
  printSummary(): void {
    const width = 70;
    const line = '═'.repeat(width);

    console.log();
    print(line, 'cyan');

    const totalPassed = this.sections.reduce((sum, s) => sum + s.passed, 0);
    const totalFailed = this.sections.reduce((sum, s) => sum + s.failed, 0);
    const totalDuration = this.sections.reduce((sum, s) => sum + s.duration, 0);
    const totalTests = totalPassed + totalFailed;

    if (totalFailed === 0) {
      print(`  ${checkMark()} ALL TESTS PASSED (${(totalDuration / 1000).toFixed(1)}s)`, 'green');
    } else {
      print(`  ${crossMark()} TESTS FAILED (${(totalDuration / 1000).toFixed(1)}s)`, 'red');
    }

    print(line, 'cyan');
    console.log();

    print(`  Results: ${totalPassed} passed, ${totalFailed} failed`, 'bright');

    // Print section breakdown
    if (this.sections.length > 1) {
      console.log();
      print('  Section Breakdown:', 'bright');
      this.sections.forEach(section => {
        const color: Color = section.failed === 0 ? 'green' : 'red';
        print(`    ${section.name}: ${section.passed}/${section.passed + section.failed} (${(section.duration / 1000).toFixed(1)}s)`, color);
      });
    }

    console.log();
  }

  /**
   * Get whether all tests passed
   */
  getAllPassed(): boolean {
    return this.sections.every(s => s.failed === 0);
  }

  /**
   * Get total test counts
   */
  getTotals(): { passed: number; failed: number; duration: number } {
    return {
      passed: this.sections.reduce((sum, s) => sum + s.passed, 0),
      failed: this.sections.reduce((sum, s) => sum + s.failed, 0),
      duration: this.sections.reduce((sum, s) => sum + s.duration, 0),
    };
  }
}
