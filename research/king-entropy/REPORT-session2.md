# Sesja 2 — adwersarialny audyt sesji 1

Gałąź `d/king-entropy`, katalog `research/king-entropy/`. Każda liczba: `skrypt args` → plik
wyjściowy @ commit kodu (dane: commit z wynikiem w tabeli na końcu).

## Werdykty

| teza sesji 1 | werdykt | podstawa |
| --- | --- | --- |
| **s ≤ 0.586216605404** (pasy otwarte, √φ, Fibonacci) | **POTWIERDZONE** | `PROOF-upper.md`; `audit_bounds.py` @0c53f27, 0 błędów: tożsamość cięcia = brute force (58 plansz, K ≤ 8, kw ≤ 12); max M(A,B) = F_{n+1} (m ≤ 11), rozgałęzienie a₁→b₁/b₂ bez wyjątków; **Z(K,kw) ≤ W(K,w)ᵏ na 58 planszach** (dokładnie, przedziały dla √φ); transfer(z) = brute force jako wielomian w z (162 ewaluacje); certyfikat float przeliczony w ułamkach (w ≤ 12): błąd ≤ 1.3e-16 przy zapasie 1e-12. Moc testu: z = 0 łamie się na 40/40. |
| **s ≥ 0.545343749727** (Fekete + Collatz–Wielandt) | **POTWIERDZONE** | `PROOF-lower.md`, ten sam audyt (L1–L3). Kosmetyka: wystarcza supp v ⊆ supp Aⁿe₀ (nie „=”), co zachodzi zawsze. |
| s ≥ 0.565511911035 „przy (L)” | logika **POTWIERDZONA**, hipoteza za mocna | `PROOF-lower.md` §6: wystarcza **(L∞)** = wypukłość log λ_{2q} dla 2q ≥ 22; sprawdzona do 2q = 24 (Δ²a = 1.0e-11). |
| s = 0.565511911041325 ± 4e-15 | wartość **POTWIERDZONA**, pasek **6× za szeroki** | niżej. |
| (L) | **NIEROZSTRZYGNIĘTE** | `L-NOTE.md`: 0 naruszeń; brak dowodu; (L) nie jest ogólna. |
| −2σ ≈ −0.4840358715 | **POTWIERDZONE** | σ = **0.242017935766251 ± 9e-15** (niżej). |
| proweniencja (SHA w raporcie 1) | **OBALONE** | 11/11 cytowanych SHA (d817805, 9fc8b21, ff18169, …) nie istnieje w repo. Wyniki są jednak odtwarzalne: `repro.py` @167f49a → `out_repro.txt`: estimate.py, cw.py, bounds.py (w ≤ 16, obie sekcje) identyczne, cylw w=20 wszystkie 19 iteratów bit w bit. |

## Pasek błędu s (`python3 errbar.py` @825fa48 → `out_errbar.txt`)

Modele ogona na nieparzystych w: geometryczny (sesja 1), d_w = A e^{−w/ξ} w^b (3 i 6 punktów),
r_w = r_∞ + c/w (+e/w²), dwa wykładniki, Wynn ε; to samo na środkach sektorów parzystych w
(niezależne dane). Przy W = 25: [0.56551191104132526, 0.56551191104132537]; geometryczny jest
skrajny i jedyny oblewa backtest (1.05e-15 przy W = 23; inne ≤ 1.1e-16). Modele zdające
backtest (< 5e-16) na obu zbiorach: [0.5655119110413252, 0.5655119110413255]. Zaokrąglenia
float64 zmierzone powtórką w longdouble (`lean.py king cyl w 1 longdouble`): ≤ 4.1e-17 na węzeł
(w = 15…25; w = 25: 3.1e-17), Σ|∂s/∂f_w| = 1.49; na samych wartościach longdouble w = 21, 23, 25
modele dają 0.56551191104132531–2 (geometryczny 0.565511911041325226). Fity: ξ_odd = 0.93, b = −1.9, r_∞ = 8.3 (spadek
r_w 13.4 → 9.99 to efekt w^b, nie zmiana ξ); 1/ξ_odd ≈ 1.07 ≈ szczelina transferu 1.083.

**Rekomendacja: s = 0.5655119110413253 ± 6e-16** (3 × (połowa rozrzutu modeli + zaokrąglenia)).

## (L) (`L-NOTE.md`)

