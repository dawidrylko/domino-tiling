const os = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { parseArgs } = require('./helpers');

const MAX_SHORTER_SIDE = 30;
const LARGEST_PRIME_BOUND = 2 ** 31;

/**
 * Lists the given number of primes, starting from the largest one below 2^31.
 * The sum of two residues then stays below 2^32 and fits a Uint32Array cell.
 * @param {number} count The number of primes.
 * @returns {number[]} The primes in decreasing order.
 */
function listPrimes(count) {
  const isPrime = n => {
    for (let d = 3; d * d <= n; d += 2) {
      if (n % d === 0) {
        return false;
      }
    }

    return true;
  };
  const primes = [];

  for (let n = LARGEST_PRIME_BOUND - 1; primes.length < count; n -= 2) {
    if (isPrime(n)) {
      primes.push(n);
    }
  }

  return primes;
}

/**
 * Bounds log2 of the number of perfect matchings of the board's king's graph with the
 * Kahn-Lovasz theorem (proved by Alon and Friedland, 2008): a graph has at most
 * Prod_v (d(v)!)^(1/(2 d(v))) perfect matchings, where d(v) is the degree of the vertex v.
 * @param {number} rows The number of rows.
 * @param {number} cols The number of columns.
 * @returns {number} An upper bound on log2 of the number of tilings.
 */
function calculateLog2Bound(rows, cols) {
  let bound = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const height = Math.min(r + 1, rows - 1) - Math.max(r - 1, 0) + 1;
      const width = Math.min(c + 1, cols - 1) - Math.max(c - 1, 0) + 1;
      const degree = height * width - 1;
      let log2Factorial = 0;

      for (let k = 2; k <= degree; k++) {
        log2Factorial += Math.log2(k);
      }

      bound += degree ? log2Factorial / (2 * degree) : 0;
    }
  }

  return bound;
}

/**
 * Counts the domicule tilings modulo a prime with the same broken-profile dynamic
 * programming as domiculeTilingSolver-BigInt.js. Bit i of a state tells whether the cell
 * i places ahead of the current one is already covered; a state has cols + 2 bits.
 * Only additions are needed, so the counts are kept in Uint32Array tables.
 * @param {number} rows The number of rows (the longer side).
 * @param {number} cols The number of columns (the shorter side).
 * @param {number} prime The modulus.
 * @returns {number} The number of tilings modulo the prime.
 */
function countModulo(rows, cols, prime) {
  const stateCount = 2 ** (cols + 2);
  let current = new Uint32Array(stateCount);
  let next = new Uint32Array(stateCount);
  current[0] = 1 % prime;

  for (let cell = 0; cell < rows * cols; cell++) {
    const rowIndex = Math.floor(cell / cols);
    const colIndex = cell % cols;
    const hasRight = colIndex + 1 < cols;
    const hasBelow = rowIndex + 1 < rows;
    const offsets = [
      ...(hasRight ? [1] : []),
      ...(hasBelow && colIndex > 0 ? [cols - 1] : []),
      ...(hasBelow ? [cols] : []),
      ...(hasBelow && hasRight ? [cols + 1] : []),
    ].map(offset => 2 ** offset);

    next.fill(0);

    for (let state = 0; state < stateCount; state++) {
      const count = current[state];

      if (count === 0) {
        continue;
      }

      if (state & 1) {
        const target = state >>> 1;
        const sum = next[target] + count;
        next[target] = sum >= prime ? sum - prime : sum;
        continue;
      }

      for (let i = 0; i < offsets.length; i++) {
        if (!(state & offsets[i])) {
          const target = (state + offsets[i]) >>> 1;
          const sum = next[target] + count;
          next[target] = sum >= prime ? sum - prime : sum;
        }
      }
    }

    [current, next] = [next, current];
  }

  return current[0];
}

/**
 * Rebuilds a non-negative integer from its residues with the Chinese remainder theorem.
 * @param {number[]} residues The residues.
 * @param {number[]} primes The moduli.
 * @returns {BigInt} The unique solution in [0, product of the primes).
 */
