# King-graph dimer entropy

Perfect matchings of the king's graph (square lattice plus both diagonals),
i.e. domicule tilings. Goal: the entropy per site
`s = lim log Z / N` to many digits, with rigorous bounds.
Results and their provenance: [`REPORT-session1.md`](REPORT-session1.md); adversarial audit of
those results: [`REPORT-session2.md`](REPORT-session2.md) (proofs in `PROOF-upper.md`,
`PROOF-lower.md`, hypothesis (L) in `L-NOTE.md`).
Paper draft: [`paper/main.pdf`](paper/main.pdf) (source `paper/main.tex`, every number mapped to
its output file in [`paper/NUMBERS.md`](paper/NUMBERS.md)); session report:
[`REPORT-session3.md`](REPORT-session3.md).

All commands below are run from this directory (`research/king-entropy/`)
with Python 3.13.

```sh
python3 -m pip install -r requirements.txt
```

## Files

| file | what it does |
| --- | --- |
| `tm.py` | cell-by-cell row transfer; lattices `king`, `tri`, `sq`; boundary `free` (open strip) or `cyl` (periodic across the width); exact counts with `count(h, w, lattice, bc)` |
| `tmfast.py` | the same transfer with reshaped views (bit-identical to `tm.py`, ~17x faster); open-side weight `z` for `bounds.py`; counts mod p |
| `tm2.py` | float64 power iteration on `T^2` separately in each parity sector; writes `sec_<lat>_<bc>_<w0>_<w1>.json` |
| `cylw.py` | one width and one sector per run with `tmfast.py`, convergence check, Collatz-Wielandt bracket, time and peak RSS; writes `eig_<lat>_<bc>_w<w>_p<p>.json` |
| `summary.py` | reads the four `sec_*.json`, prints estimators and bounds (first pass) |
| `fitsq.py` | fits on the exact L x L counts in `../../data/domiculeTilingTests.json` |
| `validate.py` | brute force, repo data, square-lattice closed forms, triangular Kasteleyn, free-strip ratios |
| `crosscheck.py` | exact-integer ratios (w = 9..13) and ARPACK on the full w = 20 transfer vs the power iteration |
| `bounds.py` | certified Fekete lower bounds, open-strip upper bounds, Kahn-Lovasz, Calkin-Wilf hypothesis checks |
| `cw.py` | Calkin-Wilf hypothesis: RP obstruction, spectral measure, exact log-convexity tests, limit form, conditional bounds (see `CW-NOTE.md`) |
| `estimate.py` | final estimate of s from all cylinders, Z2 splitting table and correlation length; writes `z2.json` |
| `timed.py` | runs a command and appends wall time and peak RSS to stderr |
| `zexact.py` | exact Z(k, m), k <= K, by CRT over 60-bit primes (session 2); writes `zex_*.json` |
| `lean.py` | power iteration with two buffers, float64 or x87 extended precision; writes `lean_*.json` |
| `audit_bounds.py` | exact audit of both strip bounds and of the float certificates (`PROOF-*.md`) |
| `errbar.py` | alternative extrapolation models, backtests and rounding check for s |
| `surface.py` | surface free energy sigma from free strips |
| `ltest.py` | exact (L) tests and Hankel (moment) tests on all `zex_*.json` |
| `lparity.py`, `lspec.py`, `lweight.py` | path-parity form of (L), spectral obstructions, (L) under diagonal weights |
| `repro.py` | re-runs session-1 scripts from a clean export of HEAD and compares outputs |
| `paper/derived.py` | numbers of the paper that are simple functions of committed outputs; writes `paper/out_derived.txt` |

## Reproduce

Sector eigenvalues up to w = 19 (the four runs are independent, run them in parallel):

```sh
python3 timed.py python3 tm2.py king cyl 3 13  > log_king_cyl_3_13.txt  2> time_king_cyl_3_13.txt
python3 timed.py python3 tm2.py king cyl 14 19 > log_king_cyl_14_19.txt 2> time_king_cyl_14_19.txt
python3 timed.py python3 tm2.py king free 1 18 > log_king_free_1_18.txt 2> time_king_free_1_18.txt
python3 timed.py python3 tm2.py tri cyl 3 18   > log_tri_cyl_3_18.txt   2> time_tri_cyl_3_18.txt
python3 summary.py > out_summary.txt
python3 fitsq.py   > out_fitsq.txt
```

Wide cylinders, one process per width and sector (odd w: one sector is enough):

```sh
for a in "20 0" "20 1" "21 1" "22 0" "22 1" "23 1" "24 0" "24 1" "25 1"; do
  set -- $a; python3 cylw.py king cyl $1 $2 > log_eig_king_cyl_w$1_p$2.txt
done
```

Checks, bounds, estimate:

```sh
python3 timed.py python3 validate.py   > out_validate.txt   2> time_validate.txt
python3 timed.py python3 crosscheck.py > out_crosscheck.txt 2> time_crosscheck.txt
python3 timed.py python3 bounds.py 24  > out_bounds.txt     2> time_bounds.txt
python3 estimate.py > out_estimate.txt
python3 timed.py python3 cw.py > out_cw.txt 2> time_cw.txt   # needs bounds.json and z2.json
```

Peak memory: about 1.1 GiB at w = 22, 2.2 GiB at w = 23, 4.3 GiB at w = 24
and 8.4 GiB at w = 25 per `cylw.py` process (`out_estimate.txt`, cost table).

Session 2 (each writes `out_<name>.txt`; `zexact.py`/`lean.py` runs as listed in `REPORT-session2.md`):

```sh
python3 audit_bounds.py > out_audit_bounds.txt
python3 errbar.py > out_errbar.txt
python3 surface.py > out_surface.txt
python3 ltest.py > out_ltest.txt
python3 lparity.py > out_lparity.txt
python3 lspec.py > out_lspec.txt
python3 lweight.py > out_lweight.txt; python3 lweight.py big > out_lweight_big.txt
python3 repro.py > out_repro.txt
```

Paper (session 3; needs a TeX distribution with `latexmk`, e.g. TeX Live with
`texlive-latex-extra`):

```sh
python3 paper/derived.py > paper/out_derived.txt
cd paper && latexmk -pdf main.tex
```
