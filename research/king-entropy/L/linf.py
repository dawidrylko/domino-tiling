"""Task 3 (session 3b): is (L-infinity) as fragile as (L)?

usage: python3 linf.py > out_linf.txt

(L-inf): q -> a_{2q} = log lambda_{2q} convex (lambda_k = growth rate of the free strip with k rows
and length -> infinity). Session 2 checked it for the king lattice up to 2q = 24. symmetry.py shows
that (L) at fixed width m breaks under ANY diagonal-weight asymmetry (1, 1 - eps) once q is large
(m = 4, 8, 12). Question: does (L-inf) break too? If not, (L-inf) is a different, robust statement.

Z(k, m) = Z(m, k) also for asymmetric diagonal weights (transposition keeps the type of each
diagonal), so lambda_k is the Perron root of the width-k row transfer with the same weights
(checked exactly below). Float64 power iteration on the cell-by-cell transfer (state layout of
tmfast.py, weights as in lweight.step_x); a_k for king (1, 1) is compared with bounds.json.
Second differences d_q = a_{2q-2} + a_{2q+2} - 2 a_{2q}; float error of a_k is ~1e-15 (power
iteration converged to 1e-15 relative), so signs of |d_q| > 1e-13 are reliable.

Also: equal diagonal weights x in {0.5, 1.25, 1.5, 2, 3} (J-symmetric models), a two-mode (Prony)
fit of the king d_q up to 2q = 24 from surface.json, and an exact check that d_4 < 0 at x >= 1.5
really breaks (L) at 2q = 8 on wide boards.
"""
import json, os, sys, time
import numpy as np
from kt import transfer, zseq

t0 = time.time()


def step(v, w, c, xl, xr):
    """One cell of the free-strip transfer (tmfast state layout), float64, diagonal weights xl, xr."""
    H = 1 << (w + 1)
    u = np.zeros(2 * H)
    src = v.reshape(H, 2)
    u.reshape(2, H)[0, :] += src[:, 1]
    offs = [(1, 1.0)] if c + 1 < w else []
    if c > 0:
        offs.append((w - 1, xl))
    offs.append((w, 1.0))
    if c + 1 < w:
        offs.append((w + 1, xr))
    for d, wt in offs:
        if wt == 0:
            continue
        B = 1 << (d - 1)
        u.reshape(2, H // (2 * B), 2, B)[0, :, 1, :] += wt * v.reshape(H // (2 * B), 2, B, 2)[:, 0, :, 0]
    return u


def growth(k, xl, xr, tol=1e-15, maxit=4000):
    """log of the Perron root of the width-k transfer (two rows per iteration, from e0)."""
    v = np.zeros(1 << (k + 2))
    v[0] = 1.0
    prev = None
    for it in range(maxit):
        for _ in range(2):
            for c in range(k):
                v = step(v, k, c, xl, xr)
        nrm = v.sum()
        v /= nrm
        g = np.log(nrm) / 2
        if prev is not None and abs(g - prev) < tol * abs(g) and it > 20:
            return g
        prev = g
    raise RuntimeError(f'no convergence k={k}')


# exact check of Z(k, m) = Z(m, k) for asymmetric weights
for w in [(2, 2, 1), (1, 1, 0), (4, 4, 3)]:
    for k in range(2, 7):
        for m in range(2, 7):
            assert zseq(transfer(m, *w), k)[k] == zseq(transfer(k, *w), m)[m], (w, k, m)
print('Z(k, m) = Z(m, k) exactly for weights (2,2,1), (1,1,0), (4,4,3), 2 <= k, m <= 6')

# float transfer agrees with the exact one
for w in [(1, 1, 1), (2, 2, 1)]:
    for m in (3, 4, 5):
        v = np.zeros(1 << (m + 2))
        v[0] = 1.0
        ref = zseq(transfer(m, *w), 8)
        for k in range(1, 9):
            for c in range(m):
                v = step(v, m, c, w[1] / w[0], w[2] / w[0])
            assert abs(v[0] - ref[k] / w[0] ** (k * m / 2)) <= 1e-9 * abs(v[0]), (w, m, k)
print('float cell transfer = exact row transfer (m = 3..5, k <= 8)')

bj = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'bounds.json')
KMAX = int(sys.argv[1]) if len(sys.argv) > 1 else 18
CASES = [('king (1, 1)', 1.0, 1.0), ('(1, 0.95)', 1.0, 0.95), ('(1, 0.9)', 1.0, 0.9), ('(1, 0.75)', 1.0, 0.75),
         ('(1, 0.5)', 1.0, 0.5), ('triangular (1, 0)', 1.0, 0.0), ('equal x = 0.5', 0.5, 0.5),
         ('equal x = 1.25', 1.25, 1.25), ('equal x = 1.5', 1.5, 1.5), ('equal x = 2', 2.0, 2.0), ('equal x = 3', 3.0, 3.0)]
