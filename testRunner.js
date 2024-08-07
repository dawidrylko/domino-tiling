const { exec, parseArgs, verifyInt, verifyBigInt } = require('./helpers');
const {
  filesInt,
  testCasesInt,
  filesBigInt,
  testCasesBigInt,
} = require('./test-data');

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
    const options = parseArgs(process.argv.slice(2), argsSchema);
    const maxSize = options.maxSize;

    console.log(`Starting test execution with ${maxSize || 'all available'} tests...`);

    const testCasesToRunInt = maxSize ? testCasesInt.slice(0, maxSize) : testCasesInt;
    const testCasesToRunBigInt = maxSize ? testCasesBigInt.slice(0, maxSize) : testCasesBigInt;

    const allIntTestsPassed = executeTests(filesInt, testCasesToRunInt, false);
    const allBigIntTestsPassed = executeTests(filesBigInt, testCasesToRunBigInt, true);

    if (allIntTestsPassed && allBigIntTestsPassed) {
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
