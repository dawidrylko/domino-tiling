const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { parseArgs } = require('../helpers');

const SOLVER = path.join(__dirname, '..', 'domiculeTilingSolver-Modular.js');
const ARRAY_FILE = path.join(__dirname, 'b239264.txt');
const DIAGONAL_FILE = path.join(__dirname, 'b239273.txt');

/**
 * Reads the values a b-file already holds, so that a longer run never recounts them.
 * @param {string} file The b-file.
 * @returns {string[]} The values, indexed by n.
 */
function readBFile(file) {
  if (!fs.existsSync(file)) {
    return [];
  }

  return fs
    .readFileSync(file, 'utf-8')
    .split('\n')
    .filter(line => /^\d+ \d+$/.test(line))
    .reduce((values, line) => {
      const [n, value] = line.split(' ');
      values[Number(n)] = value;

      return values;
    }, []);
}

function writeBFile(file, values) {
  fs.writeFileSync(file, values.map((value, n) => `${n} ${value}\n`).join(''));
}

/**
 * Counts the domicule tilings of a board, reusing a known value of it or its transpose.
 * @param {Map<string, string>} known The values counted so far, keyed by "rows x cols".
 * @param {number} rows The number of rows.
 * @param {number} cols The number of columns.
 * @returns {string} The number of tilings.
 */
function count(known, rows, cols) {
  const key = `${Math.max(rows, cols)}x${Math.min(rows, cols)}`;

  if (!known.has(key)) {
    const started = Date.now();
    const output = execFileSync(process.execPath, [SOLVER, '-r', String(rows), '-c', String(cols)], {
      encoding: 'utf-8',
    });
    known.set(key, output.trim());

    if (Date.now() - started > 1000) {
      console.log(`${key}: ${((Date.now() - started) / 1000).toFixed(1)} s`);
    }
  }

  return known.get(key);
}

function __main__() {
  const { maxAntidiagonal, maxN } = parseArgs(process.argv.slice(2), { '-d': 'maxAntidiagonal', '-n': 'maxN' });

  if (!Number.isInteger(maxAntidiagonal) || !Number.isInteger(maxN)) {
    console.error('Usage: node oeis/buildBFiles.js -d <max antidiagonal of A239264> -n <max n of A239273>');
    process.exit(1);
  }

  const known = new Map();
  const arrayValues = readBFile(ARRAY_FILE);
  const diagonalValues = readBFile(DIAGONAL_FILE);
  let index = 0;

  diagonalValues.forEach((value, n) => known.set(`${2 * n}x${2 * n}`, value));

  // A239264 reads A(n, k) by antidiagonals: A(0, d), A(1, d - 1), ..., A(d, 0).
  for (let d = 0; d <= maxAntidiagonal; d++) {
    for (let n = 0; n <= d; n++, index++) {
      if (arrayValues[index] !== undefined) {
        known.set(`${Math.max(n, d - n)}x${Math.min(n, d - n)}`, arrayValues[index]);
      }

      arrayValues[index] = count(known, n, d - n);
    }
  }

  for (let n = 0; n <= maxN; n++) {
    diagonalValues[n] = count(known, 2 * n, 2 * n);
  }

  writeBFile(ARRAY_FILE, arrayValues.slice(0, index));
  writeBFile(DIAGONAL_FILE, diagonalValues.slice(0, maxN + 1));
  console.log(`Wrote ${index} terms of A239264 and ${maxN + 1} terms of A239273.`);
}

__main__();