function combineResidues(residues, primes) {
  let result = BigInt(0);
  let modulus = BigInt(1);

  residues.forEach((residue, i) => {
    const prime = BigInt(primes[i]);
    const difference = (((BigInt(residue) - result) % prime) + prime) % prime;
    const inverse = modularInverse(modulus % prime, prime);
    result += modulus * ((difference * inverse) % prime);
    modulus *= prime;
  });

  return result;
}

function modularInverse(value, modulus) {
  let [a, b, x, y] = [value, modulus, BigInt(1), BigInt(0)];

  while (b !== BigInt(0)) {
    const quotient = a / b;
    [a, b] = [b, a - quotient * b];
    [x, y] = [y, x - quotient * y];
  }

  return ((x % modulus) + modulus) % modulus;
}

/**
 * Counts the residues in worker threads, at most `jobs` at a time.
 * @param {number} rows The longer side.
 * @param {number} cols The shorter side.
 * @param {number[]} primes The moduli.
 * @param {number} jobs The number of worker threads.
 * @returns {Promise<number[]>} The residues, in the order of the primes.
 */
async function countResidues(rows, cols, primes, jobs) {
  const residues = new Array(primes.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < primes.length) {
      const index = nextIndex++;
      residues[index] = await new Promise((resolve, reject) => {
        const worker = new Worker(__filename, { workerData: { rows, cols, prime: primes[index] } });
        worker.once('message', resolve);
        worker.once('error', reject);
        worker.once('exit', code =>
          reject(new Error(`The worker for the prime ${primes[index]} stopped with exit code ${code} before it sent a result.`)),
        );
      });
    }
  };

  await Promise.all(Array.from({ length: Math.min(jobs, primes.length) }, runWorker));

  return residues;
}

/**
 * Counts the tilings exactly: enough primes for the Kahn-Lovasz bound, plus one more prime
 * that the result is checked against.
 * @param {Object} options The board and the number of worker threads.
 * @returns {Promise<BigInt>} The number of tilings.
 */
async function calculateTotalTilingCombinations({ rowCount, colCount, jobs }) {
  const rows = Math.max(rowCount, colCount);
  const cols = Math.min(rowCount, colCount);

  if ((rows * cols) % 2 === 1) {
    return BigInt(0);
  }

  const primeCount = Math.ceil((calculateLog2Bound(rows, cols) + 1) / 30) + 1;
  const primes = listPrimes(primeCount);
  const residues = await countResidues(rows, cols, primes, jobs);
  const result = combineResidues(residues.slice(0, -1), primes.slice(0, -1));

  if (result % BigInt(primes.at(-1)) !== BigInt(residues.at(-1))) {
    throw new Error(`The result does not match the residue modulo the check prime ${primes.at(-1)}.`);
  }

  return result;
}

function isValidSize(size) {
  return Number.isInteger(size) && size >= 0;
}

async function __main__() {
  const argsSchema = { '-r': 'rowCount', '-c': 'colCount', '-j': 'jobs' };
  const options = parseArgs(process.argv.slice(2), argsSchema);
  const jobs = options.jobs ?? os.availableParallelism();

  if (!isValidSize(options.rowCount) || !isValidSize(options.colCount) || !(jobs > 0)) {
    console.error(
      'Usage: node domiculeTilingSolver-Modular.js -r <rowCount> -c <colCount> [-j <jobs>]',
    );
    process.exit(1);
  }

  if (Math.min(options.rowCount, options.colCount) > MAX_SHORTER_SIDE) {
    console.error(
      `The shorter side of the board can be at most ${MAX_SHORTER_SIDE}, because the states are indexed with 32-bit integers.`,
    );
    process.exit(1);
  }

  const result = await calculateTotalTilingCombinations({ ...options, jobs });
  console.log(result.toString());
}

if (isMainThread) {
  __main__().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
} else {
  const { rows, cols, prime } = workerData;
  parentPort.postMessage(countModulo(rows, cols, prime));
}
