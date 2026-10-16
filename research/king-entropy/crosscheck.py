"""Independent cross-checks of the float64 power-iteration eigenvalues.

usage: python3 crosscheck.py > out_crosscheck.txt

A. exact integers: Z_cyl(K, w) for K = 0..Kmax by the transfer with Python ints
   (tmfast.row on object arrays, no rounding anywhere), then
   log lambda = log(Z(K+2) / Z(K)) / 2 in mpmath at 40 digits; compared with
   the float64 sector values of sec_king_cyl_3_13.json.
B. scipy.sparse.linalg.eigs (implicitly restarted Arnoldi, ARPACK) on the full
   2^w-dimensional row transfer of the w = 20 cylinder, no sector projection:
   the two largest eigenvalues must be the two sector values of
   eig_king_cyl_w20_p{0,1}.json; the third gives the gap inside a sector.
"""
import json, resource, time
import numpy as np
from mpmath import mp, mpf, log
from scipy.sparse.linalg import LinearOperator, eigs
from tmfast import nbits, row

mp.dps = 40

print('== A. exact integer ratios vs float64 power iteration (king cyl)')
kc = json.load(open('sec_king_cyl_3_13.json'))
for w, Kmax in ((9, 90), (11, 90), (12, 90), (13, 80)):
    t = time.time()
    v = np.zeros(1 << nbits(w, 'cyl'), dtype=object)
    v[:] = 0
    v[0] = 1
    Z = [1]
    for K in range(Kmax):
        v = row(v, 'king', 'cyl', w)
        Z.append(v[0])
    est = [log(mpf(Z[K + 2]) / Z[K]) / 2 for K in range(Kmax - 1) if Z[K]]
    f64 = kc[str(w)]['0']
    print(f'  w={w} K<={Kmax} ({time.time() - t:.0f}s): exact-ratio log λ = {mp.nstr(est[-1], 30)}')
    print(f'      last two exact-ratio estimates differ by {mp.nstr(abs(est[-1] - est[-2]), 3)}')
    print(f'      float64 sector-0 value      = {f64!r}   diff = {mp.nstr(mpf(f64) - est[-1], 3)}'
          f'  per site {mp.nstr(est[-1] / w, 25)}')

print('== B. ARPACK eigs on the w=20 cylinder (full space, both sectors at once)')
w = 20
n = 1 << w
N = 1 << nbits(w, 'cyl')
calls = [0]


def mv(x):
    calls[0] += 1
    v = np.zeros(N)
    v[:n] = x.real if np.iscomplexobj(x) else x
    y = row(v, 'king', 'cyl', w)
    return y[:n]


t = time.time()
op = LinearOperator((n, n), matvec=mv, dtype=np.float64)
vals = eigs(op, k=6, which='LM', tol=1e-15, ncv=40, return_eigenvectors=False, v0=np.ones(n))
vals = sorted(vals, key=lambda z: -abs(z))
pw = [json.load(open(f'eig_king_cyl_w20_p{p}.json'))['log_lambda'] for p in (0, 1)]
print(f'  {calls[0]} matvecs, {time.time() - t:.0f}s, maxrss {resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024:.0f} MiB')
for z in vals:
    print(f'  eigenvalue {z.real:.15e} {z.imag:+.2e}j   log|.| = {np.log(abs(z)):.15f}')
print(f'  power iteration sectors: p0 {pw[0]!r}  p1 {pw[1]!r}')
print(f'  diff top two vs sectors: {np.log(abs(vals[0])) - pw[0]:.2e} {np.log(abs(vals[1])) - pw[1]:.2e}')
print(f'  in-sector gap log(λ1/λ3) = {np.log(abs(vals[0]) / abs(vals[2])):.6f}')
