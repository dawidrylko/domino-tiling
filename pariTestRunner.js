const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { testCasesDomicule, testCasesDomiculeRectangles } = require('./test-data');

const PROGRAM_FILE = path.join(__dirname, 'oeis', 'A239273.gp');
const README_FILE = path.join(__dirname, 'README.md');
const GP = process.env.GP_PATH || 'gp';
const GP_TIMEOUT = 300000;
const MAX_SQUARE_SIDE = 12;

function readProgram() {
  return fs
    .readFileSync(PROGRAM_FILE, 'utf-8')
    .split('\n')
    .filter(line => !line.startsWith('\\\\'))
    .join('\n')
    .trim();
}

function executeReadmeTest() {
  process.stdout.write('Executing README test 1 of 1 for the PARI/GP program... ');

  const blocks = [...fs.readFileSync(README_FILE, 'utf-8').matchAll(/```gp\n([\s\S]*?)```/g)].map(match =>
    match[1].trim(),
  );

  if (blocks.length !== 1 || blocks[0] !== readProgram()) {
    console.error(`Failed! The README must show ${path.relative(__dirname, PROGRAM_FILE)} in one gp block.`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function executeGpTests() {
  const testCases = [
    ...testCasesDomicule.filter(({ rowCount }) => rowCount <= MAX_SQUARE_SIDE),
    ...testCasesDomiculeRectangles,
  ].map(({ rowCount, colCount, expectedResult }) => ({
    rows: Math.max(rowCount, colCount),
    cols: Math.min(rowCount, colCount),
    expectedResult,
  }));
  const script = [
    'default(parisizemax, 10^9);',
    `read("${PROGRAM_FILE.replace(/\\/g, '/')}");`,
    ...testCases.map(({ rows, cols }) => `print(T(${rows}, ${cols}));`),
    'print(a(2));',
  ].join('\n');
  const { status, stdout, stderr, error } = spawnSync(GP, ['-q', '-f'], {
    input: script,
    encoding: 'utf-8',
    timeout: GP_TIMEOUT,
  });

  if (error || status !== 0) {
    console.error(
      `Failed to run PARI/GP (${GP}): ${error ? error.message : stderr.trim()}. Install it (apt install pari-gp, brew install pari) or set GP_PATH.`,
    );

    return false;
  }

  const results = stdout.trim().split('\n');
  const expected = [...testCases.map(({ expectedResult }) => expectedResult), '280'];

  return expected.every((expectedResult, index) => {
    const label = index < testCases.length ? `T(${testCases[index].rows}, ${testCases[index].cols})` : 'a(2)';

    process.stdout.write(`Executing PARI/GP test ${index + 1} of ${expected.length} for ${label}... `);

    if (results[index] !== expectedResult) {
      console.error(`Failed! Expected: ${expectedResult}, Actual: ${results[index]}`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function __main__() {
  const readmeTestPassed = executeReadmeTest();
  const gpTestsPassed = executeGpTests();

  if (readmeTestPassed && gpTestsPassed) {
    console.log('All PARI/GP tests completed successfully.');
    process.exit(0);
  }

  console.error('Some PARI/GP tests failed.');
  process.exit(1);
}

__main__();
