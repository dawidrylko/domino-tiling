const fs = require('fs');
const path = require('path');
const { filesInt, testCasesInt, filesBigInt, testCasesBigInt } = require('../test-data');

const SITE_URL = 'https://dawidrylko.github.io/domino-tiling/';
const REPOSITORY_TREE_URL = 'https://github.com/dawidrylko/domino-tiling/tree/master';
const ROOT_DIRECTORY = path.join(__dirname, '..');
const OUTPUT_DIRECTORY = path.join(ROOT_DIRECTORY, 'dist', 'site');
const BENCHMARK_ROOT = 'benchmark';
const RESULT_FILE = /_(\d+)x(\d+)\.txt$/;
const BENCHMARK_RUNS = listBenchmarkRuns();
const BENCHMARK_RUN = findLatestCompleteRun();
const BENCHMARK_DIRECTORY = path.join(ROOT_DIRECTORY, BENCHMARK_ROOT, BENCHMARK_RUN);
const BROWSER_SCRIPTS = ['renderer/svg.js'];
const WORKER_SCRIPTS = ['renderer/unrank.js', 'renderer/cftp.js', 'site/worker.js'];
const ASSETS = {
  'domino.svg': '.github/assets/domino.svg',
  'apple-touch-icon.png': '.github/assets/apple-touch-icon.png',
  'og-image.png': '.github/assets/og-image.png',
  'domino-tiling-math.woff2': 'site/fonts/domino-tiling-math.woff2',
  'OFL.txt': 'site/fonts/OFL.txt',
};
const AUTHOR = {
  '@type': 'Person',
  name: 'Dawid Ryłko',
  url: 'https://dawidrylko.com',
};
const GALLERY_BOARDS = [
  { rowCount: 2, colCount: 2 },
  { rowCount: 4, colCount: 4 },
  { rowCount: 6, colCount: 6 },
  { rowCount: 8, colCount: 8 },
  { rowCount: 10, colCount: 10 },
  { rowCount: 12, colCount: 12 },
  { rowCount: 14, colCount: 14, memory: '60 MB' },
  { rowCount: 16, colCount: 16, memory: '250 MB' },
  { rowCount: 18, colCount: 18, memory: '1.1 GB', confirm: true },
  { rowCount: 20, colCount: 20, mode: 'random' },
];
const DEFAULT_BOARD = '4x4';

function listBenchmarkRuns() {
  return fs
    .readdirSync(path.join(ROOT_DIRECTORY, BENCHMARK_ROOT))
    .filter(name => /^\d{4}-\d{2}$/.test(name))
    .sort()
    .reverse();
}

function resultFileName(fileName, { rowCount, colCount }) {
  return `${fileName}_${rowCount}x${colCount}.txt`;
}

function isCompleteRun(run) {
  const lastInt = testCasesInt[testCasesInt.length - 1];
  const lastBigInt = testCasesBigInt[testCasesBigInt.length - 1];
  const requiredFiles = [
    'environment.json',
    ...filesInt.map(fileName => resultFileName(fileName, lastInt)),
    ...filesBigInt.map(fileName => resultFileName(fileName, lastBigInt)),
  ];

  return requiredFiles.every(file => fs.existsSync(path.join(ROOT_DIRECTORY, BENCHMARK_ROOT, run, file)));
}

function findLatestCompleteRun() {
  const run = BENCHMARK_RUNS.find(isCompleteRun);

  if (!run) {
    throw new Error(
      `No complete benchmark/YYYY-MM directory: one needs environment.json and every solver's largest board.`,
    );
  }

  return run;
}

function describeRun(run) {
  const directory = path.join(ROOT_DIRECTORY, BENCHMARK_ROOT, run);
  const environment = readEnvironment(directory) || {};
  const runs = fs
    .readdirSync(directory)
    .filter(fileName => RESULT_FILE.test(fileName))
    .map(fileName => readAverageTime(directory, fileName).runs);
  const most = Math.max(...runs);
  const month = new Date(`${run}-01T00:00:00Z`).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return [
    environment.date || month,
    `${runs.every(count => count === most) ? '' : 'up to '}${most.toLocaleString('en-US')} runs per board`,
    environment.node && `Node.js ${environment.node}`,
    environment.cpu || 'machine not recorded',
  ]
    .filter(Boolean)
    .join(', ');
}

function buildOlderBenchmarks() {
  const links = BENCHMARK_RUNS.filter(run => run !== BENCHMARK_RUN).map(
    run => `<a href="${REPOSITORY_TREE_URL}/${BENCHMARK_ROOT}/${run}">${BENCHMARK_ROOT}/${run}</a> (${describeRun(run)})`,
  );

  if (!links.length) {
    return '';
  }

  const list = links.length === 1 ? links[0] : `${links.slice(0, -1).join(', ')} and ${links[links.length - 1]}`;

  return `Other measurements are kept in ${list}.`;
}

function countTilings(board) {
  const testCase = testCasesBigInt.find(
    t => t.rowCount === board.rowCount && t.colCount === board.colCount,
  );

  if (!testCase) {
    throw new Error(`No expected result in test-data for ${board.rowCount}x${board.colCount}.`);
  }

  return testCase.expectedResult;
}

