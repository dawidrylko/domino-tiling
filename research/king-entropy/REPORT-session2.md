# Session 2 — adversarial audit of session 1

Branch `d/king-entropy`, directory `research/king-entropy/`. Every number: `script args` → output
file @ code commit (data: commit with the result in the table at the end).

## Verdicts

| session-1 claim | verdict | basis |
| --- | --- | --- |
| **s ≤ 0.586216605404** (open strips, √φ, Fibonacci) | **CONFIRMED** | `PROOF-upper.md`; `audit_bounds.py` @0c53f27, 0 errors: cut identity = brute force (58 boards, K ≤ 8, kw ≤ 12); max M(A,B) = F_{n+1} (m ≤ 11), branching a₁→b₁/b₂ without exceptions; **Z(K,kw) ≤ W(K,w)ᵏ on 58 boards** (exact, intervals for √φ); transfer(z) = brute force as a polynomial in z (162 evaluations); float certificate recomputed in fractions (w ≤ 12): error ≤ 1.3e-16 with margin 1e-12. Power of the test: z = 0 breaks on 40/40. |
| **s ≥ 0.545343749727** (Fekete + Collatz–Wielandt) | **CONFIRMED** | `PROOF-lower.md`, the same audit (L1–L3). Cosmetic: supp v ⊆ supp Aⁿe₀ suffices (not "="), and it always holds. |
| s ≥ 0.565511911035 "given (L)" | logic **CONFIRMED**, hypothesis too strong | `PROOF-lower.md` §6: **(L∞)** = convexity of log λ_{2q} for 2q ≥ 22 suffices; checked up to 2q = 24 (Δ²a = 1.0e-11). |
| s = 0.565511911041325 ± 4e-15 | value **CONFIRMED**, error bar **6× too wide** | below. |
| (L) | **UNRESOLVED** | `L-NOTE.md`: 0 violations; no proof; (L) is not generic. |
| −2σ ≈ −0.4840358715 | **CONFIRMED** | σ = **0.242017935766251 ± 9e-15** (below). |
| provenance (SHAs in report 1) | **REFUTED** | 11/11 cited SHAs (d817805, 9fc8b21, ff18169, …) do not exist in the repo. The results are nevertheless reproducible: `repro.py` @167f49a → `out_repro.txt`: estimate.py, cw.py, bounds.py (w ≤ 16, both sections) identical, cylw w=20 all 19 iterates bit for bit. |

## Error bar of s (`python3 errbar.py` @825fa48 → `out_errbar.txt`)

Tail models on odd w: geometric (session 1), d_w = A e^{−w/ξ} w^b (3 and 6 points),
r_w = r_∞ + c/w (+e/w²), two exponents, Wynn ε; the same on the midpoints of the even-w sectors
(independent data). At W = 25: [0.56551191104132526, 0.56551191104132537]; the geometric one is
extreme and the only one failing the backtest (1.05e-15 at W = 23; others ≤ 1.1e-16). Models passing the
backtest (< 5e-16) on both sets: [0.5655119110413252, 0.5655119110413255]. float64
rounding measured by a rerun in longdouble (`lean.py king cyl w 1 longdouble`): ≤ 4.1e-17 per site
(w = 15…25; w = 25: 3.1e-17), Σ|∂s/∂f_w| = 1.49; on the longdouble values alone w = 21, 23, 25
the models give 0.56551191104132531–2 (geometric 0.565511911041325226). Fits: ξ_odd = 0.93, b = −1.9, r_∞ = 8.3 (the drop of
r_w 13.4 → 9.99 is an effect of w^b, not a change of ξ); 1/ξ_odd ≈ 1.07 ≈ transfer gap 1.083.

**Recommendation: s = 0.5655119110413253 ± 6e-16** (3 × (half the model spread + rounding)).

## (L) (`L-NOTE.md`)

