import json, pathlib, numpy as np
from mpmath import mp, mpf, log
mp.dps = 40
d = json.load(open(pathlib.Path(__file__).resolve().parents[2] / 'data' / 'domiculeTilingTests.json'))['testCases']
Z = {t['rowCount']: int(t['expectedResult']) for t in d if t['rowCount'] > 0}
Z[20] = int('974206002957112698855240779762528002509423239819130603938953917534367085458193363176670427')  # README, repo-claimed
Ls = sorted(Z)
lz = {L: log(mpf(Z[L])) for L in Ls}
print('L  logZ/L^2')
for L in Ls: print(L, mp.nstr(lz[L]/L**2, 12))
print('\nsecond difference estimator s ~ [lZ(L+2)-2lZ(L)+lZ(L-2)]/8:')
for L in Ls[1:-1]:
    print(L, mp.nstr((lz[L+2]-2*lz[L]+lz[L-2])/8, 12))
print('\nthird-order: fit lZ = s L^2 + a L + b on 3 consecutive L (exact solve):')
for i in range(len(Ls)-2):
    L3 = Ls[i:i+3]
    A = mp.matrix([[L**2, L, 1] for L in L3]); y = mp.matrix([lz[L] for L in L3])
    x = mp.lu_solve(A, y)
    print(L3, 's=', mp.nstr(x[0], 12), 'a=', mp.nstr(x[1], 10), 'b=', mp.nstr(x[2], 8))
print('\nlogZ/L^2 = s + a/L + b/L^2 + c/L^3, 4 consecutive L:')
for i in range(len(Ls)-3):
    L4 = Ls[i:i+4]
    A = mp.matrix([[1, mpf(1)/L, mpf(1)/L**2, mpf(1)/L**3] for L in L4]); y = mp.matrix([lz[L]/L**2 for L in L4])
    x = mp.lu_solve(A, y)
    print(L4, 's=', mp.nstr(x[0], 12))
print('\nprior-pass reproduction: quadratic in 1/L on logZ/L^2 at L=14,16,18:')
L3=[14,16,18]
A = mp.matrix([[1, mpf(1)/L, mpf(1)/L**2] for L in L3]); y = mp.matrix([lz[L]/L**2 for L in L3])
print(mp.nstr(mp.lu_solve(A, y)[0], 12))
