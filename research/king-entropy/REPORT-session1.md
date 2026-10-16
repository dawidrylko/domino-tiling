# Session 1 — dimer entropy on the king graph

Branch `d/king-entropy`, directory `research/king-entropy/`. Source of every number: script + arguments
+ code commit → output file in the repo (commit with the result in parentheses).

SHAs in this report (and in `CW-NOTE.md`) were replaced in session 3 by the current ones: the original ones were invalidated by an authorship rewrite; mapped by commit subject (the old commits are still visible on GitHub), table in `paper/NUMBERS.md`; the `commit` fields in output files keep the old values.

## Result

**s = 0.565511911041325 ± 4·10⁻¹⁵** (per site; per dimer 2s = 1.13102382208265, eˢ = 1.76034869404198).

Method: king cylinders of width w (periodic across, free along), λ_w = leading eigenvalue
of the row transfer, float64 power iteration on T² separately in the parity sectors
(`tm2.py`, w ≤ 19; `cylw.py`, w = 20…25, same algorithm, transfer code `tmfast.py` @106661e).
Odd w increase monotonically to s, ratio of successive differences r_w = 13.4 → 9.99. Geometric
extrapolation from w = 21, 23, 25: 0.5655119110413253; the previous triple differs by 1.1e-15, a tail with
r dropping to ⅔ would add 3.9e-15 (this is the error bar). Independently: the midpoints of the even-w sectors
decrease to s with the same ratio ~10; their extrapolation (20, 22, 24) = 0.5655119110413256, difference
3.6e-16. Source: `python3 estimate.py` @76fc5e1 → `out_estimate.txt`, `z2.json` (73a0628).
Previous pass (0.565511911 ± 1e-9) confirmed; now 6 more digits.

## Rigorous bounds (`python3 bounds.py 24` @102b7e5 → `out_bounds.txt`, ee63b57)

| | value | why rigorous |
| --- | --- | --- |
| lower | **s ≥ 0.545343749727** (w = 24) | Fekete: free strips side by side give an admissible tiling, Z(K, kw) ≥ Z(K, w)ᵏ ⇒ s ≥ log λ_w / w. λ_w² ≥ c from Collatz–Wielandt: v = iterate from the empty boundary, so supp v = supp T²ⁿe₀; T²v ≥ c·v ⇒ Z(2(n+K)) ≥ cᴷ·const. |
| upper | **s ≤ 0.586216605404** (w = 24) | strips with open sides: a K×kw tiling splits into strips + edges across the cuts; the number of crossings between sets A, B (\|Δr\| ≤ 1) is ≤ F_{n+1} ≤ φⁿ (the lowest cell of A goes to the 1st or 2nd cell of B ⇒ M(n) ≤ M(n−1)+M(n−2)), so Z(K, kw) ≤ W(K, w)ᵏ, W = strip in which a side cell may be "covered from outside" with weight √φ. μ_w² ≤ C: A v ≤ C v componentwise (zeros too), v₀ > 0 ⇒ W(2K) ≤ Cᴷ. |
| upper | s ≤ 0.662787681422 | Kahn–Lovász (proof Alon–Friedland 2008): PM(G) ≤ ∏(d_v!)^{1/(2d_v)}, d_v ≤ 8. |

Rounding: an entry of T²v is 2w steps of ≤ 6 nonnegative terms each ⇒ relative error ≤ 12wu < 3.2e-14;
certificates × (1 ∓ 1e-12), results rounded down/up, subnormal entries excluded (assert).

**Calkin–Wilf: the condition does not hold, but the bound looks true** (`python3 cw.py` @0357d17 →
`out_cw.txt`, `CW-NOTE.md`, 0cf6903). The CW proof needs reflection positivity; here it fails for every
reflection line (T non-symmetric: T[∅→{1}]=2, T[{1}→∅]=0; the gluing form M has λ_min = 1−√2 at m=3,
with an explicit negative functional). The weaker hypothesis **(L): q ↦ Z(2q, m) log-convex for every m**
implies CW for even p — checked exactly (integers): 0 violations in 429
cases, m ≤ 20. All 132 CW pairs lie below s (closest 5.7e-12). **Given (L):
s ≥ 0.565511911035** (certified λ₂₄, λ₂₂) — 11 digits; without a proof of (L) this is not a theorem.
Chessboard (upper bound from even cylinders) needs the same positivity — not certified.

