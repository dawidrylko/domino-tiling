const { spawnSync } = require('child_process');
const path = require('path');
const {
  enumerateTilings,
  renderSheet,
  renderAscii,
  canUnrank,
  createUnranker,
  unrankTiling,
  sampleRandomTiling,
  canUnrankDomicule,
  createDomiculeUnranker,
  unrankDomiculeTiling,
  sampleDomiculeTiling,
} = require('../src/renderer');
const crypto = require('crypto');
const { createRandom } = require('../src/renderer/cftp');
const { testCasesBigInt, testCasesDomicule, testCasesDomiculeRectangles } = require('../data');

const MAX_CELLS = 36;
const UNRANK_SAMPLE_SIZE = 1000;
const RANDOM_SEED = 2024;
const SAMPLES_PER_TILING = 200;
const CLI_TIMEOUT = 30000;
const randomTestCases = [
  { rowCount: 2, colCount: 2, expectedResult: 2, criticalValue: 10.83 },
  { rowCount: 4, colCount: 4, expectedResult: 36, criticalValue: 66.62 },
];
const randomValidityTestCases = [
  { rowCount: 20, colCount: 20 },
  { rowCount: 30, colCount: 30 },
];
const DOMINO_OUTPUT_HASHES = {
  svg: '03747e1b113b2eead3aaba260a1da9773169027c21346ad1dcdf77d707a83f50',
  ascii: '3bbf6c1dc91ec1980e1b71fa58ff4796d0f87123a57ca282b46d71dd9677afc7',
};
const DOMICULE_FULL_CHECK_LIMIT = BigInt(5000);
const DOMICULE_REACH_SWEEPS = 20;
const DOMICULE_REACH_SAMPLES_PER_TILING = 30;
const domiculeReachTestCases = [
  { rowCount: 2, colCount: 3, expectedResult: 5 },
  { rowCount: 3, colCount: 4, expectedResult: 43 },
  { rowCount: 4, colCount: 5, expectedResult: 1563 },
  { rowCount: 5, colCount: 4, expectedResult: 1563 },
];
const domiculeShapeTestCases = [
  { rowCount: 2, colCount: 2, piece: { row: 0, col: 0, dr: 1, dc: 1 }, svg: 'class="d"', rotation: 'rotate(45 ', ascii: '\\ .\n. \\' },
  { rowCount: 2, colCount: 2, piece: { row: 0, col: 1, dr: 1, dc: -1 }, svg: 'class="a"', rotation: 'rotate(-45 ', ascii: '. /\n/ .' },
];
const styleTestCases = [
  { rowCount: 2, colCount: 4, style: 'blocks', markers: ['class="blocks"', '<rect class="h"', '<rect class="d"', 'rotate(45 ', '.a{fill'] },
  { rowCount: 2, colCount: 4, style: 'dimer', markers: ['class="dimer"', '<path class="h"', '<path class="r"', '<circle class="d o"', '<circle class="a o"', '.r{fill:none'] },
  { rowCount: 2, colCount: 4, style: 'engraving', markers: ['class="engraving"', '<rect class="h"', '<rect class="cd"', '<rect class="ca"', '<path class="d k"', '<path class="a k"'] },
];
const engravingContainmentTestCases = [
  { rowCount: 2, colCount: 2, tiling: [{ row: 0, col: 0, dr: 1, dc: 1 }, { row: 0, col: 1, dr: 1, dc: -1 }] },
  { rowCount: 4, colCount: 4 },
  { rowCount: 6, colCount: 6 },
];
const firstSegment = (sheet, kinds) => {
  const match = sheet.match(new RegExp(`<path class="${kinds}" d="M([\\d.]+) ([\\d.]+)L([\\d.]+) ([\\d.]+)`));

  return match ? { dx: Number(match[3]) - Number(match[1]), dy: Number(match[4]) - Number(match[2]) } : null;
};
const STYLE_GEOMETRY_CHECKS = {
  blocks: {
    'diagonal palette': sheet => sheet.includes('.d{fill:#ab3415}') && sheet.includes('.a{fill:#f09c17}'),
    'straight before diagonal': sheet => sheet.lastIndexOf('class="h"') < sheet.indexOf('class="d"'),
  },
  dimer: {
    'edges between cell centres': sheet => ['M20 20L36 20', 'M20 36L36 36', 'M52 20L68 36', 'M68 20L52 36'].every(edge => sheet.includes(`d="${edge}"`)),
    'two dots per piece': sheet => ['h', 'd', 'a'].every(kind => (sheet.match(new RegExp(`class="${kind} o"`, 'g')) || []).length === (kind === 'h' ? 4 : 2)),
    'ring in the board colour': sheet => sheet.includes('.r{fill:none;stroke:#f3f4f6'),
  },
  engraving: {
    'hatch follows the piece': sheet => {
      const down = firstSegment(sheet, 'd k');
      const up = firstSegment(sheet, 'a k');
      return Boolean(down && up) && down.dx > 0 && down.dy > 0 && up.dx < 0 && up.dy > 0;
    },
  },
};
const STYLE_TEST_TILING = [
  { row: 0, col: 0, dr: 0, dc: 1 },
  { row: 1, col: 0, dr: 0, dc: 1 },
  { row: 0, col: 2, dr: 1, dc: 1 },
  { row: 0, col: 3, dr: 1, dc: -1 },
];
const DOMICULE_TEST_SWEEPS = 200;
const domiculeRandomTestCases = [
  { rowCount: 2, colCount: 2, expectedResult: 3, criticalValue: 13.82 },
  { rowCount: 4, colCount: 4, expectedResult: 280, criticalValue: 357.8 },
];
const domiculeRandomValidityTestCases = [
  { rowCount: 1, colCount: 2 },
  { rowCount: 4, colCount: 5 },
  { rowCount: 5, colCount: 4 },
  { rowCount: 20, colCount: 20 },
  { rowCount: 30, colCount: 30 },
];
const cliTestCases = [
  { rowCount: 3, colCount: 3, args: ['--random', '--ascii'], status: 0, output: 'Nothing to render.' },
  { rowCount: 3, colCount: 3, args: ['-i', '1', '--ascii'], status: 0, output: 'Nothing to render.' },
  { rowCount: 11, colCount: 15, args: ['--ascii'], status: 0, output: 'Nothing to render.' },
  { rowCount: 3, colCount: 3, args: ['-o', 'abc', '--ascii'], status: 1, output: '-o expects' },
  { rowCount: 2, colCount: 2, args: ['-l', '0', '--ascii'], status: 1, output: 'Usage' },
  { rowCount: 8, colCount: 8, args: ['--all', '--ascii'], status: 1, output: '--all is only allowed' },
  { rowCount: 2, colCount: 2, args: ['--all', '--ascii'], status: 0, output: 'Rendered tilings 1-2.' },
  { rowCount: 2, colCount: 100, args: ['-l', '1', '--ascii'], status: 0, output: '573147844013817084101 tilings.' },
  { rowCount: 18, colCount: 18, args: ['-l', '1', '--ascii'], status: 0, output: 'tilings not counted (board too large).' },
  { rowCount: 0, colCount: 0, args: ['--ascii'], status: 0, output: 'Board 0x0: 1 tiling.' },
  { rowCount: 2, colCount: 2, args: ['-i', '1', '--random'], status: 1, output: 'cannot be combined' },
  { rowCount: 2, colCount: 2, args: ['--all', '-l', '1'], status: 1, output: 'cannot be combined' },
  { rowCount: 30, colCount: 2, args: ['-i', '1', '--ascii'], status: 0, output: 'Rendered tilings 1-1.' },
  { rowCount: 2, colCount: 30, args: ['-i', '1', '--ascii'], status: 1, output: 'use -r 30 -c 2 instead' },
  { rowCount: 2, colCount: 20000, args: ['-l', '1', '--ascii'], status: 0, output: 'Rendered tilings 1-1.' },
  { rowCount: 2, colCount: 2, args: ['--all', '--ascii', '--domicule'], status: 0, output: 'Rendered tilings 1-3.' },
  { rowCount: 4, colCount: 4, args: ['-i', '280', '--ascii', '--domicule'], status: 0, output: 'Board 4x4: 280 tilings.' },
  { rowCount: 3, colCount: 3, args: ['--ascii', '--domicule'], status: 0, output: 'Nothing to render.' },
  { rowCount: 20, colCount: 20, args: ['--ascii', '--domicule'], status: 1, output: 'use --random instead' },
  { rowCount: 2, colCount: 20, args: ['-i', '1', '--ascii', '--domicule'], status: 1, output: 'use -r 20 -c 2 instead' },
  { rowCount: 20, colCount: 20, args: ['--random', '--ascii', '--domicule'], status: 0, output: 'approximately uniformly' },
  {
    rowCount: 2,
    colCount: 100000,
    args: ['-l', '1', '--ascii'],
    env: { NODE_OPTIONS: '--max-old-space-size=128' },
    status: 0,
    output: 'tilings not counted (board too large).',
  },
];

