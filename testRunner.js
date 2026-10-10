const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec, parseArgs, verifyInt, verifyBigInt } = require('./helpers');
const {
  filesInt,
  testCasesInt,
  filesBigInt,
  testCasesBigInt,
  filesRectangles,
  testCasesRectangles,
} = require('./test-data');

const REJECTION_TIMEOUT = 30000;
const parserTestCases = [
  { value: '12', expectedResult: 12 },
  { value: '0', expectedResult: 0 },
  { value: '2abc', expectedResult: NaN },
  { value: '-2', expectedResult: NaN },
  { value: '1e3', expectedResult: NaN },
  { value: '99999999999999999999999', expectedResult: NaN },
  { value: undefined, expectedResult: NaN },
];
const rejectionTestCases = [
  { args: ['dominoTilingSolver.js', '-r', '31', '-c', '31'], message: 'at most 30' },
  { args: ['dominoTilingSolver-BigInt.js', '-r', '31', '-c', '31'], message: 'at most 30' },
  { args: ['dominoTilingSolver.js', '-r', '2abc', '-c', '2'], message: 'Usage' },
  { args: ['testRunner.js', '-m', 'abc'], message: 'Usage' },
  { args: ['testRunner.js', '-m'], message: 'Usage' },
  { args: ['dominoTilingSolver-Formula.js', '-r', '3', '-c', '3'], message: '2n x 2n boards only' },
  { args: ['benchmarkRunner.js', '-n', '1', '--only', 'missing.js'], message: 'Usage' },
  { args: ['benchmarkRunner.js', '-n', '1', '-o', '99'], message: 'No test cases' },
];

