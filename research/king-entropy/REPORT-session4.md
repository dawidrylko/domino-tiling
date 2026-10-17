# Session 4: paper corrected after session 3b (no new research)

Branch `d/king-entropy`, directory `research/king-entropy/`. No new computations; only the PDF
was rebuilt (`cd paper && latexmk -pdf main.tex`, 12 pages, no LaTeX warnings).

## Changes

| commit | what |
| --- | --- |
| `e58b346` | `paper/main.tex` §8 rewritten: Conjecture 8.1 is now (L∞) for the king's graph at unit weights, Proposition 8.2 (L∞) ⇒ s ≥ 0.565511911035. (L) is presented as observed at unit weights (free m ≤ 26, cylinder m ≤ 22) and explicitly not conjectured. New subsection "Why (L) is not structural": Krein-signature lemma (T = HM, G = JM), the (1, 9/10) and (1, 19/20) counterexamples, the equal-weight failures x = 3/2, 2, 3 at 2q = 8, the Prony two-mode picture. The sentence that the oscillating mode is never seen with equal weights is gone. Abstract, intro item 5, open problem and reproducibility table updated. Theorem 4.1 (0.545343749727 ≤ s) unchanged. |
| `23e043b` | `paper/refs.bib`: the five OEIS entries (A239264, A239273, A239265, A239268, A243510) with exact name lines, author Alois P. Heinz, 2014, checked against the live OEIS on 2026-10-17; UNVERIFIED mark removed. |
| `2df6ec5` | Dated errata (2026-10-17) in `L-NOTE.md` (status paragraph and §2.5) and `REPORT-session2.md`, pointing to `L/REPORT-session3b.md`; original text kept. |
| `246dd07` | `paper/oeis-draft.txt`: new comment line with the conditional bound under (L∞). The draft had no mention of (L) before, so this is an addition, not a replacement. |
| `b888444` | `paper/main.pdf` rebuilt; `paper/NUMBERS.md`: section 8 renamed, and sources for every new number in §8 (all from `L/out_linf.txt`, `L/out_symmetry.txt`, `L/out_involution.txt`, `L/REPORT-session3b.md`). No existing number moved. |

## Note on (L∞)

(L∞) is robust to asymmetric diagonal weights, including the triangular lattice (2q ≤ 14), but
it is **not** true for all equal weights: at x = 3/2, 2, 3 the second difference of a_{2q} is
negative at 2q = 8 and 12 (`L/out_linf.txt`). The paper says so; the conjecture is stated at
unit weights only.
