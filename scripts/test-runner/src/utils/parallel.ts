/**
 * Parallel Test Execution Utilities
 *
 * Worker pool for CPU-intensive test operations.
 * Zero-allocation task queue with pre-allocated worker slots.
 */

import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';

// ============================================================================
// WORKER POOL (SOA Pattern)
// ============================================================================

interface WorkerSlot {
  id: number;
  worker: Worker | null;
  busy: boolean;
  taskCount: number;
}

interface Task<T, R> {
  id: number;
  data: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
}

export class WorkerPool<T, R> {
  private readonly _workers: WorkerSlot[];
  private readonly _queue: Task<T, R>[];
  private readonly _scriptPath: string;
  private readonly _maxWorkers: number;
  private _taskId: number = 0;
  private _terminated: boolean = false;

  constructor(scriptPath: string, maxWorkers?: number) {
    this._scriptPath = scriptPath;
    this._maxWorkers = maxWorkers ?? availableParallelism();
    this._workers = new Array(this._maxWorkers);
    this._queue = [];

    // Pre-allocate worker slots
    for (let i = 0; i < this._maxWorkers; i++) {
      this._workers[i] = {
        id: i,
        worker: null,
        busy: false,
        taskCount: 0,
      };
    }
  }

  private _getIdleWorker(): WorkerSlot | null {
    for (let i = 0; i < this._workers.length; i++) {
      const slot = this._workers[i];
      if (slot && !slot.busy && slot.worker) {
        return slot;
      }
    }
    return null;
  }

  private _createWorker(slot: WorkerSlot): void {
    if (slot.worker) return;

    const worker = new Worker(this._scriptPath);

    worker.on('message', (result: R) => {
      slot.busy = false;
      slot.taskCount++;
      this._processQueue();
    });

    worker.on('error', (err) => {
      slot.busy = false;
      console.error(`Worker ${slot.id} error:`, err);
      this._processQueue();
    });

    slot.worker = worker;
  }

  private _processQueue(): void {
    if (this._queue.length === 0) return;

    // Find or create idle worker
    let slot = this._getIdleWorker();

    if (!slot) {
      // Try to create new worker if under limit
      for (let i = 0; i < this._workers.length; i++) {
        const candidate = this._workers[i];
        if (candidate && !candidate.worker) {
          this._createWorker(candidate);
          slot = candidate;
          break;
        }
      }
    }

    if (!slot || slot.busy) return;

    // Dequeue task
    const task = this._queue.shift();
    if (!task) return;

    slot.busy = true;

    // Send task to worker
    slot.worker!.once('message', (result: R) => {
      task.resolve(result);
    });

    slot.worker!.once('error', (err: Error) => {
      task.reject(err);
    });

    slot.worker!.postMessage(task.data);
  }

  execute(data: T): Promise<R> {
    if (this._terminated) {
      return Promise.reject(new Error('Worker pool terminated'));
    }

    return new Promise((resolve, reject) => {
      const task: Task<T, R> = {
        id: ++this._taskId,
        data,
        resolve,
        reject,
      };

      this._queue.push(task);
      this._processQueue();
    });
  }

  async terminate(): Promise<void> {
    this._terminated = true;

    const promises: Promise<number>[] = [];
    for (const slot of this._workers) {
      if (slot.worker) {
        promises.push(slot.worker.terminate());
        slot.worker = null;
        slot.busy = false;
      }
    }

    await Promise.all(promises);
  }

  get stats(): { active: number; idle: number; queued: number; totalTasks: number } {
    let active = 0;
    let idle = 0;
    let totalTasks = 0;

    for (const slot of this._workers) {
      if (slot.worker) {
        if (slot.busy) active++;
        else idle++;
        totalTasks += slot.taskCount;
      }
    }

    return {
      active,
      idle,
      queued: this._queue.length,
      totalTasks,
    };
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

export async function parallelMap<T, R>(
  items: ReadonlyArray<T>,
  mapper: (item: T) => Promise<R>,
  concurrency: number = 4
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await mapper(items[currentIndex]!);
    }
  }

  const workers = new Array(concurrency).fill(null).map(() => worker());
  await Promise.all(workers);

  return results;
}

export async function parallelFilter<T>(
  items: ReadonlyArray<T>,
  predicate: (item: T) => Promise<boolean>,
  concurrency: number = 4
): Promise<T[]> {
  const results = await parallelMap(items, async (item) => ({
    item,
    keep: await predicate(item),
  }), concurrency);

  return results.filter(r => r.keep).map(r => r.item);
}

// ============================================================================
// RACE & TIMEOUT UTILITIES
// ============================================================================

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message?: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message ?? `Operation timed out after ${ms}ms`));
    }, ms);
    timer.unref();
  });

  return Promise.race([promise, timeout]);
}

export function withDeadline<T>(
  promise: Promise<T>,
  deadlineMs: number
): Promise<T> {
  return withTimeout(promise, deadlineMs, `Deadline exceeded: ${deadlineMs}ms`);
}

// ============================================================================
// RETRY UTILITIES
// ============================================================================

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  retryable?: (error: Error) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxAttempts,
    delayMs,
    backoffMultiplier = 2,
    maxDelayMs = 30000,
    retryable = () => true,
  } = options;

  let lastError: Error | undefined;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts || !retryable(lastError)) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const jitter = Math.random() * currentDelay * 0.1;
      await new Promise(r => setTimeout(r, currentDelay + jitter));

      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError ?? new Error('Retry exhausted');
}
