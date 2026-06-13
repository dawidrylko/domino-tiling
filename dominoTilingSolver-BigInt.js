/**
 * dominoTilingSolver-BigInt.js — Domino tiling solver using BigInt arithmetic
 *
 * Calculates the number of ways to completely cover an m×n grid
 * with 2×1 and 1×2 domino tiles using profile dynamic programming.
 *
 * Uses BigInt to handle the exponentially large results for grids
 * beyond 12×12, where standard JavaScript integers would overflow.
 *
 * @module dominoTilingSolver-BigInt
 */

const { parseArgs } = require('./helpers');

// ─── Bitmask helpers ──────────────────────────────────────────────────────────

/**
 * Check if two adjacent columns in the current row are both unoccupied,
 * meaning a horizontal domino can be placed spanning them.
 *
 * Note: currentMask and currentBit are BigInt values, but colIndex and
 * colCount are regular numbers (they represent grid dimensions, not
 * tiling counts, so they never exceed Number.MAX_SAFE_INTEGER).
 *
 * @param {number} colIndex - Current column index
 * @param {number} colCount - Total number of columns
 * @param {bigint} currentMask - BigInt bitmask of occupied cells in the current row
 * @param {bigint} currentBit - BigInt bit representing the current column
 * @param {bigint} nextBit - BigInt bit representing the next column
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
 * Recursively explore all valid domino placements for a single row
 * using BigInt arithmetic for overflow-safe counting.
 *
 * The algorithm is identical to the integer version but uses BigInt
 * for the tiling counts, which grow exponentially with grid size.
 *
 * @param {Object} params - Decomposed algorithm parameters
 * @param {bigint[][]} params.tilingMatrix - BigInt DP table
 * @param {number} params.rowCount - Total rows in the grid
 * @param {number} params.colCount - Total columns in the grid
 * @param {number} params.rowIndex - Current row being processed
 * @param {number} params.colIndex - Current column being processed
 * @param {bigint} params.currentMask - BigInt occupancy bitmask for current row
 * @param {bigint} params.nextMask - BigInt occupancy bitmask being built for next row
 */
function explorePlacementsBigInt({ tilingMatrix, rowCount, colCount, rowIndex, colIndex, currentMask, nextMask }) {
  if (rowIndex === rowCount) {
    return;
  }

  if (colIndex >= colCount) {
    tilingMatrix[rowIndex + 1][nextMask] += tilingMatrix[rowIndex][currentMask];
    return;
  }

  const currentBit = BigInt(1) << BigInt(colIndex);
  const nextBit = BigInt(1) << BigInt(colIndex + 1);

  // If current cell is occupied (by a vertical domino from above), skip it
  if (currentMask & currentBit) {
    explorePlacementsBigInt({ tilingMatrix, rowCount, colCount, rowIndex, colIndex: colIndex + 1, currentMask, nextMask });
  } else {
    // Place a vertical domino: current cell → mark next row's cell as occupied
    explorePlacementsBigInt({ tilingMatrix, rowCount, colCount, rowIndex, colIndex: colIndex + 1, currentMask, nextMask: nextMask | currentBit });
  }

  // Place a horizontal domino: occupy current cell and the next cell
  if (canPlaceHorizontalDomino(colIndex, colCount, currentMask, currentBit, nextBit)) {
    explorePlacementsBigInt({ tilingMatrix, rowCount, colCount, rowIndex, colIndex: colIndex + 2, currentMask, nextMask });
  }
}

// ─── Grid initialization ────────────────────────────────────────────────────

/**
 * Create the initial BigInt DP table for the tiling computation.
 * Each cell stores a BigInt count of valid partial tilings.
 *
 * @param {number} rowCount - Number of rows in the grid
 * @param {number} colCount - Number of columns in the grid
 * @returns {bigint[][]} Initialized BigInt DP table filled with BigInt(0)
 */
function createTilingMatrix(rowCount, colCount) {
  return Array.from({ length: rowCount + 1 }, () =>
    new Array(1 << colCount).fill(BigInt(0))
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Calculate the number of ways to tile an m×n grid with 2×1 dominoes
 * using BigInt arithmetic for overflow-safe computation.
 *
 * Returns a BigInt value. Use .toString() for string representation
 * or Number() for conversion (when within safe integer range).
 *
 * @param {Object} dimensions - Grid dimensions
 * @param {number} dimensions.rowCount - Number of rows (must be positive)
 * @param {number} dimensions.colCount - Number of columns (must be positive)
 * @returns {bigint} Number of valid domino tilings as a BigInt
 */
function calculateTotalTilingCombinations({ rowCount, colCount }) {
  const tilingMatrix = createTilingMatrix(rowCount, colCount);
  tilingMatrix[0][0] = BigInt(1);

  for (let rowIndex = 0; rowIndex < rowCount; ++rowIndex) {
    for (let currentMask = 0; currentMask < 1 << colCount; ++currentMask) {
      explorePlacementsBigInt({
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

// ─── CLI entry point ─────────────────────────────────────────────────────────

function main() {
  const argsSchema = { '-r': 'rowCount', '-c': 'colCount' };
  const options = parseArgs(process.argv.slice(2), argsSchema);

  if (!options.rowCount || !options.colCount) {
    console.error(
      'Usage: node dominoTilingSolver-BigInt.js -r <rowCount> -c <colCount>'
    );
    process.exit(1);
  }

  const result = calculateTotalTilingCombinations(options);
  console.log(result.toString());
  process.exit(0);
}

// Only run CLI when executed directly, not when imported
if (require.main === module) {
  main();
}

module.exports = {
  canPlaceHorizontalDomino,
  explorePlacementsBigInt,
  createTilingMatrix,
  calculateTotalTilingCombinations,
};
