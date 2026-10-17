"""Task 1 (session 3b): the left-right reflection J and hypothesis (L).

usage: python3 symmetry.py > out_symmetry.txt

(L): q -> Z(2q, m) log-convex for the free king strip of width m. Known (session 2): it fails
for diagonal weights (1, 1/2), (1, 3/4); it holds for equal weights. This script pins down why.

A  (exact) Factorisation T = H M of the row transfer: H(s, a) = horizontal tilings of the row
   outside s u a (symmetric, J-invariant), M(a, b) = crossing kernel (bijections a -> b with
   |shift| <= 1, weights wo, xl, xr). For ANY weights M^T = J M J, hence G := J M is symmetric
   and G T is symmetric: T is self-adjoint for the indefinite form G. For equal weights
   J T = T J and Z(k) = (T_+^k)[0][0] with T_+ the J-even block.
B  (float) Weight formula. For a simple real eigenvalue lambda_j of T with right eigenvector r_j,
   the weight of lambda_j in Z(k) = sum_j c_j lambda_j^k is c_j = r_j(0)^2 / (r_j^T G r_j):
   its sign is the Krein signature of r_j for G. With equal weights G = M on the J-even sector
   and G = -M on the J-odd sector. Table: leading levels of A = T^2 by sector, with M-signature.
C  (float) Homotopy (1, 1 - eps): the J-odd level becomes visible with weight ~ -K eps^2 < 0.
D  (exact) Consequences: (1) near-symmetric weights (1, 9/10), (1, 19/20) violate (L) at m = 8
   (and m = 12) at large q, where the J-odd level lies above the leading visible J-even level;
   predicted onset vs exact onset. (2) The J-symmetrised transfer T_s = H (M + M^T)/2 of the
   asymmetric models satisfies (L) wherever tested. (3) Orbit counts of tilings under J:
   F = J-symmetric tilings, Z_+ = (Z + F)/2, Z_- = (Z - F)/2, tested for (L).
E  (float) Inertia of M on the J-even / J-odd sectors.
"""
import collections, sys, time
from fractions import Fraction
import numpy as np
from kt import rev, configs, transfer, zseq, lviol, propagate

t0 = time.time()


def hmat(m, wo=1):
    """H as dict-of-Counters, built directly (not from configs)."""
    H = {}
    for s in range(1 << m):
        row = collections.Counter()
        for a in range(1 << m):
            if s & a:
                continue
            free = ~(s | a) & ((1 << m) - 1)
            runs, ok, run = 0, True, 0
            for c in range(m + 1):
                if c < m and free >> c & 1:
                    run += 1
                else:
                    ok &= run % 2 == 0
                    runs += run // 2
                    run = 0
            if ok:
                row[a] = wo ** runs
        H[s] = row
    return H


def mmat(m, wo=1, xl=1, xr=1):
    """Crossing kernel M[a][b] = sum over bijections a -> b, |b_i - a_i| <= 1, of the weights."""
    M = {}
    for a in range(1 << m):
        A = [c for c in range(m) if a >> c & 1]
        row = collections.Counter()

        def rec(i, used, w):
            if i == len(A):
                row[used] += w
                return
            c = A[i]
            for d, wt in ((c - 1, xl), (c, wo), (c + 1, xr)):
                if 0 <= d < m and not used >> d & 1 and wt:
                    rec(i + 1, used | 1 << d, w * wt)
        rec(0, 0, 1)
        M[a] = row
    return M


def mul(P, Q):
    R = {}
    for s, row in P.items():
        acc = collections.Counter()
        for a, w in row.items():
            for b, v in Q[a].items():
                acc[b] += w * v
        R[s] = +acc if any(acc.values()) else collections.Counter()
    return R


def same(P, Q):
    return all(+P[s] == +Q[s] for s in P)


def transpose(P):
    R = {s: collections.Counter() for s in P}
    for s, row in P.items():
        for t, w in row.items():
            R[t][s] += w
    return R


def conjJ(P, m):
    return {rev(s, m): collections.Counter({rev(t, m): w for t, w in row.items()}) for s, row in P.items()}


def leftJ(P, m):
    return {rev(s, m): collections.Counter(row) for s, row in P.items()}


