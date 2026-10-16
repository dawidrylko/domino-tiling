import sys, time, json
import numpy as np
from tm import row

def lam_sector(w, lattice, bc, parity, tol=1e-15, maxit=3000):
    nb = w + 3 if bc == 'cyl' else w + 2
    S = np.arange(1 << w)
    pc = np.array([bin(s).count('1') & 1 for s in range(1 << w)])
    rng = np.random.default_rng(7)
    v = np.zeros(1 << nb)
    v[: 1 << w] = (rng.random(1 << w) + 0.5) * (pc == parity)
    v /= v.sum()
    hist = []
    for it in range(maxit):
        v = row(row(v, lattice, bc, w), lattice, bc, w)
        s = v.sum(); v /= s
        est = np.log(s) / 2
        hist.append(est)
        if len(hist) > 3 and abs(hist[-1] - hist[-2]) < tol and abs(hist[-2]-hist[-3]) < tol:
            return est, it
    return est, -it

if __name__ == '__main__':
    lat, bc, w0, w1 = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    out = {}
    for w in range(w0, w1 + 1):
        t = time.time()
        r = {}
        for p in (0, 1):
            r[p] = lam_sector(w, lat, bc, p)
        out[w] = {p: r[p][0] for p in r}
        print(f'{lat} {bc} w={w:2d} even: {r[0][0]:.15f} ({r[0][1]})  odd: {r[1][0]:.15f} ({r[1][1]})  /w: {r[0][0]/w:.13f} {r[1][0]/w:.13f}  t={time.time()-t:.1f}s', flush=True)
        json.dump(out, open(f'sec_{lat}_{bc}_{w0}_{w1}.json', 'w'))
