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

## Scripts and the files they write

All commands run from `research/king-entropy/`. Code commit = last change of the script before the
output was committed (see `git log -- <script>`).

| file | command |
| --- | --- |
| `sec_king_cyl_3_13.json`, `sec_king_cyl_14_19.json`, `sec_king_free_1_18.json`, `sec_tri_cyl_3_18.json` | `python3 tm2.py <lat> <bc> <w0> <w1>` |
| `eig_king_cyl_w<w>_p<p>.json`, `log_eig_*.txt` | `python3 cylw.py king cyl <w> <p>` |
| `lean_*.json`, `log_lean_*.txt` | `python3 lean.py <lat> <bc> <w> <p\|-> <float64\|longdouble> [cw]` |
| `out_estimate.txt`, `z2.json` | `python3 estimate.py` |
| `out_errbar.txt`, `errbar.json` | `python3 errbar.py` |
| `out_bounds.txt`, `bounds.json` | `python3 bounds.py 24` |
| `out_audit_bounds.txt` | `python3 audit_bounds.py` |
| `out_surface.txt`, `surface.json` | `python3 surface.py` |
| `out_cw.txt`, `cw.json` | `python3 cw.py` |
| `out_validate.txt` | `python3 validate.py` |
| `out_crosscheck.txt` | `python3 crosscheck.py` |
| `out_fitsq.txt` | `python3 fitsq.py` |
| `zex_<lat>_<bc>_m<m>_K<K>.json` | `python3 zexact.py <lat> <bc> <m> <K>` |
| `out_ltest.txt`, `ltest.json` | `python3 ltest.py` |
| `out_lcert_m25.txt`, `out_lcert_m26.txt` | `python3 lcert.py 25 30`, `python3 lcert.py 26 30` |
| `out_lweight.txt`, `out_lweight_big.txt` | `python3 lweight.py`, `python3 lweight.py big` |
| `out_lparity.txt` | `python3 lparity.py` |
| `out_lspec.txt` | `python3 lspec.py` |
| `out_repro.txt` | `python3 repro.py` |
| `time_<name>.txt` | `python3 timed.py <command>` (wall time and peak RSS) |
| `paper/out_derived.txt` | `python3 paper/derived.py` |

## Numbers, in the order of `main.tex`

"rounded" = the paper prints the file value to fewer digits. "arithmetic" = a one-line
computation from the listed values, done in `paper/derived.py` unless stated otherwise.

### Abstract and introduction

| number | meaning | file | script |
| --- | --- | --- | --- |
| 0.5655119110413253 ± 6·10⁻¹⁶ | s, error bar | `out_errbar.txt` (RECOMMENDATION line) | `errbar.py` |
| 0.545343749727, 0.586216605404 | certified bounds, w = 24 | `out_bounds.txt` (BEST CERTIFIED) | `bounds.py 24` |
| 0.242017935766251 ± 9·10⁻¹⁵ | σ | `out_surface.txt` (RESULT; 9.2e-15 rounded) | `surface.py` |
| ξ ≈ 1.23 | splitting length | `out_estimate.txt` (fits 1.2323, 1.2351; rounded) | `estimate.py` |
| 0.565511911035 | bound given (L) | `out_cw.txt` (section E) | `cw.py` |
| 1451 | (L) cases checked on the king's graph | 873 + 550 (`out_ltest.txt` totals) + 14 + 14 (`out_lcert_m25.txt`, `out_lcert_m26.txt`, 2q = 2…28) | `ltest.py`, `lcert.py` |
| A239264, A239273, A239265, A239268, A243510 | OEIS ids | literature (`refs.bib`) | — |
| 72 > 3·25 − 6 | edges of the 5×5 king graph | `paper/out_derived.txt` | `paper/derived.py` |
| 1.34254…1.34265 | hard-square constant | Finch, arXiv:2001.00578, §5.12 (literature) | — |
| 2s = 1.131023822082651, eˢ = 1.760348694041978 | per dimer, per site | `paper/out_derived.txt` | `paper/derived.py` |
| 3 | tilings of the 2×2 board | `out_validate.txt` (`2x2 = 3`) | `validate.py` |

### Section 2 (model)

