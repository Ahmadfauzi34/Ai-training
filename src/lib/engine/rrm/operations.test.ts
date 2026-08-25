import { describe, it } from 'node:test';
import { StrictAssertions } from '../../../../scripts/test-runner/src/core/test-runner.ts';
import { executeFHRROperation, hashSymbol } from './operations.ts';
import type { RRMHypervectorResult } from '../../types/rrm.ts';

describe('FHRR node operations', () => {
  it('encodes symbols deterministically', () => {
    const first = executeFHRROperation('fhrr_encode', 'APPLE', []) as RRMHypervectorResult;
    const second = executeFHRROperation('fhrr_encode', 'APPLE', []) as RRMHypervectorResult;

    StrictAssertions.strictEqual(hashSymbol('APPLE'), hashSymbol('APPLE'));
    StrictAssertions.deepStrictEqual(Array.from(first.vector), Array.from(second.vector));
  });

  it('binds two connected hypervectors', () => {
    const left = executeFHRROperation('fhrr_encode', 'ROLE', []) as RRMHypervectorResult;
    const right = executeFHRROperation('fhrr_encode', 'VALUE', []) as RRMHypervectorResult;
    const result = executeFHRROperation('fhrr_bind', '', [left, right]) as RRMHypervectorResult;

    StrictAssertions.strictEqual(result.kind, 'rrm.hypervector');
    StrictAssertions.strictEqual(result.operation, 'bind');
    StrictAssertions.strictEqual(result.vector.length, 8192);
  });

  it('reports identical deterministic symbols with maximum similarity', () => {
    const left = executeFHRROperation('fhrr_encode', 'SAME', []) as RRMHypervectorResult;
    const right = executeFHRROperation('fhrr_encode', 'SAME', []) as RRMHypervectorResult;
    const result = executeFHRROperation('fhrr_similarity', '', [left, right]);

    StrictAssertions.strictEqual(result.kind, 'rrm.similarity');
    if (result.kind === 'rrm.similarity') StrictAssertions.nearEqual(result.score, 1);
  });

  it('requires two upstream hypervectors for binary operations', () => {
    const input = executeFHRROperation('fhrr_encode', 'ONLY', []) as RRMHypervectorResult;
    let message = '';
    try {
      executeFHRROperation('fhrr_similarity', '', [input]);
    } catch (error) {
      message = (error as Error).message;
    }
    StrictAssertions.strictEqual(message.includes('dua output hypervector'), true);
  });
});
