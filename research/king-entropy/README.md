# King-graph dimer entropy

Perfect matchings of the king's graph (square lattice plus both diagonals),
i.e. domicule tilings. Goal: the entropy per site
`s = lim log Z / N` to many digits, with rigorous bounds.

All commands below are run from this directory (`research/king-entropy/`)
with Python 3.13.

```sh
python3 -m pip install -r requirements.txt
```

## Files

| file | what it does |
| --- | --- |
| `tm.py` | cell-by-cell row transfer; lattices `king`, `tri`, `sq`; boundary `free` (open strip) or `cyl` (periodic across the width); exact counts with `count(h, w, lattice, bc)` |
| `tm2.py` | float64 power iteration on `T^2` separately in each parity sector; writes `sec_<lat>_<bc>_<w0>_<w1>.json` |
| `summary.py` | reads the four JSONs below, prints estimators and bounds |
| `fitsq.py` | fits on the exact L x L counts in `../../data/domiculeTilingTests.json` |

## Reproduce

Sector eigenvalues (the four runs are independent, run them in parallel):

```sh
python3 tm2.py king cyl 3 13  > log_king_cyl_3_13.txt
python3 tm2.py king cyl 14 19 > log_king_cyl_14_19.txt
python3 tm2.py king free 1 18 > log_king_free_1_18.txt
python3 tm2.py tri cyl 3 18   > log_tri_cyl_3_18.txt
```

Then:

```sh
python3 summary.py > out_summary.txt
python3 fitsq.py   > out_fitsq.txt
```
