"""Is (L) robust? Log-convexity of q -> Z_x(2q, m) when every diagonal edge has weight x (session 2).

usage: python3 lweight.py > out_lweight.txt

Second table: asymmetric weights, x_dl on down-left and x_dr on down-right diagonals
((1, 0) is the triangular lattice up to reflection, where (L) fails from m = 5 on).

x = 0 is the square lattice (symmetric transfer, (L) holds by Cauchy-Schwarz), x = 1 the king
lattice, x -> infinity the two diagonal sublattices. Exact rational arithmetic (Fractions),
free strips of width m <= 9, 2q <= 40. Same cell transfer as tmfast.step (state layout
identical), with the two diagonal moves (offsets w-1 and w+1) weighted by x; checked
against tmfast at x = 0 (lattice 'sq') and x = 1 (lattice 'king').
"""
from fractions import Fraction
import numpy as np
from tmfast import nbits, row


def step_x(v, w, c, x, xr=None):
    xr = x if xr is None else xr
    H = 1 << (w + 1)
    u = np.zeros(2 * H, dtype=object)
    u[:] = 0
    src = v.reshape(H, 2)
    dst = u.reshape(2, H)
    dst[0, :] += src[:, 1]
    offs = [(1, 1)] if c + 1 < w else []
    if c > 0:
        offs.append((w - 1, x))
    offs.append((w, 1))
    if c + 1 < w:
        offs.append((w + 1, xr))
    for d, wt in offs:
        B = 1 << (d - 1)
        s5 = v.reshape(H // (2 * B), 2, B, 2)[:, 0, :, 0]
        d5 = u.reshape(2, H // (2 * B), 2, B)
        d5[0, :, 1, :] += wt * s5 if wt != 1 else s5
    return u


def counts(m, K, x, xr=None):
    v = np.zeros(1 << nbits(m, 'free'), dtype=object)
    v[:] = 0
    v[0] = 1
    Z = [Fraction(1)]
    for _ in range(K):
        for c in range(m):
            v = step_x(v, m, c, x, xr)
        Z.append(Fraction(v[0]))
    return Z


# consistency with tmfast at x = 0 and x = 1
for m in (3, 4, 5):
    for x, lat in ((0, 'sq'), (1, 'king')):
        v = np.zeros(1 << nbits(m, 'free'), dtype=object)
        v[:] = 0
        v[0] = 1
        ref = [1]
        for _ in range(10):
            v = row(v, lat, 'free', m)
            ref.append(int(v[0]))
        assert counts(m, 10, x) == ref, (m, x)
print('transfer with diagonal weight x agrees with tmfast at x = 0 (sq) and x = 1 (king), m = 3..5, k <= 10')

XS = [Fraction(0), Fraction(1, 4), Fraction(1, 2), Fraction(1), Fraction(2), Fraction(4), Fraction(10), Fraction(100)]
K = 40
print(f'\n(L) violations Z_x(2q)^2 > Z_x(2q-2) Z_x(2q+2), 2 <= 2q <= {K - 2}; entry = violations/cases (first q)')
print('   m  ' + ''.join(f'{str(x):>12}' for x in XS))
tot = {x: [0, 0] for x in XS}
for m in range(2, 10):
    line = f'  {m:2d}  '
    for x in XS:
        Z = counts(m, K, x)
        E = Z[0::2]
        bad = [q for q in range(1, len(E) - 1) if E[q - 1] and E[q] ** 2 > E[q - 1] * E[q + 1]]
        n = sum(1 for q in range(1, len(E) - 1) if E[q - 1])
        tot[x][0] += len(bad)
        tot[x][1] += n
        line += f'{f"{len(bad)}/{n}" + (f"({bad[0]})" if bad else ""):>12}'
    print(line, flush=True)
print('  total ' + ''.join(f'{f"{a}/{b}":>12}' for a, b in tot.values()))

PAIRS = [(Fraction(1), Fraction(1)), (Fraction(1), Fraction(9, 10)), (Fraction(1), Fraction(3, 4)), (Fraction(1), Fraction(1, 2)),
         (Fraction(1), Fraction(1, 4)), (Fraction(1), Fraction(1, 10)), (Fraction(1), Fraction(0)), (Fraction(2), Fraction(1, 2))]
print(f'\nasymmetric diagonal weights (x_dl, x_dr): violations/cases (first q), 2q <= {K - 2}')
print('   m  ' + ''.join(f'{f"({a},{b})":>12}' for a, b in PAIRS))
tot = {p: [0, 0] for p in PAIRS}
for m in range(2, 10):
    line = f'  {m:2d}  '
    for a, b in PAIRS:
        E = counts(m, K, a, b)[0::2]
        bad = [q for q in range(1, len(E) - 1) if E[q - 1] and E[q] ** 2 > E[q - 1] * E[q + 1]]
        n = sum(1 for q in range(1, len(E) - 1) if E[q - 1])
        tot[a, b][0] += len(bad)
        tot[a, b][1] += n
        line += f'{f"{len(bad)}/{n}" + (f"({bad[0]})" if bad else ""):>12}'
    print(line, flush=True)
print('  total ' + ''.join(f'{f"{a}/{b}":>12}' for a, b in tot.values()))

# larger m with integer weights: (orthogonal, x_dl, x_dr) = (n, n, k) has the same ratios as (1, 1, k/n);
# multiplying every edge by n multiplies Z(2q) by n^(qm), which leaves log-convexity unchanged.


def counts_int(m, K, wo, xl, xr):
    v = np.zeros(1 << nbits(m, 'free'), dtype=object)
    v[:] = 0
    v[0] = 1
    Z = [1]
    for _ in range(K):
        for c in range(m):
            H = 1 << (m + 1)
            u = np.zeros(2 * H, dtype=object)
            u[:] = 0
            src = v.reshape(H, 2)
            u.reshape(2, H)[0, :] += src[:, 1]
            offs = [(1, wo)] if c + 1 < m else []
            if c > 0:
                offs.append((m - 1, xl))
            offs.append((m, wo))
            if c + 1 < m:
                offs.append((m + 1, xr))
            for d, wt in offs:
                B = 1 << (d - 1)
                u.reshape(2, H // (2 * B), 2, B)[0, :, 1, :] += wt * v.reshape(H // (2 * B), 2, B, 2)[:, 0, :, 0]
            v = u
        Z.append(int(v[0]))
    return Z


assert [Fraction(z, 10 ** (k * 5 // 2)) for k, z in enumerate(counts_int(5, 8, 10, 10, 9)) if k % 2 == 0] == \
    counts(5, 8, Fraction(1), Fraction(9, 10))[0::2]
INT = [(10, 10, 9), (4, 4, 3), (1, 1, 1)]
print(f'\nlarger m, integer weights (orthogonal, x_dl, x_dr): violations/cases (first q), 2q <= {K - 2}')
print('   m  ' + ''.join(f'{str(p):>14}' for p in INT))
for m in range(10, 14):
    line = f'  {m:2d}  '
    for p in INT:
        E = counts_int(m, K, *p)[0::2]
        bad = [q for q in range(1, len(E) - 1) if E[q - 1] and E[q] ** 2 > E[q - 1] * E[q + 1]]
        n = sum(1 for q in range(1, len(E) - 1) if E[q - 1])
        line += f'{f"{len(bad)}/{n}" + (f"({bad[0]})" if bad else ""):>14}'
    print(line, flush=True)

# python3 lweight.py big > out_lweight_big.txt : near-symmetric weights, wider strips, more rows
import sys
if sys.argv[1:] == ['big']:
    KB = 80
    BIG = [(10, 10, 9), (20, 20, 19), (1, 1, 1)]
    print(f'\nnear-symmetric weights, m = 5..16, 2q <= {KB - 2}: violations/cases (first q)')
    print('   m  ' + ''.join(f'{str(p):>14}' for p in BIG))
    for m in range(5, 17):
        line = f'  {m:2d}  '
        for p in BIG:
            E = counts_int(m, KB, *p)[0::2]
            bad = [q for q in range(1, len(E) - 1) if E[q - 1] and E[q] ** 2 > E[q - 1] * E[q + 1]]
            n = sum(1 for q in range(1, len(E) - 1) if E[q - 1])
            line += f'{f"{len(bad)}/{n}" + (f"({bad[0]})" if bad else ""):>14}'
        print(line, flush=True)
