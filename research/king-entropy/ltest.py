"""Hypothesis (L): q -> Z(2q, m) is log-convex for every width m. Exact tests (session 2).

usage: python3 ltest.py > out_ltest.txt       (reads zex_*.json from zexact.py, writes ltest.json)

For every (lattice, bc, m) with exact counts Z(k, m), k <= K:
 L2  Z(2q)^2 <= Z(2q-2) Z(2q+2) for all 2 <= 2q <= K-2 (exact integers);
     margin mu_q = log Z(2q-2) + log Z(2q+2) - 2 log Z(2q) (> 0 means log-convex), its
     minimum over q and where it sits;
 L1  odd m and cylinders are included (Z(k, m) = 0 for odd k on odd free strips);
 H   Stieltjes moment test: leading principal minors of the Hankel matrices
     [Z(2(i+j))] and [Z(2(i+j+1))] (exact, Bareiss). All of them >= 0 for every size iff
     Z(2q) is a moment sequence of a positive measure on [0, inf), which would imply (L)
     with room to spare. The first negative minor (if any) is reported: it kills that route.
 L2b whether mu_q decreases in q, and its last ratio mu_q / mu_(q-1) (-> rho^2, rho = |lambda_2 / lambda_1|).
"""
import glob, json, re
from fractions import Fraction
from mpmath import mp, mpf, log

mp.dps = 50


def bareiss_minors(H):
    """Leading principal minors det H[:k,:k], k = 1..n, exact (fraction-free elimination, no pivoting)."""
    n = len(H)
    A = [row[:] for row in H]
    out, prev = [], 1
    for k in range(n):
        if A[k][k] == 0:
            out.append(0)
            break
        out.append(A[k][k])
        for i in range(k + 1, n):
            for j in range(k + 1, n):
                A[i][j] = (A[i][j] * A[k][k] - A[i][k] * A[k][j]) // prev
        prev = A[k][k]
    return out


data = []
for fn in glob.glob('zex_*.json'):
    d = json.load(open(fn))
    d['Z'] = [int(x) for x in d['Z']]
    data.append(d)
best = {}
for d in data:                      # keep the longest K per (lat, bc, m)
    key = (d['lattice'], d['bc'], d['m'])
    if key not in best or d['K'] > best[key]['K']:
        best[key] = d

summary = {}
for lat in ('king', 'tri', 'sq'):
    for bc in ('free', 'cyl'):
        keys = sorted(k for k in best if k[0] == lat and k[1] == bc)
        if not keys:
            continue
        print(f'\n== {lat} {bc}: (L) exact, Z(2q)^2 <= Z(2q-2) Z(2q+2)')
        print('   m   K  cases viol  margin at 2q=2   min margin (at 2q)  decreasing  last ratio   Hankel minors: first negative/size')
        tot = viol_tot = 0
        rows = []
        for key in keys:
            d = best[key]
            m, K, Z = d['m'], d['K'], d['Z']
            E = [Z[k] for k in range(0, K + 1, 2)]          # E[q] = Z(2q)
            viol, marg = [], []
            for q in range(1, len(E) - 1):
                if E[q - 1] == 0:
                    continue
                if E[q] ** 2 > E[q - 1] * E[q + 1]:
                    viol.append(q)
                D = E[q - 1] * E[q + 1] - E[q] ** 2              # exact
                marg.append((mp.log1p(mpf(D) / mpf(E[q] ** 2)), q))
            tot += len(marg)
            viol_tot += len(viol)
            mn = min(marg)
            mono = all(a[0] > b[0] for a, b in zip(marg, marg[1:]))
            rat = marg[-1][0] / marg[-2][0]
            # Hankel tests (Stieltjes): H0 = [E[i+j]], H1 = [E[i+j+1]]
            n0 = (len(E) + 1) // 2
            n1 = len(E) // 2
            H0 = [[E[i + j] for j in range(n0)] for i in range(n0)]
            H1 = [[E[i + j + 1] for j in range(n1)] for i in range(n1)]
            neg = []
            for nm, H in (('H0', H0), ('H1', H1)):
                mins = bareiss_minors(H)
                bad = [k + 1 for k, x in enumerate(mins) if x < 0]
                zero = [k + 1 for k, x in enumerate(mins) if x == 0]
                neg.append(f'{nm}:{bad[0] if bad else "-"}/{len(mins)}' + (f'(0 at {zero[0]})' if zero else ''))
            print(f'  {m:2d} {K:3d}  {len(marg):4d} {len(viol):3d}   {mp.nstr(marg[0][0], 4):>10}   {mp.nstr(mn[0], 4):>10} (2q={2 * mn[1]:3d})'
                  f'  {str(mono):>5}  {mp.nstr(rat, 4):>8}    {"  ".join(neg)}')
            rows.append(dict(m=m, K=K, cases=len(marg), violations=viol, min_margin=str(mn[0]), min_at=2 * mn[1],
                             margin_decreasing=mono, last_ratio=str(rat), first_margin=str(marg[0][0]),
                             last_margin=str(marg[-1][0]), hankel=neg, commit=d.get('commit')))
        print(f'  total: {viol_tot} violations in {tot} cases (exact integers)')
        summary[f'{lat}_{bc}'] = dict(cases=tot, violations=viol_tot, rows=rows)

json.dump(summary, open('ltest.json', 'w'), indent=1)
