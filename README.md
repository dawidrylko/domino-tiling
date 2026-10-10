# <img src=".github/assets/domino.svg" alt="" width="36" height="36"> Domino Tiling

[![Continuous Integration](https://github.com/dawidrylko/domino-tiling/actions/workflows/ci.yml/badge.svg)](https://github.com/dawidrylko/domino-tiling/actions/workflows/ci.yml)
[![Pages](https://github.com/dawidrylko/domino-tiling/actions/workflows/pages.yml/badge.svg)](https://github.com/dawidrylko/domino-tiling/actions/workflows/pages.yml)
[![Gallery & benchmark](https://img.shields.io/badge/Gallery_%26_benchmark-dawidrylko.github.io-4f7cac?style=flat)](https://dawidrylko.github.io/domino-tiling/)
[![Blog post](https://img.shields.io/badge/Blog_post_%28PL%29-dawidrylko.com-e0a458?style=flat)](https://dawidrylko.com/domino-tiling/)

> Number of domino tilings (or dimer coverings) of a 2n × 2n square, [OEIS A004003](https://oeis.org/A004003), for n = 0, 1, 2, ...:
>
> 1, 2, 36, 6728, 12988816, 258584046368, 53060477521960000, 112202208776036178000000, 2444888770250892795802079170816, 548943583215388338077567813208427340288, 1269984011256235834242602753102293934298576249856

## 📖 Overview

This repository contains three JavaScript solvers for the domino tiling problem: two dynamic programming solvers, one based on the standard `Number` type and one based on `BigInt`, and an exact evaluation of the closed-form formula. All of them calculate the number of ways to tile a 2n × 2n board with 2×1 and 1×2 dominoes. The repository also includes a test suite, a benchmark runner and a renderer that draws any individual tiling.

## ❓ Problem Statement

The main problem tackled by this project is determining the number of different ways to completely cover an 8×8 board with 2×1 domino tiles. The answer is 12,988,816. The same solvers handle every board of the sequence, from the empty 0×0 board (exactly one tiling, the empty one) up to 20×20; `Number` stays exact up to 2<sup>53</sup> (10×10), while `BigInt` keeps the results exact for larger boards.

## 💡 Solution

The core of the solution lies in a recursive function named `searchTileArrangements`, combined with dynamic programming over bitmasks (also known as the broken-profile method). The board is processed row by row, and the number of ways to reach every possible occupancy pattern of the next row is accumulated in a table instead of enumerating whole tilings.

The closed-form formula from [OEIS A004003](https://oeis.org/A004003) gives the same numbers directly:

```
a(n) = ∏_{j=1..n} ∏_{k=1..n} (4·cos²(jπ/(2n+1)) + 4·cos²(kπ/(2n+1)))
```

Evaluated with floating-point cosines it loses precision from n = 6 (12×12) on, so `dominoTilingSolver-Formula.js` evaluates it exactly with `BigInt` instead. The values `x_j = 4·cos²(jπ/(2n+1))` are the roots of an integer polynomial `P(x)` (built with a Chebyshev-like recurrence), which turns the double product into a resultant, `a(n) = (−1)^n · Res(P(x), P(−x))`. The resultant is the determinant of a 2n × 2n Sylvester matrix, computed with fraction-free Bareiss elimination. It needs milliseconds even for 20×20, but it only counts tilings; enumerating or drawing them still needs the dynamic programming approach.

## 🧩 Key Components

- **Parameters**: The function `searchTileArrangements` takes parameters such as `tilingMatrix`, `rowCount`, `colCount`, `rowIndex`, `colIndex`, `currentMask`, and `nextMask`.
- **Function Flow**: The function walks through the cells of the current row. A cell that is already covered is skipped; a free cell is covered either by a vertical domino (which reaches into the next row) or by a horizontal domino (if the cell to its right is free as well).
- **Bitwise Operations**: `currentMask` marks the cells of the current row that are already covered by vertical dominoes from the row above, and `nextMask` marks the cells of the next row that the current row's vertical dominoes reach into. With one bit per column, all occupancy patterns of a row fit in `2^colCount` table entries.
- **Complexity**: The solvers walk along the longer side and use the shorter one as the row width, so the table has `(max(rowCount, colCount) + 1) × 2^min(rowCount, colCount)` entries. The running time grows linearly with the longer side and exponentially with the shorter one, which is why a 2×33 board takes milliseconds. The shorter side is capped at 30, because a row is stored as a 32-bit mask, but memory runs out much earlier: a 24×24 board already needs a table of about 420 million entries.

## 📋 Requirements

- [Node.js](https://nodejs.org/) 26 or newer. The exact version is specified in the `.nvmrc` file (run `nvm use`).
- [pnpm](https://pnpm.io/). The version is pinned in the `packageManager` field of `package.json`. Install it with `npm install -g pnpm` (Corepack is no longer bundled with Node.js 25 and newer).

## 🚀 Getting Started

1. Clone the repository:

```sh
git clone https://github.com/dawidrylko/domino-tiling.git
```

2. Install dependencies:

```sh
pnpm install
```

3. Run the project:

```sh
pnpm start
```

This command runs the first 7 benchmark cases (boards up to 12×12) 1000 times each and saves the results in a `benchmark/<year-month>` directory named after the month of the run (for example [`benchmark/2026-10`](./benchmark/2026-10)), together with a description of the machine in `environment.json`.

The [benchmark page](https://dawidrylko.github.io/domino-tiling/#benchmark) shows the newest complete directory (one with `environment.json` and every solver's largest board), so a partial run such as `pnpm start` never replaces a full table. The full table is measured with `pnpm benchmark`. A single 20×20 run with `BigInt` takes more than four minutes even on an Apple M4, so the number of `BigInt` runs drops with the board size: 1000 up to 12×12, 10 for 14×14 and 16×16, and one for 18×18 and 20×20. The formula solver needs milliseconds and runs 1000 times on every board. Other runs stay in their own directories and are listed under the table, including [`benchmark/2024-03`](./benchmark/2024-03) (March 2024, up to 1,000 runs per board, machine not recorded) and [`benchmark/2024-04`](./benchmark/2024-04) (April 2024, 100,000 runs per board on an Intel Core i7-8700).

To run the benchmark with a different number of iterations or test cases, pass them with the `-n`, `-m` and `-o` arguments (`-o` skips the first test cases), and limit the run to one solver with `--only`:

```sh
node benchmarkRunner.js -n <k> -m <m> -o <o> --only dominoTilingSolver-BigInt.js
```

4. Run tests:

```sh
pnpm test
```

By default, this command runs the first 7 test cases: boards up to 10×10 for the `Number` solver (it is not exact beyond that) and up to 12×12 for the `BigInt` and formula solvers. The same default is used in CI. Increasing this value may lead to a significantly longer test execution time. Every run also checks a few rectangular boards (3×4 and 2×33 in both orientations), the argument parser and the error messages for invalid arguments and boards above the size cap. The renderer tests (`pnpm test:render`) compare unranking with the enumeration, check the uniformity of random tilings with a chi-squared test at p = 0.001 and run the command line on boards without tilings.

To run a different number of test cases, pass it with the `-m` argument:

```sh
node testRunner.js -m <m>
```

Replace `<m>` with the number of test cases you want to run.

To run all available test cases, omit the argument:

```sh
node testRunner.js
```

## 🖼️ Visualization

Rendering is a separate tool, so the solvers, tests and benchmarks are not affected by it. Every tiling has a fixed number, and any of them can be rebuilt directly from that number (unranking with the same dynamic programming table the solver uses), so even the 53,060,477,521,960,000th tiling of a 12×12 board renders instantly.

```sh
pnpm render -r 4 -c 4                       # all 36 tilings as SVG sheets in output/4x4/
pnpm render -r 2 -c 2 --ascii               # print tilings in the terminal
pnpm render -r 8 -c 8 -o 5000 -l 200        # tilings 5001-5200 of 12,988,816
pnpm render -r 12 -c 12 -i 1000000000000    # one specific tiling
pnpm render -r 10 -c 10 --random --ascii    # a random tiling
pnpm render -r 20 -c 20 --random -l 12      # 12 uniformly random tilings of a 20×20 board
```

- `-l <limit>`: maximum number of tilings to render (default: 1000).
- `-o <offset>`: number of tilings to skip, for paging through large boards.
- `-i <number>`: render a single tiling by its 1-based number.
- `--random`: render a single random tiling (with `-l`, several of them on boards too large to number).
- `--all`: remove the limit; allowed only for boards with at most 100,000 tilings (6×6 and smaller squares), so it never fills the disk.

Numbering needs a counting table of `(rowCount × colCount + 1) × 2^colCount` entries, which is about 250 MB for 16×16, 1.1 GB for 18×18 and several GB for 20×20. The command line numbers boards whose table has at most 4 million entries (up to 14×14). The table grows with the number of columns, so a 30×2 board can be numbered while the same board turned sideways (2×30) cannot. For larger boards `--random` switches to monotone coupling from the past (Propp and Wilson), which samples tilings uniformly at random without any table.

The [online gallery](https://dawidrylko.github.io/domino-tiling/) does the same in the browser: it pages through every tiling of boards up to 18×18 and shows uniformly random tilings of a 20×20 board, without storing any images. The counting tables are built in a Web Worker that keeps only one large table in memory at a time, so the page stays responsive. It is built with `pnpm site:build` and deployed to GitHub Pages on every push to `master`.

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

The formula on the gallery page is set in a subset of [STIX Two Math](https://github.com/stipub/stixfonts) 2.13 (tag `v2.13b171`, file `fonts/static_otf/STIXTwoMath-Regular.otf`), which is licensed under the SIL Open Font License 1.1, not MIT. The subset is a modified font and STIX Two is a trademark of the IEEE, so it is renamed Domino Tiling Math. The font and its license are in [site/fonts](./site/fonts). When the formula gains a character, add the code point the browser draws to `FORMULA` in `site/fonts/subset.py` (a single-letter `<mi>` is drawn in mathematical italic, so `m` becomes U+1D45A) and rebuild the font with `python3 site/fonts/subset.py STIXTwoMath-Regular.otf` (needs fontTools and brotli).

## 👨‍💻 Author

This project was created by [Dawid Ryłko](https://dawidrylko.com). The dynamic programming solver and the test and benchmark runners are described in two blog posts: 🇵🇱 [Domino Tiling](https://dawidrylko.com/domino-tiling/) and 🇵🇱 [Domino tiling library](https://dawidrylko.com/domino-tiling-library/).