res = {}
for name, xl, xr in CASES:
    a = {k: growth(k, xl, xr) for k in range(2, KMAX + 1, 2)}
    res[name] = a
    d = {q: a[2 * q - 2] + a[2 * q + 2] - 2 * a[2 * q] for q in range(2, KMAX // 2)}
    print(f'\n{name}: a_{{2q}} = log lambda_{{2q}}, second differences d_q (2q = 4..{KMAX - 2})')
    print('   ' + '  '.join(f'2q={2 * q}: {d[q]:+.2e}' for q in d))
    bad = [2 * q for q in d if d[q] < -1e-13]
    print(f'   negative (< -1e-13): {bad if bad else "none"};  ratios d_q/d_(q+1): '
          + ' '.join(f'{d[q] / d[q + 1]:.2f}' for q in list(d)[:-1] if d[q + 1] != 0), flush=True)

B = json.load(open(bj))['log_lambda_free']
err = max(abs(res['king (1, 1)'][k] - B[str(k)]) for k in res['king (1, 1)'] if str(k) in B)
print(f'\nking (1, 1): max |a_k - bounds.json log_lambda_free[k]| over even k <= {KMAX}: {err:.1e}')

# king (1, 1) up to 2q = 24 from surface.json (longdouble / float64 strip eigenvalues, session 2):
# d_q = Delta^2 f(2q) since a_k = s k + f(k). The ratios d_q / d_(q+1) alternate: two corrections,
# a positive one ~ rho^q and a sign-alternating one ~ (-sigma)^q with sigma < rho.
from fractions import Fraction
S = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'surface.json')))['f']
f = {int(k): Fraction(v) for k, v in S.items()}
d = {q: f[2 * q - 2] + f[2 * q + 2] - 2 * f[2 * q] for q in range(2, 13)}
print('\nking (1, 1) from surface.json: d_q for 2q = 4..24 and ratios d_q/d_(q+1)')
print('   ' + '  '.join(f'2q={2 * q}: {float(d[q]):.3e}' for q in d))
r = {q: float(d[q] / d[q + 1]) for q in range(2, 12)}
print('   ratios: ' + ' '.join(f'{r[q]:.2f}' for q in r))
# exact two-mode fit d_q = A rho^q + B (-sigma)^q on four consecutive points (Prony): x^2 - p x - p' = 0
for q0 in range(6, 10):
    y = [float(d[q]) for q in range(q0, q0 + 4)]
    M = np.array([[y[1], y[0]], [y[2], y[1]]])
    c1, c2 = np.linalg.solve(M, [y[2], y[3]])           # y_{n+2} = c1 y_{n+1} + c2 y_n
    roots = np.roots([1, -c1, -c2])
    Vm = np.array([[z ** 0 for z in roots], [z ** 1 for z in roots]])
    amp = np.linalg.solve(Vm, y[:2])
    order = np.argsort(-abs(roots))
    print(f'   Prony fit on 2q = {2 * q0}..{2 * q0 + 6}: roots ' + ', '.join(f'{roots[i].real:+.4f}' for i in order)
          + f';  |oscillating / positive| term at 2q = 24: '
          + f'{abs(amp[order[1]] * roots[order[1]] ** (12 - q0)) / abs(amp[order[0]] * roots[order[0]] ** (12 - q0)):.3f}')

# Consequence of d_4 < 0 for equal weights x >= 1.5: (L) itself fails at 2q = 8 for wide boards.
# Exact integers, Z(k, m) = Z(m, k): iterate the width-k row transfer (k = 6, 8, 10) m times.
print('\nexact (L) at 2q = 8 for equal diagonal weights, wide boards: Z(8, m)^2 vs Z(6, m) Z(10, m)')
MW = 60
for w in [(1, 1, 1), (4, 5, 5), (2, 3, 3), (1, 2, 2), (1, 3, 3)]:
    Zk = {k: zseq(transfer(k, *w), MW) for k in (6, 8, 10)}
    bad = [m for m in range(1, MW + 1) if Zk[8][m] ** 2 > Zk[6][m] * Zk[10][m]]
    print(f'  weights (wo, xl, xr) = {w} (x = {w[1] / w[0]:g}): violations for m = 1..{MW}: {len(bad)}'
          + (f', first m = {bad[0]}, all m >= {bad[0]} violate: {bad == list(range(bad[0], MW + 1))}' if bad else ''), flush=True)
print(f'\ntotal time {time.time() - t0:.0f} s')
