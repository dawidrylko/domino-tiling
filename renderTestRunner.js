const {
  enumerateTilings,
  renderSheet,
  renderAscii,
  canUnrank,
  createUnranker,
  unrankTiling,
} = require('./renderer');
const { testCasesBigInt } = require('./test-data');

const MAX_CELLS = 36;
const UNRANK_SAMPLE_SIZE = 1000;
const extraTestCases = [
  { rowCount: 1, colCount: 3, expectedResult: '0' },
  { rowCount: 2, colCount: 3, expectedResult: '3' },
  { rowCount: 3, colCount: 4, expectedResult: '11' },
  { rowCount: 3, colCount: 3, expectedResult: '0' },
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

function __main__() {
  const testCases = [...testCasesBigInt, ...extraTestCases].filter(
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

  if (allPassed && allUnrankPassed) {
    console.log('All renderer tests completed successfully.');
    process.exit(0);
  } else {
    console.error('Some renderer tests failed.');
    process.exit(1);
  }
}

__main__();
