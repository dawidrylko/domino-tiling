"""Spectral obstructions to two proof routes for (L) (session 2).

usage: python3 lspec.py > out_lspec.txt

Z(2q, m) = e0^T A^q e0 with A = T^2 (free king strip, width m). Writing
Z(2q) = sum_i c_i mu_i^q over the e0-visible eigenvalues mu_i of A (eigenvalues lambda and
-lambda of T merge into one mu = lambda^2):

 TN  If A (in any ordering of the states) were totally nonnegative, all its eigenvalues
     would be real and >= 0 (Gantmacher-Krein). A non-real e0-visible mu rules this out,
     also for the e0-cyclic subspace on which Z lives.
 MOM Z(2q) is a Stieltjes moment sequence iff (here: finite sum) every visible mu_i is real
     >= 0 with c_i > 0. Any visible complex or negative mu, or c_i < 0, kills the Hankel-PSD route
     (a negative real mu = lambda^2 comes from a purely imaginary lambda of T)
     (consistent with the exact Hankel minors in out_ltest.txt).
 LARGE-q (L) at fixed m holds for all large q iff the leading subdominant visible mu_2 is
     real positive with c_2 > 0 (or a tie resolved the same way); listed per m.
"""
import numpy as np
from tmfast import nbits, row


def dense_T(m):
    n = 1 << nbits(m, 'free')
    T = np.zeros((n, n))
    for S in range(n):
        e = np.zeros(n)
        e[S] = 1
        T[:, S] = row(e, 'king', 'free', m)
    return T


print('  m  visible mu  non-real  real mu<0  c<0 (real mu)  max |mu|/mu1 non-real or <0   mu2/mu1   c2/c1   large-q (L)')
for m in range(2, 11):
    T = dense_T(m)
    lam, R = np.linalg.eig(T)
    c = R[0, :] * np.linalg.inv(R)[:, 0]
    mu = lam ** 2
    # merge eigenvalues of A = T^2 that coincide (lambda, -lambda) by summing their weights
    groups = []
    for i in np.argsort(-np.abs(mu)):
        if abs(c[i]) < 1e-10 * abs(c).max():
            continue
        for g in groups:
            if abs(g[0] - mu[i]) < 1e-9 * abs(mu).max():
                g[1] += c[i]
                break
        else:
            groups.append([mu[i], c[i]])
    groups = [g for g in groups if abs(g[1]) > 1e-10 * abs(c).max()]
    mu1 = groups[0][0].real
    nonreal = [g for g in groups if abs(g[0].imag) > 1e-9 * mu1]
    negc = [g for g in groups if abs(g[0].imag) <= 1e-9 * mu1 and g[1].real < -1e-12 * groups[0][1].real]
    negmu = [g for g in groups if abs(g[0].imag) <= 1e-9 * mu1 and g[0].real < -1e-12 * mu1]
    mu2, c2 = groups[1]
    ok = abs(mu2.imag) <= 1e-9 * mu1 and mu2.real > 0 and c2.real > 0
    print(f' {m:2d}  {len(groups):10d}  {len(nonreal):8d}  {len(negmu):9d}  {len(negc):13d}  {max((abs(g[0]) / mu1 for g in nonreal + negmu), default=0):27.4f}'
          f'  {mu2.real / mu1:+.5f}  {(c2 / groups[0][1]).real:+.4f}   {"yes" if ok else "NO"}', flush=True)
