# Hypothesis (L): attack log (session 2)

**(L)** For every width m: q ↦ Z(2q, m) is log-convex, Z(2q, m)² ≤ Z(2q−2, m) Z(2q+2, m)
(Z(k, m) = perfect matchings of the k × m king board). Session 1: (L) ⇒ Calkin–Wilf for even p
⇒ s ≥ 0.565511911035 (`CW-NOTE.md`, audited in `PROOF-lower.md` §6).

**Status: NIEROZSTRZYGNIĘTE.** No counterexample (exact, much larger range than session 1), no
proof. Five proof routes closed with explicit obstructions; two exact reformulations; two
control experiments showing that (L) is *not* a generic property: it fails on the triangular
lattice and when the two diagonals of the king lattice get clearly unequal weights ((1, ½),
(1, ¾)), while equal weights x ∈ [0, 100] and near-equal (1, 0.9), (1, 0.95) survive. A proof
cannot be uniform in the diagonal weights; the left–right symmetry is the natural ingredient
(not shown to be necessary).

## 0. What is really needed: (L∞), much weaker than (L)

The conditional bound uses only convexity of a_{2q} = log λ_{2q} (free strip of width 2q) for
2q ≥ 22 (`PROOF-lower.md` §6). Call this **(L∞)**. (L) for all m implies (L∞) by m → ∞, not
conversely. (L∞) checked on the float strip eigenvalues: second differences of a_{2q} are
positive for 2q = 8 … 24 (9·10⁻¹¹ at 2q = 22, float error ~10⁻¹⁵; `surface.py` data, f(k)
columns) — see `REPORT-session2.md` for k = 25, 26.

## 1. Exact tests (`zexact.py` CRT counts → `ltest.py` → `out_ltest.txt`)

| family | widths | rows 2q | (L) cases | violations |
| --- | --- | --- | --- | --- |
| king free | m = 2…12 / 13…16 / 17…20 / 21…22 / 23…24 | ≤ 120 / 60 / 36 / 24 / 20 | see `out_ltest.txt` | **0** |
| king cylinder | m = 3…12 / 13…18 / 19…20 / 21…22 | ≤ 80 / 40 / 28 / 22 | see `out_ltest.txt` | **0** |
| square free / cyl (control, RP) | m ≤ 12 | ≤ 60 | 319 / 290 | 0 / 0 |
| triangular cyl (control) | m ≤ 12 | ≤ 60 | 290 | 0 |
| **triangular free (control)** | m ≤ 12 | ≤ 60 | 319 | **92** (from m = 5; brute-force confirmed: m = 5, Z(6), Z(8), Z(10) = 6475, 210560, 6842465, 210560² − 6475·6842465 = 30552725 > 0) |

Odd m and cylinders are included as asked. Shape of the king margin
μ_q = log Z(2q−2) + log Z(2q+2) − 2 log Z(2q): strictly decreasing in q for every m tested,
≈ 0.4 m at 2q = 2, ratio μ_q/μ_{q−1} → 0.18–0.20 (= μ₂/μ₁ of A = T²), minimum always at the
largest q. No dip at intermediate q, nothing that shrinks with m: no candidate region for a
counterexample was found.

**All q at fixed m (non-rigorous).** (L) for q → ∞ holds iff the leading subdominant e₀-visible
eigenvalue μ₂ of A = T² is real positive with c₂ > 0. `lspec.py` (dense, float): true for
m = 2…10 (μ₂/μ₁ = 0.13–0.25, c₂/c₁ = 0.17–2.1), with the exact range q ≤ 59 for m ≤ 12 already
deep in the asymptotic regime (constant ratio).

## 2. Closed routes (dead ends, with the obstruction)

1. **Reflection positivity / Cauchy–Schwarz** (session 1): crossing kernel M indefinite.
2. **Stieltjes moments (Hankel PSD of the transfer moments).** Z(2q, m) would be a moment
   sequence of a positive measure iff all Hankel matrices [Z(2(i+j))], [Z(2(i+j+1))] are PSD.
   Exact leading minors (`ltest.py`, Bareiss): a negative minor appears for every free width
   m ≥ 3 (m = 3: H1 at size 3; m = 4: H0 at size 4; …) and every cylinder m ≥ 7. Spectral
   reason (`lspec.py`): e₀-visible eigenvalues of A = T² that are non-real (m ≥ 4) or real
   negative (λ purely imaginary; m = 3, 5, 7, 9), all small (|μ|/μ₁ ≤ 0.047 at m = 10).
   (L) is only the 2×2 consecutive-minor part of this; the full moment structure is false.
   (Square lattice and triangular cylinders: all minors ≥ 0, as expected for them.)
3. **Total nonnegativity of the transfer** (in any ordering of states): a TN matrix has real
   nonnegative spectrum (Gantmacher–Krein); A has non-real e₀-visible eigenvalues. Dead.
4. **Lindström–Gessel–Viennot**: needs a planar acyclic path model of the configurations; the
   king graph is non-planar (crossing diagonals) and non-bipartite, no height function, no
   path bijection. Dead as stated (would need a genuinely new encoding).
