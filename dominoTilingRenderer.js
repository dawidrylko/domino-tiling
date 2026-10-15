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
  canUnrankDomicule,
  createDomiculeUnranker,
  unrankDomiculeTiling,
  sampleDomiculeTiling,
} = require('./renderer');

const DEFAULT_LIMIT = 1000;
const MAX_TILINGS_FOR_ALL = BigInt(100000);
const OUTPUT_DIRECTORY = 'output';
const USAGE =
  'Usage: node dominoTilingRenderer.js -r <rowCount> -c <colCount> [-l <limit>] [-o <offset>] [-i <number>] [--random] [--all] [--ascii] [--domicule]';
const PIECES = {
  domino: {
    canUnrank,
    createUnranker,
    unrankTiling,
    sample: options => sampleRandomTiling(options),
    sampling: 'uniformly at random',
    directorySuffix: '',
  },
  domicule: {
    canUnrank: canUnrankDomicule,
    createUnranker: createDomiculeUnranker,
    unrankTiling: unrankDomiculeTiling,
    sample: options => sampleDomiculeTiling(options),
    sampling: 'approximately uniformly at random (Markov chain)',
    directorySuffix: '-diagonal',
  },
};

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

function* unrankRange(pieces, unranker, offset, count) {
  for (let i = BigInt(0); i < count; i++) {
    yield pieces.unrankTiling(unranker, offset + i);
  }
}

function* sampleRandomTilings(pieces, options, count) {
  for (let i = 0; i < count; i++) {
    yield pieces.sample(options);
  }
}

function selectTilings(argv, options, pieces, unranker, total) {
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
        pieces.canUnrank(swapped)
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
  const { rowCount, colCount, directorySuffix = '' } = options;
  const directory = path.join(OUTPUT_DIRECTORY, `${rowCount}x${colCount}${directorySuffix}`);
  const sheets = writeSvgSheets(tilings, { ...options, directory });

  sheets.forEach(({ file }) => console.log(`File saved: ${file}`));

  return sheets.reduce(
    (sum, { first, last }) => sum + last - first + BigInt(1),
    BigInt(0),
  );
}

function renderRandomSample(argv, options, pieces) {
  const { rowCount, colCount } = options;

  if ((rowCount * colCount) % 2 !== 0) {
    console.log(`Board ${rowCount}x${colCount}: 0 tilings.`);
    console.log('Nothing to render.');
    return;
  }

  const count = options.limit || 1;
  const labels = Array.from({ length: count }, (_, i) => `random ${i + 1}`);
  const tilings = sampleRandomTilings(pieces, options, count);
  const renderOptions = {
    rowCount,
    colCount,
    offset: BigInt(0),
    lastNumber: null,
    labels,
    filePrefix: `random-${Date.now()}`,
    directorySuffix: pieces.directorySuffix,
  };

  console.log(
    `Board ${rowCount}x${colCount}: too large to number its tilings, sampling ${count} ${pieces.sampling}.`,
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

    const domicule = argv.includes('--domicule');
    const pieces = domicule ? PIECES.domicule : PIECES.domino;
    const unranker = pieces.canUnrank(options) ? pieces.createUnranker(options) : null;

    if (!unranker && argv.includes('--random') && readBigIntArg(argv, '-i') === null) {
      renderRandomSample(argv, options, pieces);
      return;
    }

    const isOdd = (rowCount * colCount) % 2 !== 0;

    if (domicule && !unranker && !isOdd) {
      throw new Error(
        pieces.canUnrank({ rowCount: colCount, colCount: rowCount })
          ? `--domicule needs a numbering table, which grows with the number of columns; use -r ${colCount} -c ${rowCount} instead.`
          : '--domicule lists tilings only when their numbering table fits in memory; use --random instead.',
      );
    }

    const counted = isOdd ? 0 : unranker ? unranker.total : countTilings(options);
    const total = counted === null ? null : BigInt(counted);

    console.log(`Board ${rowCount}x${colCount}: ${describeTotal(total)}.`);

    const { offset, count } = selectTilings(argv, options, pieces, unranker, total);

    if (count <= BigInt(0)) {
      console.log('Nothing to render.');
      return;
    }

    const tilings = unranker
      ? unrankRange(pieces, unranker, offset, count)
      : takeRange(enumerateTilings(options), Number(offset), Number(count));
    const renderOptions = {
      rowCount,
      colCount,
      offset,
      lastNumber: total === null ? null : offset + count,
      directorySuffix: pieces.directorySuffix,
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
