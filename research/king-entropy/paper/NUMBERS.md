# Numbers in the paper: number → file → script

Every number printed in `main.tex` is listed below with the committed file it is read from and
the script (and arguments) that wrote that file. Paths are relative to `research/king-entropy/`.

## Commit SHAs of session 1 (rewritten history)

Session 1 recorded commit SHAs that were invalidated by an authorship rewrite of the branch. The
old commits are still reachable on GitHub by SHA, so each was mapped to the current commit with
the same subject. `REPORT-session1.md` and `CW-NOTE.md` now cite the current SHA; the `commit`
fields inside output files (`eig_*.json`, `out_estimate.txt`) keep the old value and are read
through this table.

| old | current | subject |
| --- | --- | --- |
| 49a8c11 | 106661e | feat(research): add view-based transfer and one-width eigenvalue driver |
| f4de76a | b08b04a | data(research): king cylinder w=20, both parity sectors |
| c7d22f4 | 8dc1359 | refactor(research): expose sector_eig and record the commit at start of a run |
| 6377e1e | a32a0fe | test(research): cross-check float64 eigenvalues with exact integers and ARPACK |
| c46657a | 73289ea | test(research): validate the transfer against brute force, exact formulas and Kasteleyn |
| 9fc8b21 | 76fc5e1 | feat(research): add certified bounds, final estimate and Z2 analysis scripts |
| d817805 | 102b7e5 | fix(research): stop the bound certificate at float noise level (4e-15) |
| 99cb918 | 0357d17 | docs(research): draft Calkin-Wilf status note; extend exact tests to m=20, add (O) and convexity checks |
| 2f65f6b | ee63b57 | data(research): certified bounds 0.545343749727 <= s <= 0.586216605404 |
| ff18169 | 73a0628 | data(research): final estimate of s and Z2 splitting table (estimate.py) |
| 5cfb175 | 0cf6903 | docs(research): Calkin-Wilf status: not proven, not refuted; reduced to log-convexity |
