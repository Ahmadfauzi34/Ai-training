/**
 * Custom Test Reporter
 *
 * Implements SOA (Structure of Arrays) pattern for efficient data aggregation.
 * Pre-allocated buffers, no dynamic allocation during test execution.
 */

import { Transform } from 'node:stream';

// ============================================================================
// EVENT TYPE ENUM (Branchless dispatch)
// ============================================================================

const EventType = Object.freeze({
  TEST_PASS: 0,
  TEST_FAIL: 1,
  TEST_SKIP: 2,
  TEST_TODO: 3,
  DIAGNOSTIC: 4,
  STDERR: 5,
  STDOUT: 6,
} as const);

// ============================================================================
// SOA DATA STRUCTURES
// ============================================================================

interface TestResult {
  name: string;
  file: string;
  line?: number;
  column?: number;
  duration: number;
  error?: Error;
}

class TestResultBuffer {
  // SOA: Separate arrays for each field (better cache locality)
  private readonly _names: string[];
  private readonly _files: string[];
  private readonly _lines: (number | undefined)[];
  private readonly _columns: (number | undefined)[];
  private readonly _durations: Float64Array;
  private readonly _errors: (Error | undefined)[];

  private _count: number = 0;
  private readonly _capacity: number;

  constructor(capacity: number = 1000) {
    this._capacity = capacity;
    this._names = new Array(capacity);
    this._files = new Array(capacity);
    this._lines = new Array(capacity);
    this._columns = new Array(capacity);
    this._durations = new Float64Array(capacity);
    this._errors = new Array(capacity);
  }

  push(result: TestResult): boolean {
    if (this._count >= this._capacity) return false;

    const idx = this._count;
    this._names[idx] = result.name;
    this._files[idx] = result.file;
    this._lines[idx] = result.line;
    this._columns[idx] = result.column;
    this._durations[idx] = result.duration;
    this._errors[idx] = result.error;

    this._count += 1;
    return true;
  }

  getCount(): number { return this._count; }

  getName(i: number): string { return this._names[i]!; }
  getFile(i: number): string { return this._files[i]!; }
  getLine(i: number): number | undefined { return this._lines[i]; }
  getColumn(i: number): number | undefined { return this._columns[i]; }
  getDuration(i: number): number { return this._durations[i]!; }
  getError(i: number): Error | undefined { return this._errors[i]; }

  getTotalDuration(): number {
    let sum = 0;
    for (let i = 0; i < this._count; i++) {
      sum += this._durations[i]!;
    }
    return sum;
  }

  getMeanDuration(): number {
    return this._count > 0 ? this.getTotalDuration() / this._count : 0;
  }

  getMinDuration(): number {
    if (this._count === 0) return 0;
    let min = Infinity;
    for (let i = 0; i < this._count; i++) {
      const d = this._durations[i]!;
      min = d < min ? d : min; // Branchless min
    }
    return min;
  }

  getMaxDuration(): number {
    if (this._count === 0) return 0;
    let max = -Infinity;
    for (let i = 0; i < this._count; i++) {
      const d = this._durations[i]!;
      max = d > max ? d : max; // Branchless max
    }
    return max;
  }
}

// ============================================================================
// CUSTOM REPORTER
// ============================================================================

export interface CustomReporterOptions {
  showTiming?: boolean;
  showFiles?: boolean;
  maxFailures?: number;
  colorize?: boolean;
}

