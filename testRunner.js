const { spawnSync } = require('child_process');
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
];

function executeExecutorTest() {
  process.stdout.write('Executing executor test 1 of 1 for the Node.js binary... ');

  const command = exec.generateNodeCommand('dominoTilingSolver.js', { rowCount: 2, colCount: 2 });

  if (!command.startsWith(`"${process.execPath}" `)) {
    console.error(`Failed! Command: ${command}`);

    return false;
  }

  console.log('Passed!');

  return true;
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

    if (
      allIntTestsPassed &&
      allBigIntTestsPassed &&
      allRectangleTestsPassed &&
      allParserTestsPassed &&
      allRejectionTestsPassed &&
      executorTestPassed
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
