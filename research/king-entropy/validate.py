"""Validation of the transfer code (tm.py / tmfast.py) against independent methods.

usage: python3 validate.py > out_validate.txt     (exit status 1 if any check fails)

1. brute-force perfect-matching counts on explicit graphs vs the transfer,
   king/tri/sq x free/cyl, w = 3..5, h = 1..4 (plus w = 6, h = 1..3)
2. exact counts in ../../data/*.json (domicule = king, free) vs the transfer
3. square lattice: free strip vs the closed form; cylinder sectors vs the exact
   free-fermion formula, and its extrapolation to G/pi
4. triangular lattice: cylinder value vs an independent Kasteleyn computation
5. free king strips w = 3, 4: lambda_w vs ratios of exact counts
   a(n) = Z(3 x 2n) (A239265 in OEIS) and a(n) = Z(4 x n) (A239266)
"""
import functools, itertools, json, pathlib, sys
import numpy as np
from mpmath import mp, mpf, catalan, pi, asinh, fabs, cos as mcos
import tm, tmfast
from cylw import sector_eig

mp.dps = 40
FAIL = []


def check(name, ok, detail=''):
    print(f'[{"PASS" if ok else "FAIL"}] {name} {detail}', flush=True)
    if not ok:
        FAIL.append(name)


# ---------------------------------------------------------------- 1. brute force
DIRS = {'sq': [(0, 1), (1, 0)], 'tri': [(0, 1), (1, 0), (1, 1)],
        'king': [(0, 1), (1, 0), (1, 1), (1, -1)]}


def graph(lat, bc, h, w):
    """Edge set of the h x w board, written from the lattice definition only."""
    E = set()
    for r, c in itertools.product(range(h), range(w)):
        for dr, dc in DIRS[lat]:
            r2, c2 = r + dr, c + dc
            if r2 >= h:
                continue
            if bc == 'cyl':
                c2 %= w
            elif not 0 <= c2 < w:
                continue
            a, b = r * w + c, r2 * w + c2
            if a != b:
                E.add((min(a, b), max(a, b)))
    return E


def brute(n, E):
    nb = [[] for _ in range(n)]
    for a, b in E:
        nb[a].append(b)
        nb[b].append(a)

    @functools.lru_cache(maxsize=None)
    def f(mask):
        if mask == (1 << n) - 1:
            return 1
        i = (~mask & -~mask).bit_length() - 1      # lowest unmatched vertex
        return sum(f(mask | 1 << i | 1 << j) for j in nb[i] if not mask >> j & 1)
    return f(0)


print('== 1. brute force vs transfer')
n_ok = 0
cases = [(w, h) for w in range(3, 6) for h in range(1, 5)] + [(6, h) for h in range(1, 4)]
for lat in ('king', 'tri', 'sq'):
    for bc in ('free', 'cyl'):
        rows = []
        for w, h in cases:
            b = brute(h * w, frozenset(graph(lat, bc, h, w)))
            t = tm.count(h, w, lat, bc)
            f = tmfast.count_mod(h, w, lat, bc, 2**31 - 1)
            ok = b == t and t % (2**31 - 1) == f
            n_ok += ok
            rows.append(f'{h}x{w}={b}' + ('' if ok else f'(tm {t})'))
            if not ok:
                check(f'brute {lat} {bc} h={h} w={w}', False, f'brute={b} tm={t} fast={f}')
        print(f'  {lat:4s} {bc:4s}: ' + ' '.join(rows))
check('brute-force counts', n_ok == 6 * len(cases), f'{n_ok}/{6 * len(cases)} boards agree')

# ---------------------------------------------------------------- 2. repo data
print('== 2. exact counts in data/*.json vs transfer (king, free)')
def _isprime(n):
    return n > 1 and all(n % q for q in range(2, int(n ** 0.5) + 1))


PRIMES = [p for p in range(2**31 - 1, 2**31 - 2000, -1) if _isprime(p)][:14]


def count_crt(h, w, lat='king', bc='free'):
    """Exact count by CRT over 14 primes just below 2^31 (product > 2^433)."""
    M, x = 1, 0
    for p in PRIMES:
        r = tmfast.count_mod(h, w, lat, bc, p)
        # combine x mod M with r mod p
        t = ((r - x) * pow(M, -1, p)) % p
        x, M = x + M * t, M * p
    return x


