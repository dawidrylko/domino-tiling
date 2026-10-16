"""Error bar of the cylinder estimate of s: alternative extrapolation models, backtests,
rounding sensitivity (session 2).

usage: python3 errbar.py > out_errbar.txt      (writes errbar.json)

Inputs: sector values of log(lambda) from tm2.py (sec_king_cyl_*.json, w <= 19) and
cylw.py (eig_king_cyl_w*_p*.json, w = 20..25), all float64; if present, the
extended-precision reruns lean_king_cyl_w*_p*_longdouble.json (lean.py) are used to
measure the float64 rounding error of the same quantities.

Odd widths: f_w = log(lambda_w)/w increases to s; d_w = f_w - f_(w-2), r_w = d_(w-2)/d_w.
Models for the tail s - f_W = sum_{j>=1} d_(W+2j), each fitted on the last few widths:
  G    geometric, r constant = r_W (session 1)
  PE   d_w = A exp(-w/xi) w^b, exact through d_(W-4), d_(W-2), d_W
  PE6  the same, least squares over the last 6 differences
  R1   r_w = r_inf + c/w through r_(W-2), r_W
  R2   r_w = r_inf + c/w + e/w^2 through r_(W-4), r_(W-2), r_W
  2E   d_w = A rho1^w + B rho2^w through the last 4 differences (Prony)
  WY   Wynn epsilon table on the odd sequence f_w (last full diagonal entry)
Each model is run with the data truncated at W = 19, 21, 23, 25 (backtest).
Even widths: the same models on the sector midpoints m_w and on each sector.
"""
import glob, json
import numpy as np
from mpmath import mp, mpf, exp, log, findroot, nsum, inf, sqrt

mp.dps = 40

def load():
    """Cylinder sector log(lambda) (float64) and longdouble reruns, keyed by (w, parity)."""
    lam = {}
    for fn in ('sec_king_cyl_3_13.json', 'sec_king_cyl_14_19.json'):
        for w, d in json.load(open(fn)).items():
            for p, x in d.items():
                lam[int(w), int(p)] = mpf(x)
    for fn in glob.glob('eig_king_cyl_w*_p*.json'):
        d = json.load(open(fn))
        lam[d['w'], d['parity']] = mpf(d['log_lambda'])
    for w in sorted({w for w, _ in lam}):
        if w % 2:
            x = lam.get((w, 1), lam.get((w, 0)))
            lam[w, 0] = lam[w, 1] = x
    ld = {}
    for fn in glob.glob('lean_king_cyl_w*_p*_longdouble.json'):
        d = json.load(open(fn))
        if d['converged']:
            ld[d['w'], d['parity']] = mpf(d['log_lambda'])
    return lam, ld


def diffs(f, W):
    ws = [w for w in sorted(f) if w <= W]
    return ws, {w: f[w] - f[ws[i - 1]] for i, w in enumerate(ws) if i}


def tail_from_r(dW, W, rfun, n=400):
    """sum_{j>=1} d_(W+2j) with d_(w+2) = d_w / r(w+2)."""
    t, d = mpf(0), dW
    for j in range(1, n):
        d = d / rfun(W + 2 * j)
        t += d
        if abs(d) < abs(t) * mpf(10) ** -30:
            break
    return t


