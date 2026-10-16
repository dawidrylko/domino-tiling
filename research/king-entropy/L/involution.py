"""Task 2 (session 3b): a reflection-twisted cut-and-swap involution for (L).

usage: python3 involution.py > out_involution.txt

Type 1 pairs (X, Y): X a tiling of rows [0, 2q), Y of rows [2, 2q+2)      (Z(2q)^2 pairs).
Type 2 pairs (X, Y): X a tiling of rows [0, 2q+2), Y of rows [2, 2q)       (Z(2q-2) Z(2q+2) pairs).
U_X(r) = cells of row r covered from row r-1 (U = 0 outside the tiled rows), likewise U_Y(r).
Row r in [2, 2q] is a CUT of the pair if U_X(r) = U_Y(r) (plain) or U_X(r) = J U_Y(r) (twisted,
J = left-right reflection). Swap at the first cut r:

  X' = X(rows < r) ++ J^e Y(rows >= r),   Y' = Y(rows < r) ++ J^e X(rows >= r),

e = 0 for a plain cut, e = 1 for a twisted one (plain preferred). Rows < r are untouched and
U_X'(r) = U_X(r), U_Y'(r) = U_Y(r), so r stays the first cut: Phi is an involution between type 1
and type 2 pairs that have a cut, and it changes the row extents exactly as needed. The plain
swap preserves the weight monomial wo^a xl^b xr^c for any weights; the twisted swap preserves it
only for xl = xr (J swaps the two diagonals below the cut). Hence, for equal diagonal weights,

  Z(2q-2) Z(2q+2) - Z(2q)^2 = N_2 - N_1,   N_i = number of type-i pairs with NO cut,

and (L) <=> N_1 <= N_2. Plain cuts alone are the classical argument: a plain cut forces t = 0 TB
paths in the superposition (session-2 reformulation R1), so it only reproduces the cancellation of
t = 0 superpositions; twisted cuts are compatible with TB paths and are new.

Part 1: explicit enumeration of all pairs for small (m, q): Phi maps type 1 <-> type 2, Phi^2 = id,
        number of diagonals preserved, N_2 - N_1 = D.
Part 2: N_1, N_2 by a pair transfer matrix for larger (m, q); fraction of pairs left unmatched.
Part 3: the same with asymmetric weights: N_2 - N_1 != D (the twisted swap needs the symmetry).
"""
import collections, itertools, sys, time
import numpy as np
from kt import rev, configs, transfer, zseq

t0 = time.time()


# ------------------------------------------------------------------------------- Part 1
def tilings(m, k):
    """All tilings of k rows as tuples of row configurations (each config = tuple of dominoes);
    also returns the state sequence U(0..k)."""
    out = []

    def rec(s, confs, states):
        if len(confs) == k:
            if s == 0:
                out.append((tuple(confs), tuple(states)))
            return
        for t, w, doms in configs(s, m):
            rec(t, confs + [doms], states + [t])
    rec(0, [], [0])
    return out


def jconf(doms, m):
    J = {'h': lambda c: ('h', m - 2 - c), 'v': lambda c: ('v', m - 1 - c),
         'l': lambda c: ('r', m - 1 - c), 'r': lambda c: ('l', m - 1 - c)}
    return tuple(sorted(J[d](c) for d, c in doms))


def norm(doms):
    return tuple(sorted(doms))


def ndiag(confs):
    return sum(1 for doms in confs for d, _ in doms if d in 'lr'), sum(1 for doms in confs for d, _ in doms if d == 'l')


def phi(pair, q, m):
    """pair = (X, Y, typ); X, Y = (confs, states); X starts at row 0, Y at row 2.
    Returns the swapped pair or None if there is no cut."""
    (Xc, Xs), (Yc, Ys), typ = pair
    UX = lambda r: Xs[r] if r < len(Xs) else 0
    UY = lambda r: Ys[r - 2] if 0 <= r - 2 < len(Ys) else 0
    for r in range(2, 2 * q + 1):
        a, b = UX(r), UY(r)
        if a == b:
            e = 0
        elif a == rev(b, m):
            e = 1
        else:
            continue
        f = (lambda c: jconf(c, m)) if e else norm
        g = (lambda s: rev(s, m)) if e else (lambda s: s)
        Xc2 = tuple(norm(c) for c in Xc[:r]) + tuple(f(c) for c in Yc[r - 2:])
        Xs2 = tuple(Xs[:r]) + tuple(g(s) for s in Ys[r - 2:])
        Yc2 = tuple(norm(c) for c in Yc[:r - 2]) + tuple(f(c) for c in Xc[r:])
        Ys2 = tuple(Ys[:r - 2]) + tuple(g(s) for s in Xs[r:])
        return ((Xc2, Xs2), (Yc2, Ys2), 3 - typ), r, e
    return None


def canon(T):
    return (tuple(norm(c) for c in T[0]), tuple(T[1]))


