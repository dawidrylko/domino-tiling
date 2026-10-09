# 🎲 Domino Tiling

[![Continuous Integration](https://github.com/dawidrylko/domino-tiling/actions/workflows/ci.yml/badge.svg)](https://github.com/dawidrylko/domino-tiling/actions/workflows/ci.yml)
[![Pages](https://github.com/dawidrylko/domino-tiling/actions/workflows/pages.yml/badge.svg)](https://github.com/dawidrylko/domino-tiling/actions/workflows/pages.yml)

**[🖼️ Gallery of tilings & 📊 benchmark results](https://dawidrylko.github.io/domino-tiling/)**

> 1, 2, 36, 6728, 12988816, 258584046368, 53060477521960000, 112202208776036178000000, 2444888770250892795802079170816, 548943583215388338077567813208427340288, 1269984011256235834242602753102293934298576249856

## 📖 Overview

This repository contains a library for solving domino tiling problems using `BigInt` and standard JavaScript. It provides a method to calculate the number of ways to tile a 2D grid with 2x1 and 1x2 dominoes.

## ❓ Problem Statement

The main problem tackled by this library is determining the number of different ways to completely cover an 8x8 board with 2x1 domino tiles.

## 💡 Solution

The core of the solution lies in a recursive function named `searchTileArrangements`. This function explores possible arrangements of domino tiles on the board using dynamic programming for optimization.

## 🧩 Key Components

- **Parameters**: The function `searchTileArrangements` takes parameters such as `tilingMatrix`, `rowCount`, `colCount`, `rowIndex`, `colIndex`, `currentMask`, and `nextMask`.
- **Function Flow**: The function iterates through the board, considering each cell's occupancy status and exploring both vertical and horizontal placement of dominoes.
- **Bitwise Operations**: Bitmasks are used to represent the current and next column's occupancy status, enabling efficient exploration of tile arrangements.

## 📋 Requirements

- [Node.js](https://nodejs.org/) 26 or newer – the exact version is specified in the `.nvmrc` file (`nvm use`).
- [pnpm](https://pnpm.io/) – the version is pinned in the `packageManager` field of `package.json`. Install it with `npm install -g pnpm` (Corepack is no longer bundled with Node.js 25+).

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

This command will execute the benchmark tests 1000 times.

If you want to run the benchmark tests with a different number of iterations, you can specify the number of iterations as an argument:

```sh
node benchmarkRunner.js -n <k>
```

4. Run tests:

```sh
pnpm test
```

This command will run tests for the first 7 test cases by default. This default value is used for my tests and CI. Increasing this value may lead to a significantly longer test execution time.

If you want to run tests for a different number of test cases, you can specify the desired number using the `-m` argument:

```sh
node testRunner.js -m <m>
```

Replace `<m>` with the number of test cases you want to run.

Alternatively, if you don't specify any argument, all available test cases will be run:

```sh
node testRunner.js
```

## 🖼️ Visualization

Rendering is a separate tool with its own enumeration algorithm, so the solvers, tests and benchmarks are not affected by it.

```sh
pnpm render -r 4 -c 4            # all 36 tilings as SVG sheets in output/4x4/
pnpm render -r 2 -c 4 --ascii    # print tilings in the terminal
pnpm render -r 8 -c 8 -o 5000 -l 200   # tilings 5001-5200 of 12,988,816
```

- `-l <limit>` – maximum number of tilings to render (default: 1000).
- `-o <offset>` – number of tilings to skip, for paging through large boards.
- `--all` – remove the limit; allowed only for boards up to 144 cells.

The [online gallery](https://dawidrylko.github.io/domino-tiling/) is built with `pnpm site:build` and deployed to GitHub Pages on every push to `master`. Renderer tests run with `pnpm test:render`.

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## 👨‍💻 Author

This library was created by [Dawid Ryłko](https://dawidrylko.com) and is fully documented in the blog post titled 🇵🇱 [Domino Tiling](https://dawidrylko.com/domino-tiling/).
