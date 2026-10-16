# Session 3 — paper draft (no new exploration)

Branch `d/king-entropy`, directory `research/king-entropy/`. No new widths and no attempt on (L);
writing, provenance and reproducibility only.

## What was written

- `paper/main.tex` → `paper/main.pdf` (amsart, 11 pages; `latexmk -pdf main.tex`, clean build from
  `git archive` checked): introduction and literature status, transfer matrix and parity sectors,
  s = 0.5655119110413253 ± 6e-16 with the model/backtest/rounding analysis, Theorem 4.1
  (0.545343749727 ≤ s ≤ 0.586216605404) with full proofs from `PROOF-*.md`, σ, Z2 splitting and ξ,
  square/triangular checks, conjecture (L) with evidence, counterexamples and obstructions
  (open problem), reproducibility.
- `paper/refs.bib`; `paper/NUMBERS.md` (number → file → script for every number in the paper, plus
  the old → current SHA table of session 1); `paper/derived.py` → `paper/out_derived.txt` (simple
  functions of committed outputs only: eˢ, 2s, second differences of a₂q, −4σ, 12wu, the
  triangular violation, error interval of s); `paper/oeis-draft.txt` (not submitted; only the 14
  digits after the point that s ± 6e-16 share).
- `REPORT-session1.md`, `CW-NOTE.md`: the 11 SHAs replaced by current ones. The old commits are
  still reachable on GitHub by SHA, so the mapping is by exact commit subject, not by guess.
- Translation of every Polish artifact to English (language policy given during the session).
  With a UTF-8 locale, `grep -rlIP` for the Polish diacritics over `research/king-entropy`
  returns nothing. Without `-I` it also lists the binary `paper/main.pdf`: its ~460 KB of
  compressed streams contain such byte pairs by chance, not text. The author's name in
  `paper/oeis-draft.txt` is written as `Ry&#322;ko`; in `main.tex` it is `Ry\l{}ko`.
  Under `LC_ALL=C` the same grep matches bytes of λ, →, ≤, … (not Polish) in many files;
  those were left as they are.

## Checked, not an error

`out_cw.txt` (`log rho`) and `bounds.json` disagree for free strips m = 6, 10, 14, 18 (e.g.
2.909568954808860 vs 2.909403518708946). `cw.py` takes the maximum over both parity sectors
(spectral radius, used in test I1), `bounds.json` the sector of e₀ (the growth rate of Z). Every
bound, σ and the conditional bound use the e₀ sector, which is correct; the paper states this
in §2.3.

## Corrections to the brief

- cond-mat/0312097 is by A. W. Sandvik alone ("Deconfinement and criticality in extended
  two-dimensional dimer models"), a precursor that arXiv marks as superseded by cond-mat/0507277
  = Sandvik–Moessner, PRB 73, 144504. Both are cited.
- The FMS 2002 abstract gives no entropy value; the paper quotes none from it (s_tri is our own
  Kasteleyn computation).

## UNVERIFIED references (`paper/refs.bib`)

oeis.org, arxiv.org, doi.org and crossref are blocked from the container; the fields were compared
with search-engine extracts of the publisher/arXiv pages.

- OEIS A239264, A239273, A239265, A239268, A243510: exact name lines, authors and dates not read.
  The titles for A239264/A239273 come from this repository's docs.
- Temperley–Fisher 1961: em dash vs hyphen in the title.
- Fekete 1923: issue number (omitted).
- Sandvik–Moessner 2006: issue number 14 (inferred).
- Nagle 1966: end page 197, issue 1. Gaunt 1969: end page 179.
- Nagle 1966, Gaunt 1969: only the abstracts were seen (by the brief, too); the paper says so.

## Open TODOs

1. Fetch the five OEIS entries from a machine with access: name lines into `refs.bib`, and recheck
   that none states a growth constant.
2. Author affiliation/e-mail, MSC/PACS codes, acknowledgements: left empty in `main.tex`.
3. Decide whether OEIS accepts a constant with a non-rigorous error bar before submitting
   `oeis-draft.txt`; the draft says so at the top.
4. (L∞) at 2q = 24 rests on uncertified power iteration (Δ²a = 1.01e-11 vs float error ~1e-15);
   a certified enclosure of a₂₂, a₂₄, a₂₆ would make that one instance rigorous (no new widths).
5. Optional figures (f_w and Δ_w against w) for the paper.

## Commits (session 3)

534b0fc SHAs in report 1; b90350a, 0c1119d, 7785457 translations; 5f2cd40, 647391a `derived.py`;
80a9642 `refs.bib`; 8a32d4a, 7ac2f90 paper and PDF; e00ffa7, bd9a9dd `NUMBERS.md`; d62a8ad, 3983bf5 OEIS
draft; e5d249f README; this report is the commit after 3983bf5.
