"""(L) beyond the exact range: Z(2q, m) in x87 extended precision with a rigorous rounding bound.

usage: python3 lcert.py <m> <K> > out_lcert_m<m>.txt      (free king strip; two buffers of 2^(m+2) longdoubles)

Z(k, m) is computed with tmfast.step in np.longdouble (64-bit mantissa, u = 2^-64), ping-pong
between two buffers, no normalisation (Z(K, m) < 1e4900 here). All terms are nonnegative and
each cell step writes every entry as a sum of at most 5 terms (already covered; right,
down-left, down, down-right), so the computed value satisfies
    Z~(k) = Z(k) (1 + e_k),   |e_k| <= g_k := (1 + u)^(5 m k) - 1.
Hence Z(2q-2) Z(2q+2) / Z(2q)^2 >= R~ (1 - g_(2q-2)) (1 - g_(2q+2)) / (1 + g_(2q))^2 (1 - 4u),
with R~ the computed ratio (the last factor covers the three float operations of R~). If that
lower bound exceeds 1, (L) holds at q exactly. Small values are checked against zexact.py.
"""
import json, subprocess, sys, time
import numpy as np
from mpmath import mp, mpf
from tmfast import nbits, step

mp.dps = 40


def zld(m, K):
    x = np.zeros(1 << nbits(m, 'free'), dtype=np.longdouble)
    x[0] = 1
    y = np.empty_like(x)
    Z = [mpf(1)]
    for k in range(K):
        a, b = x, y
        for c in range(m):
            step(a, 'king', 'free', m, c, out=b)
            a, b = b, a
        if a is not x:
            x, y = a, b
        Z.append(mpf(np.format_float_positional(x[0], precision=25, unique=False)))
        print(f'# m={m} k={k + 1} Z~={mp.nstr(Z[-1], 21)}', flush=True)
    return Z


def main():
    m, K = int(sys.argv[1]), int(sys.argv[2])
    t = time.time()
    u = mpf(2) ** -64
    assert np.finfo(np.longdouble).nmant == 63, 'needs x87 extended precision'
    Z = zld(m, K)
    g = lambda k: (1 + u) ** (5 * m * k) - 1
    rows, ok = [], True
    for q in range(1, K // 2):
        R = Z[2 * q - 2] * Z[2 * q + 2] / Z[2 * q] ** 2
        low = R * (1 - g(2 * q - 2)) * (1 - g(2 * q + 2)) / (1 + g(2 * q)) ** 2 * (1 - 4 * u)
        cert = low > 1
        ok &= cert
        rows.append(dict(q=q, margin=str(mp.log(R)), certified_lower=str(low - 1), certified=bool(cert)))
        print(f'  m={m} 2q={2 * q:3d}  computed margin log R = {mp.nstr(mp.log(R), 6):>12}   certified R - 1 >= '
              f'{mp.nstr(low - 1, 4):>11}   {"(L) holds" if cert else "UNDECIDED"}', flush=True)
    commit = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
    print(f'  m={m}: (L) certified for all 2 <= 2q <= {K - 2}: {ok}   ({time.time() - t:.0f}s, commit {commit})')
    json.dump(dict(m=m, K=K, rows=rows, all_certified=ok, commit=commit, Z=[str(z) for z in Z]),
              open(f'lcert_m{m}_K{K}.json', 'w'), indent=1)


if __name__ == '__main__':
    main()
