/**
 * dominoTilingSolver.js — Domino tiling solver using integer arithmetic
 *
 * Calculates the number of ways to completely cover an m×n grid
 * with 2×1 and 1×2 domino tiles using profile dynamic programming.
 *
 * Suitable for grids up to approximately 12×12 (beyond which
 * integer overflow occurs — use dominoTilingSolver-BigInt.js instead).
 *
 * @module dominoTilingSolver
 */

const { parseArgs } = require('./helpers');

// ─── Bitmask helpers ──────────────────────────────────────────────────────────

/**
 * Check if two adjacent columns in the current row are both unoccupied,
 * meaning a horizontal domino can be placed spanning them.
 *
 * @param {number} colIndex - Current column index
 * @param {number} colCount - Total number of columns
 * @param {number} currentMask - Bitmask of occupied cells in the current row
 * @param {number} currentBit - Bit representing the current column
 * @param {number} nextBit - Bit representing the next column
 * @returns {boolean} True if a horizontal domino can be placed
 */
function canPlaceHorizontalDomino(colIndex, colCount, currentMask, currentBit, nextBit) {
  return (
    colIndex + 1 < colCount &&
    !(currentMask & currentBit) &&
    !(currentMask & nextBit)
  );
}

// ─── Core algorithm ──────────────────────────────────────────────────────────

/**
 * Recursively explore all valid domino placements for a single row.
 *
 * Uses profile dynamic programming: for each row, we enumerate all possible
 * "profiles" (bitmasks representing which cells are already occupied by
 * vertical dominoes from the previous row). For each profile, we try placing
 * vertical dominoes (which occupy cells in the next row) and horizontal
 * dominoes (which occupy two adjacent cells in the current row).
 *
 * @param {Object} params - Decomposed algorithm parameters
 * @param {number[][]} params.tilingMatrix - DP table: tilingMatrix[row][mask] = count
 * @param {number} params.rowCount - Total rows in the grid
 * @param {number} params.colCount - Total columns in the grid
 * @param {number} params.rowIndex - Current row being processed
 * @param {number} params.colIndex - Current column being processed
 * @param {number} params.currentMask - Occupancy bitmask for current row
 * @param {number} params.nextMask - Occupancy bitmask being built for next row
 */
function explorePlacements({ tilingMatrix, rowCount, colCount, rowIndex, colIndex, currentMask, nextMask }) {
  if (rowIndex === rowCount) {
    return;
  }

  if (colIndex >= colCount) {
    tilingMatrix[rowIndex + 1][nextMask] += tilingMatrix[rowIndex][currentMask];
    return;
  }

  const currentBit = 1 << colIndex;
  const nextBit = 1 << (colIndex + 1);

  // If current cell is occupied (by a vertical domino from above), skip it
  if (currentMask & currentBit) {
    explorePlacements({ tilingMatrix, rowCount, colCount, rowIndex, colIndex: colIndex + 1, currentMask, nextMask });
  } else {
    // Place a vertical domino: current cell → mark next row's cell as occupied
    explorePlacements({ tilingMatrix, rowCount, colCount, rowIndex, colIndex: colIndex + 1, currentMask, nextMask: nextMask | currentBit });
  }

  // Place a horizontal domino: occupy current cell and the next cell
  if (canPlaceHorizontalDomino(colIndex, colCount, currentMask, currentBit, nextBit)) {
    explorePlacements({ tilingMatrix, rowCount, colCount, rowIndex, colIndex: colIndex + 2, currentMask, nextMask });
  }
}

// ─── Grid initialization ────────────────────────────────────────────────────

/**
 * Create the initial DP table for the tiling computation.
 * Each cell tilingMatrix[row][mask] stores the count of valid partial tilings
 * that result in the given occupancy mask at that row.
 *
 * @param {number} rowCount - Number of rows in the grid
 * @param {number} colCount - Number of columns in the grid
 * @returns {number[][]} Initialized DP table filled with zeros
 */
function createTilingMatrix(rowCount, colCount) {
  return Array.from({ length: rowCount + 1 }, () =>
    new Array(1 << colCount).fill(0)
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Calculate the number of ways to tile an m×n grid with 2×1 dominoes.
 *
 * Uses profile dynamic programming with bitmask state representation.
 * The algorithm processes the grid row by row, tracking which cells
 * are occupied by vertical dominoes from the previous row via bitmasks.
 *
 * For an m×n grid where at least one dimension is even, this returns
 * the exact count of valid complete tilings. If both dimensions are odd,
 * the grid cannot be tiled (returns 0).
 *
 * @param {Object} dimensions - Grid dimensions
 * @param {number} dimensions.rowCount - Number of rows (must be positive)
 * @param {number} dimensions.colCount - Number of columns (must be positive)
 * @returns {number} Number of valid domino tilings
 */
function calculateTotalTilingCombinations({ rowCount, colCount }) {
  const tilingMatrix = createTilingMatrix(rowCount, colCount);
  tilingMatrix[0][0] = 1;

  for (let rowIndex = 0; rowIndex < rowCount; ++rowIndex) {
    for (let currentMask = 0; currentMask < 1 << colCount; ++currentMask) {
      explorePlacements({
        tilingMatrix,
        rowCount,
        colCount,
        rowIndex,
        colIndex: 0,
        currentMask,
        nextMask: 0,
      });
    }
  }

  return tilingMatrix[rowCount][0];
}

// ─── CLI entry point ─────────────────────────────────────────────────────────

function main() {
  const argsSchema = { '-r': 'rowCount', '-c': 'colCount' };
  const options = parseArgs(process.argv.slice(2), argsSchema);

  if (!options.rowCount || !options.colCount) {
    console.error(
      'Usage: node dominoTilingSolver.js -r <rowCount> -c <colCount>'
    );
    process.exit(1);
  }

  const result = calculateTotalTilingCombinations(options);
  console.log(result);
  process.exit(0);
}

// Only run CLI when executed directly, not when imported
if (require.main === module) {
  main();
}

module.exports = {
  canPlaceHorizontalDomino,
  explorePlacements,
  createTilingMatrix,
  calculateTotalTilingCombinations,
};
