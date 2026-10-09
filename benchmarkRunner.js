const fs = require('fs');
const { parseArgs, exec } = require('./helpers');
const {
  filesInt,
  testCasesInt,
  filesBigInt,
  testCasesBigInt,
} = require('./test-data');

function calculateAverageTime(executionTimes) {
  return (
    executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
  );
}

function ensureDirectoryExists(directory) {
  if (fs.existsSync(directory)) {
    return;
  }

  fs.mkdirSync(directory);
}

function generateFileName(options) {
  const { directory, fileName, rowCount, colCount } = options;

  return `${directory}/${fileName}_${rowCount}x${colCount}.txt`;
}

function generateContent(averageTime, executionTimes) {
  return [
    `Average Execution Time: ${averageTime} ms`,
    '---',
    ...executionTimes.map((time, i) => `${i + 1}. Execution Time: ${time} ms`),
  ].join('\n');
}

function saveExecutionResults(options) {
  const { executionTimes, averageTime } = options;
  const directory = 'benchmark';

  ensureDirectoryExists(directory);

  const resultFileName = generateFileName({ directory, ...options });
  const content = generateContent(averageTime, executionTimes);

  fs.writeFileSync(resultFileName, content);
  console.log(`File saved: ${resultFileName}`);
}

function runBenchmarkTest(testCase) {
  const { fileName, numberOfExecutions } = testCase;
  const executionTimes = [];

  for (let i = 0; i < numberOfExecutions; i++) {
    const startTime = Date.now();

    try {
      exec(fileName, testCase);
    } catch (error) {
      console.error(
        `Error running program in file ${fileName}: ${error.message}`,
      );

      return false;
    }

    executionTimes.push(Date.now() - startTime);
  }

  const averageTime = calculateAverageTime(executionTimes);
  saveExecutionResults({ ...testCase, averageTime, executionTimes });

  return true;
}

function executeBenchmark(options, files, testCases) {
  const pairs = files.flatMap(fileName =>
    testCases.map(testCase => ({ ...options, fileName, ...testCase })),
  );
  const allPassed = pairs.every((testCase, index) => {
    process.stdout.write(
      `Executing benchmark ${index + 1} of ${pairs.length} for ${
        testCase.fileName
      }... `,
    );

    return runBenchmarkTest(testCase);
  });

  return allPassed;
}

function __main__() {
  try {
    const argsSchema = { '-n': 'numberOfExecutions', '-m': 'maxSize' };
    const { numberOfExecutions, maxSize } = parseArgs(
      process.argv.slice(2),
      argsSchema,
    );

    if (!numberOfExecutions) {
      throw new Error(
        'Usage: node benchmarkRunner.js -n <numberOfExecutions> [-m <maxSize>]',
      );
    }

    console.log(
      `Starting benchmark execution with ${numberOfExecutions} executions each for ${maxSize || 'all available'} test cases...`,
    );

    const options = { numberOfExecutions };
    const testCasesToRunInt = maxSize ? testCasesInt.slice(0, maxSize) : testCasesInt;
    const testCasesToRunBigInt = maxSize
      ? testCasesBigInt.slice(0, maxSize)
      : testCasesBigInt;
    const allPassedInt = executeBenchmark(options, filesInt, testCasesToRunInt);
    const allPassedBigInt = executeBenchmark(
      options,
      filesBigInt,
      testCasesToRunBigInt,
    );

    if (allPassedInt && allPassedBigInt) {
      console.log('All benchmarks completed successfully.');
      process.exit(0);
    } else {
      console.error('Some benchmarks failed.');
      process.exit(1);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

__main__();
