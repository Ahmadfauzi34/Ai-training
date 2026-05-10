
function parseNumbers(text) {
  return text
    .split(/[\s,]+/)
    .filter(s => s.trim() !== '')
    .map(Number)
    .filter(n => !isNaN(n));
}

function shouldUpdate(rawInput, externalValues) {
  const currentValues = parseNumbers(rawInput);
  const isDifferent = currentValues.length !== externalValues.length ||
                      currentValues.some((v, i) => v !== externalValues[i]);
  return isDifferent;
}

const tests = [
  {
    name: "Equal values - simple",
    rawInput: "1, 2, 3",
    externalValues: [1, 2, 3],
    expected: false
  },
  {
    name: "Equal values - trailing comma",
    rawInput: "1, 2, 3,",
    externalValues: [1, 2, 3],
    expected: false
  },
  {
    name: "Equal values - trailing space",
    rawInput: "1, 2, 3 ",
    externalValues: [1, 2, 3],
    expected: false
  },
  {
    name: "Equal values - mixed separators",
    rawInput: "1 2, 3",
    externalValues: [1, 2, 3],
    expected: false
  },
  {
    name: "Different values - length",
    rawInput: "1, 2",
    externalValues: [1, 2, 3],
    expected: true
  },
  {
    name: "Different values - content",
    rawInput: "1, 2, 4",
    externalValues: [1, 2, 3],
    expected: true
  },
  {
    name: "Empty input",
    rawInput: "",
    externalValues: [],
    expected: false
  }
];

let failed = false;
tests.forEach(test => {
  const result = shouldUpdate(test.rawInput, test.externalValues);
  if (result !== test.expected) {
    console.error(`❌ Test FAILED: ${test.name}`);
    console.error(`   Input: "${test.rawInput}", External: [${test.externalValues}]`);
    console.error(`   Expected: ${test.expected}, Got: ${result}`);
    failed = true;
  } else {
    console.log(`✅ Test PASSED: ${test.name}`);
  }
});

if (failed) {
  process.exit(1);
} else {
  console.log("\nAll logic tests passed!");
}