function serializeTiling(tiling) {
  return tiling
    .map(({ row, col, horizontal }) => `${row},${col},${horizontal ? 'h' : 'v'}`)
    .join(';');
}

function serializeDomiculeTiling(tiling) {
  return tiling.map(({ row, col, dr, dc }) => `${row},${col},${dr},${dc}`).join(';');
}

function findDomiculeCoverageError(tiling, { rowCount, colCount }) {
  const covered = new Uint8Array(rowCount * colCount);

  for (const { row, col, dr, dc } of tiling) {
    if (![0, 1].includes(dr) || ![-1, 0, 1].includes(dc) || (dr === 0 && dc !== 1)) {
      return `invalid domicule direction ${dr},${dc} at ${row},${col}`;
    }

    for (const [r, c] of [
      [row, col],
      [row + dr, col + dc],
    ]) {
      if (r >= rowCount || c < 0 || c >= colCount) {
        return `domicule outside the board at ${r},${c}`;
      }

      if (covered[r * colCount + c]++) {
        return `overlapping domicules at ${r},${c}`;
      }
    }
  }

  return covered.every(Boolean) ? null : 'board not fully covered';
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

function runDomiculeUnrankTest(testCase) {
  const unranker = createDomiculeUnranker(testCase);

  if (unranker.total !== BigInt(testCase.expectedResult)) {
    console.error(`Failed! Expected: ${testCase.expectedResult}, Actual: ${unranker.total}`);

    return false;
  }

  if (unranker.total === BigInt(0)) {
    console.log('Passed!');

    return true;
  }

  const ranks =
    unranker.total <= DOMICULE_FULL_CHECK_LIMIT
      ? Array.from({ length: Number(unranker.total) }, (_, i) => BigInt(i))
      : Array.from({ length: UNRANK_SAMPLE_SIZE }, (_, i) => (unranker.total * BigInt(i)) / BigInt(UNRANK_SAMPLE_SIZE));
  const seen = new Set();

  for (const rank of [...ranks, unranker.total - BigInt(1)]) {
    const tiling = unrankDomiculeTiling(unranker, rank);
    const error = findDomiculeCoverageError(tiling, testCase);

    if (error) {
      console.error(`Failed! Invalid tiling #${rank + BigInt(1)}: ${error}`);

      return false;
    }

    seen.add(serializeDomiculeTiling(tiling));
  }

  if (seen.size !== new Set([...ranks, unranker.total - BigInt(1)]).size) {
    console.error(`Failed! ${seen.size} distinct tilings for ${new Set(ranks).size} ranks.`);

    return false;
  }

  const svg = renderSheet([unrankDomiculeTiling(unranker, unranker.total - BigInt(1))], 1, testCase);
  const ascii = renderAscii(unrankDomiculeTiling(unranker, unranker.total - BigInt(1)), testCase);

  if (!svg.startsWith('<svg') || (testCase.rowCount * testCase.colCount && ascii.includes('.'))) {
    console.error('Failed! Rendering produced invalid output.');

    return false;
  }

  console.log('Passed!');

  return true;
}

function runDomiculeUniformityTest(testCase) {
  const { expectedResult, criticalValue } = testCase;
  const random = createRandom(RANDOM_SEED);
  const sampleCount = expectedResult * SAMPLES_PER_TILING;
  const frequencies = new Map();

  for (let i = 0; i < sampleCount; i++) {
    const tiling = sampleDomiculeTiling(testCase, random, DOMICULE_TEST_SWEEPS);
    const error = findDomiculeCoverageError(tiling, testCase);

    if (error) {
      console.error(`Failed! Invalid random tiling: ${error}`);

      return false;
    }

    const key = serializeDomiculeTiling(tiling);
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

function runDomiculeValidityTest(testCase) {
  const error = findDomiculeCoverageError(sampleDomiculeTiling(testCase, createRandom(RANDOM_SEED)), testCase);

  if (error) {
    console.error(`Failed! Invalid random tiling: ${error}`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runDominoOutputTest() {
  const options = { rowCount: 4, colCount: 4 };
  const tilings = [...enumerateTilings(options)].slice(0, 12);
  const hash = text => crypto.createHash('sha256').update(text).digest('hex');
  const svg = hash(renderSheet(tilings, 1, options));
  const ascii = hash(tilings.map(tiling => renderAscii(tiling, options)).join('\n'));

  if (svg !== DOMINO_OUTPUT_HASHES.svg || ascii !== DOMINO_OUTPUT_HASHES.ascii) {
    console.error(`Failed! Domino output changed: svg ${svg}, ascii ${ascii}`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runDomiculeShapeTest({ piece, svg, rotation, ascii, ...options }) {
  const sheet = renderSheet([[piece]], 1, options);
  const text = renderAscii([piece], options);

  if (!sheet.includes(svg) || !sheet.includes(rotation) || !sheet.includes('.d{fill') || text !== ascii) {
    console.error(`Failed! Diagonal ${piece.dc > 0 ? 'down-right' : 'down-left'} renders as ${JSON.stringify(text)}.`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runStyleTest({ style, markers, ...options }) {
  const sheet = renderSheet([STYLE_TEST_TILING], 1, { ...options, style });
  const missing = [
    ...markers.filter(marker => !sheet.includes(marker)),
    ...Object.entries(STYLE_GEOMETRY_CHECKS[style]).filter(([, check]) => !check(sheet)).map(([name]) => name),
  ];
  const others = renderSheet.STYLES.filter(other => other !== style);

  if (missing.length || others.some(other => sheet.includes(`class="${other}"`))) {
    console.error(`Failed! The ${style} sheet lacks ${missing.join(', ') || 'nothing'} or names another style.`);

    return false;
  }

  if (style === renderSheet.STYLES[0] && renderSheet([STYLE_TEST_TILING], 1, options) !== sheet) {
    console.error(`Failed! A sheet without a style is not drawn as ${style}.`);

    return false;
  }

  try {
    renderSheet([STYLE_TEST_TILING], 1, { ...options, style: `${style}-unknown` });
    console.error('Failed! An unknown style was accepted.');

    return false;
  } catch (error) {
    if (!error.message.startsWith('Unknown style')) {
      throw error;
    }
  }

  console.log('Passed!');

  return true;
}

function readStrokeWidth(sheet, selector) {
  const rule = sheet.match(new RegExp(`${selector.replace(/[.,]/g, '\\$&')}\\{[^}]*stroke-width:([\\d.]+)`));

  return rule ? Number(rule[1]) : NaN;
}

function runEngravingContainmentTest({ tiling: fixed, ...options }) {
  const unranker = fixed ? null : createDomiculeUnranker(options);
  const tiling = fixed || unrankDomiculeTiling(unranker, unranker.total - BigInt(1));
  const sheet = renderSheet([tiling], 1, { ...options, style: 'engraving' });
  const outline = readStrokeWidth(sheet, '.cd,.ca');
  const widths = { hatch: readStrokeWidth(sheet, '.d,.a'), axis: readStrokeWidth(sheet, '.k') };
  const cells = [...sheet.matchAll(/<rect class="c([da])" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/g)].map(([, kind, x, y, size]) => {
    const left = Number(x) + outline / 2;
    const top = Number(y) + outline / 2;
    const inner = Number(size) - outline;
    return { kind, left, top, right: left + inner, bottom: top + inner };
  });
  const roundCaps = /\.d,\.a\{[^}]*stroke-linecap:round/.test(sheet);
  const escaped = [];
  const kinds = new Set(cells.map(cell => cell.kind));

  if (![outline, widths.hatch, widths.axis].every(Number.isFinite) || (fixed && kinds.size !== 2)) {
    console.error(`Failed! Engraving widths ${JSON.stringify({ outline, ...widths })} or cell kinds ${[...kinds]} are missing.`);

    return false;
  }

  for (const [, kinds, d] of sheet.matchAll(/<path class="([da](?: k)?)" d="([^"]+)"/g)) {
    const half = (kinds.endsWith('k') ? widths.axis : widths.hatch) / 2;
    const cap = roundCaps ? half : 0;
    const spread = half / Math.SQRT2;

    for (const [, x1, y1, x2, y2] of d.matchAll(/M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)/g)) {
      const points = [[x1, y1], [x2, y2]].map(point => point.map(Number));
      const [[ax, ay], [bx, by]] = points;
      const length = Math.hypot(bx - ax, by - ay);
      const ux = (bx - ax) / length;
      const uy = (by - ay) / length;
      const ends = [[ax - ux * cap, ay - uy * cap], [bx + ux * cap, by + uy * cap]];
      const corners = ends.flatMap(([px, py]) => [[px + uy * half, py - ux * half], [px - uy * half, py + ux * half]]);
      const inside = cells.some(cell => corners.every(([px, py]) => px >= cell.left - 1e-6 && px <= cell.right + 1e-6 && py >= cell.top - 1e-6 && py <= cell.bottom + 1e-6));

      if (!inside) {
        escaped.push(`${kinds} M${x1} ${y1}L${x2} ${y2}`);
      }
    }
  }

  if (!cells.length || escaped.length) {
    console.error(`Failed! ${escaped.length} engraving strokes leave their cell, e.g. ${escaped[0]}.`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runDomiculeReachTest(testCase) {
  const random = createRandom(RANDOM_SEED);
  const seen = new Set();
  const samples = testCase.expectedResult * DOMICULE_REACH_SAMPLES_PER_TILING;

  for (let i = 0; i < samples && seen.size < testCase.expectedResult; i++) {
    seen.add(serializeDomiculeTiling(sampleDomiculeTiling(testCase, random, DOMICULE_REACH_SWEEPS)));
  }

  if (seen.size !== testCase.expectedResult) {
    console.error(`Failed! The chain reached ${seen.size} of ${testCase.expectedResult} tilings.`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runCliTest({ rowCount, colCount, args, env = {}, status, output }) {
  const result = spawnSync(
    process.execPath,
    ['src/dominoTilingRenderer.js', '-r', String(rowCount), '-c', String(colCount), ...args],
    { cwd: path.join(__dirname, '..'), encoding: 'utf-8', timeout: CLI_TIMEOUT, env: { ...process.env, ...env } },
  );

  if (result.status !== status || !`${result.stdout}${result.stderr}`.includes(output)) {
    console.error(`Failed! Exit code ${result.status}: ${(result.stderr || result.stdout).trim()}`);

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

  const unrankTestCases = testCasesBigInt.filter(
    ({ rowCount, colCount }) =>
      rowCount * colCount > MAX_CELLS && canUnrank({ rowCount, colCount }),
  );

  const domiculeTestCases = [...testCasesDomicule, ...testCasesDomiculeRectangles].filter(canUnrankDomicule);
  const total = [
    testCases,
    unrankTestCases,
    randomTestCases,
    randomValidityTestCases,
    domiculeTestCases,
    domiculeRandomTestCases,
    domiculeRandomValidityTestCases,
    domiculeReachTestCases,
    domiculeShapeTestCases,
    styleTestCases,
    engravingContainmentTestCases,
    cliTestCases,
  ].reduce(
    (sum, suite) => sum + suite.length,
    0,
  );

  console.log(`Starting renderer test execution with ${total} tests...`);

  const results = [
    runSuite('renderer', testCases, runTest),
    runSuite('unrank', unrankTestCases, runUnrankTest),
    runSuite('random uniformity', randomTestCases, runRandomUniformityTest),
    runSuite('random validity', randomValidityTestCases, runRandomValidityTest),
    runSuite('domicule unrank', domiculeTestCases, runDomiculeUnrankTest),
    runSuite('domicule random uniformity', domiculeRandomTestCases, runDomiculeUniformityTest),
    runSuite('domicule random validity', domiculeRandomValidityTestCases, runDomiculeValidityTest),
    runSuite('domicule chain reach', domiculeReachTestCases, runDomiculeReachTest),
    runSuite('domicule shape', domiculeShapeTestCases, runDomiculeShapeTest),
    runSuite('sheet style', styleTestCases, runStyleTest),
    runSuite('engraving containment', engravingContainmentTestCases, runEngravingContainmentTest),
    runSuite('domino output', [{ rowCount: 4, colCount: 4 }], runDominoOutputTest),
    runSuite('command line', cliTestCases, runCliTest),
  ];

  if (results.every(Boolean)) {
    console.log('All renderer tests completed successfully.');
    process.exit(0);
  } else {
    console.error('Some renderer tests failed.');
    process.exit(1);
  }
}

__main__();
