const crypto = require('crypto');
const path = require('path');
const { parseArgs } = require('./helpers');
const {
  enumerateTilings,
  renderAscii,
  writeSvgSheets,
  takeRange,
  countTilings,
  MAX_CELLS_TO_COUNT,
  canUnrank,
  createUnranker,
  unrankTiling,
  sampleRandomTiling,
} = require('./renderer');

const DEFAULT_LIMIT = 1000;
const OUTPUT_DIRECTORY = 'output';
const USAGE =
  'Usage: node dominoTilingRenderer.js -r <rowCount> -c <colCount> [-l <limit>] [-o <offset>] [-i <number>] [--random] [--all] [--ascii]';

function readBigIntArg(argv, flag) {
  const index = argv.indexOf(flag);

  if (index === -1 || argv[index + 1] === void 0) {
    return null;
  }

  if (!/^\d+$/.test(argv[index + 1])) {
    throw new Error(`${flag} expects a non-negative integer.`);
  }

  return BigInt(argv[index + 1]);
}

function randomBigInt(below) {
  const bytes = crypto.randomBytes(String(below).length);

  return BigInt(`0x${bytes.toString('hex')}`) % below;
}

function* unrankRange(unranker, offset, count) {
  for (let i = BigInt(0); i < count; i++) {
    yield unrankTiling(unranker, offset + i);
  }
}

function* sampleRandomTilings(options, count) {
  for (let i = 0; i < count; i++) {
    yield sampleRandomTiling(options);
  }
}

function selectTilings(argv, options, unranker, total) {
  const index = readBigIntArg(argv, '-i');
  const random = argv.includes('--random');

  if (index !== null || random) {
    if (!unranker) {
      throw new Error('-i is not supported for boards this large; use --random instead.');
    }

    const rank = random ? randomBigInt(total) : index - BigInt(1);

    if (rank < BigInt(0) || rank >= total) {
      throw new Error(`-i must be between 1 and ${total}.`);
    }

    return { offset: rank, count: BigInt(1) };
  }

  const offset = readBigIntArg(argv, '-o') || BigInt(0);

  if (argv.includes('--all') && total === null) {
    throw new Error(
      `--all is only allowed for boards up to ${MAX_CELLS_TO_COUNT} cells. Use -l and -o instead.`,
    );
  }

  const limit = argv.includes('--all')
    ? total
    : BigInt(options.limit || DEFAULT_LIMIT);
  const available = total === null ? limit : total - offset;

  return { offset, count: available < limit ? available : limit };
}

function printAscii(tilings, { offset, labels, ...options }) {
  let rendered = BigInt(0);

  for (const tiling of tilings) {
    console.log(labels ? labels[rendered] : `#${offset + rendered + BigInt(1)}`);
    rendered++;
    console.log(`${renderAscii(tiling, options)}\n`);
  }

  return rendered;
}

function saveSvgSheets(tilings, options) {
  const { rowCount, colCount } = options;
  const directory = path.join(OUTPUT_DIRECTORY, `${rowCount}x${colCount}`);
  const sheets = writeSvgSheets(tilings, { ...options, directory });

  sheets.forEach(({ file }) => console.log(`File saved: ${file}`));

  return sheets.reduce(
    (sum, { first, last }) => sum + last - first + BigInt(1),
    BigInt(0),
  );
}

function renderRandomSample(argv, options) {
  const { rowCount, colCount } = options;

  if ((rowCount * colCount) % 2 !== 0) {
    console.log(`Board ${rowCount}x${colCount}: 0 tilings.`);
    console.log('Nothing to render.');
    process.exit(0);
  }

  const count = options.limit || 1;
  const labels = Array.from({ length: count }, (_, i) => `random ${i + 1}`);
  const tilings = sampleRandomTilings(options, count);
  const renderOptions = {
    rowCount,
    colCount,
    offset: BigInt(0),
    lastNumber: null,
    labels,
    filePrefix: `random-${Date.now()}`,
  };

  console.log(
    `Board ${rowCount}x${colCount}: too large to number its tilings, sampling ${count} uniformly at random.`,
  );

  if (argv.includes('--ascii')) {
    printAscii(tilings, renderOptions);
  } else {
    saveSvgSheets(tilings, renderOptions);
  }

  process.exit(0);
}

function __main__() {
  try {
    const argv = process.argv.slice(2);
    const options = parseArgs(argv, {
      '-r': 'rowCount',
      '-c': 'colCount',
      '-l': 'limit',
    });
    const { rowCount, colCount } = options;

    if (!rowCount || !colCount) {
      throw new Error(USAGE);
    }

    const unranker = canUnrank(options) ? createUnranker(options) : null;

    if (!unranker && argv.includes('--random') && readBigIntArg(argv, '-i') === null) {
      renderRandomSample(argv, options);
      return;
    }

    const counted = unranker ? unranker.total : countTilings(options);
    const total = counted === null ? null : BigInt(counted);

    console.log(
      `Board ${rowCount}x${colCount}: ${total ?? 'not counted (board too large)'} tilings.`,
    );

    const { offset, count } = selectTilings(argv, options, unranker, total);

    if (count <= BigInt(0)) {
      console.log('Nothing to render.');
      process.exit(0);
    }

    const tilings = unranker
      ? unrankRange(unranker, offset, count)
      : takeRange(enumerateTilings(options), Number(offset), Number(count));
    const renderOptions = {
      rowCount,
      colCount,
      offset,
      lastNumber: total === null ? null : offset + count,
    };
    const rendered = argv.includes('--ascii')
      ? printAscii(tilings, renderOptions)
      : saveSvgSheets(tilings, renderOptions);

    console.log(`Rendered tilings ${offset + BigInt(1)}-${offset + rendered}.`);
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

__main__();
