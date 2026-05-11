/**
 * Core Test Runner Utilities
 *
 * Design aligned with Tensor-Driven Execution:
 * - Pre-allocated buffers
 * - Branchless math with epsilon
 * - Enum dispatch
 * - SOA data structures
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// ============================================================================
// EPSILON-BASED FLOATING POINT COMPARISON (Branchless Math)
// ============================================================================

/**
 * Default epsilon for floating point comparisons
 * Chosen based on typical float32 precision (~1e-7 relative)
 */
export const DEFAULT_EPSILON = 1e-9;

/**
 * Branchless absolute comparison with epsilon
 * Returns true if |a - b| <= epsilon
 */
export function nearEqual(a: number, b: number, epsilon: number = DEFAULT_EPSILON): boolean {
  // Branchless: use Math.abs instead of conditional
  return Math.abs(a - b) <= epsilon;
}

/**
 * Relative epsilon comparison for large numbers
 * Returns true if |a - b| / max(|a|, |b|, 1) <= epsilon
 */
export function nearEqualRelative(a: number, b: number, epsilon: number = DEFAULT_EPSILON): boolean {
  const diff = Math.abs(a - b);
  const scale = Math.max(Math.abs(a), Math.abs(b), 1.0);
  return (diff / scale) <= epsilon;
}

/**
 * ULP-based comparison (Unit in the Last Place)
 * More robust for edge cases near zero
 */
export function nearEqualUlp(a: number, b: number, maxUlp: number = 4): boolean {
  if (a === b) return true;
  if (Number.isNaN(a) && Number.isNaN(b)) return true;

  const aAbs = Math.abs(a);
  const bAbs = Math.abs(b);

  // Handle infinity
  if (!Number.isFinite(aAbs) && !Number.isFinite(bAbs)) {
    return (a > 0) === (b > 0);
  }

  const diff = Math.abs(a - b);
  const ulp = Math.max(
    Math.abs(Math.nextafter(a, b) - a),
    Math.abs(Math.nextafter(b, a) - b),
    Number.MIN_VALUE
  );

  return diff <= (maxUlp * ulp);
}

// ============================================================================
// STRICT ASSERTION HELPERS
// ============================================================================

export class StrictAssertions {
  /**
   * Assert two numbers are equal within epsilon
   * No dynamic allocation, direct comparison
   */
  static nearEqual(
    actual: number,
    expected: number,
    epsilon: number = DEFAULT_EPSILON,
    message?: string
  ): void {
    if (!nearEqual(actual, expected, epsilon)) {
      const msg = message ??
        `Expected ${expected} ± ${epsilon}, but got ${actual} (diff: ${Math.abs(actual - expected)})`;
      assert.fail(msg);
    }
  }

  /**
   * Assert two numbers are relatively equal
   */
  static nearEqualRelative(
    actual: number,
    expected: number,
    epsilon: number = DEFAULT_EPSILON,
    message?: string
  ): void {
    if (!nearEqualRelative(actual, expected, epsilon)) {
      const msg = message ??
        `Expected ${expected} (relative ± ${epsilon}), but got ${actual}`;
      assert.fail(msg);
    }
  }

  /**
   * Assert array equality with epsilon (SOA pattern)
   * Pre-allocated iteration, no closure allocation
   */
  static arrayNearEqual(
    actual: ReadonlyArray<number>,
    expected: ReadonlyArray<number>,
    epsilon: number = DEFAULT_EPSILON,
    message?: string
  ): void {
    const len = actual.length;
    assert.strictEqual(len, expected.length,
      message ?? `Array length mismatch: ${len} vs ${expected.length}`);

    // Unrolled loop for small arrays (hot path optimization)
    let i = 0;

    // Process 4 elements at a time
    for (; i + 3 < len; i += 4) {
      if (!nearEqual(actual[i], expected[i], epsilon)) break;
      if (!nearEqual(actual[i + 1], expected[i + 1], epsilon)) { i += 1; break; }
      if (!nearEqual(actual[i + 2], expected[i + 2], epsilon)) { i += 2; break; }
      if (!nearEqual(actual[i + 3], expected[i + 3], epsilon)) { i += 3; break; }
    }

    // Process remaining elements
    for (; i < len; i++) {
      if (!nearEqual(actual[i], expected[i], epsilon)) {
        const msg = message ??
          `Array mismatch at index ${i}: expected ${expected[i]} ± ${epsilon}, got ${actual[i]}`;
        assert.fail(msg);
      }
    }
  }

  /**
   * Assert value is within range [min, max]
   */
  static inRange(
    actual: number,
    min: number,
    max: number,
    message?: string
  ): void {
    // Branchless range check
    const inRange = (actual >= min) && (actual <= max);
    if (!inRange) {
      const msg = message ??
        `Expected value in range [${min}, ${max}], but got ${actual}`;
      assert.fail(msg);
    }
  }

  /**
   * Assert function throws with specific error pattern
   */
  static throws(
    fn: () => unknown,
    expectedError?: RegExp | string | ErrorConstructor,
    message?: string
  ): void {
    assert.throws(fn, expectedError as any, message);
  }

