const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseArgs, exec } = require('../src/helpers');
const {
  filesInt,
  testCasesInt,
  filesBigInt,
  testCasesBigInt,
  filesDomicule,
  testCasesDomicule,
} = require('../data');

const RUN_DATE = new Date().toISOString().slice(0, 10);
const BENCHMARK_ROOT = process.env.BENCHMARK_ROOT || path.join(__dirname, 'results');
const BENCHMARK_DIRECTORY = path.join(BENCHMARK_ROOT, RUN_DATE.slice(0, 7));
const MACHINE_KEYS = ['node', 'platform', 'cpu'];
const DOMICULE_BOARDS = [
  ...testCasesDomicule.map(({ rowCount, colCount }) => ({ rowCount, colCount })),
  { rowCount: 20, colCount: 20 },
];
const USAGE =
  'Usage: node benchmarks/benchmarkRunner.js -n <numberOfExecutions> [-m <maxSize>] [-o <offset>] [--only <solver file>] [--domicule] [--force]';

function displayPath(file) {
  const relative = path.relative(path.join(__dirname, '..'), file);

  return relative.startsWith('..') ? file : relative;
}

function readOnlyArg(argv) {
  const index = argv.indexOf('--only');

  return index === -1 ? null : argv[index + 1] ?? '';
}

function selectFiles(files, only) {
  return only === null ? files : files.filter(fileName => fileName === only);
}

function calculateAverageTime(executionTimes) {
  return (
    executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
  );
}

function ensureDirectoryExists(directory) {
  if (fs.existsSync(directory)) {
    return;
  }

  fs.mkdirSync(directory, { recursive: true });
}

function generateFileName(options) {
  const { directory, fileName, rowCount, colCount } = options;

  return path.join(directory, `${fileName}_${rowCount}x${colCount}.txt`);
}

function generateContent(averageTime, executionTimes) {
  return [
    `Average Execution Time: ${averageTime} ms`,
    '---',
    ...executionTimes.map((time, i) => `${i + 1}. Execution Time: ${time} ms`),
  ].join('\n');
}

function describeMachine() {
  const cpus = os.cpus();

  return {
    date: RUN_DATE,
    node: process.version,
    platform: `${os.type()} ${os.release()} ${os.arch()}`,
    cpu: cpus.length ? cpus[0].model.trim() : null,
    cores: cpus.length || null,
    memory: `${Math.round(os.totalmem() / 2 ** 30)} GB`,
  };
}

function checkDirectory(environment, force) {
  const file = path.join(BENCHMARK_DIRECTORY, 'environment.json');

  if (force || !fs.existsSync(file)) {
    return;
  }

  const recorded = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const differences = MACHINE_KEYS.filter(key => recorded[key] !== environment[key]);

  if (differences.length) {
    throw new Error(
      `${displayPath(BENCHMARK_DIRECTORY)} holds results measured on another machine (${differences
        .map(key => `${key} ${recorded[key]}`)
        .join(', ')}). Run with --force to overwrite them.`,
    );
  }
}

function saveEnvironment(environment) {
  ensureDirectoryExists(BENCHMARK_DIRECTORY);
  fs.writeFileSync(
    path.join(BENCHMARK_DIRECTORY, 'environment.json'),
    `${JSON.stringify(environment, null, 2)}\n`,
  );
}

function selectTestCases(testCases, offset, maxSize) {
  return testCases.slice(offset, maxSize ? offset + maxSize : undefined);
}

function saveExecutionResults(options) {
  const { executionTimes, averageTime } = options;
  const directory = BENCHMARK_DIRECTORY;

  ensureDirectoryExists(directory);

  const resultFileName = generateFileName({ directory, ...options });
  const content = generateContent(averageTime, executionTimes);

  fs.writeFileSync(resultFileName, content);
  console.log(`File saved: ${displayPath(resultFileName)}`);
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
    const argsSchema = {
      '-n': 'numberOfExecutions',
      '-m': 'maxSize',
      '-o': 'offset',
    };
    const argv = process.argv.slice(2);
    const {
      numberOfExecutions,
      maxSize,
      offset = 0,
    } = parseArgs(argv, argsSchema);
    const only = readOnlyArg(argv);
    const domicule = argv.includes('--domicule');
    const groups = domicule
      ? [{ files: filesDomicule, testCases: DOMICULE_BOARDS }]
      : [
          { files: filesInt, testCases: testCasesInt },
          { files: filesBigInt, testCases: testCasesBigInt },
        ];

    if (
      !(numberOfExecutions > 0) ||
      (maxSize !== undefined && !(maxSize > 0)) ||
      !(offset >= 0) ||
      (only !== null && !groups.some(({ files }) => files.includes(only)))
    ) {
      throw new Error(USAGE);
    }

    const options = { numberOfExecutions };
    const runs = groups.map(({ files, testCases }) => ({
      files: selectFiles(files, only),
      testCases: selectTestCases(testCases, offset, maxSize),
    }));

    if (!runs.some(({ files, testCases }) => files.length && testCases.length)) {
      throw new Error(`No test cases from test case ${offset + 1}. ${USAGE}`);
    }

    console.log(
      `Starting benchmark execution with ${numberOfExecutions} executions each for ${maxSize || 'all available'} test cases from test case ${offset + 1}...`,
    );

    const environment = describeMachine();

    checkDirectory(environment, argv.includes('--force'));
    saveEnvironment(environment);

    const results = runs.map(({ files, testCases }) => executeBenchmark(options, files, testCases));

    if (results.every(Boolean)) {
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
