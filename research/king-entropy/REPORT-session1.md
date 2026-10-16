# Sesja 1 — entropia dimerów na grafie króla

Gałąź `d/king-entropy`, katalog `research/king-entropy/`. Każda liczba ma źródło:
skrypt + argumenty + commit (`@sha` = commit kodu, który ją policzył; plik wyjściowy w repo).

## Wynik

**s = 0.5655119110413XX ± X·10⁻¹⁴** (entropia na węzeł; na dimer 2s = …).

Metoda: cylindry króla o szerokości w (periodyczne w poprzek), λ_w = wiodąca wartość własna
transferu wierszowego, power iteration float64 na T² w każdym sektorze parzystości
(`tm2.py` w ≤ 19, `cylw.py` w = 20…25). Nieparzyste w zbiegają do s monotonicznie od dołu,
f_w = s − c·ρ^w (iloraz kolejnych różnic r_w: 13.4 → 10.1, `estimate.py`).
Ekstrapolacja geometryczna z trójki (w−4, w−2, w); środki parzystych w zbiegają od góry
z tym samym ilorazem ~10 i ekstrapolują się niezależnie — oba ciągi się zgadzają.
Źródło: `python3 estimate.py > out_estimate.txt` @XX.

Poprzednie przejście: 0.565511911 ± 1e-9 — potwierdzone, teraz 5 cyfr więcej.

## Ograniczenia rygorystyczne (`python3 bounds.py 24 > out_bounds.txt` @XX)

| | wartość | dlaczego rygorystyczne |
| --- | --- | --- |
| dolne | **s ≥ XX** (w = 24) | Fekete: pasy wolne obok siebie dają dopuszczalne pokrycie, Z(K, kw) ≥ Z(K, w)^k ⇒ s ≥ log λ_w / w. λ_w² ≥ c z certyfikatu Collatza–Wielandta: v = iterat z pustego brzegu (supp v = supp T^{2n}e₀), T²v ≥ c·v składowo ⇒ Z(2(n+K)) ≥ c^K·const. |
| górne | **s ≤ XX** (w = 24) | pasy z otwartymi bokami: dopasowanie K×kw rozcina się na pasy + skrzyżowania między kolumnami; skrzyżowań między zbiorami A, B (|Δr| ≤ 1) jest ≤ F_{n+1} ≤ φⁿ (dowód rekurencją po najniższej komórce), więc Z(K, kw) ≤ W(K, w)^k, W = pas, w którym komórka boczna może być „pokryta z zewnątrz” z wagą √φ. μ_w² ≤ C z CW: A v ≤ C v składowo (także zera), v₀ > 0 ⇒ W(2K) ≤ C^K. |
| górne | s ≤ 0.662787681422 | Kahn–Lovász (dowód Alon–Friedland 2008): PM(G) ≤ ∏(d_v!)^{1/(2d_v)}, d_v ≤ 8. |

Zaokrąglenia: każdy wpis T²v to 2w kroków po ≤ 6 nieujemnych składnikach ⇒ błąd względny
≤ 12wu < 3.2e-14 (w ≤ 24); certyfikaty mnożone przez (1 ∓ 1e-12), wynik zaokrąglany w dół/górę.
Brak wpisów subnormalnych (sprawdzane).

**Calkin–Wilf — warunek NIE zachodzi.** Dowód s ≥ (log λ_{2q+p} − log λ_{2q})/p wymaga
Z(2q+p, m) ≤ ρ(R_m)^p·Z(2q, m), co wynika z symetrii transferu (ogólniej: dodatnio
półokreślonej formy sklejenia). Tu: T nie jest symetryczne (w=3: T[∅→{1}]=2, T[{1}→∅]=0);
odbicie zamienia przekątne, forma sklejenia na cięciu krawędziowym M(A,B) ma λ_min = 1−√2 już
dla m=3, na cięciu przez węzły V też nieokreślona. Numerycznie nierówność trzyma się w 352/352
przypadkach (m ≤ 12, q ≤ 8, p ≤ 4; najbliżej −2.6e-7), kandydaci CW ≤ XX < s — ale to nie dowód.
Górne ograniczenie z parzystych cylindrów (chessboard) wymaga tej samej dodatniości ⇒ też nie certyfikowane.

