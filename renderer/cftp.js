const RIGHT = 0;
const LEFT = 1;
const DOWN = 2;
const UP = 3;

function createRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createStartTiling(rowCount, colCount) {
  const grid = new Uint8Array(rowCount * colCount);
  const horizontal = colCount % 2 === 0;

  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < colCount; col++) {
      const index = row * colCount + col;

      if (horizontal) {
        grid[index] = col % 2 === 0 ? RIGHT : LEFT;
      } else {
        grid[index] = row % 2 === 0 ? DOWN : UP;
      }
    }
  }

  return grid;
}

/**
 * Flips the 2x2 block with the given top-left cell towards the "up" or "down" state if it is flippable.
 * The "up" state of a block is its horizontal pair when the top-left cell is black, and its vertical pair
 * otherwise, which orders tilings as a distributive lattice (Thurston height functions).
 * @returns {boolean} True if the tiling changed.
 */
function flip(grid, colCount, index, up) {
  const row = Math.floor(index / colCount);
  const col = index % colCount;
  const right = index + 1;
  const below = index + colCount;
  const isHorizontalPair = grid[index] === RIGHT && grid[below] === RIGHT;
  const isVerticalPair = grid[index] === DOWN && grid[right] === DOWN;

  if (!isHorizontalPair && !isVerticalPair) {
    return false;
  }

  const horizontalIsUp = (row + col) % 2 === 0;
  const wantHorizontal = up === horizontalIsUp;

  if (wantHorizontal === isHorizontalPair) {
    return false;
  }

  if (wantHorizontal) {
    grid[index] = grid[below] = RIGHT;
    grid[right] = grid[below + 1] = LEFT;
  } else {
    grid[index] = grid[right] = DOWN;
    grid[below] = grid[below + 1] = UP;
  }

  return true;
}

function createExtremeTiling(rowCount, colCount, up) {
  const grid = createStartTiling(rowCount, colCount);
  let changed = true;

  while (changed) {
    changed = false;

    for (let row = 0; row + 1 < rowCount; row++) {
      for (let col = 0; col + 1 < colCount; col++) {
        changed = flip(grid, colCount, row * colCount + col, up) || changed;
      }
    }
  }

  return grid;
}

function applyMoves(grids, rowCount, colCount, seed, steps) {
  const random = createRandom(seed);
  const blockCols = colCount - 1;
  const blockCount = (rowCount - 1) * blockCols;

  for (let step = 0; step < steps; step++) {
    const block = Math.floor(random() * blockCount);
    const index = Math.floor(block / blockCols) * colCount + (block % blockCols);
    const up = random() < 0.5;

    grids.forEach(grid => flip(grid, colCount, index, up));
  }
}

function toDominoes(grid, colCount) {
  const dominoes = [];

  grid.forEach((direction, index) => {
    if (direction === RIGHT || direction === DOWN) {
      dominoes.push({
        row: Math.floor(index / colCount),
        col: index % colCount,
        horizontal: direction === RIGHT,
      });
    }
  });

  return dominoes;
}

function gridsEqual(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Samples a uniformly random domino tiling with monotone coupling from the past (Propp–Wilson).
 * It needs no counting table, so it works for boards far beyond the reach of unranking.
 * @param {Object} options Board dimensions.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @param {function(): number} [random] A source of uniform numbers in [0, 1), Math.random by default.
 * @returns {Domino[]|null} A random tiling, or null if the board cannot be tiled.
 */
function sampleRandomTiling({ rowCount, colCount }, random = Math.random) {
  if ((rowCount * colCount) % 2 !== 0) {
    return null;
  }

  if (rowCount < 2 || colCount < 2) {
    return toDominoes(createStartTiling(rowCount, colCount), colCount);
  }

  const top = createExtremeTiling(rowCount, colCount, true);
  const bottom = createExtremeTiling(rowCount, colCount, false);
  const baseSteps = rowCount * colCount;
  const seeds = [];

  // Epoch 0 covers the last baseSteps moves before time 0 and epoch k > 0 the baseSteps * 2^(k-1) moves
  // before that; each epoch keeps its seed, so restarting further in the past replays the same moves.
  for (;;) {
    seeds.push(Math.floor(random() * 4294967296));

    const upper = top.slice();
    const lower = bottom.slice();

    for (let epoch = seeds.length - 1; epoch >= 0; epoch--) {
      const epochSteps = epoch === 0 ? baseSteps : baseSteps * 2 ** (epoch - 1);

      applyMoves([upper, lower], rowCount, colCount, seeds[epoch], epochSteps);
    }

    if (gridsEqual(upper, lower)) {
      return toDominoes(upper, colCount);
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = { sampleRandomTiling, createRandom };
}