def dense(P, m, dtype=float):
    n = 1 << m
    A = np.zeros((n, n), dtype=dtype)
    for s, row in P.items():
        for t, w in row.items():
            A[s, t] = w
    return A


print('A. exact structure: T = H M, H = H^T = JHJ, M^T = JMJ, G = JM symmetric, G T symmetric')
WEIGHTS = [(1, 1, 1), (2, 2, 1), (4, 4, 3), (10, 10, 9), (1, 1, 0)]
for m in range(1, 8):
    res = []
    for w in WEIGHTS:
        T, H, M = transfer(m, *w), hmat(m, w[0]), mmat(m, *w)
        G = leftJ(M, m)
        ok = (same(T, mul(H, M)) and same(H, transpose(H)) and same(H, conjJ(H, m))
              and same(transpose(M), conjJ(M, m)) and same(G, transpose(G))
              and same(mul(G, T), transpose(mul(G, T))))
        if w[1] == w[2]:
            ok &= same(T, conjJ(T, m))
        res.append(ok)
    print(f'  m={m}: ' + '  '.join(f'{w}: {"ok" if r else "FAIL"}' for w, r in zip(WEIGHTS, res)))
    assert all(res)

print('  J-even block: Z(k) = (T_+^k)[0][0], T_+ in the orbit basis f_O = sum_{s in O} e_s, k <= 30, equal weights')
for m in range(1, 11):
    T = transfer(m)
    orb = sorted({min(s, rev(s, m)) for s in range(1 << m)})
    Tp = {o: collections.Counter() for o in orb}
    for o in orb:                                  # f_O T = sum_O' T_+[O][O'] f_O'
        for s in {o, rev(o, m)}:
            for t, w in T[s].items():
                if t == min(t, rev(t, m)):
                    Tp[o][t] += w
    assert zseq(Tp, 30) == zseq(T, 30), m
print(f'  m = 1..10: identical ({len(orb)} J-even vs {(1 << 10) - len(orb)} J-odd states at m = 10)')

# ---------------------------------------------------------------------------------------------
print('\nB. weights c_j = r_j(0)^2 / (r_j^T G r_j) and sector levels (float64)')


def eigdata(m, w=(1, 1, 1)):
    T = dense(transfer(m, *w), m)
    G = dense(leftJ(mmat(m, *w), m), m)
    lam, R = np.linalg.eig(T)
    L = np.linalg.inv(R)
    c = R[0, :] * L[:, 0]
    return T, G, lam, R, c


maxerr = 0
for m in range(2, 10):
    for w in [(1, 1, 1), (1, 1, 0.5), (1, 1, 0.9)]:
        T, G, lam, R, c = eigdata(m, w)
        for j in np.argsort(-abs(lam))[:40]:
            if abs(lam[j].imag) > 1e-9 or abs(c[j]) < 1e-8 * abs(c).max():
                continue
            r = R[:, j].real
            # skip numerically degenerate eigenvalues (+-lambda pairs are distinct, fine)
            if np.sort(abs(lam - lam[j]))[1] < 1e-7 * abs(lam[j]):
                continue
            pred = r[0] ** 2 / (r @ G @ r)
            maxerr = max(maxerr, abs(pred - c[j].real) / abs(c).max())
print(f'  m = 2..9, weights (1,1,1), (1,1,1/2), (1,1,0.9): max |c_formula - c_eig| / max|c| = {maxerr:.1e}')

