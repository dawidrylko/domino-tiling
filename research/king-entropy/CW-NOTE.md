# Calkin–Wilf lower bound for king dimers: status

Question: does the Calkin–Wilf (CW) lower bound

    s >= (a_{2q+p} - a_{2q}) / p,        a_k = log lambda_k (free strip, k rows),

hold for perfect matchings of the king graph, and can it be proven?
Everything below is produced by `python3 cw.py > out_cw.txt` (commit in the
log of `out_cw.txt`); free-strip `a_k` come from `bounds.py 24`, `s` from
`estimate.py`.

**Verdict: neither proven nor refuted.** The standard proof is impossible
here (no reflection positivity), but every testable consequence holds, and
the bound follows from a simpler, exactly testable conjecture (L) below.

## 1. Why the standard proof does not apply

The usual proof writes `Z(2q+p, m) = <g, X g>`, `Z(2q, m) = <g, G g>` with
`g` the top-half partition vector and a positive semidefinite gluing form `G`
(reflection positivity, RP), which gives `Z(2q+p, m) <= rho(R_m)^p Z(2q, m)`
for every width `m`; then `m -> infinity`.

For the king lattice RP fails for every reflection line:

- between rows: a crossing diagonal is mapped to the other diagonal, so the
  gluing form is `M(A, B)` = number of matchings `A -> B` with `|a - b| <= 1`;
  `min eig M = 1 - sqrt 2` already at `m = 3`, and the negative eigenvector
  `(1, -sqrt 2, 1)` on `A = {0}, {1}, {2}` is realised by real 3-row top
  halves (`g = 10, 4, 10`), so `<F, theta F> < 0` for an explicit `F`;
- through a row (or column, or diagonal) of vertices: each mirror vertex is
  covered from exactly one side, kernel `[U != D]`, indefinite (`m = 1`:
  eigenvalues `+1, -1`);
- the transfer is only P-self-adjoint, `R^T = P R P` (P = reflection of the
  crossing edges), not symmetric: at `w = 3`, `T[{} -> {1}] = 2` but
  `T[{1} -> {}] = 0`.

Consequence for the spectral measure `Z(k, m) = sum_i c_i lambda_i^k`: for a
symmetric transfer all `c_i >= 0` and real `lambda_i`, which alone implies the
finite-m CW inequality for all `q`. Here, from `m = 3` on, part of the
e0-visible spectrum is complex or has `c_i < 0` (up to 802 of 1032 visible
eigenvalues at `m = 12`), though only at `|lambda_i| / lambda_1 <= 0.23`;
the leading correction is always real with `c_2 > 0` (`m <= 12`).

## 2. A weaker sufficient hypothesis

**(L)** For every width `m`, `q -> Z(2q, m)` is log-convex:
`Z(2q, m)^2 <= Z(2q-2, m) Z(2q+2, m)`.

(L) implies `a_{2q} = lim_m (1/m) log Z(2q, m)` is convex in `q` (a pointwise
limit of convex sequences); its increments then increase to their limit `2s`,
so `a_{2q+2r} - a_{2q} <= 2 r s`: **CW for every even p.**

**(O)** `a_{k+1} - a_k >= s` for every odd `k`.

(L) and (O) give CW for odd `p`:
`a_{2q+p} - a_{2q} = (a_{2q+p+1} - a_{2q}) - (a_{2q+p+1} - a_{2q+p}) <= (p+1)s - s`.

Note that log-convexity is false for odd row counts: `Z(2j+1, m)` is
log-concave in `j` in 205 of 208 tested cases. That matches the picture
below: odd strips approach the limit from below, even strips from above.

## 3. Evidence (exact where it can be)

| test | range | result |
| --- | --- | --- |
| (I2) = (L), exact integers | m = 2..20, 2q <= 64 (m <= 12) ... 14 (m = 19, 20) | XX violations in XX cases |
| (I1) finite-m CW, `rho_m` float | same | 0 violations > 1e-12 in XX cases; XX within 1e-12 (large q, sign fixed by the leading `c_2 > 0`) |
| limit form, all CW pairs | 2q <= 22, 2q+p <= 24 | max candidate XX, below s by XX |
| `a_{2q}` convex | 2q = 8..24 | XX |
| (O) | k = 3..23 | min of `a_{k+1} - a_k - s` = XX |

`f(k) = a_k - s k` is decreasing on even `k`, increasing on odd `k`, and every
even value lies above every odd one; the limit `-2 sigma ~ -0.48403587153`
(twice the surface free energy) sits between them.

## 4. What the bound would give

Conditional, rigorous given the hypothesis (certified `lambda` bounds from
`bounds.py`, `cw.py` section E):

- given (L): **s >= XX** (2q = XX, p = XX)
- given (L) and (O): s >= XX

compared with the unconditional Fekete bound `s >= XX` (w = 24) and the
estimate `s = XX`.

## 5. Open

- Prove (L). Equivalent to log-convexity of `||g_q||_M^2` for the
  M-self-adjoint `N = V M`; Cauchy–Schwarz needs `M >= 0`, which fails.
  A proof needs structure beyond RP (e.g. a sign-reversing involution on
  pairs of configurations, or a positive representation of `Z(2q, m)`).
- (O) has no proof route yet; numerically its margin decays like the
  even/odd splitting of the free strips.
