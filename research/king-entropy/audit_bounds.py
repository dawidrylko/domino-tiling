"""Adversarial audit of the rigorous bounds in bounds.py (session 2).

usage: python3 audit_bounds.py > out_audit_bounds.txt     (exit status 1 if any check fails)

Everything here is exact (Python integers / Fractions, mpmath interval arithmetic);
the boards are built from the lattice definition only (no code shared with tm.py).

UPPER (PROOF-upper.md)
 U1 M(A, B) <= F_{n+1} for all A, B in a column of length m <= 11 (and the max is attained).
 U2 the cut identity Z(K, k w) = [(N M)^(k-1) N](empty, empty), N(B, A) = strip counts
    with B (column 0) and A (column w-1) removed, M(A, B) = crossing matchings.
 U3 the bound itself: Z(K, k w) <= W(K, w; sqrt(phi))^k, exact in interval arithmetic.
 U4 the transfer with side fugacity z (tmfast, used by bounds.py) computes W(K, w; z) as a
    polynomial in z: equal at deg+1 integer points.
 U5 the float Collatz-Wielandt certificate of bounds.certify(upper=True) against the exact
    max_i (A_z v)_i / v_i of the same float vector v (dyadic rationals, exact arithmetic).

LOWER (PROOF-lower.md)
 L1 Z(K, k w) >= Z(K, w)^k (exact).
 L2 the float certificate of bounds.certify(upper=False) against the exact min ratio.
 L3 certified bounds against the true growth rates (dense eigenvalues, w <= 9).
"""
import functools, itertools, math, sys
from fractions import Fraction
import numpy as np
from mpmath import mp, mpf, iv, log, sqrt
from tmfast import nbits, row



def load_bounds():
    """bounds.py is a script (it recomputes everything and rewrites bounds.json when imported).
    Execute only its imports, constants and function definitions: the code under audit, unchanged."""
    import ast, types
    tree = ast.parse(open('bounds.py').read())
    body = []
    for node in tree.body[1:]:                       # skip the module docstring
        if isinstance(node, ast.Expr):               # first top-level statement with output: stop
            break
        body.append(node)
    mod = types.ModuleType('bounds_defs')
    exec(compile(ast.Module(body=body, type_ignores=[]), 'bounds.py', 'exec'), mod.__dict__)
    return mod


bounds = load_bounds()
mp.dps = 40
iv.dps = 60
FAIL = []


def check(name, ok, detail=''):
    print(f'[{"PASS" if ok else "FAIL"}] {name} {detail}', flush=True)
    if not ok:
        FAIL.append(name)


def king_adj(cells):
    """Adjacency of the king graph on a set of (r, c) cells."""
    S = set(cells)
    return {x: [y for y in S if y != x and abs(y[0] - x[0]) <= 1 and abs(y[1] - x[1]) <= 1] for x in S}


def count_pm(cells, adj=None):
    """Number of perfect matchings of the graph on `cells` (row-major lowest-first recursion)."""
    cells = sorted(cells)
    if len(cells) % 2:
        return 0
    idx = {x: i for i, x in enumerate(cells)}
    adj = adj or king_adj(cells)
    nb = [[idx[y] for y in adj[x]] for x in cells]
    full = (1 << len(cells)) - 1

    @functools.lru_cache(maxsize=None)
    def f(mask):
        if mask == full:
            return 1
        i = (~mask & (mask + 1)).bit_length() - 1
        return sum(f(mask | 1 << i | 1 << j) for j in nb[i] if not mask >> j & 1)
    return f(0)


def board(K, L):
    return [(r, c) for r in range(K) for c in range(L)]


def subsets(K):
    return [frozenset(i for i in range(K) if S >> i & 1) for S in range(1 << K)]


def M_cross(A, B):
    """Perfect matchings between A (left column) and B (right column), |a - b| <= 1 (DP over used B)."""
    if len(A) != len(B):
        return 0
    A, B = sorted(A), sorted(B)

    @functools.lru_cache(maxsize=None)
    def f(i, used):
        if i == len(A):
            return 1
        return sum(f(i + 1, used | 1 << j) for j, b in enumerate(B) if not used >> j & 1 and abs(A[i] - b) <= 1)
    return f(0, 0)


def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a


# ------------------------------------------------------------------ U1
print('== U1. crossing matchings M(A, B) <= F_{n+1}, n = |A| = |B|')
for m in range(1, 12):
    best = {}
    cols = [frozenset(c) for n in range(m + 1) for c in itertools.combinations(range(m), n)]
    for A in cols:
        for B in cols:
            if len(A) == len(B):
                best[len(A)] = max(best.get(len(A), 0), M_cross(A, B))
    ok = all(best[n] <= fib(n + 1) for n in best)
    tight = all(best[n] == fib(n + 1) for n in best)
    if m in (3, 6, 9, 11):
        check(f'm={m}', ok, f'max M by n: {[best[n] for n in sorted(best)]}  F_(n+1): {[fib(n + 1) for n in sorted(best)]}'
              f'  attained: {tight}')
    elif not ok:
        check(f'm={m}', ok)
