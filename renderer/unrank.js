const MAX_TABLE_SIZE = 4000000;

/**
 * Checks whether the unranking table for a board fits in memory.
 * @param {Object} options Board dimensions.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @returns {boolean} True if the board can be unranked.
 */
function canUnrank({ rowCount, colCount }) {
  return (rowCount * colCount + 1) * 2 ** colCount <= MAX_TABLE_SIZE;
}

/**
 * Builds a table of completion counts for a broken-profile scan of the board.
 * table[i][mask] is the number of ways to finish the tiling when cells before i are covered
 * and bit j of mask tells whether cell i + j is already covered by a vertical domino.
 * @param {Object} options Board dimensions.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @param {function(number): void} [onProgress] Called with the completed fraction after every board row.
 * @returns {{ rowCount: number, colCount: number, table: BigInt[][], total: BigInt }} The unranker.
 */
function createUnranker({ rowCount, colCount }, onProgress) {
  const cellCount = rowCount * colCount;
  const maskCount = 1 << colCount;
  const verticalBit = 1 << colCount;
  const table = new Array(cellCount + 1);

  table[cellCount] = new Array(maskCount).fill(BigInt(0));
  table[cellCount][0] = BigInt(1);

  for (let index = cellCount - 1; index >= 0; index--) {
    const next = table[index + 1];
    const current = new Array(maskCount);
    const canPlaceHorizontal = (index % colCount) + 1 < colCount;
    const canPlaceVertical = index + colCount < cellCount;

    for (let mask = 0; mask < maskCount; mask++) {
      if (mask & 1) {
        current[mask] = next[mask >> 1];
        continue;
      }

      const horizontal =
        canPlaceHorizontal && !(mask & 2) ? next[(mask | 2) >> 1] : BigInt(0);
      const vertical = canPlaceVertical
        ? next[(mask | verticalBit) >> 1]
        : BigInt(0);

      current[mask] = horizontal + vertical;
    }

    table[index] = current;

    if (onProgress && index % colCount === 0) {
      onProgress((cellCount - index) / cellCount);
    }
  }

  return { rowCount, colCount, table, total: table[0][0] };
}

/**
 * Returns the tiling with the given 0-based rank, in the same order as enumerateTilings.
 * @param {Object} unranker The result of createUnranker.
 * @param {BigInt} rank The 0-based rank, lower than unranker.total.
 * @returns {Domino[]} The tiling.
 */
function unrankTiling({ colCount, table, total }, rank) {
  if (rank < BigInt(0) || rank >= total) {
    throw new RangeError(`Rank must be between 0 and ${total - BigInt(1)}.`);
  }

  const cellCount = table.length - 1;
  const verticalBit = 1 << colCount;
  const dominoes = [];
  let remaining = rank;
  let mask = 0;

  for (let index = 0; index < cellCount; index++) {
    if (mask & 1) {
      mask >>= 1;
      continue;
    }

    const row = Math.floor(index / colCount);
    const col = index % colCount;
    const next = table[index + 1];
    const horizontal =
      col + 1 < colCount && !(mask & 2) ? next[(mask | 2) >> 1] : BigInt(0);

    if (remaining < horizontal) {
      dominoes.push({ row, col, horizontal: true });
      mask = (mask | 2) >> 1;
    } else {
      remaining -= horizontal;
      dominoes.push({ row, col, horizontal: false });
      mask = (mask | verticalBit) >> 1;
    }
  }

  return dominoes;
}

if (typeof module !== 'undefined') {
  module.exports = { canUnrank, createUnranker, unrankTiling };
}
