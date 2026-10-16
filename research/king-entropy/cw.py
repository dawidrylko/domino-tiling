"""Calkin-Wilf (CW) lower bound for the king dimer entropy: hypothesis, tests, evidence.

usage: python3 cw.py > out_cw.txt

CW: s >= (a_{2q+p} - a_{2q}) / p,  a_k = log lambda_k (free strip with k rows).
Standard proof: Z(2q+p, m) <= rho(R_m)^p Z(2q, m) for all m (R_m = row transfer of
width m, Z(k, m) = e0^T R_m^k e0), then m -> infinity. That inequality follows from
reflection positivity (RP). Sections:

 A. RP obstruction: Gram matrices of the natural cuts are indefinite.
 B. Spectral measure: Z(k, m) = sum_i c_i lambda_i^k. If every e0-visible
    eigenvalue were real with c_i >= 0 the finite-m inequality would hold for all q
    (sum_i c_i lambda_i^(2q) (lambda_i^p - rho^p) <= 0); list where this fails.
 C. Exact-integer tests (no rounding), m = 2..20:
    (I1) finite-m CW inequality with rho = max sector eigenvalue (float, margin 1e-12);
    (I2) log-convexity Z(2q, m)^2 <= Z(2q-2, m) Z(2q+2, m)  (integers, rigorous);
    (I3) the same for odd row counts, Z(2j+1, m) on even m.
    (I2) for every m implies a_{2q} convex in q, so its increments increase to 2s and
    the CW bound holds for every even p: a weaker sufficient hypothesis than RP.
 D. The limit statement itself: f(k) = a_k - s k from the free strips k <= 24
    (bounds.json) and every CW candidate against the cylinder estimate of s.
"""
import itertools, json
import numpy as np
from mpmath import mp, mpf, log
from tmfast import nbits, row
from cylw import sector_eig

mp.dps = 50


def dense_T(m):
    n = 1 << m
    T = np.zeros((n, n))
    for S in range(n):
        e = np.zeros(1 << nbits(m, 'free'))
        e[S] = 1
        T[S] = row(e, 'king', 'free', m)[:n]
    return T


def band_M(m):
    """M(A, B) = number of perfect matchings between A, B subsets of a column, |a - b| <= 1."""
    n = 1 << m
    M = np.zeros((n, n))
    for A in range(n):
        a = [i for i in range(m) if A >> i & 1]
        for B in range(n):
            b = [i for i in range(m) if B >> i & 1]
            if len(a) == len(b):
                M[A, B] = sum(all(abs(x - y) <= 1 for x, y in zip(a, pm)) for pm in itertools.permutations(b))
    return M


def vertex_V(m):
    """V(U, D) = 1 iff U, D disjoint and the rest of the row splits into horizontal dominoes."""
    n = 1 << m
    V = np.zeros((n, n))
    for U, D in itertools.product(range(n), repeat=2):
        if U & D:
            continue
        rest = ''.join('1' if (U | D) >> i & 1 else '0' for i in range(m))
        V[U, D] = all(len(r) % 2 == 0 for r in rest.split('1'))
    return V


# ------------------------------------------------------------------ A
print('== A. reflection positivity of the natural cuts (horizontal mirror lines)')
print('  RP for a cut <=> its Gram matrix is PSD on the boundary states a half-board can realise.')
for m in range(2, 7):
    print(f'  m={m}: min eig edge-cut M = {np.linalg.eigvalsh(band_M(m)).min():+.4f}, '
          f'vertex-cut V = {np.linalg.eigvalsh(vertex_V(m)).min():+.4f}')
# realisability of the negative direction of M at m = 3: g(A) = number of 3-row top halves whose
# bottom row sends exactly the cells A downward = sum_S (T^2)[empty, S] V(S, A)
g = np.linalg.matrix_power(dense_T(3), 2)[0] @ vertex_V(3)
print(f'  m=3, q=3: g(A) for A = {{0}},{{1}},{{2}}: {g[1]:.0f}, {g[2]:.0f}, {g[4]:.0f} (all > 0), so the M-eigenvector'
      f' (1, -sqrt2, 1) with eigenvalue {1 - np.sqrt(2):+.4f} is a boundary functional of real top halves: RP fails.')
print('  Every reflection line of the king lattice either runs midway between rows/columns (a crossing')
print('  diagonal is mapped to the other diagonal: per single diagonal the kernel is [tau != tau\'] with')
print('  eigenvalues +1, -1) or passes through vertices (row, column or diagonal line: a mirror vertex not')
print('  matched along the line is covered from exactly one side, kernel [U != D], again +1, -1). Diagonal')
print('  lines midway between vertex diagonals are not symmetries of Z^2.')

