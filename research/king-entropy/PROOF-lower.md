# Lower bound s ≥ 0.545343749727: full proof and audit (session 2)

Claim under audit (`REPORT-session1.md`, `bounds.py 24` → `out_bounds.txt`):

> **s ≥ log(λ₂₄)/24 ≥ 0.545343749727**, λ_w = growth rate of the free king strip of width w.

**Verdict: CONFIRMED.** Superadditivity is elementary; the float
Collatz–Wielandt certificate was recomputed in exact rational arithmetic for w ≤ 12 and the
rounding argument holds for every w (`audit_bounds.py` → `out_audit_bounds.txt`, commit
`0c53f27`, 0 failures). Same notation as `PROOF-upper.md` §0.

## 1. Superadditivity

For K even and L = kw + r (0 ≤ r < w): placing perfect matchings of k strips B(K, w) side by
side, plus vertical dominoes in the last r columns (K even), gives distinct perfect matchings
of B(K, L), so **Z(K, L) ≥ Z(K, w)ᵏ** (r = 0: Z(K, kw) ≥ Z(K, w)ᵏ; checked exactly on 58
boards, `L1`).

## 2. Transfer

Z(2j, w) = (Aʲ e₀)₀ with A = T₀², T₀ the free-strip row transfer (`PROOF-upper.md` §4 with
z = 0; validated against brute force in session 1 and by `U4` at z = 0).

## 3. Lemma (Collatz–Wielandt certificate, lower). Let v ≥ 0 with v₀ > 0 and
supp v ⊆ supp Aⁿe₀ for some n, and Av ≥ c v componentwise. Then
Z(2(n+j), w) ≥ cʲ v₀ / C′ for all j, with C′ = max_{i ∈ supp v} v_i / (Aⁿe₀)_i < ∞.

v ≤ C′ Aⁿe₀ componentwise, A ≥ 0, so Z(2(n+j), w) = (Aʲ Aⁿ e₀)₀ ≥ (Aʲ v)₀ / C′ ≥ cʲ v₀ / C′. ∎

`bounds.certify(upper=False)` takes v = float power iterate of A from e₀ (normalised each
step). Floating point never creates a positive entry from an exact zero (all terms are
nonnegative), so supp v ⊆ supp Aⁿe₀ automatically; v₀ > 0 is asserted. (The docstring's
"supp v = supp Aⁿe₀" is stronger than needed; only ⊆ is used.)

## 4. Floating point

c = min_{i ∈ supp v} fl(fl(Av)_i / v_i) · (1 − 10⁻¹²). As in `PROOF-upper.md` §6:
fl(Av)_i ≤ (1+u)^{12w} (Av)_i (≤ 5 terms per cell step, no multiplication at z = 0), no
underflow (entries on the support > 10⁻²⁸⁰ asserted, weights 1), one rounding in the
division. With 12wu ≤ 3.2·10⁻¹⁴ ≪ 10⁻¹², Av ≥ c v holds exactly on supp v; off the support
it is trivial (c v_i = 0 ≤ (Av)_i). The mpmath log and the final rounding *down* to 12
decimals are conservative.

Checked: for w = 2…12 the float min ratio was recomputed exactly (Fractions) for the same
float vector: |float/exact − 1| ≤ 1.7·10⁻¹⁶ (`L2`); for w ≤ 9 the certified bound is below
the true log λ_w/w (dense eigenvalues) by 5–25·10⁻¹⁴ (`L3`).

## 5. Passage to the limit

For K = 2(n+j) and L → ∞: (KL)⁻¹ log Z(K, L) ≥ (⌊L/w⌋ / L) K⁻¹ (j log c + log(v₀/C′)) →
(log c)/(2w) as j, L → ∞. Odd K with even L: Z(K, L) = Z(L, K), same argument with the roles
of the sides exchanged. Hence **s̲ ≥ log c_w / (2w)**; at w = 24: s ≥ 0.545343749727. ∎

## 6. The conditional bound "given (L): s ≥ 0.565511911035" (`cw.py` §E)

Audited as well, because it is the number session 1 advertises:

- (L) ⇒ for each m, q ↦ m⁻¹ log Z(2q, m) convex ⇒ (m → ∞, Z(2q, m) = Z(m, 2q)) a_{2q} := log λ_{2q}
  convex in q. Convex with a_{2q}/(2q) → s ⇒ increments b_q = a_{2q+2} − a_{2q} increase to 2s,
  so b_q ≤ 2s: s ≥ (a_{2q+2} − a_{2q})/2 for every q. **Correct.**
- Only convexity of a_{2q} for 2q ≥ 22 is used. So the hypothesis actually needed is the much
  weaker **(L∞): q ↦ log λ_{2q} is convex for 2q ≥ 22** — a statement about leading eigenvalues
  of free strips, not about all finite boards. (L) for all m is sufficient, not necessary.
- Numerics: s ≥ (log λ₂₄^{low} − log λ₂₂^{up})/2 with log λ₂₄^{low} = 24 · (certified per-site
  lower bound stored as a float in `bounds.json`) − 10⁻¹⁴ (covers the float storage,
  ≤ 24 · 0.5 ulp ≈ 1.3·10⁻¹⁵) and log λ₂₂^{up} from the upper Collatz–Wielandt certificate
  (`cw.growth_upper`, same rounding margin, `PROOF-upper.md` §5–6 with z = 0). **Correct.**
- Status: conditional on an unproven hypothesis — UNRESOLVED, see `L-NOTE.md`.

## 7. Caveats

Same as `PROOF-upper.md` §8, items 1–3 and 5 (existence of s; transfer correctness tested,
not formally verified; IEEE platform; provenance SHAs missing, code unchanged since `102b7e5`).
