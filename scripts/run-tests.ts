import { testSuite } from '../src/lib/engine/math/Matrix.test.ts';

console.log("------------------------------------------");
console.log("RUNNING PROJECT TESTS");
console.log("------------------------------------------");

try {
    testSuite();
    console.log("------------------------------------------");
    console.log("✅ ALL TESTS PASSED SUCCESSFULLY");
    console.log("------------------------------------------");
    process.exit(0);
} catch (error) {
    console.error("------------------------------------------");
    console.error("❌ TEST SUITE FAILED");
    console.error(error);
    console.error("------------------------------------------");
    process.exit(1);
}
