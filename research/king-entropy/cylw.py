"""Leading eigenvalue of the row transfer T in one parity sector, one width per run.

usage: python3 cylw.py <lat> <bc> <w> <parity> [tol]

float64 power iteration on T^2 (tmfast.row), same start vector as tm2.py.
Stops when |est_k - est_{k-1}| < tol (default 4e-15, about two ulps of log(lambda)
at w ~ 22) for three consecutive iterations. Afterwards it reports the
Collatz-Wielandt bracket min/max over the support of (T^2 v)_i / v_i, which
contains the sector eigenvalue squared, and the residual |T^2 v / s - v|_1.

Writes eig_<lat>_<bc>_w<w>_p<parity>.json.
"""
import json, resource, subprocess, sys, time
import numpy as np
from tmfast import nbits, row


def sha():
    here = __file__.rsplit('/', 1)[0] if '/' in __file__ else '.'
    return subprocess.run(['git', '-C', here, 'rev-parse', '--short', 'HEAD'],
                          capture_output=True, text=True).stdout.strip()


def sector_eig(lat, bc, w, p, tol=4e-15, maxit=400, log=None):
    """Power iteration on T^2 restricted to parity sector p. Returns a dict."""
    t0 = time.time()
    commit = sha()
    nb = nbits(w, bc)
    pc = np.bitwise_count(np.arange(1 << w, dtype=np.uint64)) & 1
    rng = np.random.default_rng(7)
    v = np.zeros(1 << nb)
    v[: 1 << w] = (rng.random(1 << w) + 0.5) * (pc == p)
    v /= v.sum()
    hist, tit = [], []
    ok = 0
    for it in range(maxit):
        t = time.time()
        v = row(row(v, lat, bc, w), lat, bc, w)
        s = v.sum()
        v /= s
        hist.append(float(np.log(s) / 2))
        tit.append(time.time() - t)
        if log:
            print(f'{lat} {bc} w={w} p={p} it={it} est={hist[-1]:.16f} t={tit[-1]:.2f}s', file=log, flush=True)
        if it and abs(hist[-1] - hist[-2]) < tol:
            ok += 1
            if ok >= 3:
                break
        else:
            ok = 0
    y = row(row(v, lat, bc, w), lat, bc, w)
    assert not y[1 << w:].any() and not v[1 << w:].any()
    sup = v > 0
    r = y[sup] / v[sup]
    lam2 = float(y.sum())                 # v sums to 1
    return dict(lattice=lat, bc=bc, w=w, parity=p, log_lambda=hist[-1], per_site=hist[-1] / w,
                converged=ok >= 3, iterations=len(hist), tol=tol, history=hist,
                cw_log_lambda=[float(np.log(r.min()) / 2), float(np.log(r.max()) / 2)],
                support=int(sup.sum()), residual_l1=float(np.abs(y / lam2 - v).sum()),
                sec_per_iteration=float(np.median(tit)), wall=time.time() - t0,
                maxrss_mib=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024,
                commit=commit)


def main():
    lat, bc, w, p = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    tol = float(sys.argv[5]) if len(sys.argv) > 5 else 4e-15
    out = sector_eig(lat, bc, w, p, tol, log=sys.stdout)
    out['cmd'] = 'python3 cylw.py ' + ' '.join(sys.argv[1:])
    print(json.dumps({k: out[k] for k in out if k != 'history'}), flush=True)
    json.dump(out, open(f'eig_{lat}_{bc}_w{w}_p{p}.json', 'w'), indent=1)


if __name__ == '__main__':
    main()