- Exactly (`zexact.py` CRT → `ltest.py` @7b8647f → `out_ltest.txt`): **0/873** (free,
  m = 2…24, 2q ≤ 120…20), **0/550** (cylinders, m = 3…22, 2q ≤ 80…22); m = 25, 26 certified
  in x87 with a strict rounding bound (`lcert.py 25 30`, `lcert.py 26 30` @a0a07e9): 0/28,
  2q ≤ 28 (smallest margin 1.2e-10 vs error ≤ 1e-16).
  The margin decreases monotonically in q, ratio → 0.16–0.20 (= μ₂/μ₁), minimum always at the
  largest q: no "suspicious" region.
- **Controls: (L) is not generic.** Triangular, free strips: 92/319 violations from m = 5 (brute
  force: 210560² > 6475·6842465). King with diagonal weights (1, ½): violations from m = 5, (1, ¾) at
  m = 9; equal weights x ∈ [0, 100] and nearly equal (1, 0.9), (1, 0.95) up to m = 16: 0. A proof cannot
  be uniform in the weights; natural ingredient: the left–right symmetry.
- Dead ends (with obstruction): RP; moment sequence/Hankel PSD (negative minors from m = 3, μ complex
  or negative in the spectrum of T², `lspec.py`); total nonnegativity (non-real spectrum); LGV.
- New, verified reformulations: (R1) D_q = Σ_H 2^c([top–bottom paths all
  odd] − [all even]); the "odd" ones win separately for each t
  (`lparity.py`, up to 3.4·10⁶ pairs); (R2) (L) ⇔ crossing form M ≥ 0 on span(u_{q−1}, u_{q+1}).

## Surface energy (`python3 surface.py` @825fa48 → `out_surface.txt`)

f(k) = log λ_k − s k, λ_k from free strips (longdouble k = 14…24, float64 + CW bracket k = 25, 26).
Odd k converge cleanly (models agree to 1e-16), even k have two corrections: simple fits
jump (backtest 1e-13), the two-exponential one and Wynn are stable. Models passing the backtest:
−2σ ∈ [−0.4840358715325015, −0.4840358715325006]; the error of s dominates (26 · 6e-16).
**−2σ = −0.484035871532501 ± 1.8e-14, σ = 0.242017935766251 ± 9e-15.**

## BLOCKED

- `curl https://oeis.org/A239265/b239265.txt` → `curl: (56) CONNECT tunnel failed, response 403`
  (environment network policy). OEIS and the literature still not compared; `oeis.org` has to be added
  to the environment's Allowed domains.
- Cylinder w = 27: 2 float64 buffers of 8 GiB = 16 GiB > 15.7 GiB RAM — not run.

## Questions for session 3

1. Proof of (L∞) (only the leading λ_{2q}) instead of (L): coupling of strips 2q−2, 2q, 2q+2 or
   rigorous enclosures of log λ_{2q} up to 2q ≈ 40 + a tail bound.
2. Involution for (R1) using the left–right reflection J; why does (1, ½) break, but (1, 0.9) does not?
3. Sharper upper bound: the weight √φ is needed in the proof, not in the data (z = 0.5 suffices on
   small boards); the O(1/w) rate remains — another idea is needed.
4. w = 27 with compression of the state parity (half of the entries are zero) → 8 GiB, one more digit.
5. OEIS/literature once the network is unblocked.

## Session-2 commits (code → data)

bounds audit 0c53f27; proofs fccfbe6, a04f90c; zexact 1eb72f5; lean 54a78ac; errbar 7434e24,
825fa48; surface d022860, 5fd0976; ltest/controls 7b8647f, e83f6f2; lparity b96c1aa; L-NOTE
cccfc9e, 83085bd; lspec cccfc9e; lweight f410768, 825fa48 (big: 606e3fa); repro 167f49a, 0924723; lcert
a0a07e9, 7ede2fc, 271a9d8; report 50a1986, d822fa5.
