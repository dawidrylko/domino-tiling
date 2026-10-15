\\ Domino tilings of a 2n X 2n board (OEIS A004003) as a resultant, without a square root.
\\ P is the monic polynomial of degree n with P(x^2) = U(2n, x/2); its roots are 4*cos(j*Pi/(2n+1))^2.
a(n) = my(P = substpol(polchebyshev(2*n, 2, x/2), x^2, x)); (-1)^n * polresultant(P, subst(P, x, -x));