function executeExecutorTest() {
  process.stdout.write('Executing executor test 1 of 1 for the Node.js binary... ');

  const command = exec.generateNodeCommand('dominoTilingSolver.js', { rowCount: 2, colCount: 2 });
  const expected = `"${process.execPath}" "${path.join(__dirname, 'dominoTilingSolver.js')}" `;

  if (!command.startsWith(expected)) {
    console.error(`Failed! Command: ${command}`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runBenchmark(benchmarkRoot, extraArgs) {
  return spawnSync(
    process.execPath,
    ['benchmarkRunner.js', '-n', '1', '-m', '1', '--only', 'dominoTilingSolver-Formula.js', ...extraArgs],
    {
      cwd: __dirname,
      encoding: 'utf-8',
      timeout: REJECTION_TIMEOUT,
      env: { ...process.env, BENCHMARK_ROOT: benchmarkRoot },
    },
  );
}

function executeBenchmarkGuardTest() {
  process.stdout.write('Executing benchmark guard test 1 of 1 for another machine... ');

  const benchmarkRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'domino-benchmark-'));
  const directory = path.join(benchmarkRoot, new Date().toISOString().slice(0, 7));
  const foreign = { date: null, node: 'v0.0.0', platform: 'Other 0 x0', cpu: 'Other CPU', cores: 1, memory: null };

  try {
    fs.mkdirSync(directory);
    fs.writeFileSync(path.join(directory, 'environment.json'), JSON.stringify(foreign));

    const refused = runBenchmark(benchmarkRoot, []);
    const kept = JSON.parse(fs.readFileSync(path.join(directory, 'environment.json'), 'utf-8'));
    const forced = runBenchmark(benchmarkRoot, ['--force']);
    const written = fs.existsSync(path.join(directory, 'dominoTilingSolver-Formula.js_0x0.txt'));

    if (refused.status === 0 || !refused.stderr.includes('--force') || kept.cpu !== foreign.cpu) {
      console.error(`Failed! The run was not refused: ${refused.stderr.trim()}`);

      return false;
    }

    if (forced.status !== 0 || !written) {
      console.error(`Failed! --force did not overwrite: ${forced.stderr.trim()}`);

      return false;
    }
  } finally {
    fs.rmSync(benchmarkRoot, { recursive: true, force: true });
  }

  console.log('Passed!');

  return true;
}

function executePrecisionWarningTests() {
  const cases = [
    { rowCount: 10, warns: false },
    { rowCount: 12, warns: true },
  ];

  return cases.every(({ rowCount, warns }, index) => {
    process.stdout.write(
      `Executing precision warning test ${index + 1} of ${cases.length} for ${rowCount}x${rowCount}... `,
    );

    const { status, stderr } = spawnSync(
      process.execPath,
      ['dominoTilingSolver.js', '-r', String(rowCount), '-c', String(rowCount)],
      { cwd: __dirname, encoding: 'utf-8', timeout: REJECTION_TIMEOUT },
    );

    if (status !== 0 || stderr.includes('not exact') !== warns) {
      console.error(`Failed! Exit code ${status}, warning ${stderr.includes('not exact') ? 'shown' : 'missing'}.`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function executeParserTests() {
  return parserTestCases.every(({ value, expectedResult }, index) => {
    process.stdout.write(
      `Executing parser test ${index + 1} of ${parserTestCases.length} for "${value}"... `,
    );

    const args = value === undefined ? ['-s'] : ['-s', value];
    const { size } = parseArgs(args, { '-s': 'size' });

    if (!Object.is(size, expectedResult)) {
      console.error(`Failed! Expected: ${expectedResult}, Actual: ${size}`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function executeRejectionTests() {
  return rejectionTestCases.every(({ args, message }, index) => {
    process.stdout.write(
      `Executing rejection test ${index + 1} of ${rejectionTestCases.length} for "${args.join(' ')}"... `,
    );

    const { status, stderr } = spawnSync(process.execPath, args, {
      cwd: __dirname,
      encoding: 'utf-8',
      timeout: REJECTION_TIMEOUT,
    });

    if (status === 0 || !stderr.includes(message)) {
      console.error(`Failed! Exit code ${status}: ${stderr.trim()}`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function runTest(testCase, useBigInt) {
  const { fileName, expectedResult } = testCase;

  try {
    const result = exec(fileName, testCase);
    const verifyResult = useBigInt ? verifyBigInt : verifyInt;

    if (verifyResult(expectedResult, result)) {
      console.log('Passed!');
    } else {
      console.error(`Failed! Expected: ${expectedResult}, Actual: ${result}`);

      return false;
    }
  } catch (error) {
    console.error(`Failed! Error: ${error.message}`);

    return false;
  }

  return true;
}

function executeTests(files, testCases, useBigInt) {
  const pairs = files.flatMap(fileName =>
    testCases.map((testCase, index) => ({ index, fileName, ...testCase })),
  );
  const allPassed = pairs.every((testCase, index) => {
    process.stdout.write(
      `Executing test ${index + 1} of ${pairs.length} for ${
        testCase.fileName
      }... `,
    );

    return runTest(testCase, useBigInt);
  });

  return allPassed;
}

function __main__() {
  try {
    const argsSchema = { '-m': 'maxSize' };
    const { maxSize } = parseArgs(process.argv.slice(2), argsSchema);

    if (maxSize !== undefined && !(maxSize > 0)) {
      throw new Error('Usage: node testRunner.js [-m <maxSize>]');
    }

    console.log(
      `Starting test execution with ${maxSize || 'all available'} test cases per solver group...`,
    );

    const testCasesToRunInt = maxSize ? testCasesInt.slice(0, maxSize) : testCasesInt;
    const testCasesToRunBigInt = maxSize ? testCasesBigInt.slice(0, maxSize) : testCasesBigInt;

    const allIntTestsPassed = executeTests(filesInt, testCasesToRunInt, false);
    const allBigIntTestsPassed = executeTests(filesBigInt, testCasesToRunBigInt, true);
    const allRectangleTestsPassed = executeTests(filesRectangles, testCasesRectangles, true);
    const allParserTestsPassed = executeParserTests();
    const allRejectionTestsPassed = executeRejectionTests();
    const executorTestPassed = executeExecutorTest();
    const benchmarkGuardTestPassed = executeBenchmarkGuardTest();
    const precisionWarningTestsPassed = executePrecisionWarningTests();

    if (
      allIntTestsPassed &&
      allBigIntTestsPassed &&
      allRectangleTestsPassed &&
      allParserTestsPassed &&
      allRejectionTestsPassed &&
      executorTestPassed &&
      benchmarkGuardTestPassed &&
      precisionWarningTestsPassed
    ) {
      console.log('All tests completed successfully.');
      process.exit(0);
    } else {
      console.error('Some tests failed.');
      process.exit(1);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

__main__();