print('\n  equal weights, A = T^2: leading subleading levels mu/mu_1 per sector; tags: J-parity,')
print('  |s|-parity class (even m only; e0 lives in class e), sign of r^T M r; "vis" = e0-visible')
print('  m  top visible J-even subleading        top J-odd level in e0-reachable class   J-odd above?')
pred_fail = {}
for m in range(3, 12):
    T, G, lam, R, c = eigdata(m)
    M = dense(mmat(m), m)
    n = 1 << m
    Jv = np.array([rev(s, m) for s in range(n)])
    odd = np.array([bin(s).count('1') % 2 for s in range(n)])
    vis = abs(c) > 1e-8 * abs(c).max()
    mu1 = (abs(lam[vis]) ** 2).max()               # leading e0-visible level
    best_even = best_odd = None
    for j in np.argsort(-abs(lam)):
        if abs(lam[j].imag) > 1e-9 * abs(lam[j]):
            continue
        r = R[:, j].real
        if abs(lam[j]) ** 2 > (1 - 1e-9) * mu1:
            continue                               # the leading level (and, even m, the odd-class one)
        par = 1 if np.allclose(r[Jv], r, atol=1e-7) else (-1 if np.allclose(r[Jv], -r, atol=1e-7) else 0)
        if m % 2 == 0 and np.abs(r[odd == 0]).max() < 1e-9:
            continue                               # odd |s| class: invisible for every weight
        mu = lam[j].real ** 2 / mu1
        sig = '+' if r @ M @ r > 0 else '-'
        if par == 1 and best_even is None and abs(c[j]) > 1e-10:
            best_even = (mu, sig, (c[j] / c[np.argmax(np.where(vis, abs(lam), 0))]).real)
        if par == -1 and best_odd is None:
            best_odd = (mu, sig, abs(c[j]))
        if best_even and best_odd:
            break
    above = best_odd[0] > best_even[0]
    pred_fail[m] = above
    print(f' {m:2d}  {best_even[0]:.5f} (M-sign {best_even[1]}, c/c1 = {best_even[2]:+.3f})'
          f'        {best_odd[0]:.5f} (M-sign {best_odd[1]}, |c| = {best_odd[2]:.0e})          {"YES" if above else "no"}',
          flush=True)

# ---------------------------------------------------------------------------------------------
print('\nC. homotopy (1, 1 - eps): weight of the descendant of the top J-odd level, followed by continuation')
print('   from eps = 0 in steps of 1e-3 (relative to the leading weight c_1; +-lambda pairs summed for odd m)')
for m in (4, 5, 8):
    T0, G0, lam0, R0, c0 = eigdata(m)
    n = 1 << m
    Jv = np.array([rev(s, m) for s in range(n)])
    odd = np.array([bin(s).count('1') % 2 for s in range(n)])
    vis0 = abs(c0) > 1e-8 * abs(c0).max()
    lead = lam0[np.argmax(np.where(vis0, abs(lam0), 0))].real
    tgt = None
    for j in np.argsort(-abs(lam0)):
        r = R0[:, j].real
        if abs(lam0[j].imag) < 1e-9 and np.allclose(r[Jv], -r, atol=1e-7) and (m % 2 or np.abs(r[odd == 0]).max() > 1e-9):
            tgt = lam0[j].real
            break
    line = f'  m={m}, J-odd level mu/mu1 = {tgt ** 2 / lead ** 2:.5f}:'
    eps, step = 0.0, 1e-3
    for target_eps in (1e-3, 3e-3, 1e-2, 3e-2):
        while eps < target_eps - 1e-12:
            eps += step
            T, G, lam, R, c = eigdata(m, (1, 1, 1 - eps))
            tgt = lam[np.argmin(abs(lam - tgt))]
            lead = lam[np.argmax(np.where(abs(c) > 1e-8 * abs(c).max(), abs(lam), 0))]   # visible leading
        pick = lambda z: [j for j in range(len(lam)) if abs(lam[j] - z) < 1e-9 * abs(lead)]
        ct = sum(c[j] for z in ((tgt, -tgt) if m % 2 else (tgt,)) for j in pick(z)).real
        c1 = sum(c[j] for z in ((lead, -lead) if m % 2 else (lead,)) for j in pick(z)).real
        line += f'  eps={eps:.0e}: mu/mu1 = {(tgt / lead).real ** 2:.5f}, c/c1 = {ct / c1:+.2e} (/eps^2 = {ct / c1 / eps ** 2:+.3f})'
    print(line, flush=True)
# ---------------------------------------------------------------------------------------------
print('\nD1. exact (L) for near-symmetric weights (orthogonal, x_dl, x_dr); predicted onset from the')
print('    visible spectrum: first q where sum_j (c_j/c_1) rho_j^(q-1) (1 - rho_j)^2 < 0, rho_j = mu_j/mu_1')


