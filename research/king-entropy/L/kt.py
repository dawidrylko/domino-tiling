"""Row transfer of the king strip with explicit states, for the session-3b attack on (L).

State s (bitmask over the m columns) = cells of the current row already covered by a domino
from the row above. A row step covers the remaining cells of the current row by horizontal
dominoes (weight wo) or by dominoes going down: vertical (wo), down-left c -> c-1 (xl),
down-right c -> c+1 (xr); s' = the cells of the next row claimed this way.
T[s][s'] = total weight; Z(k, m) = (T^k)[0][0] (k rows, free strip). Row-vector convention
v_{k+1} = v_k T. Integer weights (wo, xl, xr) keep everything exact; scaling all three by n
multiplies Z(k) by n^(k m / 2) and leaves log-convexity unchanged, so (2, 2, 1) is the
diagonal-weight pair (1, 1/2), (4, 4, 3) is (1, 3/4).

J = left-right reflection, s -> bit reversal. J T(wo, xl, xr) J = T(wo, xr, xl).
"""
import collections


def rev(s, m):
    return int(format(s, f'0{m}b')[::-1], 2) if m else 0


def configs(s, m, wo=1, xl=1, xr=1):
    """All row configurations from state s: yields (s', weight, dominoes).
    Domino codes: ('h', c) covers (c, c+1) of this row; ('v', c), ('l', c), ('r', c) go down from
    column c to c, c-1, c+1 of the next row."""
    out = []

    def rec(c, cur, nxt, w, doms):
        while c < m and cur >> c & 1:
            c += 1
        if c == m:
            out.append((nxt, w, tuple(doms)))
            return
        cur |= 1 << c
        if c + 1 < m and not cur >> (c + 1) & 1:
            rec(c + 1, cur | 1 << (c + 1), nxt, w * wo, doms + [('h', c)])
        for code, t, wt in (('v', c, wo), ('l', c - 1, xl), ('r', c + 1, xr)):
            if 0 <= t < m and not nxt >> t & 1 and wt:
                rec(c + 1, cur, nxt | 1 << t, w * wt, doms + [(code, c)])

    rec(0, s, 0, 1, [])
    return out


def transfer(m, wo=1, xl=1, xr=1):
    """T as dict s -> Counter(s' -> weight) over all 2^m states."""
    T = {}
    for s in range(1 << m):
        row = collections.Counter()
        for t, w, _ in configs(s, m, wo, xl, xr):
            row[t] += w
        T[s] = row
    return T


def propagate(T, v):
    u = collections.Counter()
    for s, a in v.items():
        if a:
            for t, w in T[s].items():
                u[t] += a * w
    return u


def zseq(T, K, start=0):
    """[ (T^k)[start][start] for k = 0..K ]."""
    v = collections.Counter({start: 1})
    Z = [1]
    for _ in range(K):
        v = propagate(T, v)
        Z.append(v.get(start, 0))
    return Z


def lviol(Z):
    """(L) on the even subsequence: list of q with Z(2q)^2 > Z(2q-2) Z(2q+2), and number of cases."""
    E = Z[0::2]
    bad = [q for q in range(1, len(E) - 1) if E[q] ** 2 > E[q - 1] * E[q + 1]]
    return bad, len(E) - 2
