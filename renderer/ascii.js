/**
 * Renders a tiling as text: `<>` marks a horizontal piece, `^`/`v` a vertical one and, for
 * domicules, `\` and `/` the two cells of a diagonal one.
 * @param {Domino[]} tiling The tiling to render.
 * @param {Object} options Board dimensions.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @returns {string} The text representation, one line per board row.
 */
function renderAscii(tiling, { rowCount, colCount }) {
  const board = Array.from({ length: rowCount }, () =>
    new Array(colCount).fill('.'),
  );

  tiling.forEach(({ row, col, horizontal, dr, dc }) => {
    if (dr === 1 && dc !== 0) {
      board[row][col] = dc > 0 ? '\\' : '/';
      board[row + 1][col + dc] = dc > 0 ? '\\' : '/';
    } else if (dr !== undefined ? dr === 0 : horizontal) {
      board[row][col] = '<';
      board[row][col + 1] = '>';
    } else {
      board[row][col] = '^';
      board[row + 1][col] = 'v';
    }
  });

  return board.map(line => line.join(' ')).join('\n');
}

module.exports = renderAscii;