root = pathlib.Path(__file__).resolve().parents[2] / 'data'
for fn in ('domiculeTilingTests.json', 'domiculeTilingTests-Rectangles.json'):
    for t in json.load(open(root / fn))['testCases']:
        h, w = t['rowCount'], t.get('colCount', t['rowCount'])
        if h == 0 or w == 0:
            continue
        hh, ww = (h, w) if w <= h else (w, h)       # put the short side across
        got = tm.count(hh, ww) if ww <= 12 else count_crt(hh, ww)
        check(f'{fn} {h}x{w}', got == int(t['expectedResult']), f'= {got}')
z20 = int('974206002957112698855240779762528002509423239819130603938953917534367085458193363176670427')
got = count_crt(20, 20)
check('README 20x20 (used by fitsq.py)', got == z20, f'= {got}')

# ---------------------------------------------------------------- 3. square lattice
print('== 3. square lattice')
for w in range(2, 17):
    a = [np.cos(np.pi * j / (w + 1)) for j in range(1, w // 2 + 1)]
    exact = sum(np.log(x + np.sqrt(1 + x * x)) for x in a)
    d = sector_eig('sq', 'free', w, 0, maxit=4000)
    check(f'sq free strip w={w} vs prod(a+sqrt(1+a^2))', abs(d['log_lambda'] - exact) < 1e-12,
          f'TM {d["log_lambda"]:.15f} exact {exact:.15f} it={d["iterations"]}')
def sq_cyl_exact(w, shift):
    """Free-fermion value of log(lambda)/w on the even-w square cylinder:
    (1/2w) sum_k asinh|cos q_k|, q_k = 2 pi (k + shift) / w."""
    return sum(asinh(fabs(mcos(2 * pi * (k + shift) / w))) for k in range(w)) / (2 * w)


def fit(vals, n):
    W = sorted(vals)[-(n + 1):]
    A = mp.matrix([[mpf(1)] + [mpf(1) / mpf(w) ** (2 * k) for k in range(1, n + 1)] for w in W])
    return W, mp.lu_solve(A, mp.matrix([mpf(vals[w]) for w in W]))


cyl, ex = {}, {}
for w in range(4, 19, 2):
    d = [sector_eig('sq', 'cyl', w, p, maxit=20000) for p in (0, 1)]
    assert all(x['converged'] for x in d), w
    cyl[w] = max(x['log_lambda'] for x in d) / w
    # sector 0 (the one holding Z from the empty boundary) = antiperiodic momenta
    # for w = 0 mod 4 and periodic for w = 2 mod 4; sector 1 the other one
    e0, e1 = (sq_cyl_exact(w, mpf(1) / 2), sq_cyl_exact(w, 0))[:: 1 if w % 4 == 0 else -1]
    ex[w] = e0
    dev = max(abs(d[0]['per_site'] - e0), abs(d[1]['per_site'] - e1))
    check(f'sq cyl w={w:2d} sectors = free-fermion formula', dev < 1e-14,
          f'TM {d[0]["per_site"]:.15f} {d[1]["per_site"]:.15f} max|diff| {mp.nstr(dev, 2)} it={d[0]["iterations"]},{d[1]["iterations"]}')
gp = catalan / pi
print('  fits f(w) = s + sum_{k=1}^{n} a_k / w^(2k) on the last n+1 even widths (TM values | exact formula):')
for n in range(1, 8):
    W, x = fit(cyl, n)
    _, y = fit(ex, n)
    print(f'    n={n} w={W[0]}..{W[-1]}: s-G/pi = {mp.nstr(x[0] - gp, 3):>9} | {mp.nstr(y[0] - gp, 3):>9}   a_1={mp.nstr(x[1], 8)} (pi/6={mp.nstr(pi / 6, 8)})')
check('sq cyl TM-only extrapolation (w=4..18, 8-term fit) -> G/pi', abs(x[0] - gp) < 1e-6,
      f'|s-G/pi| = {mp.nstr(abs(x[0] - gp), 3)}; same digits as the exact formula, i.e. the asymptotic series, not the TM, limits it')
big = {w: sq_cyl_exact(w, mpf(1) / 2) for w in (1000, 2000, 4000)}
for w in big:
    print(f'  formula w={w}: (f(w) - G/pi) w^2 = {mp.nstr((big[w] - gp) * w * w, 12)}  (pi/6 = {mp.nstr(pi / 6, 12)})')
W, x = fit(big, 2)
check('free-fermion formula Richardson (w=1000,2000,4000) -> G/pi', abs(x[0] - gp) < 1e-15,
      f'|s-G/pi| = {mp.nstr(abs(x[0] - gp), 3)}')

# ---------------------------------------------------------------- 4. triangular lattice
print('== 4. triangular lattice (square + one diagonal) via Kasteleyn')
TRI = [(1, 0), (0, 1), (1, 1)]          # (dx, dy); edge types h, v, d


def kmat(L, M, o):
    """Antisymmetric matrix of the L x M free board, sign o[(type, x%2, y%2)]."""
    K = np.zeros((L * M, L * M))
    for x, y in itertools.product(range(L), range(M)):
        for k, (dx, dy) in enumerate(TRI):
            x2, y2 = x + dx, y + dy
            if x2 < L and y2 < M:
                s = o[k, x % 2, y % 2]
                K[x * M + y, x2 * M + y2] = s
                K[x2 * M + y2, x * M + y] = -s
    return K


def pf_abs(K):
    sgn, ld = np.linalg.slogdet(K)
    return 0.0 if sgn == 0 else float(np.exp(ld / 2))


small = [(L, M, tm.count(M, L, 'tri', 'free')) for L, M in [(2, 3), (3, 4), (4, 4), (4, 5), (5, 6), (6, 6)]]
orient = None
for bits in range(1 << 12):
    o = np.array([1 - 2 * (bits >> i & 1) for i in range(12)]).reshape(3, 2, 2)
    if all(round(pf_abs(kmat(L, M, o))) == z for L, M, z in small):
        orient = o
        break
check('Pfaffian orientation found (matches exact tri counts on 6 small boards)', orient is not None,
      '' if orient is None else 'signs h,v,d by (x%2,y%2): ' + str(orient.reshape(3, 4).tolist()))
for L in (8, 10, 12):
    z = tm.count(L, L, 'tri', 'free')
    got = pf_abs(kmat(L, L, orient))
    check(f'|Pf| = tri count on {L}x{L}', abs(got / z - 1) < 1e-9, f'{z}')


def bloch_logdet(o, k1, k2):
    """log|det K(k)| for the 2x2-periodic orientation, cell sites s = x%2 + 2*(y%2)."""
    Kh = np.zeros((4, 4), dtype=complex)
    for x, y in itertools.product(range(2), range(2)):
        for k, (dx, dy) in enumerate(TRI):
            x2, y2 = x + dx, y + dy
            R1, R2 = x2 // 2, y2 // 2
            s, t = x + 2 * y, x2 % 2 + 2 * (y2 % 2)
            ph = np.exp(1j * (k1 * R1 + k2 * R2))
            Kh[s, t] += o[k, x, y] * ph
            Kh[t, s] -= o[k, x, y] / ph
    return np.log(abs(np.linalg.det(Kh)))


for G in (16, 32, 64):
    ks = 2 * np.pi * (np.arange(G) + 0.5) / G
    avg = np.mean([bloch_logdet(orient, a, b) for a in ks for b in ks])
    s_kast = avg / 8                    # (1/2) log|Pf| per site, 4 sites per cell
    print(f'  Kasteleyn Bloch average, {G}x{G} grid: s_tri = {s_kast:.15f}')
tc = json.load(open('sec_tri_cyl_3_18.json'))
s_tm = tc['17']['0'] / 17
check('tri cylinder (w=17) = Kasteleyn bulk value', abs(s_tm - s_kast) < 1e-13,
      f'TM {s_tm:.15f} Kasteleyn {s_kast:.15f} diff {s_tm - s_kast:.1e}')
check('tri value starts 0.4286', f'{s_tm:.4f}' == '0.4286', f'{s_tm:.13f}')

# ---------------------------------------------------------------- 5. free strips w = 3, 4
print('== 5. free king strips vs ratios of exact counts')
kf = json.load(open('sec_king_free_1_18.json'))
for w, step, name in ((3, 2, 'A239265: a(n) = Z(3 x 2n)'), (4, 1, 'A239266: a(n) = Z(4 x n)')):
    a = [tm.count(step * n, w) for n in range(1, 41)]
    print(f'  {name}, n = 1..10: {a[:10]}')
    lam = mp.e ** (step * mpf(kf[str(w)]['0']))  # lambda_w^step from the power iteration
    errs = [abs(mpf(a[n + 1]) / a[n] - lam) / lam for n in range(len(a) - 1)]
    print(f'    |a(n+1)/a(n) / lambda_w^{step} - 1| at n = 5, 10, 20, 39: '
          + ' '.join(mp.nstr(errs[n - 1], 3) for n in (5, 10, 20, 39)))
    check(f'free w={w}: a(n+1)/a(n) -> lambda_{w}^{step}', errs[-1] < 1e-14,
          f'lambda_{w}^{step} = {mp.nstr(lam, 16)}, ratio(40/39) = {mp.nstr(mpf(a[-1]) / a[-2], 16)}')

print(f'\n{len(FAIL)} failed' + (': ' + ', '.join(FAIL) if FAIL else ''))
sys.exit(1 if FAIL else 0)
