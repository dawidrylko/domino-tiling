"""Cell-by-cell transfer for perfect matchings on w-wide strips.

lattice: 'king' (square + both diagonals), 'tri' (square + one diagonal), 'sq' (square)
bc: 'free' (open strip) or 'cyl' (periodic across the width)

State: bits 0..w+1 = occupancy of the next w+2 cells in row-major order,
bit w+2 (cyl only) = (r+1, w-1) claimed by (r,0) through the down-left wrap edge.
"""
import sys
import numpy as np


def offsets(lattice, bc, w, c):
    """Offsets (relative to current cell) of later cells the current cell may pair with.
    Special value 'E' = down-left wrap target (r+1, w-1) from c == 0 (cyl only)."""
    out = []
    dl = lattice == 'king'                       # down-left
    dr = lattice in ('king', 'tri')               # down-right
    if bc == 'free':
        if c + 1 < w: out.append(1)
        if dl and c > 0: out.append(w - 1)
        out.append(w)
        if dr and c + 1 < w: out.append(w + 1)
    else:
        if c + 1 < w: out.append(1)               # right
        if c == 0: out.append(w - 1)               # left wrap -> (r, w-1)
        if dl:
            out.append('E' if c == 0 else w - 1)   # down-left (wrap at c == 0)
        out.append(w)                              # down
        if dr:
            out.append(1 if c == w - 1 else w + 1) # down-right (wrap at c == w-1 -> (r+1,0) = p+1)
    return out


def step(v, lattice, bc, w, c, dtype):
    nb = w + 3 if bc == 'cyl' else w + 2
    N = 1 << nb
    S = np.arange(N, dtype=np.int64)
    win = (1 << (w + 2)) - 1
    E = 1 << (w + 2)
    merge = bc == 'cyl' and c == w - 3 if w >= 3 else False

    def shift(t):
        if bc != 'cyl':
            return t >> 1
        r = (t & win) >> 1
        if merge:
            return r | (((t >> (w + 2)) & 1) << (w + 1))
        return r | (t & E)

    u = np.zeros(N, dtype=dtype)
    nz = v != 0
    occ = (S & 1).astype(bool) & nz
    idx = S[occ]
    u[shift(idx)] += v[occ]
    free = (~(S & 1).astype(bool)) & nz
    for d in offsets(lattice, bc, w, c):
        bit = E if d == 'E' else (1 << d)
        sel = free & ((S & bit) == 0)
        idx = S[sel]
        u[shift(idx | bit)] += v[sel]
    return u


def count(h, w, lattice='king', bc='free'):
    """Exact count with Python ints (object arrays) for small boards."""
    nb = w + 3 if bc == 'cyl' else w + 2
    v = np.zeros(1 << nb, dtype=object)
    v[:] = 0
    v[0] = 1
    for r in range(h):
        for c in range(w):
            v = step(v, lattice, bc, w, c, object)
    # after last row, nothing may stick into row h
    return v[0]


def row(v, lattice, bc, w):
    for c in range(w):
        v = step(v, lattice, bc, w, c, np.float64)
    return v


def lam(w, lattice='king', bc='free', tol=1e-14, maxit=4000):
    """Spectral radius of the row transfer, via power iteration on T^2."""
    nb = w + 3 if bc == 'cyl' else w + 2
    rng = np.random.default_rng(1)
    v = np.zeros(1 << nb)
    v[: 1 << w] = rng.random(1 << w) + 0.5
    v /= v.sum()
    prev = None
    for it in range(maxit):
        v = row(row(v, lattice, bc, w), lattice, bc, w)
        s = v.sum()
        v /= s
        est = np.log(s) / 2
        if prev is not None and abs(est - prev) < tol:
            return est, it
        prev = est
    return est, -it


if __name__ == '__main__':
    pass
