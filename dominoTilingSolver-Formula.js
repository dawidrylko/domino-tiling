const { parseArgs } = require('./helpers');

/**
 * Multiplies two polynomials given as coefficient arrays, from the constant term up.
 * @param {BigInt[]} p The first polynomial.
 * @param {BigInt[]} q The second polynomial.
 * @returns {BigInt[]} The product.
 */
function multiplyPolynomials(p, q) {
  const product = new Array(p.length + q.length - 1).fill(BigInt(0));

  p.forEach((a, i) => q.forEach((b, j) => (product[i + j] += a * b)));

  return product;
}

/**
 * Subtracts two polynomials given as coefficient arrays, from the constant term up.
 * @param {BigInt[]} p The minuend.
 * @param {BigInt[]} q The subtrahend.
 * @returns {BigInt[]} The difference.
 */
function subtractPolynomials(p, q) {
  return Array.from(
    { length: Math.max(p.length, q.length) },
    (_, i) => (p[i] || BigInt(0)) - (q[i] || BigInt(0)),
  );
}

/**
 * Builds the monic polynomial whose roots are 4*cos(j*Pi/(2n+1))^2 for j = 1..n.
 * With z = x - 2 these are 2*cos(2*j*Pi/(2n+1)), the roots of Q_n(z), where
 * Q_0 = 1, Q_1 = z + 1 and Q_k = z * Q_{k-1} - Q_{k-2}.
 * @param {number} n Half of the board side.
 * @returns {BigInt[]} The coefficients, from the constant term up.
 */
function createRootPolynomial(n) {
  const z = [BigInt(-2), BigInt(1)];
  let previous = [BigInt(1)];
  let current = [BigInt(-1), BigInt(1)];

  if (n === 0) {
    return previous;
  }

  for (let k = 2; k <= n; k++) {
    [previous, current] = [
      current,
      subtractPolynomials(multiplyPolynomials(z, current), previous),
    ];
  }

  return current;
}

/**
 * Calculates the determinant of an integer matrix with fraction-free Bareiss elimination.
 * @param {BigInt[][]} matrix The square matrix.
 * @returns {BigInt} The determinant.
 */
function calculateDeterminant(matrix) {
  const a = matrix.map(row => row.slice());
  const size = a.length;
  let sign = BigInt(1);
  let previousPivot = BigInt(1);

  for (let k = 0; k < size - 1; k++) {
    if (a[k][k] === BigInt(0)) {
      const pivotRow = a.findIndex((row, i) => i > k && row[k] !== BigInt(0));

      if (pivotRow === -1) {
        return BigInt(0);
      }

      [a[k], a[pivotRow]] = [a[pivotRow], a[k]];
      sign = -sign;
    }

    for (let i = k + 1; i < size; i++) {
      for (let j = k + 1; j < size; j++) {
        a[i][j] = (a[i][j] * a[k][k] - a[i][k] * a[k][j]) / previousPivot;
      }
    }

    previousPivot = a[k][k];
  }

  return size === 0 ? BigInt(1) : sign * a[size - 1][size - 1];
}

/**
 * Calculates the resultant of two polynomials of equal degree from their Sylvester matrix.
 * @param {BigInt[]} p The first polynomial, from the constant term up.
 * @param {BigInt[]} q The second polynomial, from the constant term up.
 * @returns {BigInt} The resultant.
 */
function calculateResultant(p, q) {
  const degree = p.length - 1;
  const size = 2 * degree;
  const sylvesterMatrix = Array.from({ length: size }, (_, i) => {
    const row = new Array(size).fill(BigInt(0));
    const [polynomial, shift] = i < degree ? [p, i] : [q, i - degree];

    for (let k = 0; k <= degree; k++) {
      row[shift + k] = polynomial[degree - k];
    }

    return row;
  });

  return calculateDeterminant(sylvesterMatrix);
}

function calculateTotalTilingCombinations({ rowCount }) {
  const n = rowCount / 2;
  const p = createRootPolynomial(n);
  const pOfMinusX = p.map((coefficient, i) => (i % 2 ? -coefficient : coefficient));
  const resultant = calculateResultant(p, pOfMinusX);

  return n % 2 ? -resultant : resultant;
}

function isValidSize(size) {
  return Number.isInteger(size) && size >= 0;
}

function __main__() {
  const argsSchema = { '-r': 'rowCount', '-c': 'colCount' };
  const options = parseArgs(process.argv.slice(2), argsSchema);

  if (!isValidSize(options.rowCount) || !isValidSize(options.colCount)) {
    console.error(
      'Usage: node dominoTilingSolver-Formula.js -r <rowCount> -c <colCount>',
    );
    process.exit(1);
  }

  if (options.rowCount !== options.colCount || options.rowCount % 2 !== 0) {
    console.error(
      'The formula covers 2n x 2n boards only (OEIS A004003); rowCount and colCount must be equal and even.',
    );
    process.exit(1);
  }

  const result = calculateTotalTilingCombinations(options);
  console.log(result.toString());
  process.exit(0);
}

__main__();
