\\ Domicule tilings of an h X w board (OEIS A239264) = perfect matchings of the king's graph.
\\ Broken-profile dynamic programming in row-major order: bit i of a state tells whether
\\ the cell i places ahead is covered; a free cell is matched right, down-left, down or down-right.
T(h, w) = {
  my(S = 2^(w+2), v = vector(S), u);
  if (h*w == 0, return(1));
  v[1] = 1;
  for (p = 0, h*w-1,
    my(r = p\w, c = p%w, d = []);
    if (c+1 < w, d = concat(d, 1));
    if (r+1 < h,
      if (c > 0, d = concat(d, w-1));
      d = concat(d, w);
      if (c+1 < w, d = concat(d, w+1)));
    u = vector(S);
    for (s = 0, S-1,
      my(x = v[s+1]);
      if (x,
        if (bitand(s, 1),
          u[(s>>1) + 1] += x,
          for (i = 1, #d, if (!bittest(s, d[i]), my(t = (s + 2^d[i])>>1); u[t+1] += x)))));
    v = u);
  v[1]
};
a(n) = T(2*n, 2*n);
