// regret-adapters.mjs — ESM adapter for domino-tiling CJS modules
// Bridges CommonJS modules to ESM for Regrets' capture.js (which uses dynamic import)
// After refactoring, the solver modules now export their functions properly,
// so we can import them via createRequire instead of duplicating code.

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const intSolver = require('./dominoTilingSolver.js');
const bigIntSolver = require('./dominoTilingSolver-BigInt.js');

/**
 * Calculate the number of ways to tile an m×n grid with 2×1 dominoes.
 * Uses integer arithmetic — suitable for grids up to ~12×12.
 * Delegates to the refactored dominoTilingSolver module.
 *
 * @param {Object} input - { rowCount: number, colCount: number }
 * @returns {number} Number of valid domino tilings
 */
export function calculateTilings(input) {
  return intSolver.calculateTotalTilingCombinations(input);
}

/**
 * Calculate the number of ways to tile an m×n grid with 2×1 dominoes.
 * Uses BigInt arithmetic — suitable for large grids (14×14 and beyond).
 * Returns the result as a string to ensure JSON serialization works.
 * Delegates to the refactored dominoTilingSolver-BigInt module.
 *
 * @param {Object} input - { rowCount: number, colCount: number }
 * @returns {string} Number of valid domino tilings (as string for JSON safety)
 */
export function calculateTilingsBigInt(input) {
  return bigIntSolver.calculateTotalTilingCombinations(input).toString();
}
