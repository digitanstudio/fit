# Môj plán — jedlo a tréning

Osobný denník jedla a tréningu. Cieľ, na ktorý je appka postavená: **nabrať sval na zadku
a stehnách, zároveň chudé brucho** — teda pomalé, kontrolované naberanie, nie objemová fáza.
Celá databáza potravín je **bez mliečnych výrobkov** (mliečna bielkovina je vylúčená).

Je to obyčajná statická stránka: žiadny server, žiadna databáza, žiadne knižnice.
Dáta sú v `localStorage` prehliadača, záloha cez export/import JSON.

---

## Spustenie na GitHub Pages

1. Vytvor si na GitHube nové repo (napr. `tana-fit`) — pokojne privátne.
2. V tomto priečinku:
   ```bash
   git init
   git add .
   git commit -m "prva verzia"
   git branch -M main
   git remote add origin https://github.com/<tvoje-meno>/tana-fit.git
   git push -u origin main
   ```
3. Na GitHube: **Settings → Pages → Source: `main` / `/ (root)` → Save**.
4. O minútu bude appka na `https://<tvoje-meno>.github.io/tana-fit/`.
5. **Na telefóne**: otvor tú adresu → *Zdieľať → Pridať na plochu*.
   Odvtedy sa správa ako normálna appka a funguje aj bez internetu.

### Lokálne vyskúšanie

```bash
python -m http.server 8777     # alebo:  npx serve .
```
a otvor `http://localhost:8777/`.
(Cez `file://` to nepôjde — service worker potrebuje `http`.)

---

## Dôležité o dátach

- Dáta sú uložené **len v tom prehliadači a na tom zariadení**, kde ich zapíšeš.
  Zápisy z telefónu sa v notebooku neukážu a naopak.
- Preto: zapisuj **z jedného zariadenia** (najlepšie telefón).
- Raz za mesiac si urob **Nastavenia → Záloha dát → Export JSON** a súbor ulož
  (OneDrive, mail sebe samej, hocikam).
- Prenos medzi zariadeniami = Export na jednom, Import na druhom.
- Vymazanie dát prehliadača (čistenie histórie so zaškrtnutým „údaje stránok“) zápisy zmaže.

---

## Ako to počíta

```
BMR (Mifflin–St Jeor, žena) = 10×kg + 6,25×cm − 5×rokov − 161
základ      = BMR × 1,2                     (sedavá práca)
TDEE        = základ + kalórie zo zapísaného pohybu v ten deň
cieľ kcal   = TDEE + 150                    (pomalé naberanie)
bielkoviny  = 2,0 g/kg, minimálne 130 g
tuky        = 1,0 g/kg
uhľohydráty = zvyšok kalórií
```

Pri 26 rokoch / 174,5 cm / 67 kg to vychádza na **1 914 kcal v deň bez pohybu** a zhruba
**2 400 kcal v deň s fitkom a chôdzou**. Čím viac pohybu zapíšeš, tým viac môžeš zjesť —
preto sa oplatí zapisovať aj chôdzu.

Kalórie z pohybu (čistá energia nad pokojový metabolizmus):

| | výpočet | pri 67 kg |
|---|---|---|
| chôdza | 0,63 × kg × km | 5 km ≈ **211 kcal** |
| silový tréning | 4,0 × kg × hodiny | 65 min ≈ **290 kcal** |

### Mikroživiny

Appka sleduje vlákninu, vápnik, železo, magnézium, kálium, vitamín C, omega-3 a vitamín D.
Na karte *Dnes* vždy ukáže **tú jednu, ktorá najviac chýba**, a navrhne konkrétne gramy
potraviny, ktorá ju dorovná za čo najmenej kalórií.

Bez mliečnych výrobkov je najkritickejší **vápnik (1000 mg)** — rieši sa kalciovým tofu,
fortifikovaným sójovým nápojom, tahini, makom, sezamom, chia a sardinkami s kostičkami.
**Vitamín D** sa zo stravy pokryť nedá — od októbra do apríla treba D3 2000 IU denne.

---

## Tréningový plán v appke

| Deň | Jednotka |
|---|---|
| Po | **Fitko** — hip thrust, RDL, leg press, bulharský drep, abdukcia, predkopávanie, sťahovanie kladky |
| Ut, Št, So, Ne | **Chôdza** 5 km |
| St | **Doma A** — zadok: hip thrust s činkou, RDL, zakročný výpad, glute bridge, gumy + vrch tela |
| Pi | **Doma B** — stehná, zadná strana, lýtka a jadro (anti-rotačné cviky, žiadne zaťažené úklony) |

Týždenné ciele sérií na partiu: **zadok 12–18**, stehná 8–12, zadná strana 8–10, lýtka 3–6,
jadro 6–12, vrch tela 6–10. Sekundárna partia sa počíta ako polovica série.

Pri každom cviku appka ukáže, **čo si dala naposledy** — to je celý princíp progresívneho
preťažovania. Keď dáš horný počet opakovaní vo všetkých sériách, nabudúce pridaj 1–2,5 kg.

---

## Štruktúra projektu

```
index.html             kostra appky
css/style.css          mobile-first štýly, tmavý aj svetlý režim
js/foods-db.js         177 potravín, hodnoty na 100 g (bez mliečnych)
js/exercises-db.js     cviky a tri tréningové jednotky
js/store.js            localStorage + export/import
js/targets.js          prepočet cieľov a návrhy na doplnenie živín
js/ui.js               bottom sheet, steppery, časovač prestávky, toast
js/charts.js           inline-SVG grafy bez knižnice
js/food.js             denník jedla, hľadanie, obľúbené, moje jedlá
js/training.js         denník tréningu, série, týždenný objem
js/stats.js            agregácia deň/týždeň/mesiac + slovné hodnotenie
js/app.js              karty Dnes a Nastavenia, navigácia
sw.js, manifest.json   PWA — inštalácia na plochu, offline
tools/gen-icons.js     vygeneruje icon-192.png a icon-512.png
tools/test-logic.js    testy výpočtov (node tools/test-logic.js)
tools/test-dom.js      test celej appky v jsdom
```

### Testy

```bash
node tools/test-logic.js      # výpočty: ciele, kalórie z pohybu, súčty, objem
npm i jsdom                   # len pre test-dom
node tools/test-dom.js        # vykreslí celú appku a preklikká ju
```

### Po úprave súborov

Zvýš `VERSION` v `sw.js` (napr. `v1` → `v2`), inak si telefón nechá starú verziu v cache.

---

## Upozornenie

Toto nie je zdravotné poradenstvo. Hodnoty potravín sú približné, z bežných zložkových
tabuliek. Pri zdravotných ťažkostiach (štítna žľaza, PCOS, anémia, tráviace problémy)
nechaj si plán potvrdiť lekárom alebo dietológom.
