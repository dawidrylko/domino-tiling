"""Exact Z(k, m) for k = 0..K rows on a strip of width m, by CRT over 60-bit primes.

usage: python3 zexact.py <lat> <bc> <m> <K>     -> zex_<lat>_<bc>_m<m>_K<K>.json

Same cell transfer as tmfast.row (reduced mod p after every cell). Each cell step
adds at most 6 nonnegative terms below p < 2^60 into one int64 entry, so nothing
overflows (6 * 2^60 < 2^63). The number of primes is chosen so that their product
exceeds the Kahn-Lovasz bound (8!)^(N/16) on the number of perfect matchings of
any graph with N vertices and degree <= 8, N = K * m (needs m >= 3 for 'cyl').
The CRT result is therefore the exact integer, not a residue.
"""
import json, math, subprocess, sys, time
import numpy as np
from tmfast import nbits, row


def is_prime(n):
    if n < 2:
        return False
    for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        if n % p == 0:
            return n == p
    d, s = n - 1, 0
    while d % 2 == 0:
        d, s = d // 2, s + 1
    for a in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):   # deterministic below 3.3e24
        x = pow(a, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True


def primes_below(top, n):
    out, p = [], top - 1
    while len(out) < n:
        if is_prime(p):
            out.append(p)
        p -= 1
    return out


def kl_bits(N):
    """log2 of the Kahn-Lovasz bound (8!)^(N/16)."""
    return N * math.log2(math.factorial(8)) / 16


def zexact(lat, bc, m, K, log=None):
    assert bc == 'free' or m >= 3
    need = kl_bits(K * m) + 2
    P = primes_below(1 << 60, int(need // 59) + 1)
    assert sum(math.log2(p) for p in P) > need
    res = []
    for p in P:
        t = time.time()
        v = np.zeros(1 << nbits(m, bc), dtype=np.int64)
        v[0] = 1
        z = [1]
        for _ in range(K):
            v = row(v, lat, bc, m, mod=p)
            z.append(int(v[0]))
        res.append(z)
        if log:
            print(f'{lat} {bc} m={m} K={K} prime {len(res)}/{len(P)} {time.time() - t:.1f}s', file=log, flush=True)
    M = math.prod(P)
    Z = []
    for k in range(K + 1):
        x = 0
        for p, z in zip(P, res):
            q = M // p
            x += z[k] * q * pow(q, -1, p)
        Z.append(x % M)
    return Z, P


def main():
    lat, bc, m, K = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    t = time.time()
    commit = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
    Z, P = zexact(lat, bc, m, K, log=sys.stdout)
    json.dump(dict(lattice=lat, bc=bc, m=m, K=K, Z=[str(x) for x in Z], primes=P, commit=commit,
                   cmd='python3 zexact.py ' + ' '.join(sys.argv[1:]), wall=time.time() - t),
              open(f'zex_{lat}_{bc}_m{m}_K{K}.json', 'w'))
    print(f'done {time.time() - t:.0f}s', flush=True)


if __name__ == '__main__':
    main()
