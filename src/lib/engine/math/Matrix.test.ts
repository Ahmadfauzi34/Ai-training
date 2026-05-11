import { describe, it } from 'node:test';
import { StrictAssertions } from '../../../../scripts/test-runner/src/core/test-runner.ts';
import { Matrix } from './Matrix.ts';

describe('Matrix Multiplication', () => {

  it('testHappyPath: 2x3 * 3x2 = 2x2', () => {
    const a = new Matrix(2, 3, new Float32Array([
      1, 2, 3,
      4, 5, 6
    ]));
    const b = new Matrix(3, 2, new Float32Array([
      7, 8,
      9, 10,
      11, 12
    ]));
    const res = Matrix.multiply(a, b);

    StrictAssertions.defined(res);
    StrictAssertions.strictEqual(res.rows, 2);
    StrictAssertions.strictEqual(res.cols, 2);
    StrictAssertions.arrayNearEqual(
        res.data,
        new Float32Array([58, 64, 139, 154])
    );
  });

  it('testDimensionMismatch', () => {
    const a = new Matrix(2, 2);
    const b = new Matrix(3, 2);

    // Suppress console.error in test
    const originalError = console.error;
    console.error = () => {};
    const res = Matrix.multiply(a, b);
    console.error = originalError;

    StrictAssertions.strictEqual(res, null);
  });

  it('testZeroAllocation', () => {
    const a = new Matrix(2, 2, new Float32Array([1, 2, 3, 4]));
    const b = new Matrix(2, 2, new Float32Array([5, 6, 7, 8]));
    const out = new Matrix(2, 2);
    const res = Matrix.multiply(a, b, out);

    StrictAssertions.strictEqual(res, out);
    StrictAssertions.arrayNearEqual(
        out.data,
        new Float32Array([19, 22, 43, 50])
    );
  });

  it('test1x1', () => {
    const a = new Matrix(1, 1, new Float32Array([3]));
    const b = new Matrix(1, 1, new Float32Array([4]));
    const res = Matrix.multiply(a, b);

    StrictAssertions.defined(res);
    StrictAssertions.nearEqual(res.data[0]!, 12);
  });

  it('testNegativeValues', () => {
    const a = new Matrix(1, 2, new Float32Array([-1, 2]));
    const b = new Matrix(2, 1, new Float32Array([3, -4]));
    const res = Matrix.multiply(a, b);

    StrictAssertions.defined(res);
    StrictAssertions.nearEqual(res.data[0]!, -11);
  });

  it('testZeroDimensions', () => {
    const a = new Matrix(0, 0);
    const b = new Matrix(0, 0);
    const res = Matrix.multiply(a, b);
    StrictAssertions.defined(res);
    StrictAssertions.strictEqual(res.rows, 0);
    StrictAssertions.strictEqual(res.cols, 0);
  });

  it('testLargeMatrixDimensions', () => {
      const N = 128; // Small enough for fast tests, large enough to catch bugs
      const a = new Matrix(N, N);
      const b = new Matrix(N, N);
      for(let i=0; i<N*N; i++) {
          a.data[i] = Math.random();
          b.data[i] = Math.random();
      }

      const res = Matrix.multiply(a, b);

      StrictAssertions.defined(res);
      StrictAssertions.strictEqual(res.rows, N);
      StrictAssertions.strictEqual(res.cols, N);
  });

  it('testZeroAllocationModeWrongDimensions', () => {
      const a = new Matrix(2, 3);
      const b = new Matrix(3, 2);
      const out = new Matrix(3, 3); // WRONG OUT DIMENSIONS

      const originalError = console.error;
      console.error = () => {};
      const res = Matrix.multiply(a, b, out);
      console.error = originalError;

      StrictAssertions.strictEqual(res, null);
  });

  it('testIdentityMatrix', () => {
      const a = new Matrix(2, 2, new Float32Array([1, 2, 3, 4]));
      const id = new Matrix(2, 2, new Float32Array([1, 0, 0, 1]));

      const res1 = Matrix.multiply(a, id);
      StrictAssertions.defined(res1);
      StrictAssertions.nearEqual(res1.data[0]!, 1);
      StrictAssertions.nearEqual(res1.data[1]!, 2);
      StrictAssertions.nearEqual(res1.data[2]!, 3);
      StrictAssertions.nearEqual(res1.data[3]!, 4);

      const res2 = Matrix.multiply(id, a);
      StrictAssertions.defined(res2);
      StrictAssertions.nearEqual(res2.data[0]!, 1);
      StrictAssertions.nearEqual(res2.data[1]!, 2);
      StrictAssertions.nearEqual(res2.data[2]!, 3);
      StrictAssertions.nearEqual(res2.data[3]!, 4);
  });
});
