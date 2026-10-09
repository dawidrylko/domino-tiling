const fs = require('fs');
const path = require('path');
const { testCasesBigInt } = require('../test-data');
const { createUnranker } = require('../renderer');

const SITE_URL = 'https://dawidrylko.github.io/domino-tiling/';
const OUTPUT_DIRECTORY = path.join('dist', 'site');
const BENCHMARK_DIRECTORY = 'benchmark';
const BROWSER_SCRIPTS = ['renderer/svg.js'];
const WORKER_SCRIPTS = ['renderer/unrank.js', 'renderer/cftp.js', 'site/worker.js'];
const ASSETS = {
  'domino.svg': '.github/assets/domino.svg',
  'apple-touch-icon.png': '.github/assets/apple-touch-icon.png',
  'og-image.png': '.github/assets/og-image.png',
};
const AUTHOR = {
  '@type': 'Person',
  name: 'Dawid Ryłko',
  url: 'https://dawidrylko.com',
};
const GALLERY_BOARDS = [
  { rowCount: 1, colCount: 2 },
  { rowCount: 2, colCount: 2 },
  { rowCount: 2, colCount: 4 },
  { rowCount: 3, colCount: 4 },
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

function countTilings(board) {
  const testCase = testCasesBigInt.find(
    t => t.rowCount === board.rowCount && t.colCount === board.colCount,
  );

  return testCase ? testCase.expectedResult : String(createUnranker(board).total);
}

function readAverageTime(fileName) {
  const file = path.join(BENCHMARK_DIRECTORY, fileName);

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
    .map(fileName => fileName.match(/_(\d+)x(\d+)\.txt$/))
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
    const number = readAverageTime(`dominoTilingSolver.js${suffix}`);
    const bigint = readAverageTime(`dominoTilingSolver-BigInt.js${suffix}`);

    return {
      rowCount,
      colCount,
      tilings: tilingsBySize.get(`${rowCount}x${colCount}`) ?? null,
      number: number && number.average,
      bigint: bigint && bigint.average,
      runs: Math.max(number ? number.runs : 0, bigint ? bigint.runs : 0),
    };
  });
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
          'JavaScript solvers that count domino tilings of rectangular boards with bitmask dynamic programming, plus a renderer for every tiling.',
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
  };
  const readScripts = files => files.map(file => fs.readFileSync(file, 'utf-8')).join('\n');
  const scripts = readScripts(BROWSER_SCRIPTS);
  const workerSource = readScripts(WORKER_SCRIPTS);
  const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf-8');
  const html = template
    .replace('__SCRIPTS__', () => scripts)
    .replace('__DATA__', () => JSON.stringify(data))
    .replace('__WORKER__', () => JSON.stringify(workerSource).replace(/</g, '\\u003c'))
    .replace('__JSON_LD__', () => JSON.stringify(buildJsonLd()).replace(/</g, '\\u003c'))
    .replace(/__SITE_URL__/g, SITE_URL);

  Object.entries(ASSETS).forEach(([name, source]) =>
    fs.copyFileSync(source, path.join(OUTPUT_DIRECTORY, name)),
  );
  fs.writeFileSync(path.join(OUTPUT_DIRECTORY, 'index.html'), html);
  fs.writeFileSync(path.join(OUTPUT_DIRECTORY, 'sitemap.xml'), buildSitemap());
  console.log(`Site saved: ${path.join(OUTPUT_DIRECTORY, 'index.html')}`);
}

__main__();