## Sygnał Z2 (parzyste cylindry, `estimate.py` → `z2.json`)

Δ_w = log λ_even − log λ_odd: w=10 1.52e-4, 14 5.12e-6, 18 1.79e-7, 22 6.39e-9, 24 XX.
Lokalne ξ_w = 2/log(Δ_{w−2}/Δ_w): 1.154 → XX (rośnie). Fit log Δ = a − w/ξ + b log w (w ≥ 10):
**ξ ≈ XX**, b ≈ XX; ekstrapolacja 1/ξ_w liniowo w 1/w: ξ_∞ ≈ XX. Szczelina w sektorze (ARPACK, w=20):
log(λ₁/|λ₃|) = 1.0827 (λ₃ < 0).

## Co zwalidowane i jak

- Brute force (jawne grafy, rekurencja po najniższym wolnym węźle) = transfer: 90/90 plansz, king/tri/sq × free/cyl, w = 3…6 (`validate.py`).
- Dane repo: kwadraty L ≤ 18, prostokąty, oraz liczba 20×20 z README (używana w `fitsq.py`) — dokładnie (CRT, 14 liczb pierwszych).
- Sieć kwadratowa: pasy wolne = ∏(a+√(1+a²)) i oba sektory cylindra = wzór fermionowy (antyperiodyczny dla w≡0 mod 4) do < 1e-14; granica wzoru = G/π (Richardson, 2e-19), (f−G/π)w² → π/6. Sam fit TM z w ≤ 18 daje G/π ± 6e-8 — te same cyfry co fit na dokładnym wzorze, czyli ogranicza asymptotyka, nie TM.
- Sieć trójkątna: cylinder w=17 = całka Blocha z orientacji Kasteleyna (orientacja sprawdzona |Pf| = liczba na 9 planszach) do 2.9e-15: **s_tri = 0.428594537464959**.
- Pasy wolne w=3, 4: a(n+1)/a(n) dla Z(3×2n) (A239265, bisekcja ⇒ λ₃²) i Z(4×n) (A239266) → λ_w do 1e-16 (liczby dokładne własne; OEIS nie pobierany).
- float64 vs liczby dokładne: Z_cyl(K+2)/Z_cyl(K) w liczbach całkowitych (w = 9, 11, 12, 13) — różnica ≤ 4.1e-16 w log λ; ARPACK `eigs` na pełnym transferze w=20 — oba sektory do 1.8e-15 (`crosscheck.py`).
- `tmfast.py` = `tm.py` bit w bit (losowe wektory, wszystkie sieci/brzegi, w = 3…12).

Koszt (3 procesy równolegle na 4 rdzeniach): w=20 1.3 s/iter, 310 MiB; w=22 6.8 s, 1.1 GiB; w=24 32 s, 4.3 GiB; w=25 XX. Zbieżność zawsze w 19 iteracjach T² (nawias CW zamknięty do ulp).

## BLOCKED

- Porównanie z OEIS A239265/A239266 i literaturą: poza zakresem (bez sieci) — sprawdzone tylko względem własnych dokładnych liczb i danych repo.
- w ≥ 26: szacunkowo ~17 GiB RAM > 15.7 GiB dostępne — nie uruchamiane.
- `/usr/bin/time` brak w kontenerze (`No such file or directory`) — zastąpione `timed.py`.

## Pytania na następną sesję

1. Czy nierówność CW Z(2q+p,m) ≤ λ_m^p Z(2q,m) da się udowodnić inną faktoryzacją (np. cięcie przez środki krawędzi, transfer po przekątnej)? Dałoby rygorystyczne dolne ≈ 0.5655119 (8 cyfr zamiast 2).
2. Lepsze rygorystyczne górne niż pasy otwarte (zbieżność ~0.5/w)?
3. Postać poprawek dla nieparzystych w: r_w dryfuje (13.4 → 10.1); czy granica ≈ e^{2/ξ'} z ξ' związanym z ξ_Z2 ≈ 1.23 i szczeliną 1.08?
4. Certyfikacja przedziałowa λ_w dla cylindrów (dla tabeli w artykule) — choć cylindry same nie dają ograniczeń na s.
5. Lokalny przegląd literatury dla wartości 0.56551191104133.
