"""Same cell-by-cell transfer as tm.py, written with reshaped views instead of
index arrays (no per-step allocation of 2^nb-sized temporaries).

State layout is identical to tm.py: index t = E * 2^(w+2) + window, window bit k
= occupancy of the cell k positions after the current one (row-major), E (cyl
only) = (r+1, w-1) already claimed by (r, 0) through the down-left wrap edge.

Extra over tm.py: `z` = weight for a cell in column 0 or w-1 of a free strip to
be covered from outside the strip (open side boundaries, used by bounds.py).
`mod` = reduce mod a prime after every cell (exact counts with int64).
"""
import numpy as np
from tm import offsets


def nbits(w, bc):
    return w + 3 if bc == 'cyl' else w + 2


def step(v, lattice, bc, w, c, z=0, mod=None, out=None):
    nE = 2 if bc == 'cyl' else 1
    H = 1 << (w + 1)                      # window bits 1..w+1 after the shift
    N = nE * 2 * H
    u = np.zeros(N, dtype=v.dtype) if out is None else out
    if out is not None:
        u[:] = 0
    merge = bc == 'cyl' and w >= 3 and c == w - 3
    src = v.reshape(nE, H, 2)             # [E, mid, bit0]
    dst = u.reshape(nE, 2, H)             # [E, top window bit, rest]
    tgt = dst[0] if merge else dst[:, 0, :]   # merge: E moves into window bit w+1

    tgt += src[:, :, 1]                   # current cell already covered
    if z and bc == 'free' and (c == 0 or c == w - 1):
        tgt += z * src[:, :, 0]           # covered from outside the strip
    for d in offsets(lattice, bc, w, c):
        if d == 'E':
            if merge:
                dst[0, 1, :] += src[0, :, 0]
            else:
                dst[1, 0, :] += src[0, :, 0]
            continue
        B = 1 << (d - 1)
        s5 = v.reshape(nE, H // (2 * B), 2, B, 2)[:, :, 0, :, 0]
        d5 = u.reshape(nE, 2, H // (2 * B), 2, B)
        t5 = d5[0, :, :, 1, :] if merge else d5[:, 0, :, 1, :]
        t5 += s5
    if mod is not None:
        np.remainder(u, mod, out=u)
    return u


def row(v, lattice, bc, w, z=0, mod=None):
    """One full row (w cells); v is left untouched."""
    a = step(v, lattice, bc, w, 0, z=z, mod=mod)
    b = np.empty_like(v)
    for c in range(1, w):
        step(a, lattice, bc, w, c, z=z, mod=mod, out=b)
        a, b = b, a
    return a


def count_mod(h, w, lattice, bc, p):
    v = np.zeros(1 << nbits(w, bc), dtype=np.int64)
    v[0] = 1
    for _ in range(h):
        v = row(v, lattice, bc, w, mod=p)
    return int(v[0])
