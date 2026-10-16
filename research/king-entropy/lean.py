"""Memory-lean power iteration on T^2 (cell steps ping-pong between two buffers),
in float64 or x87 extended precision (np.longdouble, 64-bit mantissa).

usage: python3 lean.py <lat> <bc> <w> <parity|-> <float64|longdouble> [cw]

Same transfer (tmfast.step) and same start vector as cylw.sector_eig (parity sector p,
seed 7) for 'cyl'; e0 (empty boundary) for 'free' (parity '-'), as in bounds.certify.
Stops when the estimate log(sum T^2 v)/2 (v summing to 1) changes by less than
tol = 2 eps * 0.6 w (about 2 ulp of log lambda) for three consecutive iterations.
With 'cw', one extra pass keeps v and reports the Collatz-Wielandt bracket
min/max (T^2 v)_i / v_i (a third buffer). Peak memory: 2 (3 with cw) vectors.

Writes lean_<lat>_<bc>_w<w>_p<p>_<dtype>.json (log lambda as a decimal string).
"""
import json, resource, subprocess, sys, time
import numpy as np
from tmfast import nbits, step


def T2(x, y, lat, bc, w, z=0):
    """x <- T^2 x using y as scratch (2w cell steps, an even number, so the result lands in x)."""
    a, b = x, y
    for c in list(range(w)) * 2:
        step(a, lat, bc, w, c, z=z, out=b)
        a, b = b, a
    assert a is x


def run(lat, bc, w, p, dtype, cw=False, maxit=60):
    t0 = time.time()
    dt = np.longdouble if dtype == 'longdouble' else np.float64
    nb = nbits(w, bc)
    x = np.zeros(1 << nb, dtype=dt)
    if bc == 'cyl':
        pc = np.bitwise_count(np.arange(1 << w, dtype=np.uint64)) & 1
        rng = np.random.default_rng(7)
        x[: 1 << w] = (rng.random(1 << w) + 0.5) * (pc == p)
    else:
        x[0] = 1
    x /= x.sum()
    y = np.empty_like(x)
    tol = 2 * np.finfo(dt).eps * (0.6 * w)
    hist, tit, ok = [], [], 0
    for it in range(maxit):
        t = time.time()
        T2(x, y, lat, bc, w)
        s = x.sum()
        x /= s
        hist.append(np.log(s) / 2)
        tit.append(time.time() - t)
        print(f'{lat} {bc} w={w} p={p} {dtype} it={it} est={np.format_float_positional(hist[-1], precision=21)}'
              f' t={tit[-1]:.1f}s', flush=True)
        if it and abs(hist[-1] - hist[-2]) < tol:
            ok += 1
            if ok >= 3:
                break
        else:
            ok = 0
    out = dict(lattice=lat, bc=bc, w=w, parity=p, dtype=dtype, converged=ok >= 3, iterations=len(hist),
               tol=float(tol), log_lambda=np.format_float_positional(hist[-1], precision=21, unique=False),
               history=[np.format_float_positional(h, precision=21, unique=False) for h in hist],
               sec_per_iteration=float(np.median(tit)))
    if cw:
        v = x.copy()
        T2(x, y, lat, bc, w)
        sup = v > 0
        r = x[sup] / v[sup]
        out['cw_log_lambda'] = [np.format_float_positional(np.log(r.min()) / 2, precision=21, unique=False),
                                np.format_float_positional(np.log(r.max()) / 2, precision=21, unique=False)]
        out['support_closed'] = bool(not (x[~sup] > 0).any())
    out.update(wall=time.time() - t0, maxrss_mib=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024,
               commit=subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip())
    return out


def main():
    lat, bc, w, p, dtype = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4], sys.argv[5]
    p = int(p) if p != '-' else '-'
    out = run(lat, bc, w, p, dtype, cw='cw' in sys.argv[6:])
    out['cmd'] = 'python3 lean.py ' + ' '.join(sys.argv[1:])
    print(json.dumps({k: v for k, v in out.items() if k != 'history'}), flush=True)
    json.dump(out, open(f'lean_{lat}_{bc}_w{w}_p{p}_{dtype}.json', 'w'), indent=1)


if __name__ == '__main__':
    main()