def models(f, W):
    ws, d = diffs(f, W)
    ws = [w for w in ws if w in d]
    w1, w2, w3 = ws[-3:]
    fW = f[W]
    r = {w: d[ws[i - 1]] / d[w] for i, w in enumerate(ws) if i}
    out = {}
    out['G'] = fW + d[W] / (r[W] - 1)
    # PE: log d = a - w/xi + b log w (signs of d are constant)
    sg = 1 if d[W] > 0 else -1
    M = mp.matrix([[1, -w, log(w)] for w in (w1, w2, w3)])
    y = mp.matrix([log(sg * d[w]) for w in (w1, w2, w3)])
    a, ixi, b = mp.lu_solve(M, y)
    out['PE'] = fW + sg * nsum(lambda j: exp(a - (W + 2 * j) * ixi + b * log(W + 2 * j)), [1, inf])
    six = ws[-6:]
    A = np.array([[1, -w, np.log(w)] for w in six], float)
    yy = np.array([float(log(sg * d[w])) for w in six])
    c6 = np.linalg.lstsq(A, yy, rcond=None)[0]
    out['PE6'] = fW + sg * nsum(lambda j: exp(c6[0] - (W + 2 * j) * c6[1] + c6[2] * log(W + 2 * j)), [1, inf])
    out['_PE6_rms'] = float(np.sqrt(np.mean((A @ c6 - yy) ** 2)))
    out['_PE_xi_b'] = (float(1 / ixi), float(b))
    # R1, R2
    c = (r[w2] - r[W]) / (1 / mpf(w2) - 1 / mpf(W))
    rinf = r[W] - c / W
    out['R1'] = fW + tail_from_r(d[W], W, lambda w: rinf + c / w)
    out['_R1_rinf'] = float(rinf)
    if w1 in r:
        M = mp.matrix([[1, 1 / mpf(w), 1 / mpf(w) ** 2] for w in (w1, w2, W)])
        r0, r1, r2 = mp.lu_solve(M, mp.matrix([r[w] for w in (w1, w2, W)]))
        out['R2'] = fW + tail_from_r(d[W], W, lambda w: r0 + r1 / w + r2 / w ** 2)
        out['_R2_rinf'] = float(r0)
    # 2E: d_(w+4) = al d_(w+2) + be d_w through the last 4 differences
    w0 = ws[-4]
    M = mp.matrix([[d[w1], d[w0]], [d[w2], d[w1]]])
    al, be = mp.lu_solve(M, mp.matrix([d[w2], d[W]]))
    disc = al ** 2 + 4 * be
    if disc > 0:
        x1, x2 = (al + sqrt(disc)) / 2, (al - sqrt(disc)) / 2      # roots of x^2 = al x + be (ratios per 2 widths)
        if abs(x1) < 1 and abs(x2) < 1:
            # d_(W+2j) = P x1^j + Q x2^j, fitted to d_(W-2), d_W
            P, Q = mp.lu_solve(mp.matrix([[1 / x1, 1 / x2], [1, 1]]), mp.matrix([d[w2], d[W]]))
            out['2E'] = fW + P * x1 / (1 - x1) + Q * x2 / (1 - x2)
            out['_2E_ratios'] = (float(1 / x1), float(1 / x2))
    # Wynn epsilon on the sequence f_w, w <= W
    S = [f[w] for w in sorted(f) if w <= W]
    eps = [[mpf(0)] * (len(S) + 1), list(S)]
    for k in range(1, len(S)):
        prev, cur = eps[-2], eps[-1]
        nxt = []
        for i in range(len(cur) - 1):
            dd = cur[i + 1] - cur[i]
            nxt.append(prev[i + 1] + (1 / dd if dd != 0 else mpf(10) ** 30))
        eps.append(nxt)
    even_cols = [col for k, col in enumerate(eps[1:]) if k % 2 == 0 and col]
    out['WY'] = even_cols[-1][-1] if len(even_cols[-1]) else even_cols[-2][-1]
    out['WY-'] = even_cols[-2][-1]
    return out


KEYS = ['G', 'PE', 'PE6', 'R1', 'R2', '2E', 'WY', 'WY-']


def table(name, f, Ws):
    print(f'\n== {name}: estimates of s by model and by last width used (W)')
    print('   W   ' + ''.join(f'{k:>21}' for k in KEYS))
    res = {}
    for W in Ws:
        m = models(f, W)
        res[W] = m
        print(f'  {W:2d}   ' + ''.join(f'{mp.nstr(m[k], 16) if k in m else "-":>21}' for k in KEYS))
    W = Ws[-1]
    m = res[W]
    print(f'  extras at W={W}: PE xi, b = {m["_PE_xi_b"][0]:.4f}, {m["_PE_xi_b"][1]:.3f}; PE6 rms(log d) = {m["_PE6_rms"]:.1e};'
          f' R1 r_inf = {m["_R1_rinf"]:.3f}; R2 r_inf = {m.get("_R2_rinf", float("nan")):.3f};'
          f' 2E ratios = {m.get("_2E_ratios", "-")}')
    return res


