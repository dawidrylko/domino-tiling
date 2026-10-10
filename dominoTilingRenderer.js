const crypto = require('crypto');
const path = require('path');
const { parseArgs } = require('./helpers');
const {
  enumerateTilings,
  renderAscii,
  writeSvgSheets,
  takeRange,
  countTilings,
  canUnrank,
  createUnranker,
  unrankTiling,
  sampleRandomTiling,
} = require('./renderer');

const DEFAULT_LIMIT = 1000;
const MAX_TILINGS_FOR_ALL = BigInt(100000);
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
  const offset = readBigIntArg(argv, '-o') || BigInt(0);
  const random = argv.includes('--random');

  if (total === BigInt(0)) {
    return { offset: BigInt(0), count: BigInt(0) };
  }

  if (index !== null || random) {
    if (!unranker) {
      const swapped = { rowCount: options.colCount, colCount: options.rowCount };

      throw new Error(
        canUnrank(swapped)
          ? `-i needs a numbering table, which grows with the number of columns; use -r ${options.colCount} -c ${options.rowCount} instead.`
          : '-i needs a numbering table, which does not fit in memory for this board; use --random instead.',
      );
    }

    const rank = random ? randomBigInt(total) : index - BigInt(1);

    if (rank < BigInt(0) || rank >= total) {
      throw new Error(`-i must be between 1 and ${total}.`);
    }

    return { offset: rank, count: BigInt(1) };
  }

  if (argv.includes('--all') && (total === null || total > MAX_TILINGS_FOR_ALL)) {
    throw new Error(
      `--all is only allowed for boards with at most ${MAX_TILINGS_FOR_ALL.toLocaleString('en-US')} tilings. Use -l and -o instead.`,
    );
  }

  const limit = argv.includes('--all')
    ? total
    : BigInt(options.limit || DEFAULT_LIMIT);
  const available = total === null ? limit : total - offset;

  return { offset, count: available < limit ? available : limit };
}

function describeTotal(total) {
  if (total === null) {
    return 'tilings not counted (board too large)';
  }

  return `${total} ${total === BigInt(1) ? 'tiling' : 'tilings'}`;
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
    return;
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

    if (
      ![rowCount, colCount].every(size => Number.isInteger(size) && size >= 0) ||
      (options.limit !== undefined && !(options.limit > 0))
    ) {
      throw new Error(USAGE);
    }

    if (argv.includes('--random') && readBigIntArg(argv, '-i') !== null) {
      throw new Error('-i and --random cannot be combined.');
    }

    if (argv.includes('--all') && options.limit !== undefined) {
      throw new Error('--all and -l cannot be combined.');
    }

    const unranker = canUnrank(options) ? createUnranker(options) : null;

    if (!unranker && argv.includes('--random') && readBigIntArg(argv, '-i') === null) {
      renderRandomSample(argv, options);
      return;
    }

    const isOdd = (rowCount * colCount) % 2 !== 0;
    const counted = isOdd ? 0 : unranker ? unranker.total : countTilings(options);
    const total = counted === null ? null : BigInt(counted);

    console.log(`Board ${rowCount}x${colCount}: ${describeTotal(total)}.`);

    const { offset, count } = selectTilings(argv, options, unranker, total);

    if (count <= BigInt(0)) {
      console.log('Nothing to render.');
      return;
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
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

__main__();
