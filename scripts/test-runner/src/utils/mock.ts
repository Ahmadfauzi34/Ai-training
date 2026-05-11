/**
 * Mock Utilities
 *
 * Zero-allocation mocking with pre-allocated call record buffers.
 * Designed for hot-path test scenarios.
 */

// ============================================================================
// CALL RECORD SOA STRUCTURE
// ============================================================================

interface CallRecord<TArgs extends unknown[], TReturn> {
  timestamp: number;
  args: TArgs;
  returnValue: TReturn;
  error?: Error;
}

class CallLog<TArgs extends unknown[], TReturn> {
  // SOA: Pre-allocated arrays for each field
  private readonly _timestamps: Float64Array;
  private readonly _args: TArgs[][];
  private readonly _returns: TReturn[];
  private readonly _errors: (Error | undefined)[];

  private _count: number = 0;
  private readonly _capacity: number;

  constructor(capacity: number = 1000) {
    this._capacity = capacity;
    this._timestamps = new Float64Array(capacity);
    this._args = new Array(capacity);
    this._returns = new Array(capacity);
    this._errors = new Array(capacity);
  }

  record(args: TArgs, returnValue: TReturn, error?: Error): boolean {
    if (this._count >= this._capacity) return false;

    const idx = this._count;
    this._timestamps[idx] = performance.now();
    this._args[idx] = args;
    this._returns[idx] = returnValue;
    this._errors[idx] = error;

    this._count += 1;
    return true;
  }

  getCount(): number { return this._count; }

  getTimestamp(i: number): number { return this._timestamps[i]; }
  getArgs(i: number): TArgs { return this._args[i]; }
  getReturn(i: number): TReturn { return this._returns[i]; }
  getError(i: number): Error | undefined { return this._errors[i]; }

  getAllArgs(): ReadonlyArray<TArgs> {
    return this._args.slice(0, this._count);
  }

  getAllReturns(): ReadonlyArray<TReturn> {
    return this._returns.slice(0, this._count);
  }

  getLastCall(): CallRecord<TArgs, TReturn> | null {
    if (this._count === 0) return null;
    const idx = this._count - 1;
    return {
      timestamp: this._timestamps[idx],
      args: this._args[idx],
      returnValue: this._returns[idx],
      error: this._errors[idx],
    };
  }

  getCallAt(index: number): CallRecord<TArgs, TReturn> | null {
    if (index < 0 || index >= this._count) return null;
    return {
      timestamp: this._timestamps[index],
      args: this._args[index],
      returnValue: this._returns[index],
      error: this._errors[index],
    };
  }