5. **"Generic" arguments** valid for all non-bipartite / non-RP dimer models: refuted by the
   triangular free strips (table above). **Arguments not using the left–right symmetry**:
   refuted by asymmetric diagonal weights (`lweight.py` → `out_lweight.txt`): with weight x on
   both diagonals (L) holds for every x ∈ {0, ¼, ½, 1, 2, 4, 10, 100} (m ≤ 9, 2q ≤ 38, exact);
   with weights (x_dl, x_dr) = (1, ½) it fails from m = 5 (14 of 19 q), (1, ¼), (1, 1/10), (1, 0) from
   m = 5, (1, ¾) at m = 9 (5 of 19, first at 2q = 30). Not monotone in m: (1, ¾) has no violation
   for m = 10…13 (2q ≤ 38), and (1, 9/10), (1, 19/20) have none for m ≤ 16, 2q ≤ 78
   (`python3 lweight.py big` → `out_lweight_big.txt`); the failures sit mostly on odd m and at
   large q, i.e. they come from an oscillating (non-real or negatively weighted) subleading
   eigenvalue, which never shows up with equal diagonal weights (`lspec.py`: μ₂ real, c₂ > 0).

## 3. Exact reformulations (both verified)

**(R1) Path parity of superpositions** (`lparity.py` → `out_lparity.txt`). Put X on rows
[0, 2q) and Y on rows [2, 2q+2) (Z(2q)² pairs), or X′ on [0, 2q+2) and Y′ on [2, 2q)
(Z(2q+2)Z(2q−2) pairs). The union multigraph H has degree 1 on the top rows T = {0, 1} and
bottom rows B = {2q, 2q+1}, degree 2 between: paths and even cycles, labels alternate, end
labels forced. Type 1 ⇔ TT, BB paths odd and TB paths **even**; type 2 ⇔ all paths odd. Each
admissible H has 2^{#cycles of length ≥ 4} labelings in both cases, H without TB paths cancel:

  Z(2q−2)Z(2q+2) − Z(2q)² = Σ_{H: t(H) ≥ 1} 2^{c(H)} ([all TB paths odd] − [all TB paths even]).

Checked pair by pair on (m, q) = (2, 1…4), (3, 1…3), (4, 1…2), (5, 2), up to 3.4·10⁶ pairs.
Observed: odd ≥ even **separately for every number t of TB paths** (e.g. m = 5, q = 2:
t = 2: 1847660 vs 912656; t = 4: 32616 vs 0). So (L) ⇔ "odd top-bottom connections win",
and a sign-reversing involution would have to flip the parity of all TB paths of an even-type
H, injectively, preserving 2^{c}. Two facts any such involution must respect:
(i) the identity is graph-independent, and on the triangular lattice even-type H win for some
(m, q) (§1), so the involution must be king-specific; (ii) with a shift of one row instead of
two (X on [0, 2q), Y on [1, 2q+1); `lparity.py` control) the same identity computes
Z(2q+1)Z(2q−1) − Z(2q)², which is *negative* for even m (session 1, I3) — there even-type H win.
Tried and failed by hand: the K₄ switch (re-pair two H-edges on opposite sides of a unit square)
changes TB parities only when ℓ(b→bottom_P) ≢ ℓ(d→bottom_Q) (mod 2), which is not controlled;
a 3-way move, not an involution.

**(R2) Krein-space form.** Cutting the 2q-row board in the middle with the bottom half reflected
(the king lattice is invariant under r ↦ −r), Z(k₁ + k₂) = u_{k₁}ᵀ M u_{k₂}, with u_k the
boundary vector of a k-row half-board and M(A, B) the symmetric, indefinite crossing kernel
(|a − b| ≤ 1). Since Z(2q−2) = u_{q−1}ᵀMu_{q−1} > 0 and Z(2q+2) = u_{q+1}ᵀMu_{q+1} > 0:
**(L) ⇔ M is positive semidefinite on span(u_{q−1}, u_{q+1}) for every q** (the Gram determinant
of the pair is exactly Z(2q−2)Z(2q+2) − Z(2q)²; definite in every tested case). The Hankel
matrices of route 2 are the M-Gram matrices of {u₀, u₂, u₄, …} and {u₁, u₃, …}: route 2 failing
⇔ M is not PSD on those longer spans. So (L) is a "2-positivity along the orbit u_k = Rᵏu₀" statement for an M-self-adjoint R.

## 4. Suggested next attacks (session 3)

- Prove (L∞) directly (only the leading eigenvalue λ_{2q} of the width-2q strip matters):
  e.g. a monotone coupling of strips of widths 2q−2, 2q, 2q+2, or interlacing of the strip
  spectra; or a rigorous enclosure of log λ_{2q} for 2q ≤ ~40 plus an asymptotic tail bound.
- Exploit the left–right symmetry J explicitly: in (R1), J maps H to H and preserves
  t(H) and all lengths; look for an involution built from J restricted to a canonical
  sub-region (the asymmetric-weight failures say J must enter).
- Try (R2) with a different cut (vertex cut through a row, kernel V of `cw.py`) where the
  orbit vectors may lie in a cone on which the kernel is positive.