- Dokładnie (`zexact.py` CRT → `ltest.py` @7b8647f → `out_ltest.txt`): **0/873** (wolne,
  m = 2…24, 2q ≤ 120…20), **0/550** (cylindry, m = 3…22, 2q ≤ 80…22); m = 25, 26 certyfikowane
  w x87 ze ścisłym ograniczeniem zaokrągleń (`lcert.py 25 30`, `lcert.py 26 30` @a0a07e9): 0/28,
  2q ≤ 28 (najmniejszy margines 1.2e-10 vs błąd ≤ 1e-16).
  Margines maleje monotonicznie w q, iloraz → 0.16–0.20 (= μ₂/μ₁), minimum zawsze przy
  największym q: brak obszaru „podejrzanego”.
- **Kontrole: (L) nie jest ogólna.** Trójkątna, wolne pasy: 92/319 naruszeń od m = 5 (brute
  force: 210560² > 6475·6842465). Król z wagami ukośnych (1, ½): naruszenia od m = 5, (1, ¾) przy
  m = 9; równe wagi x ∈ [0, 100] i prawie równe (1, 0.9), (1, 0.95) do m = 16: 0. Dowód nie może
  być jednostajny w wagach; naturalny składnik: symetria lewo–prawo.
- Martwe drogi (z przeszkodą): RP; ciąg momentów/Hankel PSD (ujemne minory od m = 3, μ zespolone
  lub ujemne w widmie T², `lspec.py`); całkowita nieujemność (widmo nierzeczywiste); LGV.
- Nowe, sprawdzone przeformułowania: (R1) D_q = Σ_H 2^c([ścieżki góra–dół wszystkie
  nieparzyste] − [wszystkie parzyste]); przewaga „nieparzystych” osobno dla każdego t
  (`lparity.py`, do 3.4·10⁶ par); (R2) (L) ⇔ forma krzyżowania M ≥ 0 na span(u_{q−1}, u_{q+1}).

## Energia powierzchniowa (`python3 surface.py` @825fa48 → `out_surface.txt`)

f(k) = log λ_k − s k, λ_k z wolnych pasów (longdouble k = 14…24, float64 + nawias CW k = 25, 26).
Nieparzyste k zbiegają czysto (modele zgodne do 1e-16), parzyste mają dwie poprawki: proste fity
skaczą (backtest 1e-13), dwuwykładniczy i Wynn są stabilne. Modele zdające backtest:
−2σ ∈ [−0.4840358715325015, −0.4840358715325006]; dominuje błąd s (26 · 6e-16).
**−2σ = −0.484035871532501 ± 1.8e-14, σ = 0.242017935766251 ± 9e-15.**

## BLOCKED

- `curl https://oeis.org/A239265/b239265.txt` → `curl: (56) CONNECT tunnel failed, response 403`
  (polityka sieci środowiska). OEIS i literatura nadal nieporównane; trzeba dodać `oeis.org`
  w Allowed domains środowiska.
- Cylinder w = 27: 2 bufory float64 po 8 GiB = 16 GiB > 15.7 GiB RAM — nie uruchamiane.

## Pytania na sesję 3

1. Dowód (L∞) (tylko wiodące λ_{2q}) zamiast (L): sprzężenie pasów 2q−2, 2q, 2q+2 albo
   rygorystyczne otoczki log λ_{2q} do 2q ≈ 40 + ograniczenie ogona.
2. Inwolucja dla (R1) z użyciem odbicia lewo–prawo J; dlaczego (1, ½) łamie, a (1, 0.9) nie?
3. Ostrzejsze górne: waga √φ jest potrzebna w dowodzie, nie w danych (z = 0.5 wystarcza na
   małych planszach); rząd O(1/w) zostaje — potrzebny inny pomysł.
4. w = 27 z kompresją parzystości stanu (połowa wpisów zerowa) → 8 GiB, jedna cyfra więcej.
5. OEIS/literatura po odblokowaniu sieci.

## Commity sesji 2 (kod → dane)

audyt bounds 0c53f27; dowody fccfbe6, a04f90c; zexact 1eb72f5; lean 54a78ac; errbar 7434e24,
825fa48; surface d022860, 5fd0976; ltest/kontrole 7b8647f, e83f6f2; lparity b96c1aa; L-NOTE
cccfc9e, 83085bd; lspec cccfc9e; lweight f410768, 825fa48 (big: 606e3fa); repro 167f49a, 0924723; lcert
a0a07e9, 7ede2fc, 271a9d8; raport 50a1986, d822fa5.
