# <img src=".github/assets/domino.svg" alt="" width="36" height="36"> Domino and Domicule Tilings

[![Continuous Integration](https://github.com/dawidrylko/domino-tiling/actions/workflows/ci.yml/badge.svg)](https://github.com/dawidrylko/domino-tiling/actions/workflows/ci.yml)
[![Pages](https://github.com/dawidrylko/domino-tiling/actions/workflows/pages.yml/badge.svg)](https://github.com/dawidrylko/domino-tiling/actions/workflows/pages.yml)
[![Site](https://img.shields.io/badge/Site_%26_notebooks-dawidrylko.github.io-4f7cac?style=flat)](https://dawidrylko.github.io/domino-tiling/)
[![Blog post](https://img.shields.io/badge/Blog_post_%28PL%29-dawidrylko.com-e0a458?style=flat)](https://dawidrylko.com/domino-tiling/)

## Abstract

How many ways are there to cover a $2n \times 2n$ board with pieces that each cover two neighbouring cells, and what does any one of those coverings look like? For dominoes, which join cells that share a side, the count is [OEIS A004003](https://oeis.org/A004003) and has a closed form (Kasteleyn, Fisher, 1961). For domicules, which may also join cells that share only a corner, the count is [OEIS A239273](https://oeis.org/A239273) on squares and [A239264](https://oeis.org/A239264) on rectangles, and no closed form is used here. This repository counts both exactly, numbers every tiling so that any single one can be drawn from its number, and samples tilings of boards too large to number. It evaluates the domino product formula exactly as a resultant of two integer polynomials, counts domicule tilings with a cell-by-cell transfer that runs modulo primes in parallel and is rebuilt with the Chinese remainder theorem, and checks the solvers against each other, against the OEIS and against two PARI/GP programs run in CI. The results, the method and the computations are on the [project site](https://dawidrylko.github.io/domino-tiling/).

## Results

Both sequences up to $20 \times 20$. The term marked **new** is not in the OEIS yet; the site recounts it on every build and the modular solver checks it against an extra prime.

| n | board | A004003 (dominoes) | A239273 (domicules) |
| --: | --- | --: | --: |
| 0 | 0×0 | 1 | 1 |
| 1 | 2×2 | 2 | 3 |
| 2 | 4×4 | 36 | 280 |
| 3 | 6×6 | 6728 | 3037561 |
| 4 | 8×8 | 12988816 | 3263262629905 |
| 5 | 10×10 | 258584046368 | 326207195516663381931 |
| 6 | 12×12 | 53060477521960000 | 3011882198082438957330143630563 |
| 7 | 14×14 | 112202208776036178000000 | 2565014347691062208319404612723752103028288 |
| 8 | 16×16 | 2444888770250892795802079170816 | 201442620359313683494245316355883565275531844406384955392 |
| 9 | 18×18 | 548943583215388338077567813208427340288 | 1458834332808489549111708247664894524221330758005874053074138540424018259 |
| 10 | 20×20 | 1269984011256235834242602753102293934298576249856 | 974206002957112698855240779762528002509423239819130603938953917534367085458193363176670427 **new** |

## Notes

The notes are Markdown files with code cells. The site build runs every cell and publishes the output under it, so the rendered pages are notebooks whose results are recomputed from this repository on every deploy.

- [Method](notes/01-method.md) ([rendered](https://dawidrylko.github.io/domino-tiling/notes/method.html)): the closed form and the resultant, transfer by rows and by cells, numbering, coupling from the past, counting modulo primes, the Markov chain for domicules, and how every number is verified.
- [A004003 notebook](notes/02-a004003.md) ([rendered](https://dawidrylko.github.io/domino-tiling/notes/a004003.html)): three methods side by side, the floating-point error of the product, the polynomial behind the resultant, running times.
- [A239273 notebook](notes/03-a239273.md) ([rendered](https://dawidrylko.github.io/domino-tiling/notes/a239273.html)): the sequence up to $20 \times 20$, the A239264 table, the Kahn-Lovász bound, the Chinese remainder theorem at work, a uniformity test of the Markov chain.

## Method in brief

- **Domino closed form.** The numbers $4\cos^2(j\pi/(2n+1))$ are the roots of a monic integer polynomial $P$ with $P(x^2) = U_{2n}(x/2)$, so $a(n) = (-1)^n \operatorname{Res}(P(x), P(-x))$, the determinant of a $2n \times 2n$ integer matrix, computed with fraction-free Bareiss elimination.
- **Transfer.** Dominoes are counted row by row with a bitmask of the next row; domicules cell by cell, with a state of the next $w + 2$ cells, because a cell can be matched with its right, down-left, down or down-right neighbour.
- **Modular counting.** The domicule transfer only adds, so it runs modulo primes below $2^{31}$ in `Uint32Array` tables, one worker thread per prime. The Kahn-Lovász bound on perfect matchings gives the number of primes, the Chinese remainder theorem rebuilds the count, and one more prime checks it.
- **Numbering and sampling.** A table of completion counts turns a number into a tiling and back. Domino tilings too large to number are sampled exactly with monotone coupling from the past; domicule tilings with a symmetric Markov chain of pair swaps, which is approximately uniform.

The PARI/GP programs, both run in CI against the known values:

```gp
a(n) = my(P = substpol(polchebyshev(2*n, 2, x/2), x^2, x)); (-1)^n * polresultant(P, subst(P, x, -x));
```

```gp
T(h, w) = {
  my(S = 2^(w+2), v = vector(S), u);
  if (h*w == 0, return(1));
  v[1] = 1;
  for (p = 0, h*w-1,
    my(r = p\w, c = p%w, d = []);
    if (c+1 < w, d = concat(d, 1));
    if (r+1 < h,
      if (c > 0, d = concat(d, w-1));
      d = concat(d, w);
      if (c+1 < w, d = concat(d, w+1)));
    u = vector(S);
    for (s = 0, S-1,
      my(x = v[s+1]);
      if (x,
        if (bitand(s, 1),
          u[(s>>1) + 1] += x,
          for (i = 1, #d, if (!bittest(s, d[i]), my(t = (s + 2^d[i])>>1); u[t+1] += x)))));
    v = u);
  v[1]
};
a(n) = T(2*n, 2*n);
```

The first is [`pari/A004003.gp`](pari/A004003.gp), the second [`pari/A239273.gp`](pari/A239273.gp), where `T(h, w)` is A239264 and `a(n)` is A239273.

## Repository layout

```text
src/solvers/      command-line solvers, one file per method
  dominoTilingSolver.js             dominoes, transfer by rows, Number (exact up to 10×10)
  dominoTilingSolver-BigInt.js      dominoes, transfer by rows, BigInt
  dominoTilingSolver-Formula.js     dominoes, the product formula as a resultant
  domiculeTilingSolver-BigInt.js    domicules, transfer by cells, BigInt (reference)
  domiculeTilingSolver-Modular.js   domicules, transfer modulo primes, worker threads, CRT
src/renderer/     numbering, coupling from the past, the domicule chain, SVG and ASCII output
src/dominoTilingRenderer.js         command line for drawing tilings
pari/             PARI/GP programs
notes/            the method and the notebooks, built into the site
data/             known values the solvers, the PARI programs and the site are checked against
tests/            test runners for the solvers, the renderer, the PARI programs and the site
benchmarks/       the benchmark runner and its results, one directory per month and machine
site/             the site: gallery, benchmark tables, notes
```

## Reproducing the results

Requirements: [Node.js](https://nodejs.org/) 26 or newer (`.nvmrc`), [pnpm](https://pnpm.io/) (version pinned in `package.json`), and for the PARI tests [PARI/GP](https://pari.math.u-bordeaux.fr/) (`apt install pari-gp`, `brew install pari`; set `GP_PATH` when `gp` is not on the `PATH`).

```sh
git clone https://github.com/dawidrylko/domino-tiling.git
cd domino-tiling
pnpm install
```

Counting a single board:

```sh
node src/solvers/dominoTilingSolver-Formula.js -r 20 -c 20
node src/solvers/domiculeTilingSolver-Modular.js -r 20 -c 20    # -j <jobs> sets the number of worker threads
```

Verification:

```sh
pnpm test           # solvers against data/, up to 12×12 (node tests/testRunner.js runs every known term)
pnpm test:render    # numbering, sampling and drawing
pnpm test:pari      # both PARI/GP programs and their copies in this README
pnpm site:build     # runs the notebooks and builds dist/site
pnpm test:site      # the built site in headless Chrome at 1440, 786 and 375 px (set CHROME_PATH if needed)
```

Benchmarks:

```sh
pnpm benchmark            # domino solvers, results in benchmarks/results/<year-month>
pnpm benchmark:domicule   # domicule solvers, 10 runs up to 16×16 and one modular run of 18×18 and 20×20
```

A run writes `environment.json` next to the timings and refuses to mix machines or Node.js versions in one month directory unless given `--force`. The site shows the newest directory that holds the largest board of every solver. Older runs stay in [`benchmarks/results`](benchmarks/results): March 2024 (machine not recorded) and April 2024 (100,000 runs per board on an Intel Core i7-8700).

## Drawing tilings

Every tiling has a number, and the renderer rebuilds any tiling from it without listing the ones before:

```sh
pnpm render -r 8 -c 8 -o 5000 -l 200              # tilings 5001-5200 of 12,988,816, as SVG sheets in output/8x8/
pnpm render -r 12 -c 12 -i 1000000000000 --ascii  # one tiling, printed in the terminal
pnpm render -r 20 -c 20 --random -l 12            # 12 uniformly random tilings (coupling from the past)
pnpm render -r 4 -c 4 --domicule --all            # all 280 domicule tilings of a 4×4 board
pnpm render -r 20 -c 20 --domicule --random -l 6  # six approximately uniform domicule tilings
```

`-l` limits the number of tilings (default 1000), `-o` skips tilings, `-i` draws one tiling by its 1-based number, `--random` samples, `--all` lifts the limit on boards with at most 100,000 tilings, `--ascii` prints instead of writing SVG. The command line numbers boards whose table has at most 4 million entries: dominoes up to 14×14, domicules up to 12×12. The [gallery](https://dawidrylko.github.io/domino-tiling/) does the same in the browser, up to 18×18 for dominoes and 16×16 for domicules, with sampling above that.

## Citation

If you use the code or the numbers, cite the repository; [`CITATION.cff`](CITATION.cff) holds the metadata, and GitHub offers it as BibTeX under "Cite this repository".

## License

MIT, see [LICENSE](LICENSE).

## Author

[Dawid Ryłko](https://dawidrylko.com). The first version of the domino solvers and the test and benchmark runners is described in two blog posts (in Polish): [Domino Tiling](https://dawidrylko.com/domino-tiling/) and [Domino tiling library](https://dawidrylko.com/domino-tiling-library/).