| number | meaning | file | script |
| --- | --- | --- | --- |
| 2.909568954808860 vs 2.909403518708946 | free strip w = 6: max over sectors vs e₀ sector | `out_cw.txt` (section C, `log rho`, m = 6) vs `bounds.json` (`log_lambda_free` 6) | `cw.py`, `bounds.py 24` |
| w = 6, 10, 14, 18 | widths where the two differ | `out_cw.txt` section C vs `bounds.json` | same |
| 4·10⁻¹⁵, 3 iterations, 19 iterations | stopping rule | `cylw.py` (`tol`), `eig_king_cyl_w2*_p*.json` (`iterations`) | `cylw.py` |
| 2²⁸ doubles | state vector at w = 25 | `tmfast.nbits` (w + 3 = 28) | — |
| 8.4 GiB, 22.5 min | w = 25 run | `eig_king_cyl_w25_p1.json` (`maxrss_mib` 8641.5, `wall` 1351.3 s) | `cylw.py king cyl 25 1` |
| f⁽⁰⁾ > s > f⁽¹⁾ | even sectors bracket s | `out_estimate.txt` (even widths table) | `estimate.py` |

### Section 3 (value of s)

| number | file | script |
| --- | --- | --- |
| r_w 13.4 → 9.99 | `out_estimate.txt` (odd widths, r = 13.382 … 9.992; rounded) | `estimate.py` |
| even-w sector brackets w = 18…24, midpoint 0.5655119110413465 | `out_estimate.txt` | `estimate.py` |
| Table 1 (all entries) | `out_estimate.txt` (odd widths) | `estimate.py` |
| Table 2 (all entries) | `out_errbar.txt` (rows W = 25 odd, W = 24 midpoints; backtest block) | `errbar.py` |
| ξ_odd = 0.9324, b = −1.880 | `out_errbar.txt` (extras at W = 25) | `errbar.py` |
| [0.5655119110413252, 0.56551191104132547], centre 0.56551191104132534, half-width 1.3·10⁻¹⁶ | `out_errbar.txt` | `errbar.py` |
| 4.1·10⁻¹⁷ per site, 1.49 | `out_errbar.txt` (rounding block: 4.09e-17, sum 1.494; rounded) | `errbar.py` (inputs `lean_king_cyl_w*_p1_longdouble.json`) |
| 0.56551191104132531–2 | `out_errbar.txt` (PE/R1/R2/2E on longdouble values) | `errbar.py` |
| 4.1·10⁻¹⁶ | `out_crosscheck.txt` section A (max diff 4.06e-16; rounded) | `crosscheck.py` |
| 1.8·10⁻¹⁵ | `out_crosscheck.txt` section B (−1.78e-15; rounded) | `crosscheck.py` |
| 0.565512081672 | `out_fitsq.txt` (fit on [16, 18, 20]) | `fitsq.py` |

### Section 4 (bounds)

| number | file | script |
| --- | --- | --- |
| 0.662787681422 | `out_bounds.txt` (Kahn-Lovasz) | `bounds.py 24` |
| Table 3 (all entries) | `out_bounds.txt` | `bounds.py 24` |
| 0.484/w, 0.497/w | `paper/out_derived.txt` (w(s − lower_w) = 0.484, w(upper_w − s) = 0.4969; rounded) | `paper/derived.py` |
| 3.2·10⁻¹⁴ | `paper/out_derived.txt` (12wu at w = 24 = 3.197e-14) | `paper/derived.py` |
| 10⁻¹², 10⁻²⁸⁰ | constants in `bounds.py` (`certify`) | — |
| 58 boards, K ≤ 8, kw ≤ 12; m ≤ 11; m ≤ 8; 162 evaluations; 40 boards; z = 0.5 | `out_audit_bounds.txt` (U1–U4, L1) | `audit_bounds.py` |
| 1.7·10⁻¹⁶ | `out_audit_bounds.txt` (U5/L2, max \|float/exact − 1\| = 1.71e-16; rounded) | `audit_bounds.py` |
| 11.95722617139012 | `out_cw.txt` (section E, `log lambda_22 <=`) | `cw.py` |

### Section 5 (surface)

| number | file | script |
| --- | --- | --- |
| Table 4 | `out_surface.txt` (f(k) lines) | `surface.py` |
| [−0.4840358715325015, −0.4840358715325006], −0.484035871532501 ± 1.8·10⁻¹⁴ | `out_surface.txt` | `surface.py` |
| a = −0.96808 | `out_fitsq.txt` ([16, 18, 20]: a = −0.9680783717; rounded) | `fitsq.py` |
| −4σ = −0.9680717 | `paper/out_derived.txt` (−0.9680717431; rounded) | `paper/derived.py` |

### Section 6 (splitting)