  wasCalledWith(...expectedArgs: TArgs): boolean {
    for (let i = 0; i < this._count; i++) {
      const args = this._args[i];
      if (args.length !== expectedArgs.length) continue;

      let match = true;
      for (let j = 0; j < args.length; j++) {
        if (args[j] !== expectedArgs[j]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
    return false;
  }

  clear(): void {
    this._count = 0;
  }
}

// ============================================================================
// MOCK FUNCTION FACTORY
// ============================================================================

export interface MockFunction<TArgs extends unknown[], TReturn> {
  (...args: TArgs): TReturn;
  calls: CallLog<TArgs, TReturn>;
  callCount: () => number;
  wasCalled: () => boolean;
  wasCalledWith: (...args: TArgs) => boolean;
  lastCall: () => CallRecord<TArgs, TReturn> | null;
  getCall: (index: number) => CallRecord<TArgs, TReturn> | null;
  returnValue: (value: TReturn) => MockFunction<TArgs, TReturn>;
  implementation: (fn: (...args: TArgs) => TReturn) => MockFunction<TArgs, TReturn>;
  throws: (error: Error) => MockFunction<TArgs, TReturn>;
  reset: () => void;
}

export function createMock<TArgs extends unknown[], TReturn>(
  defaultImpl?: (...args: TArgs) => TReturn
): MockFunction<TArgs, TReturn> {
  let impl = defaultImpl;
  let throwError: Error | undefined;
  let fixedReturn: TReturn | undefined;
  let hasFixedReturn = false;

  const calls = new CallLog<TArgs, TReturn>(1000);

  const mockFn = (...args: TArgs): TReturn => {
    let result: TReturn;
    let error: Error | undefined;

    try {
      if (throwError) {
        error = throwError;
        throw throwError;
      }

      if (hasFixedReturn) {
        result = fixedReturn as TReturn;
      } else if (impl) {
        result = impl(...args);
      } else {
        result = undefined as TReturn;
      }

      calls.record(args, result);
      return result;
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      calls.record(args, undefined as TReturn, error);
      throw error;
    }
  };

  mockFn.calls = calls;

  mockFn.callCount = () => calls.getCount();
  mockFn.wasCalled = () => calls.getCount() > 0;
  mockFn.wasCalledWith = (...args: TArgs) => calls.wasCalledWith(...args);
  mockFn.lastCall = () => calls.getLastCall();
  mockFn.getCall = (index: number) => calls.getCallAt(index);

  mockFn.returnValue = (value: TReturn) => {
    fixedReturn = value;
    hasFixedReturn = true;
    throwError = undefined;
    return mockFn;
  };

  mockFn.implementation = (fn: (...args: TArgs) => TReturn) => {
    impl = fn;
    hasFixedReturn = false;
    throwError = undefined;
    return mockFn;
  };

  mockFn.throws = (error: Error) => {
    throwError = error;
    hasFixedReturn = false;
    return mockFn;
  };

  mockFn.reset = () => {
    calls.clear();
    impl = defaultImpl;
    throwError = undefined;
    hasFixedReturn = false;
    fixedReturn = undefined;
  };

  return mockFn;
}

// ============================================================================
// ASYNC MOCK
// ============================================================================

export interface AsyncMockFunction<TArgs extends unknown[], TReturn> {
  (...args: TArgs): Promise<TReturn>;
  calls: CallLog<TArgs, TReturn>;
  callCount: () => number;
  wasCalled: () => boolean;
  wasCalledWith: (...args: TArgs) => boolean;
  lastCall: () => CallRecord<TArgs, TReturn> | null;
  resolve: (value: TReturn) => AsyncMockFunction<TArgs, TReturn>;
  reject: (error: Error) => AsyncMockFunction<TArgs, TReturn>;
  implementation: (fn: (...args: TArgs) => Promise<TReturn>) => AsyncMockFunction<TArgs, TReturn>;
  reset: () => void;
}

export function createAsyncMock<TArgs extends unknown[], TReturn>(
  defaultImpl?: (...args: TArgs) => Promise<TReturn>
): AsyncMockFunction<TArgs, TReturn> {
  let impl = defaultImpl;
  let resolveValue: TReturn | undefined;
  let rejectError: Error | undefined;
  let hasResolve = false;

  const calls = new CallLog<TArgs, TReturn>(1000);

  const mockFn = async (...args: TArgs): Promise<TReturn> => {
    let result: TReturn;
    let error: Error | undefined;

    try {
      if (rejectError) {
        error = rejectError;
        throw rejectError;
      }

      if (hasResolve) {
        result = resolveValue as TReturn;
      } else if (impl) {
        result = await impl(...args);
      } else {
        result = undefined as TReturn;
      }

      calls.record(args, result);
      return result;
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      calls.record(args, undefined as TReturn, error);
      throw error;
    }
  };

  mockFn.calls = calls;
  mockFn.callCount = () => calls.getCount();
  mockFn.wasCalled = () => calls.getCount() > 0;
  mockFn.wasCalledWith = (...args: TArgs) => calls.wasCalledWith(...args);
  mockFn.lastCall = () => calls.getLastCall();

  mockFn.resolve = (value: TReturn) => {
    resolveValue = value;
    hasResolve = true;
    rejectError = undefined;
    return mockFn;
  };

  mockFn.reject = (error: Error) => {
    rejectError = error;
    hasResolve = false;
    return mockFn;
  };

  mockFn.implementation = (fn: (...args: TArgs) => Promise<TReturn>) => {
    impl = fn;
    hasResolve = false;
    rejectError = undefined;
    return mockFn;
  };

  mockFn.reset = () => {
    calls.clear();
    impl = defaultImpl;
    rejectError = undefined;
    hasResolve = false;
    resolveValue = undefined;
  };

  return mockFn;
}

// ============================================================================
// SPY UTILITIES
// ============================================================================

export function spyOn<T extends object, K extends keyof T>(
  obj: T,
  method: K
): T[K] extends (...args: infer A) => infer R
  ? MockFunction<A, R> & { restore: () => void }
  : never {
  const original = obj[method] as unknown as (...args: unknown[]) => unknown;
  const mock = createMock(original as any) as any;

  obj[method] = mock as any;

  mock.restore = () => {
    obj[method] = original as any;
  };

  return mock;
}

// ============================================================================
// STUB UTILITIES
// ============================================================================

export function stub<T>(value: T): () => T {
  return () => value;
}

export function stubThrows(error: Error): () => never {
  return () => { throw error; };
}

// ============================================================================
// CLOCK MOCK (for deterministic timing tests)
// ============================================================================

export class MockClock {
  private _now: number = 0;
  private _timers: Array<{ id: number; at: number; fn: () => void }> = [];
  private _timerId: number = 0;

  now(): number { return this._now; }

  advance(ms: number): void {
    const target = this._now + ms;

    // Sort timers by trigger time (insertion sort for small arrays)
    this._timers.sort((a, b) => a.at - b.at);

    // Execute timers that should fire
    let i = 0;
    while (i < this._timers.length && this._timers[i].at <= target) {
      this._timers[i].fn();
      i++;
    }

    // Remove executed timers (swap-drop pattern)
    if (i > 0) {
      const remaining = this._timers.length - i;
      for (let j = 0; j < remaining; j++) {
        this._timers[j] = this._timers[i + j];
      }
      this._timers.length = remaining;
    }

    this._now = target;
  }

  setTimeout(fn: () => void, ms: number): number {
    const id = ++this._timerId;
    this._timers.push({ id, at: this._now + ms, fn });
    return id;
  }

  clearTimeout(id: number): void {
    const idx = this._timers.findIndex(t => t.id === id);
    if (idx >= 0) {
      // Swap-drop instead of splice (no array reallocation)
      const last = this._timers.length - 1;
      this._timers[idx] = this._timers[last];
      this._timers.length = last;
    }
  }

  reset(): void {
    this._now = 0;
    this._timers = [];
    this._timerId = 0;
  }
}
