import { run } from 'node:test';
import { tap, spec } from 'node:test/reporters';
import { Transform } from 'node:stream';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

function findTestFiles(dir: string, patternSuffix = '.test.ts'): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findTestFiles(fullPath, patternSuffix));
    } else if (file.endsWith(patternSuffix)) {
      results.push(path.resolve(fullPath));
    }
  }
  return results;
}

// ============================================================================
// KONFIGURASI CONSTANTS (Enum Dispatch)
// ============================================================================

const ReporterType = {
  SPEC: 0,
  TAP: 1,
  JSON: 2,
} as const;

const ExitCode = {
  SUCCESS: 0,
  TEST_FAILURE: 1,
  STRICT_VIOLATION: 2,
  COVERAGE_FAILURE: 3,
  NO_FILES: 4,
  RUNTIME_ERROR: 5,
} as const;

// Default configuration with environment overrides
const CONFIG = {
  PATTERN: process.argv[2] || 'src/**/*.test.ts',
  CONCURRENCY: parseInt(process.env.TEST_CONCURRENCY || '4', 10),
  STRICT_MODE: process.env.STRICT_MODE === 'true',
  CI: process.env.CI === 'true',
  TIMEOUT_MS: parseInt(process.env.TEST_TIMEOUT_MS || '30000', 10),
  COVERAGE_THRESHOLD: parseInt(process.env.COVERAGE_THRESHOLD || '80', 10),
  MAX_FAILURES: parseInt(process.env.MAX_FAILURES || '100', 10),
  FORCE_EXIT: process.env.FORCE_EXIT !== 'false',
};

// ============================================================================
// ZERO-ALLOCATION STATS TRACKER (SOA Pattern)
// ============================================================================

interface TestData {
  name: string;
  file?: string;
  line?: number;
  column?: number;
  duration_ms?: number;
  error?: Error;
}

interface TestEvent {
  type: string;
  data: TestData;
}

class StatsTracker {
  private _passed: number = 0;
  private _failed: number = 0;
  private _skipped: number = 0;
  private _todo: number = 0;
  private _totalDuration: number = 0;

  // Pre-allocated failure buffer (fixed size to prevent reallocation)
  private readonly _failures: Array<{ name: string; file?: string; error?: Error }>;
  private _failureCount: number = 0;
  private readonly _maxFailures: number;

  constructor(maxFailures: number = 100) {
    this._maxFailures = maxFailures;
    // Pre-allocate failure array with fixed capacity
    this._failures = new Array(maxFailures);
  }

  // Branchless increment methods (inline-friendly)
  incrementPassed(): void { this._passed += 1; }
  incrementFailed(): void { this._failed += 1; }
  incrementSkipped(): void { this._skipped += 1; }
  incrementTodo(): void { this._todo += 1; }
  addDuration(ms: number): void { this._totalDuration += ms; }

  addFailure(name: string, file?: string, error?: Error): void {
    // Bounds check to prevent buffer overflow (ghost state pattern)
    if (this._failureCount < this._maxFailures) {
      this._failures[this._failureCount] = { name, file, error };
      this._failureCount += 1;
    }
  }

  // Getters (no allocation)
  get passed(): number { return this._passed; }
  get failed(): number { return this._failed; }
  get skipped(): number { return this._skipped; }
  get todo(): number { return this._todo; }
  get totalDuration(): number { return this._totalDuration; }
  get failureCount(): number { return this._failureCount; }

  getFailures(): ReadonlyArray<{ name: string; file?: string; error?: Error }> {
    // Return slice of pre-allocated buffer (no new allocation)
    return this._failures.slice(0, this._failureCount);
  }

  getSummary(): string {
    const total = this._passed + this._failed + this._skipped + this._todo;
    return [
      `\n${'='.repeat(60)}`,
      'TEST SUMMARY',
      `${'='.repeat(60)}`,
      `  Total:     ${total}`,
      `  Passed:    ${this._passed} ✅`,
      `  Failed:    ${this._failed} ❌`,
      `  Skipped:   ${this._skipped} ⏭️`,
      `  Todo:      ${this._todo} 📝`,
      `  Duration:  ${this._totalDuration.toFixed(2)}ms`,
      `${'='.repeat(60)}`,
    ].join('\n');
  }
}

// ============================================================================
// STRICT MODE VALIDATOR
// ============================================================================

class StrictValidator {
  private readonly _strictMode: boolean;
  private _violations: number = 0;

  constructor(strictMode: boolean) {
    this._strictMode = strictMode;
  }

  validateSkip(event: TestData): boolean {
    if (!this._strictMode) return true;

    console.error(`\n❌ STRICT MODE VIOLATION: Test skipped: ${event.name}`);
    if (event.file) {
      console.error(`   File: ${event.file}:${event.line ?? '?'}:${event.column ?? '?'}`);
    }
    this._violations += 1;
    return false;
  }

  validateTodo(event: TestData): boolean {
    if (!this._strictMode) return true;

    console.error(`\n❌ STRICT MODE VIOLATION: Test marked as todo: ${event.name}`);
    if (event.file) {
      console.error(`   File: ${event.file}:${event.line ?? '?'}:${event.column ?? '?'}`);
    }
    this._violations += 1;
    return false;
  }