| number | file | script |
| --- | --- | --- |
| Table 5; ξ = 1.1931, rms 1.5·10⁻²; ξ = 1.2323, b = −0.433, rms 9.3·10⁻⁴; ξ_∞ = 1.2351 | `out_estimate.txt` (Z2 block) | `estimate.py` |
| 1.082727 | `out_crosscheck.txt` (in-sector gap) | `crosscheck.py` |
| 1/ξ_odd ≈ 1.07 | arithmetic: 1/0.9324 (`out_errbar.txt`) | — |
| π/6, G/π ± 6·10⁻⁸ | `out_validate.txt` (section 3: 5.68e-8; rounded) | `validate.py` |

### Section 7 (solvable lattices)

| number | file | script |
| --- | --- | --- |
| 90 boards, w = 3…6, h = 1…4; 18×18, 20×20 | `out_validate.txt` (sections 1, 2) | `validate.py` |
| 10⁻¹⁶ (square lattice) | `out_validate.txt` (section 3, max\|diff\| ≤ 6.0e-17) | `validate.py` |
| 1848358752, 1852300296658080, 57261989986381118073728 | `out_validate.txt` (section 4) | `validate.py` |
| 0.428594537464959, 0.428594537464956, 2.9·10⁻¹⁵ | `out_validate.txt` (section 4) | `validate.py` |

### Section 8 (conjecture (L))

| number | file | script |
| --- | --- | --- |
| 0.565511911035, 5.7·10⁻¹², 132 candidates, 0.5655119110355926 | `out_cw.txt` (sections D, E; 5.73e-12 rounded) | `cw.py` |
| 4.69e-5 … 1.01e-11 (second differences) | `paper/out_derived.txt` | `paper/derived.py` (from `surface.json`) |
| float error about 10⁻¹⁵ of those inputs | `L-NOTE.md` §0; Collatz-Wielandt spreads ≤ 1.6e-15 in `out_bounds.txt` | `bounds.py 24` |
| 1.237·10⁻¹⁰ | `out_lcert_m25.txt` (2q = 28) | `lcert.py 25 30` |
| ratio 0.16–0.20 | `out_ltest.txt` (`last ratio`, king free m ≥ 13: 0.1631 … 0.1945) | `ltest.py` |
| Table 6 | `out_ltest.txt` (totals and K per m), `out_lcert_m25.txt`, `out_lcert_m26.txt` | `ltest.py`, `lcert.py` |
| 6475, 210560, 6842465, 30552725 | `paper/out_derived.txt` (from `zex_tri_free_m5_K60.json`) | `paper/derived.py` |
| weights: equal x ∈ {0, ¼, ½, 1, 2, 4, 10, 100}, m ≤ 9; (1, ½) 14/19 at m = 5; (1, ¾) 5/19 at m = 9, first 2q = 30 | `out_lweight.txt` | `lweight.py` |
| (1, 9/10), (1, 19/20) to m = 16, 2q ≤ 78 | `out_lweight_big.txt` ((10, 10, 9), (20, 20, 19)) | `lweight.py big` |
| 217 of 220 | `out_cw.txt` (I3) | `cw.py` |
| 1 − √2, (1, −√2, 1), 10, 4, 10 | `out_cw.txt` (section A: −0.4142, g(A) = 10, 4, 10) | `cw.py` |
| T[∅→{1}] = 2, T[{1}→∅] = 0 | `out_bounds.txt` (Calkin-Wilf block (a)) | `bounds.py 24` |
| 0.047 | `out_lspec.txt` (m = 10, 0.0468; rounded) | `lspec.py` |
| 3.4·10⁶ pairs | `out_lparity.txt` (m = 5, q = 2: 3410589 pairs) | `lparity.py` |
| 1847660, 912656, 32616 | `out_lparity.txt` | `lparity.py` |

### Section 9 (reproducibility)

| number | file | script |
| --- | --- | --- |
| Python 3.13, numpy 2.5.3, mpmath 1.4.1, scipy 1.18.1 | `README.md`, `requirements.txt` | — |
| four cores, 15.7 GiB | `out_estimate.txt` (cost header), `REPORT-session1.md` (BLOCKED) | — |
| 8.4 GiB, 22.5 min | `eig_king_cyl_w25_p1.json` | `cylw.py king cyl 25 1` |
| 22 min | `time_bounds.txt` (wall 1326.3 s) | `timed.py python3 -u bounds.py 24` |
| 8.0 GiB, 43 min | `time_lcert_m26.txt` (maxrss 8223 MiB, wall 2557.3 s) | `timed.py python3 lcert.py 26 30` |