# recursion: verify M(n) <= M(n-1) + M(n-2) is the only branching (lowest a goes to b_1 or b_2), n <= 9
viol = 0
for m in range(1, 9):
    cols = [sorted(c) for n in range(1, m + 1) for c in itertools.combinations(range(m), n)]
    for A in cols:
        for B in cols:
            if len(A) != len(B):
                continue
            for p in itertools.permutations(B):
                if all(abs(a - b) <= 1 for a, b in zip(A, p)):
                    j = B.index(p[0])
                    if j > 1 or (j == 1 and not (p[1] == B[0] and A[1] == A[0] + 1 == B[1] and B[0] == A[0])):
                        viol += 1
check('lowest cell of A goes to b_1, or to b_2 with a_2 -> b_1 forced (a_2 = b_2 = a_1 + 1, b_1 = a_1)', viol == 0,
      f'({viol} exceptions over all A, B in columns m <= 8)')

# ------------------------------------------------------------------ U2, U3, L1
print('\n== U2/U3/L1. cut identity and both strip inequalities, exact')
PHI_IV = (1 + iv.sqrt(5)) / 2
Z_IV = iv.sqrt(PHI_IV)
cases = [(K, w, k) for K in range(1, 7) for w in (2, 3, 4) for k in (1, 2, 3) if K * w * k <= 36 and w * k <= 12]
cases += [(7, 2, 2), (7, 2, 3), (8, 2, 2), (8, 3, 2), (6, 5, 2), (5, 5, 2), (4, 6, 2), (2, 5, 3), (3, 3, 4), (2, 3, 5), (2, 2, 6)]
nU2 = nU3 = nL1 = 0
okU2 = okU3 = okL1 = True
ratios = []
Ncache = {}
for K, w, k in cases:
    Zfull = count_pm(board(K, k * w))
    if (K, w) not in Ncache:
        sub = subsets(K)
        N = [[count_pm([x for x in board(K, w) if not (x[1] == 0 and x[0] in B) and not (x[1] == w - 1 and x[0] in A)])
               for A in sub] for B in sub]
        Mx = [[M_cross(A, B) for B in sub] for A in sub]
        Ncache[K, w] = (sub, N, Mx)
    sub, N, Mx = Ncache[K, w]
    n = len(sub)
    # row vector over A (the right-boundary set of the current strip), starting with B_1 = empty
    vec = [N[0][A] for A in range(n)]
    for _ in range(k - 1):
        nxt = [sum(vec[A] * Mx[A][B] for A in range(n)) for B in range(n)]
        vec = [sum(nxt[B] * N[B][A] for B in range(n)) for A in range(n)]
    Zid = vec[0]                            # A_k = empty
    nU2 += 1
    okU2 &= Zid == Zfull
    # W(K, w; z) as a polynomial: coefficient of z^j
    W = [0] * (2 * K + 1)
    for B in range(n):
        for A in range(n):
            W[len(sub[B]) + len(sub[A])] += N[B][A]
    Wz = sum(c * Z_IV ** j for j, c in enumerate(W))
    up = Wz ** k
    nU3 += 1
    good = up.a >= Zfull                    # lower end of the interval >= exact Z
    okU3 &= bool(good)
    ratios.append((float(mpf(up.a) / Zfull) if Zfull else float('inf'), K, w, k))
    Zw = count_pm(board(K, w))
    nL1 += 1
    okL1 &= Zfull >= Zw ** k
    if not good or Zid != Zfull:
        print(f'   FAIL at K={K} w={w} k={k}: Z={Zfull} identity={Zid} W^k in {up}')
check('U2 cut identity Z(K, kw) = sum prod N prod M', okU2, f'({nU2} boards, K <= 8, kw <= 12)')
check('U3 Z(K, kw) <= W(K, w; sqrt phi)^k', okU3, f'({nU3} boards); smallest W^k / Z = '
      f'{min(ratios)[0]:.4f} at (K, w, k) = {min(ratios)[1:]}')
check('L1 Z(K, kw) >= Z(K, w)^k', okL1, f'({nL1} boards)')
# power of the test: the smallest side weight z* for which W(K, w; z)^k >= Z(K, kw) on every test board
# (z = 0 is the free strip itself, W = Z(K, w), and must fail whenever crossing edges exist)
def zstar(K, w, k):
    sub, N, Mx = Ncache[K, w]
    n = len(sub)
    W = [0] * (2 * K + 1)
    for B in range(n):
        for A in range(n):
            W[len(sub[B]) + len(sub[A])] += N[B][A]
    Zfull = count_pm(board(K, k * w))
    lo, hi = mpf(0), mpf(2)
    if sum(W) ** k < Zfull:
        return None
    for _ in range(60):
        mid = (lo + hi) / 2
        if sum(c * mid ** j for j, c in enumerate(W)) ** k >= Zfull:
            hi = mid
        else:
            lo = mid
    return hi


zs = [(zstar(K, w, k), K, w, k) for K, w, k in cases if k > 1]
zmax = max(zs)
print(f'   power of the test: z = 0 fails on {sum(1 for x in zs if x[0] > 0)} of {len(zs)} boards with k > 1; the largest'
      f' necessary z on these boards is {mp.nstr(zmax[0], 6)} at (K, w, k) = {zmax[1:]} (proof uses sqrt(phi) = 1.27202).')