# ------------------------------------------------------------------ B
print('\n== B. spectral measure of Z(k, m) = sum_i c_i lambda_i^k, e0-visible part (|c_i| > 1e-9 c_1)')
spec = {}
for m in range(2, 13):
    T = dense_T(m)
    lam, R = np.linalg.eig(T)
    c = R[0, :] * np.linalg.inv(R)[:, 0]
    c1 = abs(c).max()
    vis = [i for i in np.argsort(-np.abs(lam)) if abs(c[i]) > 1e-9 * c1]
    rho = abs(lam).max()
    bad = [i for i in vis if abs(lam[i].imag) > 1e-9 * rho or c[i].real < -1e-12 * c1]
    top = vis[0]
    first_bad = max((abs(lam[i]) for i in bad), default=0.0)
    lead = vis[1] if len(vis) > 1 else None
    spec[m] = dict(n_visible=len(vis), n_bad=len(bad), rho=rho, lam1=float(abs(lam[top])),
                   bad_ratio=first_bad / abs(lam[top]))
    print(f'  m={m:2d}: {len(vis):4d} visible, {len(bad):3d} complex or c<0; largest such |lambda|/lambda_1 = '
          f'{first_bad / abs(lam[top]):.4f}; leading correction lambda_2/lambda_1 = '
          f'{(lam[lead] / lam[top]).real:+.4f} with c_2/c_1 = {(c[lead] / c[top]).real:+.3f}')

