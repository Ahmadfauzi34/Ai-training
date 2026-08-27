/**
 * Extended Assertion Library
 *
 * Domain-specific assertions for common testing scenarios.
 * All operations use branchless math and pre-allocated patterns.
 */

import assert from 'node:assert/strict';
import { nearEqual, DEFAULT_EPSILON } from '../core/test-runner.js';

// ============================================================================
// COLLECTION ASSERTIONS
// ============================================================================

export class CollectionAssertions {
  /**
   * Assert array is sorted in ascending order
   */
  static isSorted<T>(arr: ReadonlyArray<T>, message?: string): void {
    if (arr.length < 2) return;

    for (let i = 1; i < arr.length; i++) {
      const current = arr[i]!;
      const previous = arr[i - 1]!;
      if (current < previous) {
        assert.fail(message ?? `Array not sorted at index ${i}: ${current} < ${previous}`);
      }
    }
  }

  /**
   * Assert array has no duplicates
   */
  static hasNoDuplicates<T>(arr: ReadonlyArray<T>, message?: string): void {
    const seen = new Set<T>();
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i]!;
      if (seen.has(item)) {
        assert.fail(message ?? `Duplicate found at index ${i}: ${item}`);
      }
      seen.add(item);
    }
  }

  /**
   * Assert array contains exactly expected elements (order-independent)
   */
  static containsExactly<T>(
    actual: ReadonlyArray<T>,
    expected: ReadonlyArray<T>,
    message?: string
  ): void {
    if (actual.length !== expected.length) {
      assert.fail(message ?? `Length mismatch: ${actual.length} vs ${expected.length}`);
    }

    const remaining = new Set(expected);
    for (const item of actual) {
      if (!remaining.has(item)) {
        assert.fail(message ?? `Unexpected item: ${item}`);
      }
      remaining.delete(item);
    }
  }

  /**
   * Assert array is empty
   */
  static isEmpty<T>(arr: ReadonlyArray<T>, message?: string): void {
    if (arr.length !== 0) {
      assert.fail(message ?? `Expected empty array, got ${arr.length} elements`);
    }
  }

  /**
   * Assert array is not empty
   */
  static isNotEmpty<T>(arr: ReadonlyArray<T>, message?: string): void {
    if (arr.length === 0) {
      assert.fail(message ?? `Expected non-empty array`);
    }
  }

  /**
   * Assert all elements satisfy predicate
   */
  static allMatch<T>(
    arr: ReadonlyArray<T>,
    predicate: (item: T) => boolean,
    message?: string
  ): void {
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i]!;
      if (!predicate(item)) {
        assert.fail(message ?? `Element at index ${i} does not match predicate: ${item}`);
      }
    }
  }

  /**
   * Assert at least one element satisfies predicate
   */
  static anyMatch<T>(
    arr: ReadonlyArray<T>,
    predicate: (item: T) => boolean,
    message?: string
  ): void {
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i]!)) return;
    }
    assert.fail(message ?? `No element matches predicate`);
  }
}

// ============================================================================
// STRING ASSERTIONS
// ============================================================================

export class StringAssertions {
  /**
   * Assert string starts with prefix
   */
  static startsWith(actual: string, prefix: string, message?: string): void {
    if (!actual.startsWith(prefix)) {
      assert.fail(message ?? `Expected "${actual}" to start with "${prefix}"`);
    }
  }

  /**
   * Assert string ends with suffix
   */
  static endsWith(actual: string, suffix: string, message?: string): void {
    if (!actual.endsWith(suffix)) {
      assert.fail(message ?? `Expected "${actual}" to end with "${suffix}"`);
    }
  }

  /**
   * Assert string contains substring
   */
  static contains(actual: string, expected: string, message?: string): void {
    if (!actual.includes(expected)) {
      assert.fail(message ?? `Expected "${actual}" to contain "${expected}"`);
    }
  }

  /**
   * Assert string matches regex
   */
  static matches(actual: string, pattern: RegExp, message?: string): void {
    if (!pattern.test(actual)) {
      assert.fail(message ?? `Expected "${actual}" to match ${pattern}`);
    }
  }

  /**
   * Assert string is valid JSON
   */
  static isValidJSON(actual: string, message?: string): void {
    try {
      JSON.parse(actual);
    } catch {
      assert.fail(message ?? `Expected valid JSON, got: ${actual}`);
    }
  }

  /**
   * Assert string has expected length
   */
  static hasLength(actual: string, expected: number, message?: string): void {
    if (actual.length !== expected) {
      assert.fail(message ?? `Expected length ${expected}, got ${actual.length}`);
    }
  }

  /**
   * Assert string is not empty (after trim)
   */
  static isNotBlank(actual: string, message?: string): void {
    if (actual.trim().length === 0) {
      assert.fail(message ?? `Expected non-blank string`);
    }
  }
}

// ============================================================================
// NUMERIC ASSERTIONS
// ============================================================================

export class NumericAssertions {
  /**
   * Assert number is integer
   */
  static isInteger(actual: number, message?: string): void {
    if (!Number.isInteger(actual)) {
      assert.fail(message ?? `Expected integer, got ${actual}`);
    }
  }

