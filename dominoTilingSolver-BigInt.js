const { parseArgs } = require('./helpers');

const MAX_SHORTER_SIDE = 30;

function canSkipTwoBits(colIndex, colCount, currentMask, currentBit, nextBit) {
  return (
    colIndex + 1 < colCount &&
    !(currentMask & currentBit) &&
    !(currentMask & nextBit)
  );
}

function searchTileArrangements(params) {
  const {
    tilingMatrix,
    rowCount,
    colCount,
    rowIndex,
    colIndex,
    currentMask,
    nextMask,
  } = params;

  if (rowIndex === rowCount) {
    return;
  }

  if (colIndex >= colCount) {
    tilingMatrix[rowIndex + 1][nextMask] += tilingMatrix[rowIndex][currentMask];
    return;
  }

  const currentBit = BigInt(1) << BigInt(colIndex);
  const nextBit = BigInt(1) << BigInt(colIndex + 1);

  currentMask & currentBit
    ? searchTileArrangements({ ...params, colIndex: colIndex + 1 })
    : searchTileArrangements({
        ...params,
        colIndex: colIndex + 1,
        nextMask: nextMask | currentBit,
      });

  if (canSkipTwoBits(colIndex, colCount, currentMask, currentBit, nextBit)) {
    searchTileArrangements({ ...params, colIndex: colIndex + 2 });
  }
}

function createInitialTilingMatrix(rowCount, colCount) {
  return Array.from({ length: rowCount + 1 }, () =>
    new Array(1 << colCount).fill(BigInt(0)),
  );
}

function calculateTotalTilingCombinations(options) {
  const rowCount = Math.max(options.rowCount, options.colCount);
  const colCount = Math.min(options.rowCount, options.colCount);
  const tilingMatrix = createInitialTilingMatrix(rowCount, colCount);
  tilingMatrix[0][0] = BigInt(1);

  for (let rowIndex = 0; rowIndex < rowCount; ++rowIndex) {
    for (let currentMask = 0; currentMask < 1 << colCount; ++currentMask) {
      searchTileArrangements({
        tilingMatrix,
        rowCount,
        colCount,
        rowIndex,
        colIndex: 0,
        currentMask: BigInt(currentMask),
        nextMask: BigInt(0),
      });
    }
  }

  return tilingMatrix[rowCount][0];
}

function isValidSize(size) {
  return Number.isInteger(size) && size >= 0;
}

function __main__() {
  const argsSchema = { '-r': 'rowCount', '-c': 'colCount' };
  const options = parseArgs(process.argv.slice(2), argsSchema);

  if (!isValidSize(options.rowCount) || !isValidSize(options.colCount)) {
    console.error(
      'Usage: node dominoTilingSolver-BigInt.js -r <rowCount> -c <colCount>',
    );
    process.exit(1);
  }

  if (Math.min(options.rowCount, options.colCount) > MAX_SHORTER_SIDE) {
    console.error(
      `The shorter side of the board can be at most ${MAX_SHORTER_SIDE}, because the rows are indexed with 32-bit integers.`,
    );
    process.exit(1);
  }

  const result = calculateTotalTilingCombinations(options);
  console.log(result.toString());
  process.exit(0);
}

__main__();