print('Part 1. explicit enumeration of all pairs; Phi = swap at the first (plain or twisted) cut')
allok = True
for m, q in [(2, 2), (2, 3), (2, 4), (3, 2), (3, 3), (4, 2), (5, 2), (4, 3)]:
    if m * (2 * q + 2) > 30:
        continue
    A = tilings(m, 2 * q)
    Bp = tilings(m, 2 * q + 2)
    Bm = tilings(m, 2 * q - 2)
    P1 = set((canon(x), canon(y), 1) for x, y in itertools.product(A, A))
    P2 = set((canon(x), canon(y), 2) for x, y in itertools.product(Bp, Bm))
    N = {1: 0, 2: 0}
    ok = True
    kinds = collections.Counter()
    for P, typ in ((P1, 1), (P2, 2)):
        for p in P:
            res = phi(p, q, m)
            if res is None:
                N[typ] += 1
                continue
            p2, r, e = res
            kinds[typ, e] += 1
            ok &= p2 in (P2 if typ == 1 else P1)                  # lands in the other type
            back = phi(p2, q, m)
            ok &= back is not None and back[0] == p and back[1] == r and back[2] == e   # involution
            ok &= ndiag(p[0][0]) [0] + ndiag(p[1][0])[0] == ndiag(p2[0][0])[0] + ndiag(p2[1][0])[0]
    D = len(Bp) * len(Bm) - len(A) ** 2
    ok &= N[2] - N[1] == D
    allok &= ok
    print(f'  m={m} q={q}: pairs {len(P1)} (type 1) / {len(P2)} (type 2); matched plain {kinds[1, 0]}, twisted {kinds[1, 1]};'
          f' unmatched N_1 = {N[1]}, N_2 = {N[2]}; D = {D}; involution + type swap + diagonals + N_2 - N_1 = D: {ok}',
          flush=True)
print(f'  all explicit checks passed: {allok}')
assert allok


def tb_paths(pair, q):
    """t = number of top-bottom paths of the superposition (rows 0,1 = T, rows 2q, 2q+1 = B)."""
    (Xc, Xs), (Yc, Ys), typ = pair
    adj = collections.defaultdict(list)
    for r0, confs in ((0, Xc), (2, Yc)):
        for i, doms in enumerate(confs):
            r = r0 + i
            for d, c in doms:
                a = (r, c)
                b = (r, c + 1) if d == 'h' else (r + 1, c + {'v': 0, 'l': -1, 'r': 1}[d])
                adj[a].append(b)
                adj[b].append(a)
    t, seen = 0, set()
    for v in adj:
        if len(adj[v]) == 1 and v[0] < 2 and v not in seen:
            prev, cur = None, v
            while prev is None or len(adj[cur]) == 2:
                nb = adj[cur]
                nxt = nb[0] if prev is None or nb[0] != prev else nb[1]
                prev, cur = cur, nxt
            seen |= {v, cur}
            t += cur[0] >= 2 * q
    return t


print('\n  t = number of TB paths (session-2 reformulation R1); twisted swaps vs t, and the combined')
print('  partial involution {t = 0: flip the BB paths (R1)} u {t >= 1: twisted swap if the image has t >= 1}')
for m, q in [(3, 2), (3, 3), (4, 2), (5, 2)]:
    A = tilings(m, 2 * q)
    Bp, Bm = tilings(m, 2 * q + 2), tilings(m, 2 * q - 2)
    stats = collections.Counter()
    for typ, P in ((1, ((canon(x), canon(y), 1) for x, y in itertools.product(A, A))),
                   (2, ((canon(x), canon(y), 2) for x, y in itertools.product(Bp, Bm)))):
        for p in P:
            t = tb_paths(p, q)
            if t == 0:
                stats[typ, 't=0'] += 1
                continue
            res = phi(p, q, m)
            if res is None:
                stats[typ, 'res'] += 1
                continue
            t2 = tb_paths(res[0], q)
            assert res[2] == 1                       # a cut of a t >= 1 pair is always twisted
            stats[typ, 'tw ok' if t2 >= 1 else 'tw->t=0'] += 1
            if t2 < 1:
                stats[typ, 'res'] += 1
            stats[typ, 'dt', t2 - t] += 1
    dts = sorted({k[2] for k in stats if k[1] == 'dt'})
    D = len(Bp) * len(Bm) - len(A) ** 2
    assert stats[1, 't=0'] == stats[2, 't=0'] and stats[1, 'tw ok'] == stats[2, 'tw ok']
    assert stats[2, 'res'] - stats[1, 'res'] == D
    print(f'  m={m} q={q}: t>=1 pairs: type 1 {stats[1, "res"] + stats[1, "tw ok"]}, type 2 {stats[2, "res"] + stats[2, "tw ok"]};'
          f' twisted-matched with t' + "'" + f' >= 1: {stats[1, "tw ok"]} / {stats[2, "tw ok"]};'
          f' twisted image with t' + "'" + f' = 0: {stats[1, "tw->t=0"]} / {stats[2, "tw->t=0"]};'
          f' residual N_1 = {stats[1, "res"]}, N_2 = {stats[2, "res"]} (N_2 - N_1 = {stats[2, "res"] - stats[1, "res"]});'
          f' change of t under the swap: ' + ', '.join(f'{d:+d}: {stats[1, "dt", d] + stats[2, "dt", d]}' for d in dts), flush=True)