def main():
    lam, ld = load()
    odd = {w: lam[w, 0] / w for w in sorted({w for w, _ in lam}) if w % 2 and w >= 5}
    mid = {w: (lam[w, 0] + lam[w, 1]) / (2 * w) for w in sorted({w for w, _ in lam}) if w % 2 == 0 and w >= 4}
    sec0 = {w: lam[w, 0] / w for w in mid}
    sec1 = {w: lam[w, 1] / w for w in mid}
    oddres = table('odd widths f_w', odd, [19, 21, 23, 25])
    midres = table('even-width sector midpoints m_w', mid, [18, 20, 22, 24])
    s0res = table('even widths, sector 0 (from above)', sec0, [18, 20, 22, 24])
    s1res = table('even widths, sector 1 (from below)', sec1, [18, 20, 22, 24])

    best = oddres[25]['G']
    print(f'\n== spreads relative to the session-1 estimate s_G(25) = {mp.nstr(best, 17)}')
    for name, res, W in (('odd', oddres, 25), ('mid', midres, 24), ('sec0', s0res, 24), ('sec1', s1res, 24)):
        vals = {k: res[W][k] for k in KEYS if k in res[W]}
        print(f'  {name:4s} W={W}: ' + ', '.join(f'{k} {mp.nstr(v - best, 3)}' for k, v in vals.items()))
    core = [oddres[25][k] for k in ('G', 'PE', 'PE6', 'R1', 'R2', '2E') if k in oddres[25]]
    print(f'  odd W=25, models G, PE, PE6, R1, R2, 2E: min {mp.nstr(min(core), 17)}, max {mp.nstr(max(core), 17)},'
          f' spread {mp.nstr(max(core) - min(core), 3)}')
    # combined recommendation: every model that passes its own backtest (|est(W) - est(W-2)| < 5e-16)
    # on the two independent data sets (odd widths, even-width midpoints)
    keep = [(n, k, r[W][k]) for n, r, W in (('odd', oddres, 25), ('mid', midres, 24)) for k in KEYS
            if k in r[W] and k in r[W - 2] and abs(r[W][k] - r[W - 2][k]) < mpf('5e-16')]
    kv = [v for *_, v in keep]
    centre, half = (max(kv) + min(kv)) / 2, (max(kv) - min(kv)) / 2
    print(f'  models passing their backtest (< 5e-16): {", ".join(f"{n} {k}" for n, k, _ in keep)}')
    print(f'  their range [{mp.nstr(min(kv), 17)}, {mp.nstr(max(kv), 17)}]: centre {mp.nstr(centre, 17)}, half-width {mp.nstr(half, 2)}')
    print('  backtest, |s_model(W) - s_model(25)| for the odd sequence:')
    for k in ('G', 'PE', 'PE6', 'R1', 'R2', '2E', 'WY'):
        if all(k in oddres[W] for W in (19, 21, 23, 25)):
            print(f'    {k:4s}: ' + ', '.join(f'W={W} {mp.nstr(abs(oddres[W][k] - oddres[25][k]), 3)}' for W in (19, 21, 23)))

    # ----------------------------------------------------------------- rounding
    print('\n== float64 rounding of log(lambda): extended-precision reruns (lean.py, longdouble)')
    rnd = {}
    for (w, p), x in sorted(ld.items()):
        dlt = lam[w, p] - x
        rnd[w] = dlt
        print(f'  w={w:2d} p={p}: float64 - longdouble = {mp.nstr(dlt, 3)} in log lambda, {mp.nstr(dlt / w, 3)} per site')
    if rnd:
        worst = max(abs(x) / w for w, x in rnd.items())
        print(f'  max per-site rounding error seen: {mp.nstr(worst, 3)}')
    # sensitivity of the G estimate to the three inputs it uses (numerical partial derivatives)
    h = mpf(10) ** -20
    sens = {}
    for w in (21, 23, 25):
        g = dict(odd)
        g[w] = g[w] + h
        sens[w] = (models(g, 25)['G'] - best) / h
    print('  d s_G / d f_w: ' + ', '.join(f'w={w} {mp.nstr(v, 4)}' for w, v in sens.items())
          + f'; sum |.| = {mp.nstr(sum(abs(v) for v in sens.values()), 4)}')
    if len(ld) >= 3 and all((w, 1) in ld for w in (21, 23, 25)):
        g = dict(odd)
        for w in (21, 23, 25):
            g[w] = ld[w, 1] / w
        print(f'  G estimate from the longdouble values of w = 21, 23, 25: {mp.nstr(models(g, 25)["G"], 18)}')
        for k in ('PE', 'R1', 'R2', '2E'):
            if k in models(g, 25):
                print(f'    {k}: {mp.nstr(models(g, 25)[k], 18)}')

    rmax = max([abs(x) / w for w, x in rnd.items()] or [mpf(0)])
    rec = 3 * (half + rmax * sum(abs(v) for v in sens.values()))
    print(f'\n== RECOMMENDATION: s = {mp.nstr(centre, 16)} +- {mp.nstr(rec, 1)}  (3 x (model half-width + rounding'
          f' {mp.nstr(rmax, 2)} per site x sum|ds/df| {mp.nstr(sum(abs(v) for v in sens.values()), 3)}));'
          f' session 1: +- 3.9e-15')
    json.dump(dict(recommended=dict(s=str(centre), err=str(rec), half_width=str(half), rounding=str(rmax)), odd={W: {k: str(v) for k, v in m.items()} for W, m in oddres.items()},
                   mid={W: {k: str(v) for k, v in m.items()} for W, m in midres.items()},
                   sec0={W: {k: str(v) for k, v in m.items()} for W, m in s0res.items()},
                   sec1={W: {k: str(v) for k, v in m.items()} for W, m in s1res.items()},
                   rounding={w: str(x) for w, x in rnd.items()}, sensitivity={w: str(x) for w, x in sens.items()}),
              open('errbar.json', 'w'), indent=1)


if __name__ == '__main__':
    main()
