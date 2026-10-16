"""Final estimate of s from king cylinders, and the Z2 sector splitting.

usage: python3 estimate.py > out_estimate.txt     (also writes z2.json)

Inputs: sec_king_cyl_3_13.json, sec_king_cyl_14_19.json (tm2.py, w <= 19) and
eig_king_cyl_w<w>_p<p>.json (cylw.py, w >= 20). For odd w the two parity
sectors are exchanged by T and have the same eigenvalue; for even w both are
listed.

s: odd widths approach s from below, f_w = s - c rho^w (1 + ...). With
d_w = f_w - f_{w-2} and r_w = d_{w-2} / d_w, each triple gives the geometric
extrapolation s_w = f_w + d_w / (r_w - 1).

Z2: Delta_w = log lambda_even - log lambda_odd on even w; local correlation
length xi_w = 2 / log(Delta_{w-2} / Delta_w) and a least-squares fit
log Delta = a - w / xi (+ b log w) over w >= 10.
"""
import glob, json, re
import numpy as np
from mpmath import mp, mpf

mp.dps = 30
lam = {}                                   # (w, parity) -> log lambda
for fn in ('sec_king_cyl_3_13.json', 'sec_king_cyl_14_19.json'):
    for w, d in json.load(open(fn)).items():
        for p, x in d.items():
            lam[int(w), int(p)] = (x, fn)
for fn in sorted(glob.glob('eig_king_cyl_w*_p*.json')):
    d = json.load(open(fn))
    assert d['converged'], fn
    lam[d['w'], d['parity']] = (d['log_lambda'], f'{fn} @{d["commit"]}')
for w in sorted({w for w, _ in lam}):
    if w % 2 and (w, 0) not in lam:
        lam[w, 0] = lam[w, 1]
    if w % 2 and (w, 1) not in lam:
        lam[w, 1] = lam[w, 0]
    if w % 2 == 0 and not ((w, 0) in lam and (w, 1) in lam):
        print(f'# w={w}: only one sector available yet, skipped')
        lam.pop((w, 0), None), lam.pop((w, 1), None)

print('king cylinder, log(lambda)/w per sector (source)')
for w in sorted({w for w, _ in lam}):
    a, b = lam[w, 0], lam[w, 1]
    print(f'  w={w:2d}  p0 {mpf(a[0]) / w:.16f}  p1 {mpf(b[0]) / w:.16f}   {a[1]}')

print('\nodd widths: f_w, d_w = f_w - f_(w-2), r_w = d_(w-2)/d_w, s_w = f_w + d_w/(r_w - 1)')
odd = {w: mpf(lam[w, 0][0]) / w for w, p in lam if w % 2 and p == 0 and w >= 5}
W = sorted(odd)
est = {}
for i, w in enumerate(W):
    line = f'  w={w:2d}  f={mp.nstr(odd[w], 16)}'
    if i >= 1:
        d = odd[w] - odd[W[i - 1]]
        line += f'  d={mp.nstr(d, 4):>10}'
    if i >= 2:
        d0 = odd[W[i - 1]] - odd[W[i - 2]]
        r = d0 / d
        est[w] = odd[w] + d / (r - 1)
        line += f'  r={mp.nstr(r, 5):>7}  s_w={mp.nstr(est[w], 16)}'
    print(line)
ws = sorted(est)
best = est[ws[-1]]
spread = abs(est[ws[-1]] - est[ws[-2]])
tail = odd[ws[-1]] - odd[ws[-2]]           # last difference: size of the correction just applied
lastr = (odd[ws[-2]] - odd[W[W.index(ws[-1]) - 2]]) / tail
# the ratios r_w drift down slowly; bound the tail by letting the next ratios fall to 2/3 of the last one
alt = odd[ws[-1]] + tail / (lastr * 2 / 3 - 1)
err = max(spread, abs(alt - best))
print(f'\n  last two extrapolations differ by {mp.nstr(spread, 3)}; tail with ratios dropping to'
      f' 2/3 of r={mp.nstr(lastr, 4)} would add {mp.nstr(abs(alt - best), 3)} more')
print(f'  ESTIMATE s = {mp.nstr(best, 15)}  +- {mp.nstr(err, 2)}   (geometric extrapolation of w={ws[-1] - 4},{ws[-1] - 2},{ws[-1]})')

