/**
 * Core Test Runner Exports
 */

export {
  // Epsilon-based comparisons
  DEFAULT_EPSILON,
  nearEqual,
  nearEqualRelative,
  nearEqualUlp,

  // Strict assertions
  StrictAssertions,

  // Test suite builder
  TestSuite,

  // Benchmark utilities
  benchmark,

  // Memory leak detection
  MemoryLeakDetector,
} from './test-runner.js';

export type { BenchmarkResult, TestSuiteConfig } from './test-runner.js';
