# <img src=".github/assets/domino.svg" alt="" width="36" height="36"> Domino Tiling

[![Continuous Integration](https://github.com/dawidrylko/domino-tiling/actions/workflows/ci.yml/badge.svg)](https://github.com/dawidrylko/domino-tiling/actions/workflows/ci.yml)
[![Pages](https://github.com/dawidrylko/domino-tiling/actions/workflows/pages.yml/badge.svg)](https://github.com/dawidrylko/domino-tiling/actions/workflows/pages.yml)

**[🖼️ Gallery of tilings & 📊 benchmark results](https://dawidrylko.github.io/domino-tiling/)**

> Number of domino tilings of a 2n×2n board ([OEIS A004003](https://oeis.org/A004003)):
>
> 1, 2, 36, 6728, 12988816, 258584046368, 53060477521960000, 112202208776036178000000, 2444888770250892795802079170816, 548943583215388338077567813208427340288, 1269984011256235834242602753102293934298576249856

## 📖 Overview

This repository contains two JavaScript solvers for the domino tiling problem: one based on the standard `Number` type and one based on `BigInt`. Both calculate the number of ways to tile a rectangular grid with 2×1 and 1×2 dominoes. The repository also includes a test suite, a benchmark runner and a renderer that draws any individual tiling.

## ❓ Problem Statement

The main problem tackled by this project is determining the number of different ways to completely cover an 8×8 board with 2×1 domino tiles – the answer is 12,988,816. The same solvers handle any rectangular board; `Number` stays exact up to 2<sup>53</sup> (10×10), while `BigInt` keeps the results exact for larger boards such as 20×20.

## 💡 Solution

The core of the solution lies in a recursive function named `searchTileArrangements`, combined with dynamic programming over bitmasks (also known as the broken-profile method). The board is processed row by row, and the number of ways to reach every possible occupancy pattern of the next row is accumulated in a table instead of enumerating whole tilings.

## 🧩 Key Components

- **Parameters**: The function `searchTileArrangements` takes parameters such as `tilingMatrix`, `rowCount`, `colCount`, `rowIndex`, `colIndex`, `currentMask`, and `nextMask`.
- **Function Flow**: The function walks through the cells of the current row. A cell that is already covered is skipped; a free cell is covered either by a vertical domino (which reaches into the next row) or by a horizontal domino (if the cell to its right is free as well).
- **Bitwise Operations**: `currentMask` marks the cells of the current row that are already covered by vertical dominoes from the row above, and `nextMask` marks the cells of the next row that the current row's vertical dominoes reach into. With one bit per column, all occupancy patterns of a row fit in `2^colCount` table entries.
- **Complexity**: The table has `(rowCount + 1) × 2^colCount` entries, so the running time grows linearly with the number of rows and exponentially with the number of columns.

## 📋 Requirements

- [Node.js](https://nodejs.org/) 26 or newer – the exact version is specified in the `.nvmrc` file (run `nvm use`).
- [pnpm](https://pnpm.io/) – the version is pinned in the `packageManager` field of `package.json`. Install it with `npm install -g pnpm` (Corepack is no longer bundled with Node.js 25 and newer).

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

This command runs every benchmark case 1000 times and saves the results in the [`benchmark`](./benchmark) directory. The results are also presented on the [benchmark page](https://dawidrylko.github.io/domino-tiling/#benchmark). Large boards take a long time to solve (a single 20×20 run takes almost half an hour), so consider fewer iterations.

To run the benchmark with a different number of iterations, pass it with the `-n` argument:

```sh
node benchmarkRunner.js -n <k>
```

4. Run tests:

```sh
pnpm test
```

By default, this command runs the first 7 test cases (boards up to 12×12). The same default is used in CI. Increasing this value may lead to a significantly longer test execution time.

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
pnpm render -r 2 -c 4 --ascii               # print tilings in the terminal
pnpm render -r 8 -c 8 -o 5000 -l 200        # tilings 5001-5200 of 12,988,816
pnpm render -r 12 -c 12 -i 1000000000000    # one specific tiling
pnpm render -r 10 -c 10 --random --ascii    # a random tiling
pnpm render -r 20 -c 20 --random -l 12      # 12 uniformly random tilings of a 20×20 board
```

- `-l <limit>` – maximum number of tilings to render (default: 1000).
- `-o <offset>` – number of tilings to skip, for paging through large boards.
- `-i <number>` – render a single tiling by its 1-based number.
- `--random` – render a single random tiling (with `-l`, several of them on boards too large to number).
- `--all` – remove the limit; allowed only for boards up to 144 cells.

Numbering needs a counting table of `(rowCount × colCount + 1) × 2^colCount` entries, which is about 1 GB for 18×18 and several GB for 20×20. For boards that large, `--random` switches to monotone coupling from the past (Propp–Wilson), which samples tilings uniformly at random without any table.

The [online gallery](https://dawidrylko.github.io/domino-tiling/) does the same in the browser: it pages through every tiling of boards up to 18×18 and shows uniformly random tilings of a 20×20 board, without storing any images. The counting tables are built in a Web Worker, so the page stays responsive. It is built with `pnpm site:build` and deployed to GitHub Pages on every push to `master`. Renderer tests run with `pnpm test:render`.

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## 👨‍💻 Author

This project was created by [Dawid Ryłko](https://dawidrylko.com) and is fully documented in the blog post titled 🇵🇱 [Domino Tiling](https://dawidrylko.com/domino-tiling/).
