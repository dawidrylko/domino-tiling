const path = require('path');
const { parseArgs } = require('./helpers');
const {
  enumerateTilings,
  renderAscii,
  writeSvgSheets,
  takeRange,
  countTilings,
  MAX_CELLS_TO_COUNT,
} = require('./renderer');

const DEFAULT_LIMIT = 1000;
const OUTPUT_DIRECTORY = 'output';

function printAscii(tilings, options) {
  let rendered = 0;

  for (const tiling of tilings) {
    rendered++;
    console.log(`#${options.offset + rendered}`);
    console.log(`${renderAscii(tiling, options)}\n`);
  }

  return rendered;
}

function saveSvgSheets(tilings, options) {
  const { rowCount, colCount } = options;
  const directory = path.join(OUTPUT_DIRECTORY, `${rowCount}x${colCount}`);
  const sheets = writeSvgSheets(tilings, { ...options, directory });

  sheets.forEach(({ file }) => console.log(`File saved: ${file}`));

  return sheets.reduce((sum, { first, last }) => sum + last - first + 1, 0);
}

function __main__() {
  const argv = process.argv.slice(2);
  const argsSchema = {
    '-r': 'rowCount',
    '-c': 'colCount',
    '-l': 'limit',
    '-o': 'offset',
  };
  const options = parseArgs(argv, argsSchema);
  const { rowCount, colCount } = options;

  if (!rowCount || !colCount) {
    console.error(
      'Usage: node dominoTilingRenderer.js -r <rowCount> -c <colCount> [-l <limit>] [-o <offset>] [--all] [--ascii]',
    );
    process.exit(1);
  }

  const offset = options.offset || 0;
  const total = countTilings(options);

  if (argv.includes('--all') && total === null) {
    console.error(
      `--all is only allowed for boards up to ${MAX_CELLS_TO_COUNT} cells. Use -l and -o instead.`,
    );
    process.exit(1);
  }

  const limit = argv.includes('--all') ? Infinity : options.limit || DEFAULT_LIMIT;
  const lastNumber = Math.min(offset + limit, total === null ? Infinity : Number(total));

  console.log(
    `Board ${rowCount}x${colCount}: ${total ?? 'not counted (board too large)'} tilings.`,
  );

  const tilings = takeRange(enumerateTilings(options), offset, limit);
  const renderOptions = { rowCount, colCount, offset, lastNumber };
  const rendered = argv.includes('--ascii')
    ? printAscii(tilings, renderOptions)
    : saveSvgSheets(tilings, renderOptions);

  if (!rendered) {
    console.log('Nothing to render.');
  } else {
    console.log(`Rendered tilings ${offset + 1}-${offset + rendered}.`);
  }

  process.exit(0);
}

__main__();
