/**
 * @typedef {Object} Domino
 * @property {number} row The row of the domino's top-left cell.
 * @property {number} col The column of the domino's top-left cell.
 * @property {boolean} horizontal True for a 1x2 domino, false for a 2x1 domino.
 */

function findFirstEmptyCell(grid, startIndex) {
  let index = startIndex;

  while (index < grid.length && grid[index]) {
    index++;
  }

  return index;
}

function* placeDominoes(grid, rowCount, colCount, startIndex, dominoes) {
  const index = findFirstEmptyCell(grid, startIndex);

  if (index === grid.length) {
    yield dominoes.slice();
    return;
  }

  const row = Math.floor(index / colCount);
  const col = index % colCount;

  if (col + 1 < colCount && !grid[index + 1]) {
    grid[index] = grid[index + 1] = 1;
    dominoes.push({ row, col, horizontal: true });
    yield* placeDominoes(grid, rowCount, colCount, index + 2, dominoes);
    dominoes.pop();
    grid[index] = grid[index + 1] = 0;
  }

  if (row + 1 < rowCount) {
    grid[index] = grid[index + colCount] = 1;
    dominoes.push({ row, col, horizontal: false });
    yield* placeDominoes(grid, rowCount, colCount, index + 1, dominoes);
    dominoes.pop();
    grid[index] = grid[index + colCount] = 0;
  }
}

/**
 * Lazily enumerates every domino tiling of a board in a deterministic order.
 * @param {Object} options Board dimensions.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @returns {Generator<Domino[]>} Tilings, one array of dominoes at a time.
 */
function* enumerateTilings({ rowCount, colCount }) {
  if ((rowCount * colCount) % 2 !== 0) {
    return;
  }

  const grid = new Uint8Array(rowCount * colCount);

  yield* placeDominoes(grid, rowCount, colCount, 0, []);
}

module.exports = enumerateTilings;
