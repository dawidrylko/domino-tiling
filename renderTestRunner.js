const {
  enumerateTilings,
  renderSheet,
  renderAscii,
  canUnrank,
  createUnranker,
  unrankTiling,
  sampleRandomTiling,
} = require('./renderer');
const { createRandom } = require('./renderer/cftp');
const { testCasesBigInt } = require('./test-data');

const MAX_CELLS = 36;
const UNRANK_SAMPLE_SIZE = 1000;
const RANDOM_SEED = 2024;
const SAMPLES_PER_TILING = 200;
// Chi-squared critical values at p = 0.001 for the degrees of freedom used below.
const randomTestCases = [
  { rowCount: 2, colCount: 2, expectedResult: 2, criticalValue: 10.83 },
  { rowCount: 4, colCount: 4, expectedResult: 36, criticalValue: 66.62 },
];
const randomValidityTestCases = [
  { rowCount: 20, colCount: 20 },
  { rowCount: 30, colCount: 30 },
];

function serializeTiling(tiling) {
  return tiling
    .map(({ row, col, horizontal }) => `${row},${col},${horizontal ? 'h' : 'v'}`)
    .join(';');
}

function findCoverageError(tiling, { rowCount, colCount }) {
  const covered = new Uint8Array(rowCount * colCount);

  for (const { row, col, horizontal } of tiling) {
    const cells = [
      [row, col],
      horizontal ? [row, col + 1] : [row + 1, col],
    ];

    for (const [r, c] of cells) {
      if (r >= rowCount || c >= colCount) {
        return `domino outside the board at ${r},${c}`;
      }

      if (covered[r * colCount + c]++) {
        return `overlapping dominoes at ${r},${c}`;
      }
    }
  }

  return covered.every(Boolean) ? null : 'board not fully covered';
}

function runTest(testCase) {
  const { expectedResult } = testCase;
  const unranker = createUnranker(testCase);
  const seen = new Set();
  let firstTiling = null;

  for (const tiling of enumerateTilings(testCase)) {
    const error = findCoverageError(tiling, testCase);

    if (error) {
      console.error(`Failed! Invalid tiling: ${error}`);

      return false;
    }

    const serialized = serializeTiling(tiling);
    const rank = BigInt(seen.size);

    if (serializeTiling(unrankTiling(unranker, rank)) !== serialized) {
      console.error(`Failed! Unranked tiling #${rank + BigInt(1)} differs from the enumerated one.`);

      return false;
    }

    seen.add(serialized);
    firstTiling = firstTiling || tiling;
  }

  if (unranker.total !== BigInt(seen.size)) {
    console.error(`Failed! Unranker total: ${unranker.total}, enumerated: ${seen.size}`);

    return false;
  }

  if (BigInt(seen.size) !== BigInt(expectedResult)) {
    console.error(`Failed! Expected: ${expectedResult}, Actual: ${seen.size}`);

    return false;
  }

  if (firstTiling) {
    const svg = renderSheet([firstTiling], 1, testCase);
    const ascii = renderAscii(firstTiling, testCase);

    if (!svg.startsWith('<svg') || ascii.includes('.')) {
      console.error('Failed! Rendering produced invalid output.');

      return false;
    }
  }

  console.log('Passed!');

  return true;
}

function runUnrankTest(testCase) {
  const { expectedResult } = testCase;
  const unranker = createUnranker(testCase);

  if (unranker.total !== BigInt(expectedResult)) {
    console.error(`Failed! Expected: ${expectedResult}, Actual: ${unranker.total}`);

    return false;
  }

  let rank = BigInt(0);

  for (const tiling of enumerateTilings(testCase)) {
    if (rank === BigInt(UNRANK_SAMPLE_SIZE)) {
      break;
    }

    if (serializeTiling(unrankTiling(unranker, rank)) !== serializeTiling(tiling)) {
      console.error(`Failed! Unranked tiling #${rank + BigInt(1)} differs from the enumerated one.`);

      return false;
    }

    rank++;
  }

  const lastTiling = unrankTiling(unranker, unranker.total - BigInt(1));
  const error = findCoverageError(lastTiling, testCase);

  if (error) {
    console.error(`Failed! Invalid last tiling: ${error}`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runRandomUniformityTest(testCase) {
  const { expectedResult, criticalValue } = testCase;
  const random = createRandom(RANDOM_SEED);
  const sampleCount = expectedResult * SAMPLES_PER_TILING;
  const frequencies = new Map();

  for (let i = 0; i < sampleCount; i++) {
    const tiling = sampleRandomTiling(testCase, random);
    const error = findCoverageError(tiling, testCase);

    if (error) {
      console.error(`Failed! Invalid random tiling: ${error}`);

      return false;
    }

    const key = serializeTiling(tiling);
    frequencies.set(key, (frequencies.get(key) || 0) + 1);
  }

  const expected = sampleCount / expectedResult;
  const chiSquared = [...frequencies.values()].reduce(
    (sum, observed) => sum + (observed - expected) ** 2 / expected,
    (expectedResult - frequencies.size) * expected,
  );

  if (frequencies.size !== expectedResult || chiSquared > criticalValue) {
    console.error(
      `Failed! Distinct: ${frequencies.size}/${expectedResult}, chi-squared: ${chiSquared.toFixed(2)} (limit ${criticalValue})`,
    );

    return false;
  }

  console.log('Passed!');

  return true;
}

function runRandomValidityTest(testCase) {
  const tiling = sampleRandomTiling(testCase, createRandom(RANDOM_SEED));
  const error = findCoverageError(tiling, testCase);

  if (error) {
    console.error(`Failed! Invalid random tiling: ${error}`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runSuite(name, testCases, run) {
  return testCases.every((testCase, index) => {
    const { rowCount, colCount } = testCase;

    process.stdout.write(
      `Executing ${name} test ${index + 1} of ${testCases.length} for ${rowCount}x${colCount}... `,
    );

    return run(testCase);
  });
}

function __main__() {
  const testCases = testCasesBigInt.filter(
    ({ rowCount, colCount }) => rowCount * colCount <= MAX_CELLS,
  );

  console.log(`Starting renderer test execution with ${testCases.length} tests...`);

  const allPassed = testCases.every((testCase, index) => {
    const { rowCount, colCount } = testCase;

    process.stdout.write(
      `Executing renderer test ${index + 1} of ${testCases.length} for ${rowCount}x${colCount}... `,
    );

    return runTest(testCase);
  });

  const unrankTestCases = testCasesBigInt.filter(
    ({ rowCount, colCount }) =>
      rowCount * colCount > MAX_CELLS && canUnrank({ rowCount, colCount }),
  );
  const allUnrankPassed = unrankTestCases.every((testCase, index) => {
    const { rowCount, colCount } = testCase;

    process.stdout.write(
      `Executing unrank test ${index + 1} of ${unrankTestCases.length} for ${rowCount}x${colCount}... `,
    );

    return runUnrankTest(testCase);
  });

  const allRandomPassed =
    runSuite('random uniformity', randomTestCases, runRandomUniformityTest) &&
    runSuite('random validity', randomValidityTestCases, runRandomValidityTest);

  if (allPassed && allUnrankPassed && allRandomPassed) {
    console.log('All renderer tests completed successfully.');
    process.exit(0);
  } else {
    console.error('Some renderer tests failed.');
    process.exit(1);
  }
}

__main__();
