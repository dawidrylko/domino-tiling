import json, math
from mpmath import mp, catalan, pi, log, factorial, exp
mp.dps = 20
kc = {**json.load(open('sec_king_cyl_3_13.json')), **json.load(open('sec_king_cyl_14_19.json'))}
kf = json.load(open('sec_king_free_1_18.json'))
tc = json.load(open('sec_tri_cyl_3_18.json'))
g = lambda d, w, p='0': d[str(w)][p]
print('odd-w cylinder logλ/w:')
odd = [(w, g(kc, w)/w) for w in range(9, 20, 2)]
for w, v in odd: print(f'  w={w} {v:.13f}')
a, b, c = odd[-3][1], odd[-2][1], odd[-1][1]
r = (b - a) / (c - b)
sA = c + (c - b) / (r - 1)
print(f'  geometric extrap (15,17,19): {sA:.13f}  ratio={r:.2f}')
print('even-w cylinder sectors (bracket):')
for w in range(10, 19, 2):
    e, o = g(kc, w, '0')/w, g(kc, w, '1')/w
    print(f'  w={w} [{o:.13f}, {e:.13f}] mid={(e+o)/2:.13f} splitting Δlogλ={g(kc,w,"0")-g(kc,w,"1"):.3e}')
print('free-strip differences logλ(w+1)-logλ(w):')
for w in range(12, 18):
    print(f'  {w}->{w+1}: {g(kf,w+1)-g(kf,w):.12f}')
print('free-strip λ_w (growth per added row of a w-wide strip):')
for w in range(1, 11): print(f'  w={w} λ={math.exp(g(kf,w)):.12f}')
print('rigorous lower bound log λ_18(free)/18 =', f'{g(kf,18)/18:.10f}')
print('triangular (own TM, cyl odd w 15,17):', f'{g(tc,15)/15:.13f} {g(tc,17)/17:.13f}')
print('G/pi =', mp.nstr(catalan/pi, 12))
print('Kahn-Lovasz log(8!)/16 =', mp.nstr(log(factorial(8))/16, 12))
print('e^s =', mp.nstr(exp(mp.mpf(sA)), 12), ' 2s (per dimer) =', f'{2*sA:.12f}')