# ------------------------------------------------------------------------------- Part 2
def dense_T(m, w):
    T = transfer(m, *w)
    n = 1 << m
    A = np.zeros((n, n), dtype=object)
    A[:] = 0
    for s, row in T.items():
        for t, v in row.items():
            A[s, t] = v
    return A


def unmatched(m, q, w=(1, 1, 1), mode='both'):
    """(N_1, N_2) by the pair transfer; mode in {'none', 'plain', 'both', 'twisted'}."""
    T = dense_T(m, w)
    n = 1 << m
    J = [rev(s, m) for s in range(n)]
    cut = np.zeros((n, n), dtype=bool)
    for a in range(n):
        for b in range(n):
            cut[a, b] = (mode in ('plain', 'both') and a == b) or (mode in ('twisted', 'both') and a == J[b])
    e0 = np.zeros(n, dtype=object)
    e0[:] = 0
    e0[0] = 1
    x = e0.dot(T).dot(T)                       # X alone on rows 0, 1 -> U_X(2)
    out = []
    for typ in (1, 2):
        V = np.zeros((n, n), dtype=object)
        V[:] = 0
        V[:, 0] = x                            # U_Y(2) = 0
        V[cut] = 0                             # cut at row 2
        for r in range(2, 2 * q):              # both advance: row r -> r + 1
            V = T.T.dot(V).dot(T)
            if r + 1 < 2 * q:
                V[cut] = 0
        if typ == 1:                           # X ends at row 2q; then Y alone on rows 2q, 2q+1
            y = V[0, :].copy()
            y[cut[0, :]] = 0
        else:                                  # Y ends at row 2q; then X alone
            y = V[:, 0].copy()
            y[cut[:, 0]] = 0
        y = y.dot(T).dot(T)
        out.append(y[0])
    return out


print('\nPart 2. unmatched pairs by pair transfer (equal weights); sanity: mode none gives Z(2q)^2, Z(2q-2)Z(2q+2)')
for m in (3, 4, 5):
    for q in (2, 3, 4):
        Z = zseq(transfer(m), 2 * q + 2)
        n1, n2 = unmatched(m, q, mode='none')
        assert (n1, n2) == (Z[2 * q] ** 2, Z[2 * q - 2] * Z[2 * q + 2])
        for mode in ('plain', 'both'):
            n1, n2 = unmatched(m, q, mode=mode)
            assert n2 - n1 == Z[2 * q - 2] * Z[2 * q + 2] - Z[2 * q] ** 2, (m, q, mode)
print('  sanity and N_2 - N_1 = D (plain and plain+twisted) for m = 3..5, q = 2..4: ok')
print('   m  q        Z(2q)^2         N_1(plain)      N_1(plain+twisted)  N_2(plain+twisted)   N_1/Z^2 (twisted)  N_1/N_2')
for m in range(2, 8):
    for q in range(2, 9 if m <= 5 else 6):
        Z = zseq(transfer(m), 2 * q + 2)
        n1p, n2p = unmatched(m, q, mode='plain')
        n1, n2 = unmatched(m, q, mode='both')
        assert n2 - n1 == n2p - n1p == Z[2 * q - 2] * Z[2 * q + 2] - Z[2 * q] ** 2
        print(f'  {m:2d} {q:2d}  {Z[2 * q] ** 2:16d}  {n1p:16d}  {n1:18d}  {n2:18d}   {n1 / Z[2 * q] ** 2:16.4f}  {n1 / n2:8.4f}',
              flush=True)

# ------------------------------------------------------------------------------- Part 3
print('\nPart 3. asymmetric weights (wo, xl, xr): plain swaps stay valid, twisted swaps do not')
for m, q, w in [(3, 2, (2, 2, 1)), (4, 2, (2, 2, 1)), (5, 3, (4, 4, 3)), (4, 3, (1, 1, 0))]:
    Z = zseq(transfer(m, *w), 2 * q + 2)
    D = Z[2 * q - 2] * Z[2 * q + 2] - Z[2 * q] ** 2
    n1p, n2p = unmatched(m, q, w, 'plain')
    n1, n2 = unmatched(m, q, w, 'both')
    print(f'  m={m} q={q} w={w}: D = {D}; plain: N_2 - N_1 = {n2p - n1p} ({"=" if n2p - n1p == D else "!="} D);'
          f' plain+twisted: N_2 - N_1 = {n2 - n1} ({"=" if n2 - n1 == D else "!="} D)')

print(f'\ntotal time {time.time() - t0:.0f} s')