## Z2 signal (even cylinders, `estimate.py` → `z2.json`)

Δ_w = log λ_even − log λ_odd: w=10 1.52e-4, 14 5.12e-6, 18 1.79e-7, 22 6.39e-9, 24 1.21e-9.
Local ξ_w = 2/log(Δ_{w−2}/Δ_w) increases: 1.154 (w=10) → 1.205 (w=24). Fit log Δ = a − w/ξ + b log w,
w = 10…24: **ξ = 1.232**, b = −0.43 (rms 9e-4); 1/ξ_w linear in 1/w: ξ_∞ = 1.235; a pure exponential
gives 1.193 with rms 1.5e-2 (wrong model). In-sector gap (ARPACK, w=20): log(λ₁/|λ₃|) = 1.083.

## What was validated and how

- Brute force (explicit graphs) = transfer: 90/90 boards, king/tri/sq × free/cyl, w = 3…6, h = 1…4 (`validate.py` @73289ea).
- Repo data: squares L ≤ 18, rectangles and the 20×20 count from the README (used in `fitsq.py`) — exactly (CRT, 14 primes).
- Square: free strips = ∏(a+√(1+a²)) and both cylinder sectors = fermionic formula to < 1e-16; limit of the formula = G/π (2e-19), (f−G/π)w² → π/6. A fit of the TM alone with w ≤ 18 gives G/π ± 6e-8 — the same digits as a fit on the exact formula (limited by the asymptotics, not the TM).
- Triangular: cylinder w=17 = Bloch integral from the Kasteleyn orientation (checked |Pf| = count on 9 boards) to 2.9e-15: **s_tri = 0.428594537464959**.
- Free strips w = 3, 4: a(n+1)/a(n) for Z(3×2n) (A239265, bisection ⇒ λ₃²) and Z(4×n) (A239266) → λ_w to 1e-16.
- float64 vs exact numbers (Z_cyl(K+2)/Z_cyl(K), w = 9…13): ≤ 4.1e-16 in log λ; ARPACK on the full transfer w=20: both sectors to 1.8e-15 (`crosscheck.py` @a32a0fe). `tmfast.py` = `tm.py` bit for bit.

Cost (`out_estimate.txt`; up to 3 processes at once on 4 cores, always 19 iterations of T², CW bracket
closed to ulp): w=20 1.3 s/iter, 310 MiB; 21 3.3 s, 587 MiB; 22 6.8 s, 1.1 GiB; 23 16 s, 2.1 GiB;
24 31 s, 4.3 GiB; 25 67 s, 8.4 GiB (22.5 min).

## BLOCKED

- Comparison with OEIS A239265/A239266 and with the literature — out of scope (no network); checked only against our own exact numbers and the repo data.
- w ≥ 26: from measurements ~17 GiB RAM > 15.7 GiB in the container — not run.
- `/usr/bin/time`: `No such file or directory` — replaced by `timed.py`.

## Questions for the next session

1. Prove (L) (log-convexity of Z(2q, m) in q). Gives the rigorous s ≥ 0.565511911035. Cauchy–Schwarz does not work (form M indefinite); another structure is needed (e.g. a sign-reversing involution on pairs of tilings).
2. Better rigorous upper bound than open strips (convergence ~0.5/w); or an upper bound analogous to (L).
3. Form of the odd-w corrections (r_w drifts, ~9.99 at w=25) — relation to ξ_Z2 ≈ 1.23 and the gap 1.08.
4. Limit of f(k) = log λ_k − sk for free strips: −2σ ≈ −0.4840358715 (surface energy) — for the paper.
5. Local literature survey for 0.565511911041325 and s_tri = 0.428594537464959.
