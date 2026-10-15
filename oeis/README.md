# OEIS material

Programs, b-files and submission text for the sequences this repository counts.

| File | Content |
| --- | --- |
| [`A239273.gp`](./A239273.gp) | PARI program for A239264 (`T(h, w)`) and A239273 (`a(n)`) |
| [`b239273.txt`](./b239273.txt) | A239273, n = 0..12 |
| [`b239264.txt`](./b239264.txt) | A239264, antidiagonals 0..44, flattened |
| [`buildBFiles.js`](./buildBFiles.js) | Builds both b-files with `domiculeTilingSolver-Modular.js` and reuses the values they already hold |

```sh
node oeis/buildBFiles.js -d 44 -n 12
echo 'read("oeis/A239273.gp"); print(vector(7, n, a(n-1)))' | gp -q
```

## A239273: new terms a(10)-a(12)

The published entry (revision #29) ends at a(9) = 1458834332808489549111708247664894524221330758005874053074138540424018259 (Alois P. Heinz, 2018). The new terms were counted with [`domiculeTilingSolver-Modular.js`](../domiculeTilingSolver-Modular.js) on a 4-core Intel Xeon at 2.10 GHz (Node.js 22):

| n | Board | Digits | Time |
| --- | --- | --- | --- |
| 10 | 20 × 20 | 90 | 43 s |
| 11 | 22 × 22 | 110 | 215 s |
| 12 | 24 × 24 | 132 | 1253 s |

How the terms were checked:

- Both solvers (`BigInt` and modular) reproduce every published term of A239273 (n = 0..9) and the 78 terms of A239264 in its data section; the PARI program reproduces A239264 for 0 ≤ h, w ≤ 6 and A239273 for n ≤ 6.
- The modular solver picks enough primes for the Kahn–Lovász bound, rebuilds the count with the Chinese remainder theorem and checks it against one more prime.
- a(10) was recounted with the `BigInt` solver, which shares the method but not the arithmetic.

### Lines to paste into the draft of A239273

LINKS (replaces nothing, the entry has no b-file yet):

```
Dawid Ryłko, <a href="/A239273/b239273.txt">Table of n, a(n) for n = 0..12</a> (terms n = 0..9 from Alois P. Heinz)
```

PROG (after the Mathematica program):

```
(PARI) \\ T(h, w) = A239264, broken-profile DP over the cells in row-major order.
T(h, w) = {my(S = 2^(w+2), v = vector(S), u); if(h*w == 0, return(1)); v[1] = 1; for(p = 0, h*w-1, my(r = p\w, c = p%w, d = []); if(c+1 < w, d = concat(d, 1)); if(r+1 < h, if(c > 0, d = concat(d, w-1)); d = concat(d, w); if(c+1 < w, d = concat(d, w+1))); u = vector(S); for(s = 0, S-1, my(x = v[s+1]); if(x, if(bitand(s, 1), u[(s>>1)+1] += x, for(i = 1, #d, if(!bittest(s, d[i]), my(t = (s + 2^d[i])>>1); u[t+1] += x))))); v = u); v[1]};
a(n) = T(2*n, 2*n); \\ _Dawid Ryłko_, Oct 15 2026
```

EXTENSIONS:

```
a(10)-a(12) from _Dawid Ryłko_, Oct 15 2026
```

The b-file itself is uploaded on the draft page (the "upload a b-file" link next to LINKS).

Discussion:

```
a(10)-a(12) were counted with broken-profile dynamic programming over the cells in row-major order (a state is the set of covered cells among the next 2n+2 cells), modulo primes below 2^31, combined with the CRT and checked against one extra prime; the number of primes comes from the Kahn-Lovasz bound on the number of perfect matchings. The same program reproduces a(0)-a(9) and the data of A239264; a(10) was also recounted with exact integers. Code: https://github.com/dawidrylko/domino-tiling
```

## A239264: b-file extended to antidiagonals 0..44

The published b-file (Alois P. Heinz) covers antidiagonals 0..36 (703 terms); [`b239264.txt`](./b239264.txt) covers 0..44 (1035 terms, at most 110 digits). It was built with `node oeis/buildBFiles.js -d 44 -n 12` in under 11 minutes on the machine above. Checks:

- the 78 terms of the data section and the 134 data terms of the columns A239265-A239272 match;
- every term equals its transpose, A(n, k) = A(k, n), although only one of them is counted;
- the terms A(2n, 2n) match `b239273.txt`.

Heinz's b-file is a Git LFS file that could not be downloaded here, so antidiagonals 0..36 have not been compared with it line by line; the editors' diff on the draft page shows any difference.

### Lines to paste into the draft of A239264

LINKS (replaces the existing b-file line):

```
Alois P. Heinz and Dawid Ryłko, <a href="/A239264/b239264.txt">Antidiagonals n = 0..44, flattened</a> (antidiagonals 0..36 from Alois P. Heinz)
```

PROG: the same PARI program as for A239273, without the line `a(n) = T(2*n, 2*n);` and signed after `T`.
