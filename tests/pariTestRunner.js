const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { testCasesBigInt, testCasesDomicule, testCasesDomiculeRectangles } = require('../data');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const README_FILE = path.join(ROOT_DIRECTORY, 'README.md');
const GP = process.env.GP_PATH || 'gp';
const GP_TIMEOUT = 300000;
const MAX_DOMICULE_SQUARE_SIDE = 12;
const PROGRAMS = [
  {
    file: 'pari/A004003.gp',
    testCases: testCasesBigInt
      .filter(({ rowCount, colCount }) => rowCount === colCount && rowCount % 2 === 0)
      .map(({ rowCount, expectedResult }) => ({ call: `a(${rowCount / 2})`, expectedResult })),
  },
  {
    file: 'pari/A239273.gp',
    testCases: [
      ...testCasesDomicule.filter(({ rowCount }) => rowCount <= MAX_DOMICULE_SQUARE_SIDE),
      ...testCasesDomiculeRectangles,
    ]
      .map(({ rowCount, colCount, expectedResult }) => ({
        call: `T(${Math.max(rowCount, colCount)}, ${Math.min(rowCount, colCount)})`,
        expectedResult,
      }))
      .concat({ call: 'a(2)', expectedResult: '280' }),
  },
];

function readProgram(file) {
  return fs
    .readFileSync(path.join(ROOT_DIRECTORY, file), 'utf-8')
    .split('\n')
    .filter(line => !line.startsWith('\\\\'))
    .join('\n')
    .trim();
}

function executeReadmeTests() {
  const blocks = [...fs.readFileSync(README_FILE, 'utf-8').matchAll(/```gp\n([\s\S]*?)```/g)].map(match =>
    match[1].trim(),
  );

  return PROGRAMS.every(({ file }, index) => {
    process.stdout.write(`Executing README test ${index + 1} of ${PROGRAMS.length} for ${file}... `);

    if (!blocks.includes(readProgram(file))) {
      console.error(`Failed! The README must show ${file} in a gp block.`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function executeGpTests({ file, testCases }) {
  const script = [
    'default(parisizemax, 10^9);',
    `read("${path.join(ROOT_DIRECTORY, file).replace(/\\/g, '/')}");`,
    ...testCases.map(({ call }) => `print(${call});`),
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

  return testCases.every(({ call, expectedResult }, index) => {
    process.stdout.write(`Executing PARI/GP test ${index + 1} of ${testCases.length} for ${file}: ${call}... `);

    if (results[index] !== expectedResult) {
      console.error(`Failed! Expected: ${expectedResult}, Actual: ${results[index]}`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function __main__() {
  const readmeTestsPassed = executeReadmeTests();
  const gpTestsPassed = PROGRAMS.map(executeGpTests).every(Boolean);

  if (readmeTestsPassed && gpTestsPassed) {
    console.log('All PARI/GP tests completed successfully.');
    process.exit(0);
  }

  console.error('Some PARI/GP tests failed.');
  process.exit(1);
}

__main__();
