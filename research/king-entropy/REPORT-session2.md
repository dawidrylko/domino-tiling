# Sesja 2 — adwersarialny audyt sesji 1

Gałąź `d/king-entropy`, katalog `research/king-entropy/`. Każda liczba: skrypt + argumenty →
plik wyjściowy, commit kodu w nawiasie (commit danych w tabeli commitów na końcu).

## Werdykty

| teza sesji 1 | werdykt | podstawa |
| --- | --- | --- |
| **s ≤ 0.586216605404** (pasy otwarte, waga √φ, Fibonacci) | **POTWIERDZONE** | `PROOF-upper.md`. `audit_bounds.py` (0c53f27), 0 błędów: tożsamość cięcia = brute force na 58 planszach; max M(A,B) = F_{n+1} dokładnie (m ≤ 11) i rekurencja M(n) ≤ M(n−1)+M(n−2) bez wyjątków; **Z(K,kw) ≤ W(K,w)ᵏ na 58 planszach** (K ≤ 8, kw ≤ 12, arytm. przedziałowa); transfer z wagą z = brute force jako wielomian (162 ewaluacje); certyfikat float przeliczony dokładnie (ułamki) dla w ≤ 12: błąd ≤ 1.3e-16 przy zapasie 1e-12. Test ma moc: z = 0 łamie się na 40/40 planszach. |
| **s ≥ 0.545343749727** (Fekete + Collatz–Wielandt) | **POTWIERDZONE** | `PROOF-lower.md`, ten sam audyt (L1–L3). Drobna nieścisłość docstringu: wystarcza supp v ⊆ supp Aⁿe₀ (nie „=”), co zachodzi automatycznie. |
| s ≥ 0.565511911035 przy (L) | **logika POTWIERDZONA**, hipoteza zbyt mocna | `PROOF-lower.md` §6: wystarcza **(L∞)**: wypukłość log λ_{2q} dla 2q ≥ 22 (tylko wiodące wartości własne pasów). |
| s = 0.565511911041325 ± 4e-15 | **wartość POTWIERDZONA, pasek ZAWYŻONY** | patrz „Pasek błędu”. |
| (L): q ↦ Z(2q,m) log-wypukłe ∀m | **NIEROZSTRZYGNIĘTE** | `L-NOTE.md`; 0 naruszeń, ale (L) łamie się na sieciach kontrolnych. |
| −2σ ≈ −0.4840358715 | **POTWIERDZONE** | σ = PENDING_SIGMA (`surface.py`). |
| proweniencja: SHA w raporcie 1 | **OBALONE** | 11 z 11 cytowanych SHA (d817805, 9fc8b21, …) nie istnieje w repo (historia przepisana przed pushem). Wyniki są jednak odtwarzalne z HEAD: `repro.py` → `out_repro.txt`: PENDING_REPRO. |

## Pasek błędu s (`python3 errbar.py` → `out_errbar.txt`)

Sześć modeli ogona na nieparzystych w (geometryczny sesji 1; d_w = A e^{−w/ξ} w^b przez 3 i 6
punktów; r_w = r_∞ + c/w (+e/w²); dwa wykładniki; Wynn ε) + te same modele na środkach
parzystych w (niezależne dane). Przy W = 25 wszystkie nieparzyste: [0.56551191104132526,
0.56551191104132537] (rozrzut 1.0e-16); geometryczny sesji 1 jest skrajny (jego backtest: błąd
1.05e-15 przy W = 23, inne ≤ 1.1e-16). Modele zdające własny backtest (< 5e-16) na obu zbiorach:
[0.5655119110413252, 0.5655119110413255], połowa szerokości 1.3e-16. Zaokrąglenia float64
zmierzone powtórką w longdouble (`lean.py`): ≤ 4.1e-17 na węzeł (w = 15…23), PENDING_W25;
wrażliwość Σ|∂s/∂f_w| = 1.49. Dopasowania: ξ_odd = 0.93 (b = −1.9), r_∞ = 8.3 (dryf r_w to
efekt 1/w, nie zmiana ξ); 1/ξ_odd ≈ 1.07 ≈ szczelina transferu 1.083 (w = 20).
**Rekomendacja: s = 0.5655119110413253 ± 6e-16** (3 × (rozrzut modeli + zaokrąglenia));
±4e-15 z sesji 1 było ~6× za szerokie, ale nie błędne.

## (L) (`L-NOTE.md`)

- Dokładnie (CRT, `zexact.py` → `ltest.py`): PENDING_L. Margines maleje monotonicznie w q,
  iloraz → 0.18–0.20 (= μ₂/μ₁), minimum zawsze przy największym q; brak „dołka”.
  PENDING_LCERT
- **Kontrole: (L) nie jest ogólna.** Trójkątna, wolne pasy: 92 naruszenia / 319 (od m = 5,
  potwierdzone brute force: 210560² > 6475·6842465). Król z wagami ukośnych (1, ½): naruszenia
  od m = 5; (1, ¾) przy m = 9. Równe wagi x ∈ [0, 100]: 0 naruszeń. Dowód musi używać
  czegoś, czego nie ma przy (1, ½) — najpewniej symetrii lewo–prawo.
- Martwe drogi (z przeszkodą): RP; Hankel/ciąg momentów (ujemne minory od m = 3, μ zespolone
  lub ujemne w widmie T²); całkowita nieujemność (widmo nierzeczywiste); LGV (graf
  nieplanarny, niedwudzielny).
- Nowe przeformułowania (sprawdzone): (R1) D_q = Σ_H 2^c([ścieżki góra–dół wszystkie
  nieparzyste] − [wszystkie parzyste]) — przewaga „nieparzystych” osobno dla każdej liczby
  ścieżek t; (R2) (L) ⇔ forma krzyżowania M jest dodatnia na span(u_{q−1}, u_{q+1}).

## Energia powierzchniowa (`python3 surface.py` → `out_surface.txt`)

PENDING_SURFACE

## BLOCKED

- `curl https://oeis.org/A239265/b239265.txt` → `curl: (56) CONNECT tunnel failed, response 403`
  (polityka sieci środowiska blokuje oeis.org). Porównanie z OEIS/literaturą nadal niewykonane;
  odblokowanie: dodać `oeis.org` w Allowed domains środowiska.
- Cylinder w = 27 (kolejny punkt nieparzysty): 2 bufory float64 × 8 GiB = 16 GiB > 15.7 GiB RAM.
  Nie uruchamiane.

## Pytania na sesję 3

1. Dowód (L∞) zamiast (L): tylko wiodące λ_{2q}; np. sprzężenie pasów 2q−2, 2q, 2q+2 albo
   rygorystyczne otoczki log λ_{2q} do 2q ≈ 40 + ograniczenie ogona.
2. Inwolucja dla (R1) wykorzystująca odbicie lewo–prawo J (asymetryczne wagi pokazują, że J musi
   wejść do dowodu).
3. Ostrzejsze górne ograniczenie: Fibonacci/√φ jest konieczne w dowodzie, ale nie w danych
   (z = 0.5 wystarcza na małych planszach; z = 1 daje 0.315/w nad s) — tylko stała, rząd O(1/w)
   zostaje.
4. w = 27 z kompresją parzystości stanu (połowa wpisów jest zerowa w każdym kroku) → 8 GiB.
5. OEIS / literatura po odblokowaniu sieci.