export function createCustomReporter(options: CustomReporterOptions = {}) {
  const {
    showTiming = true,
    showFiles = true,
    maxFailures = 10,
    colorize = true,
  } = options;

  // SOA buffers for different result types
  const passBuffer = new TestResultBuffer(10000);
  const failBuffer = new TestResultBuffer(1000);
  const skipBuffer = new TestResultBuffer(1000);
  const todoBuffer = new TestResultBuffer(1000);

  // ANSI colors (pre-allocated strings)
  const colors = colorize ? {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    gray: '\x1b[90m',
    bold: '\x1b[1m',
  } : {
    reset: '',
    green: '',
    red: '',
    yellow: '',
    blue: '',
    gray: '',
    bold: '',
  };

  return new Transform({
    objectMode: true,
    transform(event: any, _encoding, callback) {
      const { type, data } = event;

      // Enum dispatch for event handling (branchless)
      switch (type) {
        case 'test:pass': {
          passBuffer.push({
            name: data.name,
            file: data.file || '',
            line: data.line,
            column: data.column,
            duration: data.duration_ms || 0,
          });
          break;
        }
        case 'test:fail': {
          failBuffer.push({
            name: data.name,
            file: data.file || '',
            line: data.line,
            column: data.column,
            duration: data.duration_ms || 0,
            error: data.error,
          });
          break;
        }
        case 'test:skip': {
          skipBuffer.push({
            name: data.name,
            file: data.file || '',
            line: data.line,
            column: data.column,
            duration: 0,
          });
          break;
        }
        case 'test:todo': {
          todoBuffer.push({
            name: data.name,
            file: data.file || '',
            line: data.line,
            column: data.column,
            duration: 0,
          });
          break;
        }
        case 'test:diagnostic': {
          this.push(`${colors.gray}${data.message}${colors.reset}\n`);
          break;
        }
      }

      callback();
    },

    flush(callback) {
      const total = passBuffer.getCount() + failBuffer.getCount() +
                    skipBuffer.getCount() + todoBuffer.getCount();

      // Header
      this.push(`\n${colors.bold}Test Results${colors.reset}\n`);
      this.push(`${'='.repeat(60)}\n`);

      // Summary stats
      this.push(`\n${colors.bold}Summary:${colors.reset}\n`);
      this.push(`  Total:   ${total}\n`);
      this.push(`  ${colors.green}Passed:${colors.reset}  ${passBuffer.getCount()}\n`);
      this.push(`  ${colors.red}Failed:${colors.reset}  ${failBuffer.getCount()}\n`);
      this.push(`  ${colors.yellow}Skipped:${colors.reset} ${skipBuffer.getCount()}\n`);
      this.push(`  ${colors.blue}Todo:${colors.reset}    ${todoBuffer.getCount()}\n`);

      // Timing stats
      if (showTiming && total > 0) {
        const allDurations = new Float64Array(total);
        let idx = 0;

        for (let i = 0; i < passBuffer.getCount(); i++) {
          allDurations[idx++] = passBuffer.getDuration(i);
        }
        for (let i = 0; i < failBuffer.getCount(); i++) {
          allDurations[idx++] = failBuffer.getDuration(i);
        }

        let totalDuration = 0;
        let minDur = Infinity;
        let maxDur = -Infinity;

        for (let i = 0; i < idx; i++) {
          const d = allDurations[i]!;
          totalDuration += d;
          minDur = d < minDur ? d : minDur;
          maxDur = d > maxDur ? d : maxDur;
        }

        const meanDur = idx > 0 ? totalDuration / idx : 0;

        this.push(`\n${colors.bold}Timing:${colors.reset}\n`);
        this.push(`  Total: ${totalDuration.toFixed(2)}ms\n`);
        this.push(`  Mean:  ${meanDur.toFixed(4)}ms\n`);
        this.push(`  Min:   ${minDur === Infinity ? 0 : minDur.toFixed(4)}ms\n`);
        this.push(`  Max:   ${maxDur === -Infinity ? 0 : maxDur.toFixed(4)}ms\n`);
      }

      // Failure details
      if (failBuffer.getCount() > 0) {
        this.push(`\n${colors.bold}${colors.red}Failures:${colors.reset}\n`);
        const displayCount = Math.min(failBuffer.getCount(), maxFailures);

        for (let i = 0; i < displayCount; i++) {
          const name = failBuffer.getName(i);
          const file = failBuffer.getFile(i);
          const line = failBuffer.getLine(i);
          const error = failBuffer.getError(i);

          this.push(`\n  ${i + 1}. ${colors.red}${name}${colors.reset}\n`);
          if (showFiles && file) {
            this.push(`     File: ${file}${line ? `:${line}` : ''}\n`);
          }
          if (error) {
            this.push(`     Error: ${error.message}\n`);
          }
        }

        if (failBuffer.getCount() > displayCount) {
          this.push(`\n  ... and ${failBuffer.getCount() - displayCount} more failures\n`);
        }
      }

      // Slowest tests
      if (showTiming && passBuffer.getCount() > 0) {
        // Collect and sort (simple bubble sort for small arrays)
        const count = Math.min(passBuffer.getCount(), 5);
        const slowest = new Array<{ name: string; duration: number } | undefined>(count);

        for (let i = 0; i < passBuffer.getCount(); i++) {
          const dur = passBuffer.getDuration(i);
          const name = passBuffer.getName(i);

          // Insertion into sorted array
          for (let j = 0; j < count; j++) {
            const current = slowest[j];
            if (!current || dur > current.duration) {
              // Shift remaining elements
              for (let k = count - 1; k > j; k--) {
                slowest[k] = slowest[k - 1];
              }
              slowest[j] = { name, duration: dur };
              break;
            }
          }
        }

        this.push(`\n${colors.bold}Slowest Tests:${colors.reset}\n`);
        for (let i = 0; i < count; i++) {
          const result = slowest[i];
          if (result) {
            this.push(`  ${i + 1}. ${result.name}: ${result.duration.toFixed(2)}ms\n`);
          }
        }
      }

      this.push(`\n${'='.repeat(60)}\n`);
      callback();
    },
  });
}

export default createCustomReporter;
