"""Numbers in main.tex that are simple functions of committed outputs.

usage (from research/king-entropy/): python3 paper/derived.py > paper/out_derived.txt

Reads only committed files (surface.json, bounds.json, z2.json, eig_*.json); computes nothing
new about the transfer matrices.
"""
import json
from mpmath import mp, mpf, exp, log

mp.dps = 40
surf = json.load(open('surface.json'))
bnd = json.load(open('bounds.json'))
s = mpf('0.5655119110413253')            # out_errbar.txt, RECOMMENDATION
print(f's = {mp.nstr(s, 16)}  (out_errbar.txt)')
print(f'2s (per dimer) = {mp.nstr(2 * s, 16)}')
print(f'exp(s) = {mp.nstr(exp(s), 16)},  exp(2s) = {mp.nstr(exp(2 * s), 16)}')
ds = mpf('6e-16')                        # its error bar
print(f's - ds, s + ds = {mp.nstr(s - ds, 16)}, {mp.nstr(s + ds, 16)} '
      f'(digits shared by both ends are the ones quoted in paper/oeis-draft.txt)')
print(f'exp(s - ds), exp(s + ds) = {mp.nstr(exp(s - ds), 17)}, {mp.nstr(exp(s + ds), 17)}')

# second differences of a_k = log lambda_k (free strips); the s k part cancels
f = {int(k): mpf(v) for k, v in surf['f'].items()}
print('\n(L-infinity): second differences a(2q+2) - 2 a(2q) + a(2q-2) of a_k = log lambda_k, free strips')
for q2 in range(4, 26, 2):
    if q2 - 2 in f and q2 + 2 in f:
        d2 = f[q2 + 2] - 2 * f[q2] + f[q2 - 2]
        print(f'  2q={q2:2d}: {mp.nstr(d2, 3)}   sources {surf["sources"][str(q2 - 2)]} | {surf["sources"][str(q2 + 2)]}')
print('\nf(k) = log lambda_k - s k, free strips (surface.json)')
for k in range(18, 27):
    print(f'  k={k}: {mp.nstr(f[k], 16)}')

# certified per-site bounds and their gaps to s
lo, up = mpf(bnd['lower']['24']), mpf(bnd['upper']['24'])
print(f'\ncertified w=24: lower {mp.nstr(lo, 13)}, upper {mp.nstr(up, 13)}')
print(f'  s - lower = {mp.nstr(s - lo, 4)},  upper - s = {mp.nstr(up - s, 4)}')
for w in (12, 16, 20, 24):
    print(f'  w={w}: w*(s - lower_w) = {mp.nstr(w * (s - mpf(bnd["lower"][str(w)])), 4)}, '
          f'w*(upper_w - s) = {mp.nstr(w * (mpf(bnd["upper"][str(w)]) - s), 4)}')
print(f'Kahn-Lovasz log(8!)/16 = {mp.nstr(log(40320) / 16, 13)}')

# rounding budget of the certificates: 12 w u, u = 2^-53, at w = 24
print(f'12 w u at w=24: {mp.nstr(12 * 24 * mpf(2) ** -53, 4)}')

# four free edges of an L x L board: -4 sigma (compare the linear coefficient in out_fitsq.txt)
print(f'-4 sigma = {mp.nstr(-4 * mpf(surf["sigma"]), 10)}')

# triangular free strip m = 5: (L) violation from the exact counts
zt = [int(x) for x in json.load(open('zex_tri_free_m5_K60.json'))['Z']]
print(f'tri free m=5: Z(6), Z(8), Z(10) = {zt[6]}, {zt[8]}, {zt[10]}; '
      f'Z(8)^2 - Z(6) Z(10) = {zt[8] ** 2 - zt[6] * zt[10]}')

# non-planarity: edges of the n x n king graph vs 3V - 6
for n in (3, 4, 5):
    E = 2 * n * (n - 1) + 2 * (n - 1) ** 2
    print(f'king {n}x{n}: V = {n * n}, E = {E}, 3V - 6 = {3 * n * n - 6}')

# odd-width cylinders used for the estimate
print('\nking cylinders, log(lambda_w)/w (eig_*.json, float64; sector 1 for odd w)')
for w in range(20, 26):
    row = []
    for p in (0, 1):
        try:
            e = json.load(open(f'eig_king_cyl_w{w}_p{p}.json'))
            row.append(f'p{p} {e["per_site"]:.16f}')
        except FileNotFoundError:
            pass
    print(f'  w={w}: ' + '  '.join(row))
