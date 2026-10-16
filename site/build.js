const fs = require('fs');
const os = require('os');
const path = require('path');
const { filesInt, testCasesInt, filesBigInt, testCasesBigInt, filesDomicule, testCasesDomicule } = require('../data');
const { DOMICULE_SWEEPS } = require('../src/renderer');
const domiculeModular = require('../src/solvers/domiculeTilingSolver-Modular.js');
const { renderNote, listNotes, NOTES_DIRECTORY } = require('./notes');
const { CHROME_CSS, renderHeader, renderFooter } = require('./chrome');

const SITE_URL = 'https://dawidrylko.github.io/domino-tiling/';
const REPOSITORY_TREE_URL = 'https://github.com/dawidrylko/domino-tiling/tree/master';
const ROOT_DIRECTORY = path.join(__dirname, '..');
const OUTPUT_DIRECTORY = path.join(ROOT_DIRECTORY, 'dist', 'site');
const BENCHMARK_ROOT = 'benchmarks/results';
const RESULT_FILE = /_(\d+)x(\d+)\.txt$/;
const BENCHMARK_RUNS = listBenchmarkRuns();
const BENCHMARK_RUN = findLatestCompleteRun();
const BENCHMARK_DIRECTORY = path.join(ROOT_DIRECTORY, BENCHMARK_ROOT, BENCHMARK_RUN);
const BROWSER_SCRIPTS = ['src/renderer/svg.js'];
const WORKER_SCRIPTS = ['src/renderer/unrank.js', 'src/renderer/cftp.js', 'src/renderer/domicule.js', 'site/worker.js'];
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
const DOMICULE_BOARDS = [
  { rowCount: 2, colCount: 2 },
  { rowCount: 4, colCount: 4 },
  { rowCount: 6, colCount: 6 },
  { rowCount: 8, colCount: 8 },
  { rowCount: 10, colCount: 10 },
  { rowCount: 12, colCount: 12 },
  { rowCount: 14, colCount: 14, memory: '200 MB' },
  { rowCount: 16, colCount: 16, memory: '1 GB', confirm: true },
  { rowCount: 18, colCount: 18, mode: 'random' },
  { rowCount: 20, colCount: 20, mode: 'random' },
];
const DEFAULT_BOARD = '4x4';
const REPOSITORY_BLOB_URL = 'https://github.com/dawidrylko/domino-tiling/blob/master';
const NOTE_SUMMARIES = {
  method: 'How the tilings are counted, numbered and sampled, and how every number is checked.',
  a004003: 'Notebook: domino tilings by three methods, the resultant and the running time.',
  a239273: 'Notebook: domicule tilings up to 20 × 20, the modular solver and the Markov chain.',
};

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
    ...filesDomicule.map(fileName => resultFileName(fileName, { rowCount: 16, colCount: 16 })),
    ...filesDomicule.map(fileName => resultFileName(fileName, { rowCount: 20, colCount: 20 })),
  ];

  return requiredFiles.every(file => fs.existsSync(path.join(ROOT_DIRECTORY, BENCHMARK_ROOT, run, file)));
}

