"""Rigorous bounds on the king-graph dimer entropy s, and the Calkin-Wilf check.

usage: python3 bounds.py <wmax> > out_bounds.txt

LOWER (Fekete). Free strips side by side tile the plane, so
Z(K, k w) >= Z(K, w)^k and s >= log(lambda_w) / w for every w, where
lambda_w = lim_K Z(K, w)^(1/K) is the growth rate of the free w-wide strip.
Certificate for lambda_w^2 >= c (A = T^2, T = free row transfer, e0 = empty
boundary): v = float power iterate A^n e0 / norm, so supp v = supp A^n e0;
if A v >= c v then Z(2(n+K)) >= c^K v_0 / C with C = max v / (A^n e0) > 0,
hence lambda_w^2 >= c.

UPPER (open strips). Cut a K x (k w) board into k strips of width w. A
perfect matching restricts, on each strip, to its internal edges plus the set
B (column 0) / A (column w-1) of cells matched across the left / right cut.
Between two strips the crossing edges form a perfect matching of A and B with
|row difference| <= 1; there are at most F_{n+1} <= phi^n of them for
n = |A| = |B| (the lowest cell of A is matched to the lowest or second-lowest
cell of B, which gives M(n) <= M(n-1) + M(n-2)). So, with
M(A,B) <= phi^(|A|/2) phi^(|B|/2),  Z(K, k w) <= W(K, w)^k where W counts
configurations of one strip in which any side cell may instead be "covered
from outside" with weight z = sqrt(phi). Hence s <= log(mu_w) / w with mu_w
the growth rate of W. Certificate for mu_w^2 <= C: if A_z v <= C v (v >= 0,
v_0 > 0, and (A_z v)_i = 0 wherever v_i = 0) then W(2K) = e0^T A_z^K e0 <=
C^K.

ROUNDING. Every entry of A v is built by 2w cell steps, each adding at most
six nonnegative terms (one of them a product by z), so the computed value is
within a factor (1 +- u)^(12 w) of the exact A v applied to the stored float
vector v (u = 2^-53): relative error <= 12 w u < 3.2e-14 for w <= 24. The
certified c and C are the float ratios times (1 -+ 1e-12). Entries below
1e-280 are checked to be absent, so no subnormal arithmetic occurs.

UPPER (Kahn-Lovasz / Alon-Friedland). PM(G) <= prod_v (d_v!)^(1/(2 d_v)); the
king graph has d_v <= 8 and (d!)^(1/(2d)) increases with d, so
s <= log(8!)/16.
"""
import itertools, json, sys, time
import numpy as np
from mpmath import mp, mpf, log, sqrt, factorial, floor, ceil
import tm
from tmfast import nbits, row

mp.dps = 30
U_SAFE = 1e-12
PHI = (1 + sqrt(5)) / 2
Z_OPEN = float(sqrt(PHI))
if mpf(Z_OPEN) < sqrt(PHI):
    Z_OPEN = float(np.nextafter(Z_OPEN, 2.0))
assert mpf(Z_OPEN) >= sqrt(PHI)


def down(x, d=12):
    return mp.nstr(floor(x * 10**d) / 10**d, d + 2)


def up(x, d=12):
    return mp.nstr(ceil(x * 10**d) / 10**d, d + 2)


def certify(w, z, upper, tol=4e-15, maxit=80):
    """Power iteration of A = T_z^2 from e0, then the Collatz-Wielandt certificate.

    The stopping rule only affects how tight the certificate is, not its validity."""
    v = np.zeros(1 << nbits(w, 'free'))
    v[0] = 1.0
    hist, nsup = [], 0
    for it in range(maxit):
        y = row(row(v, 'king', 'free', w, z=z), 'king', 'free', w, z=z)
        s = y.sum()
        hist.append(np.log(s) / 2)
        sup = v > 0
        r = y[sup] / v[sup]
        stable = (y > 0).sum() == sup.sum() == nsup     # support no longer growing
        nsup = sup.sum()
        gap = (r.max() - r.min()) / r.max() if stable else np.inf
        v = y / s
        if gap < tol:
            break
    assert v[0] > 0 and v[v > 0].min() > 1e-280, 'tiny entries'
    y = row(row(v, 'king', 'free', w, z=z), 'king', 'free', w, z=z)
    sup = v > 0
    assert not (y[~sup] > 0).any(), 'support not closed'
    r = y[sup] / v[sup]
    if upper:
        bound = log(mpf(float(r.max()))) + log(1 + mpf(U_SAFE))
    else:
        bound = log(mpf(float(r.min()))) + log(1 - mpf(U_SAFE))
    return bound / (2 * w), hist[-1], it + 1, float((r.max() - r.min()) / r.max())


wmax = int(sys.argv[1]) if len(sys.argv) > 1 else 22
print('== Kahn-Lovasz (Alon-Friedland 2008): s <= log(8!)/16 =', up(log(factorial(8)) / 16))

print(f'\n== Fekete lower bound s >= log(lambda_w)/w, free strips (certified, rounded down)')
print(' w   lower bound      float log(lambda_w)    iters  CW spread')
low, lamfree = {}, {}
for w in range(2, wmax + 1):
    t = time.time()
    b, est, it, spread = certify(w, 0, upper=False)
    low[w], lamfree[w] = b, est
    print(f'{w:2d}  {down(b)}  {est:.15f}  {it:4d}  {spread:.1e}  ({time.time() - t:.0f}s)', flush=True)

