const { exec } = require('../helpers');

const MAX_CELLS_TO_COUNT = 144;

/**
 * Counts tilings with the BigInt solver, skipping boards that would take too long.
 * @param {Object} options Board dimensions.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @returns {string|null} The number of tilings, or null for boards above 144 cells.
 */
function countTilings(options) {
  const { rowCount, colCount } = options;

  if (rowCount * colCount > MAX_CELLS_TO_COUNT) {
    return null;
  }

  return exec('dominoTilingSolver-BigInt.js', options);
}

module.exports = { countTilings, MAX_CELLS_TO_COUNT };