  /**
   * Assert number is finite (not Infinity or NaN)
   */
  static isFinite(actual: number, message?: string): void {
    if (!Number.isFinite(actual)) {
      assert.fail(message ?? `Expected finite number, got ${actual}`);
    }
  }

  /**
   * Assert number is positive
   */
  static isPositive(actual: number, message?: string): void {
    if (actual <= 0) {
      assert.fail(message ?? `Expected positive number, got ${actual}`);
    }
  }

  /**
   * Assert number is negative
   */
  static isNegative(actual: number, message?: string): void {
    if (actual >= 0) {
      assert.fail(message ?? `Expected negative number, got ${actual}`);
    }
  }

  /**
   * Assert number is within range (inclusive)
   */
  static inRange(actual: number, min: number, max: number, message?: string): void {
    if (actual < min || actual > max) {
      assert.fail(message ?? `Expected ${actual} in range [${min}, ${max}]`);
    }
  }

  /**
   * Assert number is near expected with epsilon
   */
  static near(actual: number, expected: number, epsilon: number = DEFAULT_EPSILON, message?: string): void {
    if (!nearEqual(actual, expected, epsilon)) {
      assert.fail(message ?? `Expected ${expected} ± ${epsilon}, got ${actual}`);
    }
  }

  /**
   * Assert number is percentage (0-100)
   */
  static isPercentage(actual: number, message?: string): void {
    NumericAssertions.inRange(actual, 0, 100, message ?? `Expected percentage 0-100, got ${actual}`);
  }
}

// ============================================================================
// DATE/TIME ASSERTIONS
// ============================================================================

export class DateAssertions {
  /**
   * Assert date is valid (not Invalid Date)
   */
  static isValid(actual: Date, message?: string): void {
    if (Number.isNaN(actual.getTime())) {
      assert.fail(message ?? `Expected valid Date`);
    }
  }

  /**
   * Assert date is before expected
   */
  static isBefore(actual: Date, expected: Date, message?: string): void {
    if (actual.getTime() >= expected.getTime()) {
      assert.fail(message ?? `Expected ${actual.toISOString()} to be before ${expected.toISOString()}`);
    }
  }

  /**
   * Assert date is after expected
   */
  static isAfter(actual: Date, expected: Date, message?: string): void {
    if (actual.getTime() <= expected.getTime()) {
      assert.fail(message ?? `Expected ${actual.toISOString()} to be after ${expected.toISOString()}`);
    }
  }

  /**
   * Assert dates are within milliseconds of each other
   */
  static near(
    actual: Date,
    expected: Date,
    toleranceMs: number = 1000,
    message?: string
  ): void {
    const diff = Math.abs(actual.getTime() - expected.getTime());
    if (diff > toleranceMs) {
      assert.fail(message ?? `Dates differ by ${diff}ms (tolerance: ${toleranceMs}ms)`);
    }
  }
}

// ============================================================================
// ERROR ASSERTIONS
// ============================================================================

export class ErrorAssertions {
  /**
   * Assert error has expected message
   */
  static hasMessage(actual: Error, expected: string | RegExp, message?: string): void {
    if (typeof expected === 'string') {
      if (!actual.message.includes(expected)) {
        assert.fail(message ?? `Expected error message to include "${expected}", got "${actual.message}"`);
      }
    } else {
      if (!expected.test(actual.message)) {
        assert.fail(message ?? `Expected error message to match ${expected}, got "${actual.message}"`);
      }
    }
  }

  /**
   * Assert error is instance of expected type
   */
  static isType(actual: Error, expected: new (...args: any[]) => Error, message?: string): void {
    const actualType = actual.constructor.name;
    if (!(actual instanceof expected)) {
      assert.fail(message ?? `Expected ${expected.name}, got ${actualType}`);
    }
  }

  /**
   * Assert error has expected code (for Node.js errors)
   */
  static hasCode(actual: NodeJS.ErrnoException, expected: string, message?: string): void {
    if (actual.code !== expected) {
      assert.fail(message ?? `Expected error code "${expected}", got "${actual.code}"`);
    }
  }
}

// ============================================================================
// NETWORK ASSERTIONS
// ============================================================================

export class NetworkAssertions {
  /**
   * Assert valid URL string
   */
  static isValidURL(actual: string, message?: string): void {
    try {
      new URL(actual);
    } catch {
      assert.fail(message ?? `Expected valid URL, got: ${actual}`);
    }
  }

  /**
   * Assert valid email address (basic check)
   */
  static isValidEmail(actual: string, message?: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(actual)) {
      assert.fail(message ?? `Expected valid email, got: ${actual}`);
    }
  }

  /**
   * Assert valid IPv4 address
   */
  static isValidIPv4(actual: string, message?: string): void {
    const parts = actual.split('.');
    if (parts.length !== 4) {
      assert.fail(message ?? `Expected valid IPv4, got: ${actual}`);
    }
    for (const part of parts) {
      const num = parseInt(part, 10);
      if (num < 0 || num > 255 || String(num) !== part) {
        assert.fail(message ?? `Expected valid IPv4, got: ${actual}`);
      }
    }
  }
}