def predicted_onset(m, w, qmax):
    T = dense(transfer(m, *w), m)
    lam, R = np.linalg.eig(T)
    c = R[0, :] * np.linalg.inv(R)[:, 0]
    mu = lam ** 2
    groups = []
    for i in np.argsort(-abs(mu)):
        if abs(c[i]) < 1e-12 * abs(c).max():
            continue
        for g in groups:
            if abs(g[0] - mu[i]) < 1e-9 * abs(mu).max():
                g[1] += c[i]
                break
        else:
            groups.append([mu[i], c[i]])
    mu1, c1 = groups[0]
    for q in range(2, qmax):
        s = sum((g[1] / c1) * (g[0] / mu1) ** (q - 1) * (1 - g[0] / mu1) ** 2 for g in groups[1:] if abs(g[1]) > 1e-14)
        if s.real < 0:
            return q
    return None


for m, w, K in [(4, (1, 1, 1), 400), (4, (10, 10, 9), 400), (8, (1, 1, 1), 260), (8, (10, 10, 9), 200), (8, (20, 20, 19), 260), (6, (10, 10, 9), 300),
                (12, (1, 1, 1), 140), (12, (10, 10, 9), 140)]:
    Z = zseq(transfer(m, *w), K)
    bad, n = lviol(Z)
    pq = predicted_onset(m, w, K) if m <= 10 else None
    print(f'  m={m:2d} {str(w):13s} 2q <= {K - 2}: violations {len(bad):3d}/{n}, first 2q = {2 * bad[0] if bad else "-":>4}'
          f'   predicted first 2q = {2 * pq if pq else ("-" if m <= 10 else "n/a (m > 10)")}'
          f'   J-odd level above (table B): {"yes" if pred_fail.get(m) else "no" if m in pred_fail else "n/a"}', flush=True)

print('\nD2. exact (L) for the J-symmetrised transfer T_s = H (M + M^T)/2 (counts scaled by 2^k)')
print('    vs the original asymmetric transfer T = H M; entry = violations/cases (first 2q)')
SYMW = [(2, 2, 1), (4, 4, 3), (1, 1, 0), (10, 10, 9)]
print('   m  ' + ''.join(f'{str(w) + " T":>18}{str(w) + " T_s":>18}' for w in SYMW))
for m in range(3, 10):
    line = f'  {m:2d}  '
    for w in SYMW:
        K = 200 if (m == 8 and w == (10, 10, 9)) else 40
        H, M = hmat(m, w[0]), mmat(m, *w)
        Ms = {a: collections.Counter() for a in M}
        for a, row in M.items():
            for b, v in row.items():
                Ms[a][b] += v
                Ms[b][a] += v
        Ts = mul(H, Ms)                             # = 2 T_s, integer
        for Tm in (transfer(m, *w), Ts):
            bad, n = lviol(zseq(Tm, K))
            line += f'{f"{len(bad)}/{n}" + (f" ({2 * bad[0]})" if bad else ""):>18}'
    print(line, flush=True)

# ---------------------------------------------------------------------------------------------
print('\nD3. exact (L) for J-orbit counts: F = J-symmetric tilings, Z_+ = (Z+F)/2 orbits, Z_- = (Z-F)/2')


def sym_configs(s, m):
    """Row configurations from the J-symmetric state s whose domino set is J-invariant."""
    J = lambda d: {'h': ('h', m - 2 - d[1]), 'v': ('v', m - 1 - d[1]), 'l': ('r', m - 1 - d[1]),
                   'r': ('l', m - 1 - d[1])}[d[0]]
    cells = lambda d: ({('c', d[1]), ('c', d[1] + 1)} if d[0] == 'h' else
                       {('c', d[1]), ('n', d[1] + {'v': 0, 'l': -1, 'r': 1}[d[0]])})
    out = []

    def rec(cur, nxt):
        c = 0
        while c < m and cur >> c & 1:
            c += 1
        if c == m:
            out.append(nxt)
            return
        for d in (('h', c), ('v', c), ('l', c), ('r', c)):
            dj = J(d)
            ds = [d] if dj == d else [d, dj]
            used = set()
            ok = True
            for e in ds:
                for kind, x in cells(e):
                    if not 0 <= x < m or (kind, x) in used or (kind == 'c' and cur >> x & 1) or (kind == 'n' and nxt >> x & 1):
                        ok = False
                    used.add((kind, x))
            if ok:
                c2, n2 = cur, nxt
                for kind, x in used:
                    if kind == 'c':
                        c2 |= 1 << x
                    else:
                        n2 |= 1 << x
                rec(c2, n2)
    rec(s, 0)
    return out


