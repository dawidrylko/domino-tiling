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

function setDomino(grid, colCount, { row, col, horizontal }, value) {
  const index = row * colCount + col;

  grid[index] = value;
  grid[horizontal ? index + 1 : index + colCount] = value;
}

function nextDomino(grid, rowCount, colCount, frame) {
  const row = Math.floor(frame.index / colCount);
  const col = frame.index % colCount;

  while (frame.option < 2) {
    const horizontal = frame.option === 0;

    frame.option++;

    if (horizontal ? col + 1 < colCount && !grid[frame.index + 1] : row + 1 < rowCount) {
      return { row, col, horizontal };
    }
  }

  return null;
}

/**
 * Lazily enumerates every domino tiling of a board in a deterministic order: the first empty cell
 * gets a horizontal domino before a vertical one. It backtracks with an explicit stack, so boards
 * with tens of thousands of cells do not overflow the call stack.
 * @param {Object} options Board dimensions.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @returns {Generator<Domino[]>} Tilings, one array of dominoes at a time.
 */
function* enumerateTilings({ rowCount, colCount }) {
  const cellCount = rowCount * colCount;

  if (cellCount % 2 !== 0) {
    return;
  }

  const grid = new Uint8Array(cellCount);
  const dominoes = [];
  const frames = [{ index: findFirstEmptyCell(grid, 0), option: 0 }];

  while (frames.length) {
    const depth = frames.length - 1;
    const frame = frames[depth];

    if (frame.index === cellCount) {
      yield dominoes.slice();
      frames.pop();
      continue;
    }

    if (dominoes.length > depth) {
      setDomino(grid, colCount, dominoes.pop(), 0);
    }

    const domino = nextDomino(grid, rowCount, colCount, frame);

    if (!domino) {
      frames.pop();
      continue;
    }

    setDomino(grid, colCount, domino, 1);
    dominoes.push(domino);
    frames.push({ index: findFirstEmptyCell(grid, frame.index + 1), option: 0 });
  }
}

module.exports = enumerateTilings;