function findLatestCompleteRun() {
  const run = BENCHMARK_RUNS.find(isCompleteRun);

  if (!run) {
    throw new Error(
      `No complete benchmarks/results/YYYY-MM directory: one needs environment.json and every solver's largest board.`,
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
    throw new Error(`No expected result in data/ for ${board.rowCount}x${board.colCount}.`);
  }

  return testCase.expectedResult;
}

const domiculeCounts = new Map();

/**
 * Counts the domicule tilings of a board once per build: from data/ when the term is
 * known there, otherwise with the modular solver. The gallery and the notebooks share the result.
 * @param {Object} board The board.
 * @returns {Promise<string>} The number of tilings.
 */
function countDomiculeTilings({ rowCount, colCount }) {
  const key = `${rowCount}x${colCount}`;

  if (!domiculeCounts.has(key)) {
    const known = testCasesDomicule.find(t => t.rowCount === rowCount && t.colCount === colCount);

    domiculeCounts.set(
      key,
      known
        ? Promise.resolve(known.expectedResult)
        : domiculeModular
            .calculateTotalTilingCombinations({ rowCount, colCount, jobs: os.availableParallelism() })
            .then(String),
    );
  }

  return domiculeCounts.get(key);
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

function buildDomiculeBenchmark(totals) {
  const prefix = 'domiculeTilingSolver-';

  return fs
    .readdirSync(BENCHMARK_DIRECTORY)
    .filter(fileName => fileName.startsWith(prefix))
    .map(fileName => fileName.match(RESULT_FILE))
    .filter(Boolean)
    .map(([, rowCount, colCount]) => `${rowCount}x${colCount}`)
    .filter((size, index, all) => all.indexOf(size) === index)
    .map(size => size.split('x').map(Number))
    .sort(([a], [b]) => a - b)
    .map(([rowCount, colCount]) => {
      const suffix = `_${rowCount}x${colCount}.txt`;
      return {
        rowCount,
        colCount,
        tilings: totals.get(`${rowCount}x${colCount}`) ?? null,
        bigint: readAverageTime(BENCHMARK_DIRECTORY, `${prefix}BigInt.js${suffix}`),
        modular: readAverageTime(BENCHMARK_DIRECTORY, `${prefix}Modular.js${suffix}`),
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
          'Exact counts, numbering and sampling of domino tilings (OEIS A004003) and domicule tilings (OEIS A239264, A239273) of 2n×2n boards: a resultant form of the product formula, transfer-matrix solvers, a modular solver with the Chinese remainder theorem, PARI/GP programs and notebooks.',
        codeRepository: 'https://github.com/dawidrylko/domino-tiling',
        programmingLanguage: 'JavaScript',
        runtimePlatform: 'Node.js',
        license: 'https://opensource.org/licenses/MIT',
        keywords: 'domino tiling, dimer coverings, domicule tiling, perfect matchings, OEIS A004003, OEIS A239264, OEIS A239273, combinatorics',
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

function buildSitemap(notes) {
  const today = new Date().toISOString().slice(0, 10);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...['', ...notes.map(({ slug }) => `notes/${slug}.html`)].map(
      page => `  <url><loc>${SITE_URL}${page}</loc><lastmod>${today}</lastmod></url>`,
    ),
    '</urlset>',
    '',
  ].join('\n');
}

function resolveNoteLink(target, notes) {
  if (/^[a-z]+:/.test(target) || target.startsWith('#')) {
    return target;
  }

  const note = notes.find(({ file }) => file === target);

  if (note) {
    return `${note.slug}.html`;
  }

  const file = path.posix.normalize(path.posix.join('notes', target));

  return `${path.extname(file) ? REPOSITORY_BLOB_URL : REPOSITORY_TREE_URL}/${file}`;
}

async function buildNotes(notes, context) {
  const template = fs.readFileSync(path.join(__dirname, 'note-template.html'), 'utf-8');
  const directory = path.join(OUTPUT_DIRECTORY, 'notes');
  const today = new Date().toISOString().slice(0, 10);
  const rendered = [];

  fs.mkdirSync(directory, { recursive: true });

  for (const note of notes) {
    const markdown = fs.readFileSync(path.join(NOTES_DIRECTORY, note.file), 'utf-8');
    const { title, description, html, toc, cells } = await renderNote(markdown, {
      resolveLink: target => resolveNoteLink(target, notes),
      context,
    });
    rendered.push({ ...note, title });
    const tocHtml = toc.length > 2 ? `<nav class="toc" aria-label="Contents"><strong>Contents</strong><ol>${toc.map(item => `<li><a href="#${item.id}">${item.title}</a></li>`).join('')}</ol></nav>` : '';
    const page = template
      .replace(/__TITLE__/g, () => escapeHtml(title))
      .replace(/__DESCRIPTION__/g, () => escapeHtml(NOTE_SUMMARIES[note.slug] || description))
      .replace(/__URL__/g, `${SITE_URL}notes/${note.slug}.html`)
      .replace(/__SITE_URL__/g, SITE_URL)
      .replace('__CONTENT__', () => html.replace('</h1>', `</h1>\n${tocHtml}`))
      .replace('__CHROME_CSS__', () => CHROME_CSS)
      .replace('__SITE_HEADER__', () => renderHeader({ root: '../', current: note.slug, notes }))
      .replace('__SITE_FOOTER__', () =>
        renderFooter([
          `Built from <a href="${REPOSITORY_BLOB_URL}/notes/${note.file}">notes/${note.file}</a> on ${today}; every output on this page was computed during that build.`,
        ]),
      );

    fs.writeFileSync(path.join(directory, `${note.slug}.html`), page);
    console.log(`Note saved: ${path.relative(ROOT_DIRECTORY, path.join(directory, `${note.slug}.html`))} (${cells} cells)`);
  }

  return rendered;
}

async function __main__() {
  fs.rmSync(OUTPUT_DIRECTORY, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

  const domiculeBoards = [];

  for (const board of DOMICULE_BOARDS) {
    domiculeBoards.push({
      id: `${board.rowCount}x${board.colCount}-diagonal`,
      pieces: 'domicule',
      mode: 'pages',
      ...board,
      total: await countDomiculeTilings(board),
    });
  }

  const domiculeTotals = new Map([
    ...testCasesDomicule.map(t => [`${t.rowCount}x${t.colCount}`, t.expectedResult]),
    ...domiculeBoards.map(b => [`${b.rowCount}x${b.colCount}`, b.total]),
  ]);
  const data = {
    defaultBoard: DEFAULT_BOARD,
    boards: [
      ...GALLERY_BOARDS.map(board => ({
        id: `${board.rowCount}x${board.colCount}`,
        pieces: 'domino',
        mode: 'pages',
        ...board,
        total: countTilings(board),
      })),
      ...domiculeBoards,
    ],
    benchmark: buildBenchmark(),
    domiculeBenchmark: buildDomiculeBenchmark(domiculeTotals),
    environment: readEnvironment(BENCHMARK_DIRECTORY),
  };
  const notes = listNotes();
  await buildNotes(notes, {
    root: ROOT_DIRECTORY,
    benchmark: data.benchmark,
    benchmarkRun: `${BENCHMARK_ROOT}/${BENCHMARK_RUN}`,
    domiculeBenchmark: data.domiculeBenchmark,
    countDomicule: board => countDomiculeTilings(board).then(BigInt),
  });
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
    .replace('__OLDER_BENCHMARKS__', () => buildOlderBenchmarks())
    .replace(/__DOMICULE_SWEEPS__/g, DOMICULE_SWEEPS.toLocaleString('en-US'))
    .replace('__CHROME_CSS__', () => CHROME_CSS)
    .replace('__SITE_HEADER__', () => renderHeader({ root: '', current: 'home', notes }))
    .replace('__SITE_FOOTER__', () => renderFooter());

  Object.entries(ASSETS).forEach(([name, source]) =>
    fs.copyFileSync(path.join(ROOT_DIRECTORY, source), path.join(OUTPUT_DIRECTORY, name)),
  );
  fs.writeFileSync(path.join(OUTPUT_DIRECTORY, 'index.html'), html);
  fs.writeFileSync(path.join(OUTPUT_DIRECTORY, 'sitemap.xml'), buildSitemap(notes));
  console.log(`Site saved: ${path.relative(ROOT_DIRECTORY, path.join(OUTPUT_DIRECTORY, 'index.html'))}`);
}

__main__().catch(error => {
  console.error(error);
  process.exit(1);
});
