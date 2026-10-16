"""Surface free energy of the free king strip: f(k) = log(lambda_k) - s k -> -2 sigma (session 2).

usage: python3 surface.py > out_surface.txt      (writes surface.json)

lambda_k = growth rate of the free strip of width k (bounds.json, float64, k <= 24; replaced
by lean.py reruns lean_king_free_w<k>_p-_<dtype>.json where present: longdouble k <= 24,
float64 k = 25, 26). s and its error bar from the cylinder analysis (errbar.py).

Even and odd k approach the limit from opposite sides (session 1: even f decreases, odd f
increases). Each subsequence is extrapolated with the models of errbar.models (geometric,
exponential x power, 1/w drift of the ratio, two exponentials, Wynn); the error bar combines
the model spread, the even/odd discrepancy and the propagated error of s (df/ds = -k).
"""
import glob, json
from mpmath import mp, mpf
from errbar import models, KEYS

mp.dps = 40
S = mpf('0.56551191104132535')        # errbar.py: centre of the W = 25 model range (out_errbar.txt)
DS = mpf('3e-16')                      # recommended error bar of s (REPORT-session2.md)

b = json.load(open('bounds.json'))
lam = {int(k): (mpf(x), 'bounds.json float64', 0) for k, x in b['log_lambda_free'].items()}
for fn in sorted(glob.glob('lean_king_free_w*_p-_*.json')):          # priority: longdouble > lean float64 > bounds.json
    d = json.load(open(fn))
    rank = 2 if d['dtype'] == 'longdouble' else 1
    if d['converged'] and rank > lam.get(d['w'], (0, '', -1))[2]:
        lam[d['w']] = (mpf(d['log_lambda']), f'{fn} @{d["commit"]}', rank)

f = {k: x - S * k for k, (x, _, _) in lam.items()}
print(f's = {mp.nstr(S, 17)} +- {mp.nstr(DS, 1)};  f(k) = log lambda_k - s k  (error from s: k * {mp.nstr(DS, 1)})')
for k in sorted(f):
    if k >= 8:
        print(f'  k={k:2d}  f = {mp.nstr(f[k], 16):>20}   {lam[k][1]}')
ev = {k: v for k, v in f.items() if k % 2 == 0 and k >= 6}
od = {k: v for k, v in f.items() if k % 2 == 1 and k >= 7}
We, Wo = max(ev), max(od)
print(f'\n  bracket from the last values: f({Wo}) = {mp.nstr(od[Wo], 15)} < -2 sigma < f({We}) = {mp.nstr(ev[We], 15)}'
      f'  (width {mp.nstr(ev[We] - od[Wo], 3)})')

res = {}
for name, seq, Ws in (('even k', ev, [We - 4, We - 2, We]), ('odd k', od, [Wo - 4, Wo - 2, Wo])):
    print(f'\n== {name}: extrapolated limit of f (= -2 sigma) by model and last k used')
    print('   W   ' + ''.join(f'{k:>21}' for k in KEYS))
    res[name] = {}
    for W in Ws:
        m = models(seq, W)
        res[name][W] = m
        print(f'  {W:2d}   ' + ''.join(f'{mp.nstr(m[k], 16) if k in m else "-":>21}' for k in KEYS))

# model selection by backtest: a model is kept for a parity if its estimate moved by less than STABLE
# between the last two truncations (W-2 -> W); unstable fits (oscillating corrections) are reported, not used
STABLE = mpf('1e-14')
kept, dropped = [], []
for n, W in (('even k', We), ('odd k', Wo)):
    for k in KEYS:
        if k in res[n][W] and k in res[n][W - 2]:
            ch = abs(res[n][W][k] - res[n][W - 2][k])
            (kept if ch < STABLE else dropped).append((n, k, res[n][W][k], ch))
print(f'\n  backtest |est(W) - est(W-2)| < {mp.nstr(STABLE, 1)}: kept ' +
      ', '.join(f'{n[:3]} {k} ({mp.nstr(c, 2)})' for n, k, _, c in kept))
print('  dropped (unstable): ' + ', '.join(f'{n[:3]} {k} ({mp.nstr(c, 2)})' for n, k, _, c in dropped))
vals = [v for _, _, v, _ in kept]
lo, hi = min(vals), max(vals)
mid = (lo + hi) / 2
prop = max(We, Wo) * DS
err = (hi - lo) / 2 + max(c for *_, c in kept) + prop
sigma = -mid / 2
print(f'  kept models: -2 sigma in [{mp.nstr(lo, 16)}, {mp.nstr(hi, 16)}] (spread {mp.nstr(hi - lo, 3)}); largest kept'
      f' backtest change {mp.nstr(max(c for *_, c in kept), 2)}; error of s propagates as k * ds = {mp.nstr(prop, 2)}')
allv = [res[n][W][k] for n, W in (('even k', We), ('odd k', Wo)) for k in KEYS if k in res[n][W]]
print(f'  (all models incl. unstable: [{mp.nstr(min(allv), 16)}, {mp.nstr(max(allv), 16)}], spread {mp.nstr(max(allv) - min(allv), 3)})')
print(f'  RESULT: -2 sigma = {mp.nstr(mid, 15)} +- {mp.nstr(err, 2)};  sigma = {mp.nstr(sigma, 15)} +- {mp.nstr(err / 2, 2)}')
json.dump(dict(s=str(S), ds=str(DS), f={k: str(v) for k, v in f.items()}, sources={k: v[1] for k, v in lam.items()},
               minus_2sigma=str(mid), minus_2sigma_err=str(err), sigma=str(sigma), sigma_err=str(err / 2),
               models={n: {W: {k: str(v) for k, v in m.items()} for W, m in r.items()} for n, r in res.items()}),
          open('surface.json', 'w'), indent=1)
