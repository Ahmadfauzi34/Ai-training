import { describe, it } from 'node:test';
import { StrictAssertions } from '../../../scripts/test-runner/src/core/test-runner.ts';
import {
  isRRMMode,
  normalizeRRMMode,
  RRM_MODE_DEFINITIONS,
  RRM_MODE_OPTIONS
} from './rrm.ts';

describe('RRM mode contract', () => {
  it('keeps the runtime options synchronized with the mode definitions', () => {
    StrictAssertions.deepStrictEqual(
      RRM_MODE_OPTIONS.map(option => option.value),
      Object.keys(RRM_MODE_DEFINITIONS)
    );
  });

  it('accepts canonical modes and rejects unknown modes', () => {
    StrictAssertions.strictEqual(isRRMMode('plr_proof'), true);
    StrictAssertions.strictEqual(isRRMMode('unknown'), false);
    StrictAssertions.strictEqual(normalizeRRMMode('unknown'), null);
  });

  it('rejects mode names inherited from Object.prototype', () => {
    for (const inheritedMode of ['constructor', 'toString', '__proto__']) {
      StrictAssertions.strictEqual(isRRMMode(inheritedMode), false);
      StrictAssertions.strictEqual(normalizeRRMMode(inheritedMode), null);
    }
  });

  it('migrates legacy persisted modes while preserving sandbox behavior', () => {
    StrictAssertions.strictEqual(normalizeRRMMode('sandbox'), 'plr_proof');
    StrictAssertions.strictEqual(normalizeRRMMode('fhrr'), 'fhrr_similarity');
    StrictAssertions.strictEqual(normalizeRRMMode('entanglement'), 'entanglement_optimize');
  });

  it('marks only modes with a real node executor as implemented', () => {
    const implemented = RRM_MODE_OPTIONS
      .filter(option => option.implemented)
      .map(option => option.value);
    StrictAssertions.deepStrictEqual(implemented, [
      'plr_proof',
      'fhrr_encode',
      'fhrr_bind',
      'fhrr_similarity'
    ]);
  });
});
