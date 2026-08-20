import { describe, it } from 'node:test';
import { StrictAssertions } from '../../../../../scripts/test-runner/src/core/test-runner.ts';
import { Physics } from './physics.ts';

describe('Physics Core Engine', () => {
  it('getMagnitudes correctly computes complex array magnitudes', () => {
    // 3 complex numbers: (3, 4), (0, 0), (1, -1)
    const complexData = [3, 4, 0, 0, 1, -1];
    const mags = Physics.getMagnitudes(complexData);

    StrictAssertions.strictEqual(mags.length, 3);
    StrictAssertions.nearEqual(mags[0]!, 5.0);
    StrictAssertions.nearEqual(mags[1]!, 0.0);
    StrictAssertions.nearEqual(mags[2]!, Math.sqrt(2));
  });

  it('calculatePMR computes peak-to-mean ratio', () => {
    const magnitudes = [1, 2, 3, 4]; // sum = 10, mean = 2.5, max = 4. PMR = 4 / 2.5 = 1.6
    const pmr = Physics.calculatePMR(magnitudes);
    StrictAssertions.nearEqual(pmr, 1.6, 1e-4);
  });

  it('sigmoid maps values to (0, 1) range', () => {
    StrictAssertions.nearEqual(Physics.sigmoid(0), 0.5);
    StrictAssertions.inRange(Physics.sigmoid(10), 0.99, 1.0);
    StrictAssertions.inRange(Physics.sigmoid(-10), 0.0, 0.01);
  });

  it('cosineSimilarity calculates dot product similarity over magnitude product', () => {
    const v1 = [1, 0, 0];
    const v2 = [1, 0, 0];
    const v3 = [0, 1, 0];

    StrictAssertions.nearEqual(Physics.cosineSimilarity(v1, v2), 1.0, 1e-4);
    StrictAssertions.nearEqual(Physics.cosineSimilarity(v1, v3), 0.0, 1e-4);
  });
});