def fseq(m, K):
    TJ = {}
    for s in range(1 << m):
        if rev(s, m) == s:
            TJ[s] = collections.Counter(sym_configs(s, m))
    for s in range(1 << m):
        TJ.setdefault(s, collections.Counter())
    return zseq(TJ, K)


# brute-force check of F on small boards
def brute_F(k, m):
    cells = [(r, c) for r in range(k) for c in range(m)]
    cnt = [0, 0]

    def rec(free, edges):
        if not free:
            E = {frozenset(e) for e in edges}
            JE = {frozenset(((a[0], m - 1 - a[1]), (b[0], m - 1 - b[1]))) for a, b in edges}
            cnt[0] += 1
            cnt[1] += E == JE
            return
        x = free[0]
        for y in free[1:]:
            if abs(y[0] - x[0]) <= 1 and abs(y[1] - x[1]) <= 1:
                rec([z for z in free[1:] if z != y], edges + [(x, y)])
    rec(cells, [])
    return cnt


for k, m in [(2, 2), (2, 3), (4, 2), (4, 3), (4, 4), (2, 6), (6, 3), (4, 5), (6, 4)]:
    zt, ft = brute_F(k, m)
    assert ft == fseq(m, k)[k] and zt == zseq(transfer(m), k)[k], (k, m)
print('  F checked against brute force on (k, m) in {2,4,6} x {2..6} (small boards)')
for m in range(3, 12, 2):
    assert fseq(m, 30)[0::2] == zseq(transfer((m - 1) // 2), 30)[0::2]
print('  odd m: F(k, m) = Z(k, (m-1)/2) (middle column forced vertical), checked m = 3..11, k <= 30')
print('   m   K    F         Z_+       Z_-')
for m in range(2, 13):
    K = 80 if m <= 9 else 40
    Z = zseq(transfer(m), K)
    F = fseq(m, K)
    Zp = [(a + b) // 2 for a, b in zip(Z, F)]
    Zm = [(a - b) // 2 for a, b in zip(Z, F)]
    cols = []
    for S in (F, Zp, Zm):
        bad, n = lviol(S)
        cols.append(f'{len(bad)}/{n}' + (f'({2 * bad[0]})' if bad else ''))
    print(f'  {m:2d}  {K:3d}  ' + '  '.join(f'{x:8s}' for x in cols), flush=True)

# ---------------------------------------------------------------------------------------------
print('\nE. inertia of the crossing kernel M (equal weights) on the J-even / J-odd sectors (float64)')
print('   m  (pos, neg, zero) on J-even   (pos, neg, zero) on J-odd    [J-odd pos = neg. index of G = JM there]')
for m in range(2, 11):
    M = dense(mmat(m), m)
    n = 1 << m
    orb = sorted({min(s, rev(s, m)) for s in range(n)})
    P = np.zeros((n, len(orb)))
    for i, s in enumerate(orb):
        P[s, i] = P[rev(s, m), i] = 1
    anti = [s for s in orb if rev(s, m) != s]
    Q = np.zeros((n, len(anti)))
    for i, s in enumerate(anti):
        Q[s, i], Q[rev(s, m), i] = 1, -1
    res = []
    for B in (P, Q):
        B = B / np.linalg.norm(B, axis=0)
        ev = np.linalg.eigvalsh(B.T @ M @ B)
        tol = 1e-9 * abs(ev).max()
        res.append((int((ev > tol).sum()), int((ev < -tol).sum()), int((abs(ev) <= tol).sum())))
    print(f'  {m:2d}  {str(res[0]):26s}  {str(res[1]):26s}')
print('  m = 3, one particle: M = [[1,1,0],[1,1,1],[0,1,1]], J-even vector (1, -sqrt 2, 1) has M-norm 4(1 - sqrt 2) < 0')

print(f'\ntotal time {time.time() - t0:.0f} s')