print('\neven widths: sector values bracket s; midpoint m_w and its geometric extrapolation')
ev = sorted(w for w, p in lam if w % 2 == 0 and p == 0 and w >= 4)
mid = {}
for i, w in enumerate(ev):
    a, b = mpf(lam[w, 0][0]) / w, mpf(lam[w, 1][0]) / w
    mid[w] = (a + b) / 2
    line = f'  w={w:2d}  [{mp.nstr(min(a, b), 16)}, {mp.nstr(max(a, b), 16)}]  m={mp.nstr(mid[w], 16)}  m-s={mp.nstr(mid[w] - best, 3):>9}'
    if i >= 2:
        d, d0 = mid[w] - mid[ev[i - 1]], mid[ev[i - 1]] - mid[ev[i - 2]]
        mext = mid[w] + d / (d0 / d - 1)
        line += f'  r={mp.nstr(d0 / d, 5):>7}  extrap={mp.nstr(mext, 16)}'
    print(line)
print(f'  even-midpoint extrapolation (w={ev[-3]},{ev[-2]},{ev[-1]}) minus odd-width estimate: {mp.nstr(mext - best, 3)}')

print('\nZ2 splitting on even cylinders: Delta_w = log lambda_p0 - log lambda_p1')
E = sorted(w for w, p in lam if w % 2 == 0 and p == 0 and w >= 4)
delta = {w: lam[w, 0][0] - lam[w, 1][0] for w in E}
rows = []
for i, w in enumerate(E):
    xi = 2 / np.log(delta[E[i - 1]] / delta[w]) if i else float('nan')
    rows.append(dict(w=w, delta=delta[w], xi_local=xi))
    print(f'  w={w:2d}  Delta={delta[w]:.6e}  Delta/w={delta[w] / w:.3e}  local xi={xi:.5f}')
fitw = [w for w in E if w >= 10]
y = np.log([delta[w] for w in fitw])
A1 = np.vstack([np.ones(len(fitw)), -np.array(fitw, float)]).T
c1, res1, *_ = np.linalg.lstsq(A1, y, rcond=None)
A2 = np.vstack([np.ones(len(fitw)), -np.array(fitw, float), np.log(fitw)]).T
c2, res2, *_ = np.linalg.lstsq(A2, y, rcond=None)
rms1 = float(np.sqrt(np.mean((A1 @ c1 - y) ** 2)))
rms2 = float(np.sqrt(np.mean((A2 @ c2 - y) ** 2)))
print(f'  fit log Delta = a - w/xi,           w={fitw[0]}..{fitw[-1]}: xi = {1 / c1[1]:.4f}, a = {c1[0]:.4f}, rms = {rms1:.1e}')
print(f'  fit log Delta = a - w/xi + b log w, w={fitw[0]}..{fitw[-1]}: xi = {1 / c2[1]:.4f}, b = {c2[2]:.3f}, rms = {rms2:.1e}')
inv = [(w - 1, 1 / r['xi_local']) for r in rows[1:] if r['w'] >= 12 for w in [r['w']]]
k = np.polyfit([1 / x for x, _ in inv[-4:]], [y for _, y in inv[-4:]], 1)
print(f'  local 1/xi_w linear in 1/w (last 4 points): xi_inf = {1 / k[1]:.4f} (prefactor exponent b = {-k[0]:.3f})')
json.dump(dict(xi_inf_local=1 / k[1], table=rows, fit_exp=dict(xi=1 / c1[1], a=c1[0], rms=rms1, widths=fitw),
               fit_exp_pow=dict(xi=1 / c2[1], a=c2[0], b=c2[2], rms=rms2, widths=fitw),
               s_estimate=str(best), s_error=str(err)), open('z2.json', 'w'), indent=1)

print('\ncost per width (cylw.py runs; up to three ran concurrently on 4 cores)')
print('   w  p  iters  s/iter   wall s  peak RSS MiB  commit')
for fn in sorted(glob.glob('eig_king_cyl_w*_p*.json'), key=lambda f: [int(x) for x in re.findall(r'\d+', f)]):
    d = json.load(open(fn))
    print(f'  {d["w"]:2d}  {d["parity"]}  {d["iterations"]:5d}  {d["sec_per_iteration"]:6.2f}  {d["wall"]:7.1f}  {d["maxrss_mib"]:12.0f}  {d["commit"]}')
print('tm2.py runs (both sectors per width; peak RSS is per process, i.e. of its widest w):')
for fn in ('king_cyl_3_13', 'king_cyl_14_19'):
    t = {int(m[1]): float(m[2]) for m in re.finditer(r'w=\s*(\d+) .* t=([\d.]+)s', open(f'log_{fn}.txt').read())}
    rss = re.search(r'maxrss=(\d+)MiB', open(f'time_{fn}.txt').read())[1]
    print(f'  {fn}: ' + ', '.join(f'w={w} {x:.1f}s' for w, x in t.items()) + f'; peak RSS {rss} MiB')