  get hasViolations(): boolean {
    return this._violations > 0;
  }

  get violationCount(): number {
    return this._violations;
  }
}

// ============================================================================
// REPORTER FACTORY (Enum dispatch, no dynamic allocation)
// ============================================================================

function createReporter(type: number) {
  // Branchless enum dispatch
  switch (type) {
    case ReporterType.TAP:
      return tap;
    case ReporterType.JSON:
      return createJsonReporter();
    case ReporterType.SPEC:
    default:
      return spec;
  }
}

function createJsonReporter() {
  return new Transform({
    objectMode: true,
    transform(event: TestEvent, _encoding, callback) {
      this.push(JSON.stringify(event) + '\n');
      callback();
    },
  });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function main(): Promise<number> {
  const startTime = performance.now();

  console.log(`🚀 Robust Test Runner (V76 Engine Edition)`);
  console.log(`   Pattern:    ${CONFIG.PATTERN}`);
  console.log(`   Concurrency: ${CONFIG.CONCURRENCY}`);
  console.log(`   Strict Mode: ${CONFIG.STRICT_MODE ? 'ON' : 'OFF'}`);
  console.log(`   CI Mode:     ${CONFIG.CI ? 'ON' : 'OFF'}`);
  console.log(`   Timeout:     ${CONFIG.TIMEOUT_MS}ms\n`);

  // Resolve test files using native fs traversal (zero-dependency)
  const targetDir = CONFIG.PATTERN.startsWith('src') ? 'src' : '.';
  const files = findTestFiles(targetDir);

  if (files.length === 0) {
    console.error(`❌ No test files found for pattern: ${CONFIG.PATTERN}`);
    return ExitCode.NO_FILES;
  }

  console.log(`📁 Found ${files.length} test file(s):`);
  files.forEach(f => console.log(`   • ${f}`));
  console.log();

  // Initialize zero-allocation stats tracker
  const stats = new StatsTracker(CONFIG.MAX_FAILURES || 1000);
  const validator = new StrictValidator(CONFIG.STRICT_MODE);

  // Determine reporter type (enum dispatch)
  const reporterType = CONFIG.CI ? ReporterType.TAP : ReporterType.SPEC;
  const reporter = createReporter(reporterType);

  // Run tests with Node.js built-in runner
  const stream = run({
    files,
    concurrency: CONFIG.CONCURRENCY,
    timeout: CONFIG.TIMEOUT_MS,
  });

  // Event processing (field-based, no discrete entity spawn)
  stream.on('test:pass', (data: TestData) => {
    stats.incrementPassed();
    if (data.duration_ms) {
      stats.addDuration(data.duration_ms);
    }
  });

  stream.on('test:fail', (data: TestData) => {
    stats.incrementFailed();
    stats.addFailure(data.name, data.file, data.error);
    if (data.duration_ms) {
      stats.addDuration(data.duration_ms);
    }
  });

  stream.on('test:skip', (data: TestData) => {
    stats.incrementSkipped();
    validator.validateSkip(data);
  });

  stream.on('test:todo', (data: TestData) => {
    stats.incrementTodo();
    validator.validateTodo(data);
  });

  // Compose reporter pipeline
  // @ts-expect-error Node stream API typing
  const reporterStream = stream.compose(reporter);
  reporterStream.pipe(process.stdout);

  // Wait for completion
  await new Promise<void>((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('error', reject);
  });

  // Print summary
  const endTime = performance.now();
  const overhead = endTime - startTime - stats.totalDuration;

  console.log(stats.getSummary());
  console.log(`  Overhead:  ${overhead.toFixed(2)}ms`);
  console.log(`${'='.repeat(60)}\n`);

  // Determine exit code
  let exitCode = ExitCode.SUCCESS;

  // Check for test failures
  if (stats.failed > 0) {
    console.error(`❌ ${stats.failed} test(s) failed`);

    // Print failure details (bounded by max failures)
    const failures = stats.getFailures();
    const displayCount = Math.min(failures.length, 10);

    for (let i = 0; i < displayCount; i++) {
      const f = failures[i];
      console.error(`\n   ${i + 1}. ${f.name}`);
      if (f.file) console.error(`      File: ${f.file}`);
      if (f.error) console.error(`      Error: ${f.error.message}`);
    }

    if (failures.length > displayCount) {
      console.error(`\n   ... and ${failures.length - displayCount} more failures`);
    }

    exitCode = ExitCode.TEST_FAILURE;
  }

  // Check strict mode violations
  if (validator.hasViolations) {
    console.error(`\n❌ STRICT MODE: ${validator.violationCount} violation(s) detected`);
    console.error(`   No skip/todo tests allowed in strict mode.\n`);
    exitCode = ExitCode.STRICT_VIOLATION;
  }

  // Final status
  if (exitCode === ExitCode.SUCCESS) {
    console.log(`✅ All tests passed (${stats.passed} tests, ${stats.totalDuration.toFixed(2)}ms)\n`);
  }

  return exitCode;
}

// ============================================================================
// ENTRY POINT
// ============================================================================

main()
  .then(code => {
    process.exitCode = code;
  })
  .catch(err => {
    console.error('\n💥 Test runner crashed:');
    console.error(err);
    process.exitCode = ExitCode.RUNTIME_ERROR;
  });
