"""(L) as a parity statement about superpositions of two matchings (session 2). Brute force.

usage: python3 lparity.py > out_lparity.txt

Rows 0..2q+1 of a width-m king strip. Type 1: X perfect matching of rows [0, 2q),
Y of rows [2, 2q+2) (Z(2q)^2 pairs). Type 2: X' of rows [0, 2q+2), Y' of rows [2, 2q)
(Z(2q+2) Z(2q-2) pairs). In both, the union multigraph H has degree 1 on the top rows
T = {0, 1} and bottom rows B = {2q, 2q+1} and degree 2 in between, so H is a disjoint
union of paths (ends in T u B) and even cycles. Labels alternate along every component;
the end edges are forced (type 1: X at T, Y at B; type 2: X' at both), hence

  type 1  <=>  every TT and BB path odd, every TB path EVEN,
  type 2  <=>  every path odd (TT, BB and TB),

and each admissible H carries 2^(number of cycles of length >= 4) labelings in either case.
H without TB paths cancel, so

  Z(2q-2) Z(2q+2) - Z(2q)^2 = sum_{H, t(H) >= 1} 2^c(H) ([all TB odd] - [all TB even]).

The script checks every step of this on all pairs for small (m, q), and tabulates the two
sides by t = number of TB paths.
"""
import collections, itertools, sys


def matchings(rows, m):
    """All perfect matchings of the king graph on rows x range(m), as tuples of edges ((r,c),(r',c'))."""
    cells = sorted((r, c) for r in rows for c in range(m))
    S = set(cells)

    def rec(free):
        if not free:
            yield ()
            return
        x = free[0]
        for y in free[1:]:
            if abs(y[0] - x[0]) <= 1 and abs(y[1] - x[1]) <= 1:
                rest = [z for z in free[1:] if z != y]
                for tail in rec(rest):
                    yield ((x, y),) + tail
    return list(rec(cells))


def analyse(E, top, bot):
    """Components of the multigraph with edge list E: list of paths (end types, length) and cycle lengths."""
    adj = collections.defaultdict(list)
    for i, (a, b) in enumerate(E):
        adj[a].append((b, i))
        adj[b].append((a, i))
    used = [False] * len(E)
    paths, cycles = [], []
    ends = [v for v in adj if len(adj[v]) == 1]
    seen_end = set()
    for v in ends:
        if v in seen_end:
            continue
        cur, prev_e, length = v, None, 0
        while True:
            nxt = [(u, i) for u, i in adj[cur] if i != prev_e and not used[i]]
            if not nxt:
                break
            u, i = nxt[0]
            used[i] = True
            cur, prev_e, length = u, i, length + 1
        seen_end |= {v, cur}
        kind = ''.join(sorted(('T' if x[0] in top else 'B') for x in (v, cur)))
        paths.append((kind, length, v, cur))
    for i in range(len(E)):
        if not used[i]:
            a = E[i][0]
            cur, prev_e, length = a, None, 0
            while True:
                nxt = [(u, j) for u, j in adj[cur] if j != prev_e and not used[j]]
                if not nxt:
                    break
                u, j = nxt[0]
                used[j] = True
                cur, prev_e, length = u, j, length + 1
            cycles.append(length)
    return paths, cycles


def run(m, q, sh=2):
    """sh = 2: the (L) geometry above. sh = 1 (control): X on [0, 2q), Y on [1, 2q+1) against
    X' on [0, 2q+1), Y' on [1, 2q): D = Z(2q+1) Z(2q-1) - Z(2q)^2 (odd row counts)."""
    top, bot = set(range(sh)), set(range(2 * q, 2 * q + sh))
    A = matchings(range(0, 2 * q), m)
    Bm = [tuple(((a[0] + sh, a[1]), (b[0] + sh, b[1])) for a, b in x) for x in A]         # rows [sh, 2q+sh)
    Xp = matchings(range(0, 2 * q + sh), m)
    Yp = matchings(range(sh, 2 * q), m) if 2 * q > sh else [()]
    ok = True
    tally = {1: collections.Counter(), 2: collections.Counter()}
    Hcount = {1: collections.Counter(), 2: collections.Counter()}
    Hinfo = {}                                   # hash of H -> (2^c, t)
    for typ, P, Q in ((1, A, Bm), (2, Xp, Yp)):
        for x, y in itertools.product(P, Q):
            E = list(x) + list(y)
            paths, cycles = analyse(E, top, bot)
            tb = [l for k, l, *_ in paths if k == 'BT']
            others = [l for k, l, *_ in paths if k != 'BT']
            if typ == 1:
                ok &= all(l % 2 == 1 for l in others) and all(l % 2 == 0 for l in tb)
            else:
                ok &= all(l % 2 == 1 for l in others + tb)
            ok &= all(c % 2 == 0 for c in cycles)
            key = hash(tuple(sorted(tuple(sorted(e)) for e in E)))
            Hcount[typ][key] += 1
            Hinfo[key] = (2 ** sum(1 for c in cycles if c >= 4), len(tb))
            tally[typ][len(tb)] += 1
    mult_ok = all(n == Hinfo[k][0] for typ in (1, 2) for k, n in Hcount[typ].items())
    cancel_ok = ({k: n for k, n in Hcount[1].items() if Hinfo[k][1] == 0}
                 == {k: n for k, n in Hcount[2].items() if Hinfo[k][1] == 0})
    lhs = len(Xp) * len(Yp) - len(A) ** 2
    rhs = sum(tally[2][t] for t in tally[2] if t) - sum(tally[1][t] for t in tally[1] if t)
    print(f'  shift {sh}, m={m} q={q}: Z(2q)^2 = {len(A) ** 2}, Z(2q+sh) Z(2q-sh) = {len(Xp) * len(Yp)};'
          f' parities as claimed: {ok}; labelings per H = 2^c: {mult_ok}; t=0 classes equal: {cancel_ok};'
          f' D = {lhs} = sum_t>=1 (odd - even) = {rhs}: {lhs == rhs}')
    ts = sorted(set(tally[1]) | set(tally[2]))
    print('      t (TB paths): ' + '  '.join(f't={t}: even {tally[1][t]}, odd {tally[2][t]}' for t in ts))
    return ok and mult_ok and cancel_ok and lhs == rhs, tally


allok = True
for m, q in [(2, 1), (2, 2), (2, 3), (2, 4), (3, 1), (3, 2), (3, 3), (4, 1), (4, 2), (5, 2)]:
    good, _ = run(m, q)
    allok &= good
print('\ncontrol geometry, shift by one row (odd row counts, even m; Z(2j+1) is log-CONCAVE there):')
for m, q in [(2, 1), (2, 2), (2, 3), (2, 4), (4, 1), (4, 2)]:
    good, _ = run(m, q, sh=1)
    allok &= good
print(f'\nall checks passed: {allok}')
sys.exit(0 if allok else 1)
