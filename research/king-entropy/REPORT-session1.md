# Sesja 1 — entropia dimerów na grafie króla

Gałąź `d/king-entropy`, katalog `research/king-entropy/`. Źródło każdej liczby: skrypt + argumenty
+ commit kodu → plik wyjściowy w repo (commit z wynikiem w nawiasie).

SHA w tym raporcie (i w `CW-NOTE.md`) podmienione w sesji 3 na obecne: pierwotne unieważniło przepisanie autorstwa; mapowanie po temacie commita (stare commity nadal widoczne na GitHubie), tabela w `paper/NUMBERS.md`; pola `commit` w plikach wyjściowych zostają stare.

## Wynik

**s = 0.565511911041325 ± 4·10⁻¹⁵** (na węzeł; na dimer 2s = 1.13102382208265, eˢ = 1.76034869404198).

Metoda: cylindry króla szerokości w (periodyczne w poprzek, wolne wzdłuż), λ_w = wiodąca wartość
własna transferu wierszowego, power iteration float64 na T² osobno w sektorach parzystości
(`tm2.py`, w ≤ 19; `cylw.py`, w = 20…25, ten sam algorytm, kod transferu `tmfast.py` @106661e).
Nieparzyste w rosną monotonicznie do s, iloraz kolejnych różnic r_w = 13.4 → 9.99. Ekstrapolacja
geometryczna z w = 21, 23, 25: 0.5655119110413253; poprzednia trójka różni się o 1.1e-15, ogon przy
spadku r do ⅔ dodałby 3.9e-15 (to jest pasek błędu). Niezależnie: środki sektorów parzystych w
maleją do s z tym samym ilorazem ~10; ich ekstrapolacja (20, 22, 24) = 0.5655119110413256, różnica
3.6e-16. Źródło: `python3 estimate.py` @76fc5e1 → `out_estimate.txt`, `z2.json` (73a0628).
Poprzednie przejście (0.565511911 ± 1e-9) potwierdzone; teraz 6 cyfr więcej.

## Ograniczenia rygorystyczne (`python3 bounds.py 24` @102b7e5 → `out_bounds.txt`, ee63b57)

| | wartość | dlaczego rygorystyczne |
| --- | --- | --- |
| dolne | **s ≥ 0.545343749727** (w = 24) | Fekete: wolne pasy obok siebie dają dopuszczalne pokrycie, Z(K, kw) ≥ Z(K, w)ᵏ ⇒ s ≥ log λ_w / w. λ_w² ≥ c z Collatza–Wielandta: v = iterat z pustego brzegu, więc supp v = supp T²ⁿe₀; T²v ≥ c·v ⇒ Z(2(n+K)) ≥ cᴷ·const. |
| górne | **s ≤ 0.586216605404** (w = 24) | pasy z otwartymi bokami: pokrycie K×kw rozcina się na pasy + krawędzie przez cięcia; skrzyżowań między zbiorami A, B (\|Δr\| ≤ 1) jest ≤ F_{n+1} ≤ φⁿ (najniższa komórka A idzie do 1. lub 2. komórki B ⇒ M(n) ≤ M(n−1)+M(n−2)), więc Z(K, kw) ≤ W(K, w)ᵏ, W = pas, w którym komórka boczna może być „pokryta z zewnątrz” z wagą √φ. μ_w² ≤ C: A v ≤ C v składowo (zera też), v₀ > 0 ⇒ W(2K) ≤ Cᴷ. |
| górne | s ≤ 0.662787681422 | Kahn–Lovász (dowód Alon–Friedland 2008): PM(G) ≤ ∏(d_v!)^{1/(2d_v)}, d_v ≤ 8. |

Zaokrąglenia: wpis T²v to 2w kroków po ≤ 6 nieujemnych składników ⇒ błąd względny ≤ 12wu < 3.2e-14;
certyfikaty × (1 ∓ 1e-12), wyniki zaokrąglane w dół/górę, wpisy subnormalne wykluczone (assert).

**Calkin–Wilf: warunek nie zachodzi, ale bound wygląda na prawdziwy** (`python3 cw.py` @0357d17 →
`out_cw.txt`, `CW-NOTE.md`, 0cf6903). Dowód CW wymaga refleksyjnej dodatniości; tu zawodzi dla każdej
prostej odbicia (T niesymetryczne: T[∅→{1}]=2, T[{1}→∅]=0; forma sklejenia M ma λ_min = 1−√2 przy m=3,
z jawnym ujemnym funkcjonałem). Słabsza hipoteza **(L): q ↦ Z(2q, m) log-wypukłe dla każdego m**
implikuje CW dla parzystych p — sprawdzona dokładnie (liczby całkowite): 0 naruszeń w 429
przypadkach, m ≤ 20. Wszystkie 132 pary CW leżą poniżej s (najbliżej 5.7e-12). **Przy (L):
s ≥ 0.565511911035** (certyfikowane λ₂₄, λ₂₂) — 11 cyfr; bez dowodu (L) to nie jest twierdzenie.
Chessboard (górne z parzystych cylindrów) wymaga tej samej dodatniości — nie certyfikowane.

