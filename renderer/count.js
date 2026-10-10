const { exec } = require('../helpers');

const MAX_SOLVER_TABLE_SIZE = 4000000;

/**
 * Checks whether the BigInt solver's table for a board has at most 4 million entries.
 * The solver scans along the longer side and keeps 2^(shorter side) entries per step.
 * @param {Object} options Board dimensions.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @returns {boolean} True if the board can be counted.
 */
function canCount({ rowCount, colCount }) {
  const longerSide = Math.max(rowCount, colCount);
  const shorterSide = Math.min(rowCount, colCount);

  return (longerSide + 1) * 2 ** shorterSide <= MAX_SOLVER_TABLE_SIZE;
}

/**
 * Counts tilings with the BigInt solver, skipping boards whose table is too large or whose count runs out of memory.
 * @param {Object} options Board dimensions.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @returns {string|null} The number of tilings, or null for boards too large to count.
 */
function countTilings(options) {
  if (!canCount(options)) {
    return null;
  }

  try {
    return exec('dominoTilingSolver-BigInt.js', options);
  } catch {
    return null;
  }
}

module.exports = { canCount, countTilings };