  /**
   * Assert no async leaks: promise resolves within timeout
   */
  static async resolvesWithin<T>(
    promise: Promise<T>,
    timeoutMs: number,
    message?: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(
          message ?? `Promise did not resolve within ${timeoutMs}ms`
        ));
      }, timeoutMs);
      timer.unref();
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Assert deep equality with strict type checking
   */
  static deepStrictEqual<T>(actual: T, expected: T, message?: string): void {
    assert.deepStrictEqual(actual, expected, message);
  }

  /**
   * Assert strict reference equality (===)
   */
  static strictEqual<T>(actual: T, expected: T, message?: string): void {
    assert.strictEqual(actual, expected, message);
  }

  /**
   * Assert value is not null or undefined
   */
  static defined<T>(actual: T | null | undefined, message?: string): asserts actual is T {
    if (actual === null || actual === undefined) {
      assert.fail(message ?? `Expected defined value, but got ${actual}`);
    }
  }

  /**
   * Assert value matches regex pattern
   */
  static matches(actual: string, pattern: RegExp, message?: string): void {
    if (!pattern.test(actual)) {
      assert.fail(message ?? `Expected string to match ${pattern}, but got: ${actual}`);
    }
  }
}

// ============================================================================
// TEST SUITE BUILDER (Fluent API, minimal allocation)
// ============================================================================

export interface TestSuiteConfig {
  name: string;
  concurrency?: number;
  timeout?: number;
  only?: boolean;
  skip?: boolean;
  todo?: boolean;
}

export class TestSuite {
  private readonly _config: TestSuiteConfig;
  private readonly _beforeHooks: Array<() => void | Promise<void>>;
  private readonly _afterHooks: Array<() => void | Promise<void>>;
  private readonly _beforeEachHooks: Array<() => void | Promise<void>>;
  private readonly _afterEachHooks: Array<() => void | Promise<void>>;
  private readonly _tests: Array<{ name: string; fn: () => void | Promise<void>; config?: object }>;

  constructor(config: TestSuiteConfig) {
    this._config = config;
    // Pre-allocate arrays with reasonable capacity
    this._beforeHooks = [];
    this._afterHooks = [];
    this._beforeEachHooks = [];
    this._afterEachHooks = [];
    this._tests = [];
  }

  before(fn: () => void | Promise<void>): this {
    this._beforeHooks.push(fn);
    return this;
  }

  after(fn: () => void | Promise<void>): this {
    this._afterHooks.push(fn);
    return this;
  }

  beforeEach(fn: () => void | Promise<void>): this {
    this._beforeEachHooks.push(fn);
    return this;
  }

  afterEach(fn: () => void | Promise<void>): this {
    this._afterEachHooks.push(fn);
    return this;
  }

  test(name: string, fn: () => void | Promise<void>): this {
    this._tests.push({ name, fn });
    return this;
  }

  build(): void {
    const { name, concurrency, timeout, only, skip, todo } = this._config;

    const suiteFn = () => {
      // Register hooks
      for (const hook of this._beforeHooks) {
        before(hook);
      }
      for (const hook of this._afterHooks) {
        after(hook);
      }
      for (const hook of this._beforeEachHooks) {
        beforeEach(hook);
      }
      for (const hook of this._afterEachHooks) {
        afterEach(hook);
      }

      // Register tests
      for (const test of this._tests) {
        it(test.name, test.fn);
      }
    };

    const options: { concurrency?: number; timeout?: number; only?: boolean; skip?: boolean; todo?: boolean } = {};
    if (concurrency !== undefined) options.concurrency = concurrency;
    if (timeout !== undefined) options.timeout = timeout;
    if (only) options.only = true;
    if (skip) options.skip = true;
    if (todo) options.todo = true;

    if (Object.keys(options).length > 0) {
      describe(name, options, suiteFn);
    } else {
      describe(name, suiteFn);
    }
  }
}

// ============================================================================
// BENCHMARK UTILITIES
// ============================================================================

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  meanMs: number;
  minMs: number;
  maxMs: number;
  opsPerSecond: number;
}

/**
 * Micro-benchmark with pre-allocated timing array
 * No dynamic allocation during measurement
 */
export function benchmark(
  name: string,
  fn: () => void,
  iterations: number = 100000
): BenchmarkResult {
  // Pre-allocate timing array (SOA pattern)
  const timings = new Float64Array(iterations);

  // Warmup
  for (let i = 0; i < Math.min(100, iterations); i++) {
    fn();
  }

  // Measurement
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    timings[i] = end - start;
  }

  // Calculate statistics (single pass)
  let total = 0;
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < iterations; i++) {
    const t = timings[i];
    total += t;
    // Branchless min/max
    min = t < min ? t : min;
    max = t > max ? t : max;
  }

  const mean = total / iterations;
  const opsPerSecond = 1000 / mean;

  return {
    name,
    iterations,
    totalMs: total,
    meanMs: mean,
    minMs: min,
    maxMs: max,
    opsPerSecond,
  };
}

// ============================================================================
// MEMORY LEAK DETECTOR
// ============================================================================

export class MemoryLeakDetector {
  private _baseline: number = 0;
  private readonly _thresholdBytes: number;

  constructor(thresholdBytes: number = 1024 * 1024) { // 1MB default
    this._thresholdBytes = thresholdBytes;
  }

  snapshot(): number {
    if (global.gc) {
      global.gc();
    }
    return process.memoryUsage().heapUsed;
  }

  start(): void {
    this._baseline = this.snapshot();
  }

  check(label: string = 'memory check'): void {
    const current = this.snapshot();
    const diff = current - this._baseline;

    if (diff > this._thresholdBytes) {
      const mb = (diff / 1024 / 1024).toFixed(2);
      assert.fail(
        `${label}: Potential memory leak detected. ` +
        `Heap increased by ${mb}MB (threshold: ${this._thresholdBytes / 1024 / 1024}MB)`
      );
    }
  }
}
