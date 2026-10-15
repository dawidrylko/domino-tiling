# Method

This note describes how the project counts, numbers and samples two kinds of tilings of a board: domino tilings ([OEIS A004003](https://oeis.org/A004003)) and domicule tilings ([OEIS A239264](https://oeis.org/A239264), [A239273](https://oeis.org/A239273)). The computations behind every number are in the notebooks for [A004003](02-a004003.md) and [A239273](03-a239273.md).

## Problem

A domino covers two cells of the board that share a side. A tiling covers every cell exactly once, so it is a perfect matching of the grid graph whose vertices are the cells and whose edges join cells that share a side. A domicule may also cover two cells that share only a corner; its tilings are the perfect matchings of the king's graph, where every cell is joined to its eight neighbours.

The questions are the same for both pieces: how many tilings a board of $h \times w$ cells has, what the tiling with a given number looks like, and how to draw a tiling uniformly at random when there are too many to number.

## Domino tilings

### Closed form

Kasteleyn and Fisher found in 1961 that a $2n \times 2n$ board has

```math
a(n) = \prod_{j=1}^{n} \prod_{k=1}^{n} \left( 4\cos^2\frac{j\pi}{2n+1} + 4\cos^2\frac{k\pi}{2n+1} \right)
```

tilings. Evaluated with floating-point cosines the product loses its last digits from $12 \times 12$ on, so the formula solver evaluates it exactly. The numbers $x_j = 4\cos^2(j\pi/(2n+1))$, $j = 1, \dots, n$, are the roots of a monic integer polynomial $P$ of degree $n$, and the double product over $x_j + x_k$ is, up to sign, the resultant of $P(x)$ and $P(-x)$:

```math
a(n) = (-1)^n \operatorname{Res}\bigl(P(x), P(-x)\bigr), \qquad P(x^2) = U_{2n}(x/2)
```

where $U_{2n}$ is the Chebyshev polynomial of the second kind. The resultant is the determinant of the Sylvester matrix, an integer matrix of size $2n$, and fraction-free Bareiss elimination keeps every intermediate value an integer. No square root and no floating point is involved, and $20 \times 20$ takes milliseconds. The same formula is a two-line PARI/GP program in [`pari/A004003.gp`](../pari/A004003.gp).

### Transfer by rows

Two solvers count tilings directly. They scan the board row by row and keep, for every bitmask of the cells of the current row that a vertical domino from the row above already covers, the number of ways to reach it. A row is filled by a depth-first search that places horizontal dominoes in free pairs and starts vertical ones into the next row. The table has $2^{w}$ entries per row, so the cost grows with the shorter side and the solvers turn the board so that it is the row width. One solver keeps the counts as JavaScript numbers and is exact only while they stay below $2^{53}$ (up to $10 \times 10$); the other keeps them as `BigInt`.

### Numbering

To show tiling number $r$ without listing the ones before it, the gallery processes the board one cell at a time in row-major order. The state is the set of covered cells among the next $w$ cells, and a table of completion counts, `table[i][state]`, stores in how many ways the board can be finished from cell $i$ in that state. It has $(hw + 1) \cdot 2^{w}$ entries. Unranking walks the cells, tries a horizontal domino before a vertical one, and moves to the second choice after subtracting the number of tilings the first choice would cover. Every tiling of a board up to $18 \times 18$ can be shown this way in a browser.

### Sampling

The table for $20 \times 20$ would need several gigabytes, so the gallery samples instead. Domino tilings of a simply connected region form a distributive lattice under the rotation of two parallel dominoes in a $2 \times 2$ square, with a top and a bottom tiling. Monotone coupling from the past (Propp and Wilson) runs the same random rotations from the top and the bottom tiling, starting further and further in the past, until both runs meet at time 0. The meeting point is an exactly uniform tiling.

## Domicule tilings

### Transfer by cells

A domicule tiling is counted with the same cell-by-cell scan. A free cell is matched with its right, down-left, down or down-right neighbour, so the farthest cell a state has to remember lies $w + 1$ places ahead and a state has $w + 2$ bits. The table is four times wider than the domino one. [`domiculeTilingSolver-BigInt.js`](../src/solvers/domiculeTilingSolver-BigInt.js) keeps the counts as `BigInt` and is the reference. The same scan is in [`pari/A239273.gp`](../pari/A239273.gp), where `T(h, w)` is A239264 and `a(n)` is A239273.

### Counting modulo primes

The scan only adds counts, so it can run modulo a prime $p < 2^{31}$: the sum of two residues stays below $2^{32}$ and fits a `Uint32Array` cell. [`domiculeTilingSolver-Modular.js`](../src/solvers/domiculeTilingSolver-Modular.js) counts modulo several primes in parallel worker threads and rebuilds the exact count with the Chinese remainder theorem. It needs enough primes for their product to exceed the count, and the Kahn-Lovász theorem (proved by Alon and Friedland in 2008) bounds the number of perfect matchings of a graph with degrees $d(v)$:

```math
\#\text{perfect matchings} \le \prod_{v} \bigl(d(v)!\bigr)^{1/(2d(v))}
```

Every prime contributes at least 30 bits, so $\lceil (\log_2 B + 1)/30 \rceil$ primes suffice for a bound $B$. One more prime checks the result: the rebuilt count must agree with the residue modulo that prime, and a mismatch stops the solver.

### Sampling with a Markov chain

Domicule tilings have no lattice structure like the domino rotations, so coupling from the past does not apply. Up to $16 \times 16$ the gallery numbers every tiling with a table of $(hw + 1) \cdot 2^{w+2}$ entries, which is exactly uniform when the number is drawn at random. For $18 \times 18$ and $20 \times 20$ it runs a Markov chain. A step picks a cell $a$ and one of its eight neighbours $c$; when the partner $b$ of $a$ and the partner $d$ of $c$ are neighbours too, the pairs $ab$ and $cd$ become $ac$ and $bd$. Each such move arises from four ordered choices, and so does the move back, so the proposal is symmetric and the uniform distribution is stationary. On every board small enough to check (up to $4 \times 5$) the moves connect all tilings. A finite chain is only approximately uniform, and the gallery says so.

## Verification

Every count is checked in more than one independent way:

- the three domino solvers agree with each other and with A004003 up to $20 \times 20$, and the two domicule solvers with A239273 and the data section of A239264;
- both PARI/GP programs run in CI against the same data;
- unranking is checked against an enumeration of every tiling of the small boards, and every unranked tiling is checked for coverage;
- coupling from the past and the domicule chain are checked with chi-squared tests on $2 \times 2$ and $4 \times 4$;
- the modular solver checks every result against an extra prime.

The tests are in [`tests/`](../tests), the known values in [`data/`](../data).

## References

- P. W. Kasteleyn, The statistics of dimers on a lattice, Physica 27 (1961), 1209-1225.
- M. E. Fisher, Statistical mechanics of dimers on a plane lattice, Phys. Rev. 124 (1961), 1664-1672.
- J. G. Propp and D. B. Wilson, Exact sampling with coupled Markov chains, Random Structures and Algorithms 9 (1996), 223-252.
- N. Alon and S. Friedland, The maximum number of perfect matchings in graphs with a given degree sequence, Electronic Journal of Combinatorics 15 (2008), N13.
