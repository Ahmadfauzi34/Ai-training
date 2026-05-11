import { describe, it } from 'node:test';
import { StrictAssertions } from '../../../../scripts/test-runner/test-runner.ts';
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
});
