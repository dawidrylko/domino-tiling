const MAX_DOMICULE_TABLE_SIZE = 4000000;
const DEFAULT_SWEEPS = 5000;
const KING_STEPS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

/**
 * Lists the cells a free cell can be matched with, as offsets in row-major order:
 * right, down-left, down and down-right, the order of domiculeTilingSolver-BigInt.js.
 * @param {number} index The cell.
 * @param {number} rowCount The number of rows.
 * @param {number} colCount The number of columns.
 * @returns {number[]} The offsets.
 */
function listOffsets(index, rowCount, colCount) {
  const row = Math.floor(index / colCount);
  const col = index % colCount;
  const hasRight = col + 1 < colCount;
  const hasBelow = row + 1 < rowCount;

  return [
    ...(hasRight ? [1] : []),
    ...(hasBelow && col > 0 ? [colCount - 1] : []),
    ...(hasBelow ? [colCount] : []),
    ...(hasBelow && hasRight ? [colCount + 1] : []),
  ];
}

function toDomicule(index, offset, colCount) {
  const row = Math.floor(index / colCount);
  const col = index % colCount;
  const mate = index + offset;

  return { row, col, dr: Math.floor(mate / colCount) - row, dc: (mate % colCount) - col };
}

/**
 * Checks whether the domicule unranking table for a board fits in memory.
 * A state remembers colCount + 2 cells, so the table is four times wider than the domino one.
 * @param {Object} options Board dimensions.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @returns {boolean} True if the board can be unranked.
 */
function canUnrankDomicule({ rowCount, colCount }) {
  return (rowCount * colCount + 1) * 2 ** (colCount + 2) <= MAX_DOMICULE_TABLE_SIZE;
}

/**
 * Builds a table of completion counts for the domicule broken-profile scan.
 * table[i][state] is the number of ways to finish the tiling when the cells before i are
 * covered and bit j of state tells whether cell i + j is already covered.
 * @param {Object} options Board dimensions.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @param {function(number): void} [onProgress] Called with the completed fraction after every board row.
 * @returns {{ rowCount: number, colCount: number, table: BigInt[][], total: BigInt }} The unranker.
 */
function createDomiculeUnranker({ rowCount, colCount }, onProgress) {
  const cellCount = rowCount * colCount;
  const stateCount = 2 ** (colCount + 2);
  const zero = BigInt(0);
  const table = new Array(cellCount + 1);

  table[cellCount] = new Array(stateCount).fill(zero);
  table[cellCount][0] = BigInt(1);

  for (let index = cellCount - 1; index >= 0; index--) {
    const next = table[index + 1];
    const current = new Array(stateCount);
    const bits = listOffsets(index, rowCount, colCount).map(offset => 2 ** offset);

    for (let state = 0; state < stateCount; state++) {
      if (state & 1) {
        current[state] = next[state >>> 1];
        continue;
      }

      let sum = zero;

      for (let i = 0; i < bits.length; i++) {
        if (!(state & bits[i])) {
          sum += next[(state + bits[i]) >>> 1];
        }
      }

      current[state] = sum;
    }

    table[index] = current;

    if (onProgress && index % colCount === 0) {
      onProgress((cellCount - index) / cellCount);
    }
  }

  return { rowCount, colCount, table, total: table[0][0] };
}

/**
 * Returns the domicule tiling with the given 0-based rank. A domicule covers the cell
 * (row, col) and the cell (row + dr, col + dc).
 * @param {Object} unranker The result of createDomiculeUnranker.
 * @param {BigInt} rank The 0-based rank, lower than unranker.total.
 * @returns {{ row: number, col: number, dr: number, dc: number }[]} The tiling.
 */
function unrankDomiculeTiling({ rowCount, colCount, table, total }, rank) {
  if (rank < BigInt(0) || rank >= total) {
    throw new RangeError(`Rank must be between 0 and ${total - BigInt(1)}.`);
  }

  const cellCount = table.length - 1;
  const domicules = [];
  let remaining = rank;
  let state = 0;

  for (let index = 0; index < cellCount; index++) {
    if (state & 1) {
      state >>>= 1;
      continue;
    }

    const next = table[index + 1];
    const offsets = listOffsets(index, rowCount, colCount).filter(offset => !(state & 2 ** offset));

    for (let i = 0; i < offsets.length; i++) {
      const target = (state + 2 ** offsets[i]) >>> 1;

      if (remaining < next[target]) {
        domicules.push(toDomicule(index, offsets[i], colCount));
        state = target;
        break;
      }

      remaining -= next[target];
    }
  }

  return domicules;
}

function createStartPartners(rowCount, colCount) {
  const partner = new Int32Array(rowCount * colCount);
  const step = colCount % 2 === 0 ? 1 : colCount;

  for (let index = 0; index < partner.length; index++) {
    const first = step === 1 ? index % 2 === 0 : Math.floor(index / colCount) % 2 === 0;

    partner[index] = first ? index + step : index - step;
  }

  return partner;
}

/**
 * Samples a domicule tiling with a Markov chain whose stationary distribution is uniform.
 * A step picks a cell a and one of its eight king neighbours c; when the partners b of a
 * and d of c are king neighbours too, the pairs ab and cd become ac and bd. The proposal
 * is symmetric, so the uniform distribution is stationary, but a finite run is only
 * approximately uniform.
 * @param {Object} options Board dimensions.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @param {function(): number} [random] A generator of numbers in [0, 1).
 * @param {number} [sweeps] The number of steps per cell.
 * @returns {{ row: number, col: number, dr: number, dc: number }[]|null} A tiling, or null if the board has an odd number of cells.
 */
function sampleDomiculeTiling({ rowCount, colCount }, random = Math.random, sweeps = DEFAULT_SWEEPS) {
  const cellCount = rowCount * colCount;

  if (cellCount % 2 !== 0) {
    return null;
  }

  const partner = createStartPartners(rowCount, colCount);
  const steps = sweeps * cellCount;

  for (let step = 0; step < steps; step++) {
    const a = Math.floor(random() * cellCount);
    const [dRow, dCol] = KING_STEPS[Math.floor(random() * 8)];
    const row = Math.floor(a / colCount) + dRow;
    const col = (a % colCount) + dCol;

    if (row < 0 || row >= rowCount || col < 0 || col >= colCount) {
      continue;
    }

    const c = row * colCount + col;
    const b = partner[a];
    const d = partner[c];

    if (
      b === c ||
      Math.abs(Math.floor(b / colCount) - Math.floor(d / colCount)) > 1 ||
      Math.abs((b % colCount) - (d % colCount)) > 1
    ) {
      continue;
    }

    partner[a] = c;
    partner[c] = a;
    partner[b] = d;
    partner[d] = b;
  }

  const domicules = [];

  for (let index = 0; index < cellCount; index++) {
    if (partner[index] > index) {
      domicules.push(toDomicule(index, partner[index] - index, colCount));
    }
  }

  return domicules;
}

if (typeof module !== 'undefined') {
  module.exports = {
    canUnrankDomicule,
    createDomiculeUnranker,
    unrankDomiculeTiling,
    sampleDomiculeTiling,
    DEFAULT_SWEEPS,
  };
}