function readAverageTime(directory, fileName) {
  const file = path.join(directory, fileName);

  if (!fs.existsSync(file)) {
    return null;
  }

  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  const match = lines[0].match(/Average Execution Time: ([\d.]+) ms/);

  return {
    average: match ? Number(match[1]) : null,
    runs: lines.filter(line => /^\d+\. Execution Time/.test(line)).length,
  };
}

function buildBenchmark() {
  const tilingsBySize = new Map(
    testCasesBigInt.map(t => [`${t.rowCount}x${t.colCount}`, t.expectedResult]),
  );
  const sizes = fs
    .readdirSync(BENCHMARK_DIRECTORY)
    .map(fileName => fileName.match(RESULT_FILE))
    .filter(Boolean)
    .map(([, rowCount, colCount]) => ({
      rowCount: Number(rowCount),
      colCount: Number(colCount),
    }))
    .filter(
      (size, index, all) =>
        all.findIndex(
          s => s.rowCount === size.rowCount && s.colCount === size.colCount,
        ) === index,
    )
    .sort((a, b) => a.rowCount * a.colCount - b.rowCount * b.colCount);

  return sizes.map(({ rowCount, colCount }) => {
    const suffix = `_${rowCount}x${colCount}.txt`;
    return {
      rowCount,
      colCount,
      tilings: tilingsBySize.get(`${rowCount}x${colCount}`) ?? null,
      number: readAverageTime(BENCHMARK_DIRECTORY, `dominoTilingSolver.js${suffix}`),
      bigint: readAverageTime(BENCHMARK_DIRECTORY, `dominoTilingSolver-BigInt.js${suffix}`),
      formula: readAverageTime(BENCHMARK_DIRECTORY, `dominoTilingSolver-Formula.js${suffix}`),
    };
  });
}

function readEnvironment(directory) {
  const file = path.join(directory, 'environment.json');

  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : null;
}

function buildJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}#website`,
        url: SITE_URL,
        name: 'Domino Tiling',
        inLanguage: 'en',
        author: AUTHOR,
      },
      {
        '@type': 'SoftwareSourceCode',
        name: 'Domino Tiling',
        description:
          'JavaScript solvers that count domino tilings of 2n×2n boards (OEIS A004003) with bitmask dynamic programming and an exact closed-form formula, plus a renderer for every tiling.',
        codeRepository: 'https://github.com/dawidrylko/domino-tiling',
        programmingLanguage: 'JavaScript',
        runtimePlatform: 'Node.js',
        license: 'https://opensource.org/licenses/MIT',
        keywords: 'domino tiling, dimer coverings, OEIS A004003, combinatorics',
        author: AUTHOR,
        isBasedOn: 'https://oeis.org/A004003',
        subjectOf: {
          '@type': 'BlogPosting',
          url: 'https://dawidrylko.com/domino-tiling/',
          inLanguage: 'pl',
          author: AUTHOR,
        },
      },
    ],
  };
}

function buildSitemap() {
  const today = new Date().toISOString().slice(0, 10);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url><loc>${SITE_URL}</loc><lastmod>${today}</lastmod></url>`,
    '</urlset>',
    '',
  ].join('\n');
}

function __main__() {
  fs.rmSync(OUTPUT_DIRECTORY, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

  const data = {
    defaultBoard: DEFAULT_BOARD,
    boards: GALLERY_BOARDS.map(board => ({
      id: `${board.rowCount}x${board.colCount}`,
      mode: 'pages',
      ...board,
      total: countTilings(board),
    })),
    benchmark: buildBenchmark(),
    environment: readEnvironment(BENCHMARK_DIRECTORY),
  };
  const readScripts = files => files.map(file => fs.readFileSync(path.join(ROOT_DIRECTORY, file), 'utf-8')).join('\n');
  const scripts = readScripts(BROWSER_SCRIPTS);
  const workerSource = readScripts(WORKER_SCRIPTS);
  const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf-8');
  const html = template
    .replace('__SCRIPTS__', () => scripts)
    .replace('__DATA__', () => JSON.stringify(data))
    .replace('__WORKER__', () => JSON.stringify(workerSource).replace(/</g, '\\u003c'))
    .replace('__JSON_LD__', () => JSON.stringify(buildJsonLd()).replace(/</g, '\\u003c'))
    .replace(/__SITE_URL__/g, SITE_URL)
    .replace(/__BENCHMARK_DIRECTORY__/g, `${BENCHMARK_ROOT}/${BENCHMARK_RUN}`)
    .replace('__OLDER_BENCHMARKS__', () => buildOlderBenchmarks());

  Object.entries(ASSETS).forEach(([name, source]) =>
    fs.copyFileSync(path.join(ROOT_DIRECTORY, source), path.join(OUTPUT_DIRECTORY, name)),
  );
  fs.writeFileSync(path.join(OUTPUT_DIRECTORY, 'index.html'), html);
  fs.writeFileSync(path.join(OUTPUT_DIRECTORY, 'sitemap.xml'), buildSitemap());
  console.log(`Site saved: ${path.relative(ROOT_DIRECTORY, path.join(OUTPUT_DIRECTORY, 'index.html'))}`);
}

__main__();
