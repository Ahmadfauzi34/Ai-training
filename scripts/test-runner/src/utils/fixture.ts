/**
 * Test Fixture Utilities
 *
 * Pre-allocated fixture management for deterministic test environments.
 * Zero-allocation pattern for hot-path test data generation.
 */

import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ============================================================================
// FIXTURE POOL (Pre-allocated, reusable)
// ============================================================================

interface FixtureSlot {
  id: number;
  path: string;
  inUse: boolean;
  createdAt: number;
}

class FixturePool {
  private readonly _slots: FixtureSlot[];
  private readonly _baseDir: string;
  private _nextId: number = 0;

  constructor(capacity: number = 10) {
    this._baseDir = join(tmpdir(), `node-test-fixtures-${process.pid}`);
    this._slots = new Array(capacity);

    // Pre-allocate slots
    for (let i = 0; i < capacity; i++) {
      this._slots[i] = {
        id: -1,
        path: '',
        inUse: false,
        createdAt: 0,
      };
    }

    // Ensure base directory exists
    if (!existsSync(this._baseDir)) {
      mkdirSync(this._baseDir, { recursive: true });
    }
  }

  acquire(): FixtureSlot | null {
    // Find first available slot (linear scan, cache-friendly)
    for (let i = 0; i < this._slots.length; i++) {
      if (!this._slots[i].inUse) {
        const slot = this._slots[i];
        slot.id = ++this._nextId;
        slot.path = join(this._baseDir, `fixture-${slot.id}`);
        slot.inUse = true;
        slot.createdAt = Date.now();

        // Ensure clean state
        if (existsSync(slot.path)) {
          rmSync(slot.path, { recursive: true, force: true });
        }
        mkdirSync(slot.path, { recursive: true });

        return slot;
      }
    }
    return null; // Pool exhausted
  }

  release(slot: FixtureSlot): void {
    const idx = this._slots.findIndex(s => s.id === slot.id);
    if (idx >= 0) {
      // Clean up directory
      if (existsSync(slot.path)) {
        rmSync(slot.path, { recursive: true, force: true });
      }

      // Reset slot (ghost state pattern)
      this._slots[idx].id = -1;
      this._slots[idx].path = '';
      this._slots[idx].inUse = false;
      this._slots[idx].createdAt = 0;
    }
  }

  cleanup(): void {
    // Release all slots
    for (const slot of this._slots) {
      if (slot.inUse) {
        this.release(slot);
      }
    }

    // Remove base directory
    if (existsSync(this._baseDir)) {
      rmSync(this._baseDir, { recursive: true, force: true });
    }
  }
}

// Global pool instance (singleton)
const globalPool = new FixturePool(20);

// Cleanup on exit
process.on('exit', () => globalPool.cleanup());
process.on('SIGINT', () => { globalPool.cleanup(); process.exit(0); });
process.on('SIGTERM', () => { globalPool.cleanup(); process.exit(0); });

// ============================================================================
// FIXTURE BUILDER API
// ============================================================================

export interface FixtureContext {
  path: string;
  writeFile(filename: string, content: string | Buffer): void;
  writeJSON(filename: string, data: unknown): void;
  mkdir(name: string): string;
  cleanup(): void;
}

export function createFixture(): FixtureContext {
  const slot = globalPool.acquire();
  if (!slot) {
    throw new Error('Fixture pool exhausted. Max 20 concurrent fixtures.');
  }

  return {
    path: slot.path,

    writeFile(filename: string, content: string | Buffer): void {
      const filePath = join(slot.path, filename);
      const dir = filePath.substring(0, filePath.lastIndexOf('/'));
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(filePath, content);
    },

    writeJSON(filename: string, data: unknown): void {
      this.writeFile(filename, JSON.stringify(data, null, 2));
    },

    mkdir(name: string): string {
      const dirPath = join(slot.path, name);
      mkdirSync(dirPath, { recursive: true });
      return dirPath;
    },

    cleanup(): void {
      globalPool.release(slot);
    },
  };
}

// ============================================================================
// TEMPORARY FILE UTILITIES
// ============================================================================

export interface TempFile {
  path: string;
  write(content: string | Buffer): void;
  read(): Buffer;
  cleanup(): void;
}

export function createTempFile(extension: string = '.tmp'): TempFile {
  const slot = globalPool.acquire();
  if (!slot) {
    throw new Error('Fixture pool exhausted');
  }

  const filePath = join(slot.path, `temp${extension}`);

  return {
    path: filePath,

    write(content: string | Buffer): void {
      writeFileSync(filePath, content);
    },

    read(): Buffer {
      return require('node:fs').readFileSync(filePath);
    },

    cleanup(): void {
      globalPool.release(slot);
    },
  };
}

// ============================================================================
// DATA GENERATORS (Deterministic, seeded)
// ============================================================================

export class SeededRandom {
  private _seed: number;

  constructor(seed: number = 12345) {
    this._seed = seed;
  }

  // Linear congruential generator (fast, deterministic)
  next(): number {
    this._seed = (this._seed * 16807 + 0) % 2147483647;
    return (this._seed - 1) / 2147483646;
  }

  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  nextBool(): boolean {
    return this.next() >= 0.5;
  }

  // Generate array of random numbers
  floatArray(size: number, min: number = 0, max: number = 1): Float64Array {
    const arr = new Float64Array(size);
    for (let i = 0; i < size; i++) {
      arr[i] = this.nextFloat(min, max);
    }
    return arr;
  }

  // Generate random string
  string(length: number, chars: string = 'abcdefghijklmnopqrstuvwxyz'): string {
    let result = '';
    const charLen = chars.length;
    for (let i = 0; i < length; i++) {
      result += chars[this.nextInt(0, charLen - 1)];
    }
    return result;
  }
}

// ============================================================================
// ASSERTION HELPERS FOR FIXTURES
// ============================================================================

export function assertFileExists(path: string): void {
  if (!existsSync(path)) {
    throw new Error(`Expected file to exist: ${path}`);
  }
}

export function assertFileContains(path: string, expected: string): void {
  const content = require('node:fs').readFileSync(path, 'utf-8');
  if (!content.includes(expected)) {
    throw new Error(`Expected file ${path} to contain "${expected}"`);
  }
}

export function assertDirectoryExists(path: string): void {
  const stat = require('node:fs').statSync(path);
  if (!stat.isDirectory()) {
    throw new Error(`Expected directory to exist: ${path}`);
  }
}