print('   So small boards do not need the full Fibonacci weight: the weight is required by the proof, not by the data.')


# ------------------------------------------------------------------ U4
print('\n== U4. tmfast transfer with side fugacity z = W(K, w; z) as a polynomial in z')
okU4, nU4 = True, 0
for K, w in [(K, w) for K in range(1, 6) for w in (2, 3, 4)] + [(6, 2), (6, 3), (3, 5), (2, 6)]:
    sub = subsets(K)
    W = [0] * (2 * K + 1)
    for B in sub:
        for A in sub:
            W[len(B) + len(A)] += count_pm([x for x in board(K, w) if not (x[1] == 0 and x[0] in B)
                                            and not (x[1] == w - 1 and x[0] in A)])
    for zz in range(0, 2 * K + 2):
        v = np.zeros(1 << nbits(w, 'free'), dtype=object)
        v[:] = 0
        v[0] = 1
        for _ in range(K):
            v = row(v, 'king', 'free', w, z=zz)
        nU4 += 1
        okU4 &= int(v[0]) == sum(c * zz ** j for j, c in enumerate(W))
check('U4 transfer(z) = brute-force W(K, w; z)', okU4, f'({nU4} evaluations, degree <= 2K, K <= 6)')


# ------------------------------------------------------------------ U5, L2
def exact_ratio(w, z_float, upper):
    """Repeat bounds.certify's iteration (same loop, same stopping rule), then recompute
    (A v)_i / v_i exactly (Fractions) for the final float vector v and the float z."""
    v = np.zeros(1 << nbits(w, 'free'))
    v[0] = 1.0
    nsup = 0
    for it in range(80):
        y = row(row(v, 'king', 'free', w, z=z_float), 'king', 'free', w, z=z_float)
        s = y.sum()
        sup = v > 0
        r = y[sup] / v[sup]
        stable = (y > 0).sum() == sup.sum() == nsup
        nsup = sup.sum()
        gap = (r.max() - r.min()) / r.max() if stable else np.inf
        v = y / s
        if gap < 4e-15:
            break
    y = row(row(v, 'king', 'free', w, z=z_float), 'king', 'free', w, z=z_float)
    sup = v > 0
    rf = y[sup] / v[sup]
    float_r = float(rf.max() if upper else rf.min())
    vf = np.array([Fraction(x) for x in v], dtype=object)
    zfr = Fraction(z_float) if z_float else 0
    ye = row(row(vf, 'king', 'free', w, z=zfr), 'king', 'free', w, z=zfr)
    ex = [ye[i] / vf[i] for i in np.nonzero(sup)[0]]
    closed = all(ye[i] == 0 for i in np.nonzero(~sup)[0])
    exact_r = max(ex) if upper else min(ex)
    return float_r, exact_r, closed, v


print('\n== U5/L2. float Collatz-Wielandt ratios vs the exact ratios for the same float vector')
for w in range(2, 13):
    for upper in (False, True):
        zf = bounds.Z_OPEN if upper else 0
        fr, er, closed, v = exact_ratio(w, zf, upper)
        rel = abs(Fraction(fr) / er - 1)
        cert = Fraction(fr) * (Fraction(1) + Fraction(1, 10**12) if upper else Fraction(1) - Fraction(1, 10**12))
        ok = closed and (cert >= er if upper else cert <= er)
        check(f'{"U5" if upper else "L2"} w={w:2d}', ok, f'{"max" if upper else "min"} ratio float {fr:.17g},'
              f' |float/exact - 1| = {float(rel):.2e} (budget 12wu = {12 * w * 2**-53:.1e}, margin used 1e-12);'
              f' support closed: {closed}')

# ------------------------------------------------------------------ L3
print('\n== L3. certified bounds vs exact growth rates (dense T, w <= 9)')
for w in range(2, 10):
    n = 1 << nbits(w, 'free')
    for upper, z in ((False, 0), (True, bounds.Z_OPEN)):
        T = np.zeros((n, n))
        for S in range(n):
            e = np.zeros(n)
            e[S] = 1
            T[:, S] = row(e, 'king', 'free', w, z=z)
        # e0-visible growth: largest |eigenvalue| with nonzero weight on e0
        lam, R = np.linalg.eig(T)
        c = R[0, :] * np.linalg.inv(R)[:, 0]
        vis = [abs(l) for l, ci in zip(lam, c) if abs(ci) > 1e-10]
        g = mpf(max(vis))
        b, _, _, _ = bounds.certify(w, z, upper=upper)
        true = log(g) / w
        ok = b >= true if upper else b <= true
        check(f'L3 w={w} {"upper" if upper else "lower"}', ok, f'certified {mp.nstr(b, 15)} vs true {mp.nstr(true, 15)}'
              f' (gap {mp.nstr(abs(b - true), 2)})')

print(f'\n{len(FAIL)} failures' + (f': {FAIL}' if FAIL else ''))
sys.exit(1 if FAIL else 0)
