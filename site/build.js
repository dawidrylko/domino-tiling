const fs = require('fs');
const path = require('path');
const {
  enumerateTilings,
  writeSvgSheets,
  takeRange,
  countTilings,
} = require('../renderer');
const { testCasesBigInt } = require('../test-data');

const OUTPUT_DIRECTORY = path.join('dist', 'site');
const BENCHMARK_DIRECTORY = 'benchmark';
const MAX_COMPLETE_GALLERY = 10000;
const PARTIAL_GALLERY_LIMIT = 1000;
const GALLERY_BOARDS = [
  { rowCount: 1, colCount: 2 },
  { rowCount: 2, colCount: 2 },
  { rowCount: 2, colCount: 4 },
  { rowCount: 3, colCount: 4 },
  { rowCount: 4, colCount: 4 },
  { rowCount: 6, colCount: 6 },
  { rowCount: 8, colCount: 8 },
];
const DEFAULT_BOARD = '4x4';

function buildGalleryBoard(board) {
  const id = `${board.rowCount}x${board.colCount}`;
  const total = countTilings(board);
  const lastNumber =
    Number(total) <= MAX_COMPLETE_GALLERY ? Number(total) : PARTIAL_GALLERY_LIMIT;
  const directory = path.join(OUTPUT_DIRECTORY, 'gallery', id);
  const tilings = takeRange(enumerateTilings(board), 0, lastNumber);
  const sheets = writeSvgSheets(tilings, {
    ...board,
    directory,
    offset: 0,
    lastNumber,
  }).map(sheet => ({
    ...sheet,
    file: path.relative(OUTPUT_DIRECTORY, sheet.file).split(path.sep).join('/'),
  }));

  console.log(`Gallery ${id}: ${sheets.length} sheets.`);

  return { id, ...board, total, rendered: String(lastNumber), sheets };
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

function __main__() {
  fs.rmSync(OUTPUT_DIRECTORY, { recursive: true, force: true });

  const data = {
    defaultBoard: DEFAULT_BOARD,
    boards: GALLERY_BOARDS.map(buildGalleryBoard),
    benchmark: buildBenchmark(),
  };
  const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf-8');
  const html = template.replace('__DATA__', () => JSON.stringify(data));

  fs.writeFileSync(path.join(OUTPUT_DIRECTORY, 'index.html'), html);
  console.log(`Site saved: ${path.join(OUTPUT_DIRECTORY, 'index.html')}`);
}

__main__();
