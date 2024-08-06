# 🎲 Domino Tiling

[![Continuous Integration](https://github.com/dawidrylko/domino-tiling/actions/workflows/ci.yml/badge.svg)](https://github.com/dawidrylko/domino-tiling/actions/workflows/ci.yml)

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

To ensure compatibility and consistency, it's important to use the Node.js version specified in the `.nvmrc` file within the root directory of your project.

## 🚀 Getting Started

1. Clone the repository:

```sh
git clone https://github.com/dawidrylko/domino-tiling.git
```

2. Run the project:

```sh
npm start
```

This command will execute the benchmark tests 1000 times.

If you want to run the benchmark tests with a different number of iterations, you can specify the number of iterations as an argument:

```sh
node benchmarkRunner.js -n <k>
```

3. Run tests:

```sh
npm test
```

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## 👨‍💻 Author

This library was created by [Dawid Ryłko](https://dawidrylko.com) and is fully documented in the blog post titled 🇵🇱 [Domino Tiling](https://dawidrylko.com/domino-tiling/).
