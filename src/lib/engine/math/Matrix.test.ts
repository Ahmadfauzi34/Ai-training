import { Matrix } from './Matrix.ts';

/**
 * Simple Test Utility
 */
export function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

export function testSuite() {
    console.log("🚀 Starting Matrix.multiply Test Suite...");

    testHappyPath();
    testDimensionMismatch();
    testZeroAllocation();
    testOutputDimensionMismatch();
    test1x1();
    testVectorMultiplication();
    testZeroMatrix();
    testIdentityMatrix();
    testNegativeValues();

    console.log("✅ All Matrix.multiply tests passed!");
}

function testHappyPath() {
    console.log("  - testHappyPath");
    // 2x3 * 3x2 = 2x2
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
    assert(res !== null, "Result should not be null");
    assert(res!.rows === 2 && res!.cols === 2, "Result should be 2x2");
    assert(res!.data[0] === 58, "data[0] mismatch");
    assert(res!.data[1] === 64, "data[1] mismatch");
    assert(res!.data[2] === 139, "data[2] mismatch");
    assert(res!.data[3] === 154, "data[3] mismatch");
}

function testDimensionMismatch() {
    console.log("  - testDimensionMismatch");
    const a = new Matrix(2, 2);
    const b = new Matrix(3, 2);
    const res = Matrix.multiply(a, b);
    assert(res === null, "Should return null for dimension mismatch");
}

function testZeroAllocation() {
    console.log("  - testZeroAllocation");
    const a = new Matrix(2, 2, new Float32Array([1, 2, 3, 4]));
    const b = new Matrix(2, 2, new Float32Array([5, 6, 7, 8]));
    const out = new Matrix(2, 2);
    const res = Matrix.multiply(a, b, out);
    assert(res === out, "Should return the same 'out' matrix");
    // [1*5+2*7, 1*6+2*8] = [19, 22]
    // [3*5+4*7, 3*6+4*8] = [43, 50]
    assert(out.data[0] === 19, "out[0] mismatch");
    assert(out.data[1] === 22, "out[1] mismatch");
    assert(out.data[2] === 43, "out[2] mismatch");
    assert(out.data[3] === 50, "out[3] mismatch");
}

function testOutputDimensionMismatch() {
    console.log("  - testOutputDimensionMismatch");
    const a = new Matrix(2, 2);
    const b = new Matrix(2, 2);
    const out = new Matrix(3, 3);
    const res = Matrix.multiply(a, b, out);
    assert(res === null, "Should return null for output dimension mismatch");
}

function test1x1() {
    console.log("  - test1x1");
    const a = new Matrix(1, 1, new Float32Array([3]));
    const b = new Matrix(1, 1, new Float32Array([4]));
    const res = Matrix.multiply(a, b);
    assert(res!.data[0] === 12, "1x1 multiplication failed");
}

function testVectorMultiplication() {
    console.log("  - testVectorMultiplication");
    // Dot product simulation (Row * Col)
    const row = new Matrix(1, 3, new Float32Array([1, 2, 3]));
    const col = new Matrix(3, 1, new Float32Array([4, 5, 6]));
    const dot = Matrix.multiply(row, col);
    assert(dot!.rows === 1 && dot!.cols === 1, "Dot result should be 1x1");
    assert(dot!.data[0] === 32, "Dot result mismatch (1*4 + 2*5 + 3*6 = 32)");

    // Outer product simulation (Col * Row)
    const resOuter = Matrix.multiply(col, row);
    assert(resOuter!.rows === 3 && resOuter!.cols === 3, "Outer result should be 3x3");
    // [4*1, 4*2, 4*3] = [4, 8, 12]
    // [5*1, 5*2, 5*3] = [5, 10, 15]
    // [6*1, 6*2, 6*3] = [6, 12, 18]
    assert(resOuter!.data[0] === 4, "Outer[0] mismatch");
    assert(resOuter!.data[4] === 10, "Outer[4] mismatch");
    assert(resOuter!.data[8] === 18, "Outer[8] mismatch");
}

function testZeroMatrix() {
    console.log("  - testZeroMatrix");
    const a = new Matrix(2, 2, new Float32Array([1, 2, 3, 4]));
    const zero = new Matrix(2, 2);
    const res = Matrix.multiply(a, zero);
    assert(res!.data.every(v => v === 0), "Multiply by zero matrix should be all zeros");
}

function testIdentityMatrix() {
    console.log("  - testIdentityMatrix");
    const a = new Matrix(2, 2, new Float32Array([10, 20, 30, 40]));
    const identity = new Matrix(2, 2, new Float32Array([1, 0, 0, 1]));
    const res = Matrix.multiply(a, identity);
    assert(res!.data[0] === 10 && res!.data[1] === 20 && res!.data[2] === 30 && res!.data[3] === 40, "Multiply by identity failed");
}

function testNegativeValues() {
    console.log("  - testNegativeValues");
    const a = new Matrix(1, 2, new Float32Array([-1, 2]));
    const b = new Matrix(2, 1, new Float32Array([3, -4]));
    const res = Matrix.multiply(a, b);
    // (-1*3) + (2*-4) = -3 - 8 = -11
    assert(res!.data[0] === -11, "Negative values failed");
}

// Automatically run if this file is executed directly (though we'll use a runner)
if (import.meta.url.endsWith('Matrix.test.ts')) {
    testSuite();
}