## Sygnał Z2 (parzyste cylindry, `estimate.py` → `z2.json`)

Δ_w = log λ_even − log λ_odd: w=10 1.52e-4, 14 5.12e-6, 18 1.79e-7, 22 6.39e-9, 24 1.21e-9.
Lokalne ξ_w = 2/log(Δ_{w−2}/Δ_w) rośnie: 1.154 (w=10) → 1.205 (w=24). Fit log Δ = a − w/ξ + b log w,
w = 10…24: **ξ = 1.232**, b = −0.43 (rms 9e-4); 1/ξ_w liniowo w 1/w: ξ_∞ = 1.235; czysty wykładnik
daje 1.193 przy rms 1.5e-2 (zły model). Szczelina w sektorze (ARPACK, w=20): log(λ₁/|λ₃|) = 1.083.

## Co zwalidowane i jak

- Brute force (jawne grafy) = transfer: 90/90 plansz, king/tri/sq × free/cyl, w = 3…6, h = 1…4 (`validate.py` @73289ea).
- Dane repo: kwadraty L ≤ 18, prostokąty i liczba 20×20 z README (użyta w `fitsq.py`) — dokładnie (CRT, 14 liczb pierwszych).
- Kwadratowa: pasy wolne = ∏(a+√(1+a²)) i oba sektory cylindra = wzór fermionowy do < 1e-16; granica wzoru = G/π (2e-19), (f−G/π)w² → π/6. Fit samego TM z w ≤ 18 daje G/π ± 6e-8 — identyczne cyfry jak fit na dokładnym wzorze (ogranicza asymptotyka, nie TM).
- Trójkątna: cylinder w=17 = całka Blocha z orientacji Kasteleyna (sprawdzonej |Pf| = liczba na 9 planszach) do 2.9e-15: **s_tri = 0.428594537464959**.
- Wolne pasy w = 3, 4: a(n+1)/a(n) dla Z(3×2n) (A239265, bisekcja ⇒ λ₃²) i Z(4×n) (A239266) → λ_w do 1e-16.
- float64 vs liczby dokładne (Z_cyl(K+2)/Z_cyl(K), w = 9…13): ≤ 4.1e-16 w log λ; ARPACK na pełnym transferze w=20: oba sektory do 1.8e-15 (`crosscheck.py` @a32a0fe). `tmfast.py` = `tm.py` bit w bit.

Koszt (`out_estimate.txt`; do 3 procesów naraz na 4 rdzeniach, zawsze 19 iteracji T², nawias CW
domknięty do ulp): w=20 1.3 s/iter, 310 MiB; 21 3.3 s, 587 MiB; 22 6.8 s, 1.1 GiB; 23 16 s, 2.1 GiB;
24 31 s, 4.3 GiB; 25 67 s, 8.4 GiB (22.5 min).

## BLOCKED

- Porównanie z OEIS A239265/A239266 i z literaturą — poza zakresem (bez sieci); sprawdzone tylko z własnymi liczbami dokładnymi i danymi repo.
- w ≥ 26: z pomiarów ~17 GiB RAM > 15.7 GiB w kontenerze — nie uruchamiane.
- `/usr/bin/time`: `No such file or directory` — zastąpione `timed.py`.

## Pytania na następną sesję

1. Udowodnić (L) (log-wypukłość Z(2q, m) w q). Daje rygorystyczne s ≥ 0.565511911035. Cauchy–Schwarz nie działa (forma M nieokreślona); potrzebna inna struktura (np. inwolucja odwracająca znak na parach pokryć).
2. Lepsze rygorystyczne górne niż pasy otwarte (zbieżność ~0.5/w); albo górne analogiczne do (L).
3. Postać poprawek nieparzystych w (r_w dryfuje, ~9.99 przy w=25) — związek z ξ_Z2 ≈ 1.23 i szczeliną 1.08.
4. Granica f(k) = log λ_k − sk dla wolnych pasów: −2σ ≈ −0.4840358715 (energia powierzchniowa) — do artykułu.
5. Lokalny przegląd literatury dla 0.565511911041325 i s_tri = 0.428594537464959.