# ------------------------------------------------------------------ C
print('\n== C. exact-integer tests')
viol1, near1, n1 = [], 0, 0
viol2, n2 = [], 0
viol3, n3 = [], 0
for m in range(2, 21):
    K = 64 if m <= 12 else 40 if m <= 14 else 24 if m <= 16 else 18 if m <= 18 else 14
    v = np.zeros(1 << nbits(m, 'free'), dtype=object)
    v[:] = 0
    v[0] = 1
    Z = [1]
    for _ in range(K):
        v = row(v, 'king', 'free', m)
        Z.append(int(v[0]))
    lr = max(sector_eig('king', 'free', m, p)['log_lambda'] for p in (0, 1))   # log rho(R_m)
    for q in range(1, K // 2):
        if Z[2 * q] == 0:
            continue
        for p in range(1, 5):
            if 2 * q + p > K:
                continue
            n1 += 1
            d = float(log(mpf(Z[2 * q + p])) - log(mpf(Z[2 * q]))) - p * lr
            if d > 1e-12:
                viol1.append((m, q, p, d))
            elif d > -1e-12:
                near1 += 1
        if 2 * q + 2 <= K and Z[2 * q - 2]:
            n2 += 1
            if Z[2 * q] ** 2 > Z[2 * q - 2] * Z[2 * q + 2]:
                viol2.append((m, q))
    if m % 2 == 0:
        for j in range(1, (K - 3) // 2 + 1):
            if Z[2 * j - 1] and 2 * j + 3 <= K:
                n3 += 1
                if Z[2 * j + 1] ** 2 > Z[2 * j - 1] * Z[2 * j + 3]:
                    viol3.append((m, j))
    print(f'  m={m:2d} (k <= {K}): log rho = {lr:.15f}', flush=True)
print(f'  (I1) Z(2q+p,m) <= rho_m^p Z(2q,m): {len(viol1)} violations > 1e-12 in {n1} cases, '
      f'{near1} undecided within 1e-12' + (f'; first: {viol1[:5]}' if viol1 else ''))
print(f'  (I2) Z(2q,m)^2 <= Z(2q-2,m) Z(2q+2,m): {len(viol2)} violations in {n2} cases (exact)'
      + (f'; first: {viol2[:10]}' if viol2 else ''))
print(f'  (I3) Z(2j+1,m)^2 <= Z(2j-1,m) Z(2j+3,m), even m: {len(viol3)} violations in {n3} cases (exact)'
      + (f'; first: {viol3[:10]}' if viol3 else ''))

# ------------------------------------------------------------------ D
print('\n== D. the limit statement: f(k) = a_k - s k, a_k = log lambda_k (free strip, k rows)')
b = json.load(open('bounds.json'))
a = {int(k): mpf(x) for k, x in b['log_lambda_free'].items()}
z2 = json.load(open('z2.json'))
s, ds = mpf(z2['s_estimate']), mpf(z2['s_error'])
print(f'  s = {mp.nstr(s, 16)} +- {mp.nstr(ds, 2)} (estimate.py); f(k) error from s: <= k * {mp.nstr(ds, 2)}')
for k in sorted(a):
    if k >= 8:
        print(f'  k={k:2d}  f = {mp.nstr(a[k] - s * k, 13)}')
ev = [k for k in sorted(a) if k % 2 == 0 and k >= 8]
od = [k for k in sorted(a) if k % 2 and k >= 9]
dec = all(a[x] - s * x > a[y] - s * y for x, y in zip(ev, ev[1:]))
inc = all(a[x] - s * x < a[y] - s * y for x, y in zip(od, od[1:]))
sep = min(a[x] - s * x for x in ev) > max(a[y] - s * y for y in od)
inc2 = [a[y] - a[x] for x, y in zip(ev, ev[1:])]
conv = all(u < v for u, v in zip(inc2, inc2[1:]))
print(f'  even k: f decreasing {dec}; odd k: f increasing {inc}; every even f above every odd f: {sep}')
print(f'  a_(2q) convex (increments a_(2q+2) - a_(2q) increasing, k=8..{ev[-1]}): {conv};'
      f' last increment {mp.nstr(inc2[-1], 16)} vs 2s = {mp.nstr(2 * s, 16)}')
cand = [((a[q2 + p] - a[q2]) / p, q2, p) for q2 in sorted(a) if q2 % 2 == 0 and q2 >= 2
        for p in range(1, 25) if q2 + p in a]
worst = max(cand)
print(f'  {len(cand)} CW candidates (2q <= {max(ev)}, all p): max = {mp.nstr(worst[0], 16)} at 2q={worst[1]}, p={worst[2]};'
      f' s - max = {mp.nstr(s - worst[0], 3)}  (> s error {mp.nstr(ds, 2)}: {s - worst[0] > ds})')
oddinc = [(a[k + 1] - a[k] - s, k) for k in sorted(a) if k % 2 and k + 1 in a]
print(f'  (O) a_(k+1) - a_k >= s for odd k (k={oddinc[0][1]}..{oddinc[-1][1]}): min of a_(k+1) - a_k - s ='
      f' {mp.nstr(min(oddinc)[0], 3)} at k={min(oddinc)[1]}  -> {all(x > ds * (k + 1) for x, k in oddinc)}')
print('  CW(p even) follows from (L) = log-convexity of q -> Z(2q, m) for every m: a_(2q) is then convex in q,')
print('  its increments increase to 2s. CW(p odd) follows from (L) and (O):')
print('  a_(2q+p) - a_(2q) = (a_(2q+p+1) - a_(2q)) - (a_(2q+p+1) - a_(2q+p)) <= (p+1)s - s.')
json.dump(dict(spectral=spec, I1=dict(cases=n1, violations=viol1, undecided=near1),
               I2=dict(cases=n2, violations=viol2), I3=dict(cases=n3, violations=viol3),
               limit=dict(even_convex=conv, even_decreasing=dec, odd_increasing=inc, separated=sep,
                          max_candidate=str(worst[0]), at=worst[1:], s=str(s), s_err=str(ds))),
          open('cw.json', 'w'), indent=1, default=str)


# ------------------------------------------------------------------ E
def growth_upper(w, maxit=80, tol=4e-15):
    """Certified upper bound on lambda_w (free strip, growth of e0^T T^K e0), same
    Collatz-Wielandt certificate and rounding margin as bounds.certify(upper=True)."""
    v = np.zeros(1 << nbits(w, 'free'))
    v[0] = 1.0
    for _ in range(maxit):
        y = row(row(v, 'king', 'free', w), 'king', 'free', w)
        sup = v > 0
        r = y[sup] / v[sup]
        done = not (y[~sup] > 0).any() and (r.max() - r.min()) / r.max() < tol
        v = y / y.sum()
        if done:
            break
    y = row(row(v, 'king', 'free', w), 'king', 'free', w)
    sup = v > 0
    assert v[0] > 0 and not (y[~sup] > 0).any() and v[sup].min() > 1e-280
    return (log(mpf(float((y[sup] / v[sup]).max()))) + log(1 + mpf(1e-12))) / 2


print('\n== E. conditional bounds: rigorous IF the stated hypothesis holds (certified lambdas, rounded down)')
print('   s >= (log lambda_{2q+p}^low - log lambda_{2q}^up) / p; p even needs (L), p odd needs (L) and (O)')
# certified log lambda_w lower bounds; bounds.json stores them as floats, so give back 1e-14
low = {int(k): mpf(x) * int(k) - mpf('1e-14') for k, x in b['lower'].items()}
best_c = None
for q2 in (20, 22):
    up_ = growth_upper(q2)
    for p in (1, 2, 4):
        if q2 + p in low:
            c = (low[q2 + p] - up_) / p
            hyp = '(L)' if p % 2 == 0 else '(L)+(O)'
            print(f'  2q={q2} p={p}: s >= {mp.nstr(mp.floor(c * 10**12) / 10**12, 14)}  given {hyp:8s}'
                  f' (log lambda_{q2} <= {mp.nstr(up_, 16)})')
            if p % 2 == 0:
                best_c = c if best_c is None else max(best_c, c)
print(f'  best bound given (L) alone: s >= {mp.nstr(mp.floor(best_c * 10**12) / 10**12, 14)}')
