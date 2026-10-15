const { parseArgs } = require('./helpers');

const MAX_SHORTER_SIDE = 30;

/**
 * Counts the domicule tilings of a board (OEIS A239264), which are the perfect matchings
 * of its king's graph: a domicule covers two cells that share a side or a corner.
 * The cells are processed one by one in row-major order (the broken-profile method).
 * Bit i of a state tells whether the cell i places ahead of the current one is already
 * covered. A cell is matched only with a later cell (right, down-left, down or
 * down-right), so the farthest cell a state has to remember is colCount + 1 places ahead
 * and a state has colCount + 2 bits.
 * @param {number} rowCount The number of rows.
 * @param {number} colCount The number of columns.
 * @returns {BigInt} The number of tilings.
 */
function calculateTotalTilingCombinations({ rowCount, colCount }) {
  const rows = Math.max(rowCount, colCount);
  const cols = Math.min(rowCount, colCount);
  const stateCount = 2 ** (cols + 2);
  let current = new Array(stateCount).fill(BigInt(0));
  current[0] = BigInt(1);

  for (let cell = 0; cell < rows * cols; cell++) {
    const rowIndex = Math.floor(cell / cols);
    const colIndex = cell % cols;
    const hasRight = colIndex + 1 < cols;
    const hasLeft = colIndex > 0;
    const hasBelow = rowIndex + 1 < rows;
    const offsets = [
      ...(hasRight ? [1] : []),
      ...(hasBelow && hasLeft ? [cols - 1] : []),
      ...(hasBelow ? [cols] : []),
      ...(hasBelow && hasRight ? [cols + 1] : []),
    ];
    const next = new Array(stateCount).fill(BigInt(0));

    current.forEach((count, state) => {
      if (count === BigInt(0)) {
        return;
      }

      if (state & 1) {
        next[state >>> 1] += count;
        return;
      }

      offsets
        .filter(offset => !(state & (2 ** offset)))
        .forEach(offset => (next[(state + 2 ** offset) >>> 1] += count));
    });

    current = next;
  }

  return current[0];
}

function isValidSize(size) {
  return Number.isInteger(size) && size >= 0;
}

function __main__() {
  const argsSchema = { '-r': 'rowCount', '-c': 'colCount' };
  const options = parseArgs(process.argv.slice(2), argsSchema);

  if (!isValidSize(options.rowCount) || !isValidSize(options.colCount)) {
    console.error(
      'Usage: node domiculeTilingSolver-BigInt.js -r <rowCount> -c <colCount>',
    );
    process.exit(1);
  }

  if (Math.min(options.rowCount, options.colCount) > MAX_SHORTER_SIDE) {
    console.error(
      `The shorter side of the board can be at most ${MAX_SHORTER_SIDE}, because the states are indexed with 32-bit integers.`,
    );
    process.exit(1);
  }

  const result = calculateTotalTilingCombinations(options);
  console.log(result.toString());
}

__main__();