print(f'\n== open-strip upper bound s <= log(mu_w)/w, side fugacity z = sqrt(phi) = {Z_OPEN!r} (certified, rounded up)')
print(' w   upper bound      iters  CW spread')
upp = {}
for w in range(2, wmax + 1):
    t = time.time()
    b, est, it, spread = certify(w, Z_OPEN, upper=True)
    upp[w] = b
    print(f'{w:2d}  {up(b)}  {it:4d}  {spread:.1e}  ({time.time() - t:.0f}s)', flush=True)

wl, wu = max(low, key=low.get), min(upp, key=upp.get)
print(f'\nBEST CERTIFIED: {down(low[wl])} <= s <= {up(upp[wu])}   (lower from w={wl}, upper from w={wu})')

# ------------------------------------------------------------------ Calkin-Wilf
print('\n== Calkin-Wilf lower bound s >= (log lambda_{2q+p} - log lambda_{2q}) / p: its hypothesis')
print('The proof needs Z(2q+p, m) = <g, X g>, Z(2q, m) = <g, G g> with a symmetric gluing form G >= 0')
print('(for symmetric row transfer T: G = 1, g = T^q e0). Checks:')
# (a) the row transfer itself
w = 3
T = np.zeros((1 << w, 1 << w))
for S in range(1 << w):
    e = np.zeros(1 << nbits(w, 'free'))
    e[S] = 1
    T[S] = row(e, 'king', 'free', w)[: 1 << w]
print(f'  (a) w=3 free row transfer, state = cells of the row already covered: T[{{}} -> {{1}}] = {T[0, 2]:.0f},'
      f' T[{{1}} -> {{}}] = {T[2, 0]:.0f}; max|T - T^t| = {np.abs(T - T.T).max():.0f}  -> not symmetric')


def band_M(m):
    """M(A, B) = number of perfect matchings between A, B subsets of a column, |a - b| <= 1."""
    n = 1 << m
    M = np.zeros((n, n))
    for A in range(n):
        a = [i for i in range(m) if A >> i & 1]
        for B in range(n):
            b = [i for i in range(m) if B >> i & 1]
            if len(a) == len(b):
                M[A, B] = sum(all(abs(x - y) <= 1 for x, y in zip(a, perm)) for perm in itertools.permutations(b))
    return M


def vertex_V(m):
    """V(U, D) = 1 iff U, D disjoint and the rest of the row splits into horizontal dominoes."""
    n = 1 << m
    V = np.zeros((n, n))
    for U, D in itertools.product(range(n), repeat=2):
        if U & D:
            continue
        free = [i for i in range(m) if not (U | D) >> i & 1]
        runs, cur, prev = [], 0, None
        for i in free:
            cur = cur + 1 if prev is not None and i == prev + 1 else 1
            if prev is not None and i != prev + 1:
                runs.append(run)
            run, prev = cur, i
        if prev is not None:
            runs.append(run)
        V[U, D] = all(r % 2 == 0 for r in runs)
    return V


for m in (2, 3, 4, 5, 6):
    eM, eV = np.linalg.eigvalsh(band_M(m)).min(), np.linalg.eigvalsh(vertex_V(m)).min()
    print(f'  (b) column length m={m}: min eig of edge-cut gluing M = {eM:+.4f}, of vertex-cut gluing V = {eV:+.4f}')
print('      M < 0 already for m=3 (the tridiagonal 1-1-1 block, 1 - sqrt 2): the diagonal crossing edges')
print('      are mapped to the other diagonal by the reflection, so neither natural cut is reflection positive.')

kf = json.load(open('sec_king_free_1_18.json'))
lam = {int(k): v['0'] for k, v in kf.items()}
lam.update({w: lamfree[w] for w in lamfree if w not in lam})
viol, worst, tested = 0, -np.inf, 0
for m in range(2, 13):
    Z = [tm.count(k, m) for k in range(0, 2 * 8 + 5)]
    for q in range(1, 9):
        for p in range(1, 5):
            if Z[2 * q] == 0:
                continue
            tested += 1
            d = float(log(mpf(Z[2 * q + p])) - log(mpf(Z[2 * q]))) - p * lam[m]
            worst = max(worst, d)
            viol += d > 1e-12
print(f'  (c) finite-size CW inequality Z(2q+p, m) <= lambda_m^p Z(2q, m), m=2..12, q=1..8, p=1..4:'
      f' {viol} violations in {tested} cases (max of log LHS - log RHS = {worst:.3e})')
print('  CW candidates (log lambda_{2q+p} - log lambda_{2q})/p from free strips (NOT certified):')
cand = []
W = sorted(lam)
for q2 in [x for x in W if x % 2 == 0 and x >= 4]:
    for p in range(1, 5):
        if q2 + p in lam:
            cand.append(((lam[q2 + p] - lam[q2]) / p, q2, p))
for c, q2, p in sorted(cand)[-6:]:
    print(f'    2q={q2:2d} p={p}: {c:.13f}')
print(f'  largest candidate {max(cand)[0]:.13f}; compare the cylinder estimate in out_estimate.txt')
json.dump(dict(lower={w: float(b) for w, b in low.items()}, upper={w: float(b) for w, b in upp.items()},
               log_lambda_free={w: float(x) for w, x in lamfree.items()}, z_open=Z_OPEN,
               kahn_lovasz=float(log(factorial(8)) / 16)), open('bounds.json', 'w'), indent=1)
