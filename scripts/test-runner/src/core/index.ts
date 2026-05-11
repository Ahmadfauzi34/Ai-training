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
  TestSuiteConfig,

  // Benchmark utilities
  benchmark,
  BenchmarkResult,

  // Memory leak detection
  MemoryLeakDetector,
} from './test-runner.js';
