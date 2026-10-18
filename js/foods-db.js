/* ============================================================================
   foods-db.js — vstavana databaza potravin, hodnoty na 100 g.
   Mliecne produkty su zamerne VYNECHANE (mliecna bielkovina je vylucena).
   Hodnoty su priblizne, z beznych zlozkovych tabuliek (USDA / SK) — na
   sledovanie trendu a makier stacia, nie su to laboratorne merania.

   Poradie cisel v riadku:
   kcal, p(bielkoviny g), f(tuky g), sf(nasytene g), c(uhlohydraty g),
   s(cukry g), fib(vlaknina g), ca(mg), fe(mg), mg(mg), k(mg),
   vc(vit.C mg), vd(vit.D ug), o3(omega-3 g)
   nepovinne na konci: hmotnost 1 kusu/porcie v gramoch, nazov tej porcie
   ============================================================================ */
(function (global) {
  'use strict';

  var COLS = ['kcal', 'p', 'f', 'sf', 'c', 's', 'fib', 'ca', 'fe', 'mg', 'k', 'vc', 'vd', 'o3'];

  var CATS = {
    maso: 'Mäso, ryby, morské plody',
    vajcia: 'Vajcia',
    rastlinne: 'Rastlinné bielkoviny',
    obilniny: 'Obilniny a pečivo',
    zelenina: 'Zemiaky a zelenina',
    ovocie: 'Ovocie',
    tuky: 'Tuky, orechy, semienka',
    alternativy: 'Nemliečne alternatívy',
    ostatne: 'Ostatné',
    vlastne: 'Moje potraviny'
  };

  var RAW = [
    /* ---------- maso, ryby ---------- */
    ['kurprs', 'Kuracie prsia (surové)', 'maso', 120, 23, 2.6, 0.7, 0, 0, 0, 11, 0.7, 28, 334, 0, 0.1, 0.03],
    ['kurprsg', 'Kuracie prsia (grilované)', 'maso', 165, 31, 3.6, 1, 0, 0, 0, 15, 1, 29, 340, 0, 0.1, 0.04],
    ['kurstehno', 'Kuracie stehno bez kože', 'maso', 121, 19.3, 4.3, 1.1, 0, 0, 0, 10, 0.9, 22, 230, 0, 0.1, 0.04],
    ['morcprs', 'Morčacie prsia', 'maso', 104, 24, 1, 0.3, 0, 0, 0, 12, 0.8, 28, 300, 0, 0.1, 0.03],
    ['morcmlete', 'Morčacie mleté', 'maso', 148, 19.7, 7.4, 1.9, 0, 0, 0, 14, 1.1, 24, 280, 0, 0.1, 0.05],
    ['hovmlete', 'Hovädzie mleté 10 %', 'maso', 176, 20, 10, 4, 0, 0, 0, 12, 2.2, 20, 290, 0, 0.1, 0.04],
    ['hovsviec', 'Hovädzia sviečkovica', 'maso', 143, 21.5, 5.9, 2.3, 0, 0, 0, 10, 2, 22, 330, 0, 0.1, 0.03],
    ['hovzadne', 'Hovädzie zadné / plec', 'maso', 131, 22, 4.3, 1.7, 0, 0, 0, 10, 2.4, 23, 340, 0, 0.1, 0.03],
    ['svpanenka', 'Svinská panenka', 'maso', 120, 22, 3.5, 1.2, 0, 0, 0, 8, 0.9, 26, 400, 0.6, 0.2, 0.02],
    ['svkare', 'Svinské karé', 'maso', 143, 21, 6, 2.1, 0, 0, 0, 7, 0.8, 24, 350, 0.6, 0.2, 0.02],
    ['kursunka', 'Kuracia šunka 95 %', 'maso', 105, 18, 2.5, 0.9, 1.5, 0.8, 0, 10, 0.6, 20, 300, 0, 0.1, 0.02],
    ['kurpecen', 'Kuracia pečeň', 'maso', 119, 17, 4.8, 1.6, 0.7, 0, 0, 8, 9, 19, 230, 18, 0.4, 0.1],
    ['hovpecen', 'Hovädzia pečeň', 'maso', 135, 20, 3.6, 1.2, 3.9, 0, 0, 5, 4.9, 18, 310, 1.3, 0.3, 0.05],
    ['losos', 'Losos atlantický', 'maso', 208, 20, 13, 3.1, 0, 0, 0, 9, 0.3, 27, 363, 0, 11, 2.3],
    ['lososud', 'Losos údený', 'maso', 142, 18, 4.3, 0.9, 0, 0, 0, 11, 0.8, 18, 327, 0, 17, 1.4],
    ['lososkonz', 'Losos v konzerve (s kostičkami)', 'maso', 142, 20, 6, 1.4, 0, 0, 0, 213, 0.9, 29, 326, 0, 13, 1.6],
    ['treska', 'Treska', 'maso', 82, 18, 0.7, 0.1, 0, 0, 0, 16, 0.4, 32, 413, 1, 1.2, 0.2],
    ['tunvode', 'Tuniak vo vlastnej šťave', 'maso', 116, 26, 1, 0.3, 0, 0, 0, 11, 1.3, 33, 237, 0, 2, 0.28],
    ['tunolej', 'Tuniak v oleji (odkvapkaný)', 'maso', 198, 29, 8, 1.5, 0, 0, 0, 12, 1.3, 31, 230, 0, 2, 0.3],
    ['tunsteak', 'Tuniak steak (svieži)', 'maso', 130, 28, 1.3, 0.4, 0, 0, 0, 10, 1.3, 50, 440, 0, 1.7, 0.3],
    ['sardolej', 'Sardinky v oleji (odkvapkané)', 'maso', 208, 24.6, 11.5, 1.5, 0, 0, 0, 382, 2.9, 39, 397, 0, 4.8, 1.5],
    ['sardvode', 'Sardinky vo vode', 'maso', 135, 22, 5, 1.2, 0, 0, 0, 350, 2.5, 36, 380, 0, 4.5, 1.1],
    ['makrela', 'Makrela', 'maso', 205, 19, 13.9, 3.3, 0, 0, 0, 12, 1.6, 76, 314, 0, 16, 2.6],
    ['sled', 'Sleď / matjes', 'maso', 203, 18, 14, 3.2, 0, 0, 0, 57, 1.1, 41, 327, 0.7, 16, 2],
    ['pstruh', 'Pstruh', 'maso', 148, 20.8, 6.6, 1.9, 0, 0, 0, 43, 0.7, 31, 417, 2.4, 16, 1],
    ['krevety', 'Krevety', 'maso', 99, 24, 0.3, 0.1, 0.2, 0, 0, 70, 0.5, 39, 259, 0, 0.1, 0.5],
    ['slavky', 'Slávky / mušle', 'maso', 86, 11.9, 2.2, 0.4, 3.7, 0, 0, 26, 4, 34, 320, 8, 0.2, 0.44],

    /* ---------- vajcia ---------- */
    ['vajce', 'Vajce celé', 'vajcia', 143, 12.6, 9.5, 3.1, 0.7, 0.4, 0, 56, 1.75, 12, 138, 0, 2, 0.1, 55, 'ks'],
    ['bielok', 'Vaječný bielok', 'vajcia', 52, 10.9, 0.17, 0, 0.7, 0.7, 0, 7, 0.08, 11, 163, 0, 0, 0, 33, 'ks'],
    ['zltok', 'Vaječný žĺtok', 'vajcia', 322, 15.9, 26.5, 9.6, 3.6, 0.6, 0, 129, 2.7, 5, 109, 0, 5.4, 0.23, 17, 'ks'],
    ['vajprot', 'Vaječný proteín (prášok)', 'vajcia', 374, 82, 0.4, 0.1, 7, 1, 0, 120, 0.5, 30, 1100, 0, 0, 0, 30, 'odmerka'],

    /* ---------- rastlinne bielkoviny ---------- */
    ['tofu', 'Tofu pevné (kalciové)', 'rastlinne', 144, 15.8, 8.7, 1.3, 2.8, 0.6, 2.3, 350, 2.7, 58, 237, 0.1, 0, 0.6],
    ['tofuud', 'Tofu údené', 'rastlinne', 160, 17, 9.5, 1.5, 2, 0.5, 2, 320, 2.7, 55, 230, 0, 0, 0.6],
    ['tempeh', 'Tempeh', 'rastlinne', 193, 19, 11, 2.2, 9, 0, 6, 111, 2.7, 81, 412, 0, 0, 0.2],
    ['seitan', 'Seitan', 'rastlinne', 141, 25, 1.9, 0.3, 4, 0.5, 0.6, 42, 1.5, 25, 100, 0, 0, 0.02],
    ['edamame', 'Edamame (varené)', 'rastlinne', 121, 11.9, 5.2, 0.6, 8.9, 2.2, 5.2, 63, 2.3, 64, 436, 6.1, 0, 0.35],
    ['cicer', 'Cícer (varený)', 'rastlinne', 164, 8.9, 2.6, 0.3, 27, 4.8, 7.6, 49, 2.9, 48, 291, 1.3, 0, 0.04],
    ['sosred', 'Šošovica červená (varená)', 'rastlinne', 116, 9, 0.4, 0.1, 20, 1.8, 7.9, 19, 3.3, 36, 369, 1.5, 0, 0.04],
    ['sosgreen', 'Šošovica zelená (varená)', 'rastlinne', 116, 9, 0.4, 0.1, 20, 1.8, 7.9, 19, 3.3, 36, 369, 1.5, 0, 0.04],
    ['fazcierna', 'Fazuľa čierna (varená)', 'rastlinne', 132, 8.9, 0.5, 0.1, 23.7, 0.3, 8.7, 27, 2.1, 70, 355, 0, 0, 0.18],
    ['fazbiela', 'Fazuľa biela (varená)', 'rastlinne', 139, 9.7, 0.4, 0.1, 25, 0.3, 6.3, 90, 3.7, 63, 561, 0, 0, 0.12],
    ['hrach', 'Hrach žltý (varený)', 'rastlinne', 118, 8.3, 0.4, 0.1, 21, 2.9, 8.3, 14, 1.3, 36, 362, 0.4, 0, 0.03],
    ['sojagran', 'Sójový granulát (suchý)', 'rastlinne', 336, 52, 1.5, 0.3, 30, 8, 18, 240, 9, 250, 2000, 0, 0, 0.1],
    ['sojaizo', 'Sójový izolát (prášok)', 'rastlinne', 335, 88, 1.9, 0.3, 2, 0, 1.6, 178, 14.5, 39, 81, 0, 0, 0.05, 30, 'odmerka'],
    ['hrachprot', 'Hrachový proteín (prášok)', 'rastlinne', 400, 80, 5, 1, 5, 0.5, 3, 120, 6, 180, 50, 0, 0, 0.05, 30, 'odmerka'],
    ['blendprot', 'Proteín hrach + ryža (prášok)', 'rastlinne', 390, 78, 5, 1, 7, 0.8, 3, 100, 5, 160, 60, 0, 0, 0.05, 32, 'odmerka'],
    ['konopprot', 'Konopný proteín (prášok)', 'rastlinne', 350, 50, 10, 1.1, 11, 1.5, 18, 130, 10, 400, 900, 0, 0, 2, 30, 'odmerka'],
    ['drozdie', 'Nutričné droždie', 'rastlinne', 360, 50, 5, 0.7, 35, 5, 20, 30, 5, 230, 2000, 0, 0, 0.05],
    ['falafel', 'Falafel', 'rastlinne', 333, 13.3, 17.8, 2.4, 31.8, 0, 4.9, 54, 3.4, 82, 585, 1.6, 0, 0.1],
    ['hummus', 'Hummus', 'rastlinne', 166, 7.9, 9.6, 1.4, 14.3, 0.3, 6, 38, 2.4, 71, 228, 0.8, 0, 0.3],

    /* ---------- obilniny a pecivo ---------- */
    ['ovsvlocky', 'Ovsené vločky (suché)', 'obilniny', 379, 13.2, 6.5, 1.1, 67, 1, 10.1, 52, 4.3, 138, 362, 0, 0, 0.1],
    ['ovskasa', 'Ovsená kaša na vode', 'obilniny', 71, 2.5, 1.2, 0.2, 12, 0.3, 1.9, 9, 0.8, 26, 70, 0, 0, 0.02],
    ['ryzabasm', 'Ryža basmati (suchá)', 'obilniny', 356, 8.1, 0.9, 0.2, 78, 0.1, 1.3, 10, 0.8, 25, 115, 0, 0, 0.02],
    ['ryzabiela', 'Ryža biela (varená)', 'obilniny', 130, 2.7, 0.3, 0.1, 28, 0.1, 0.4, 10, 0.2, 12, 35, 0, 0, 0.01],
    ['ryzahnd', 'Ryža hnedá (varená)', 'obilniny', 123, 2.7, 1, 0.2, 26, 0.4, 1.6, 10, 0.5, 43, 86, 0, 0, 0.03],
    ['quinoa', 'Quinoa (varená)', 'obilniny', 120, 4.4, 1.9, 0.2, 21.3, 0.9, 2.8, 17, 1.5, 64, 172, 0, 0, 0.09],
    ['pohanka', 'Pohánka (varená)', 'obilniny', 92, 3.4, 0.6, 0.1, 20, 0.9, 2.7, 7, 0.8, 51, 88, 0, 0, 0.02],
    ['bulgur', 'Bulgur (varený)', 'obilniny', 83, 3.1, 0.2, 0, 18.6, 0.1, 4.5, 10, 1, 32, 68, 0, 0, 0.02],
    ['kuskus', 'Kuskus (varený)', 'obilniny', 112, 3.8, 0.2, 0, 23, 0.1, 1.4, 8, 0.4, 8, 58, 0, 0, 0.01],
    ['cestsuche', 'Cestoviny semolinové (suché)', 'obilniny', 371, 13, 1.5, 0.3, 75, 2.7, 3.2, 21, 1.3, 53, 223, 0, 0, 0.03],
    ['cestvarene', 'Cestoviny (varené)', 'obilniny', 158, 5.8, 0.9, 0.2, 31, 0.6, 1.8, 7, 0.5, 18, 44, 0, 0, 0.01],
    ['cestcicer', 'Cestoviny cícerové (suché)', 'obilniny', 350, 20, 6, 0.8, 54, 3, 11, 60, 5, 120, 700, 0, 0, 0.1],
    ['chlebrazny', 'Chlieb ražný', 'obilniny', 250, 8.5, 3.3, 0.6, 48, 3.9, 5.8, 73, 2.8, 40, 190, 0, 0, 0.05, 40, 'krajec'],
    ['chlebcelo', 'Chlieb celozrnný', 'obilniny', 247, 13, 3.4, 0.7, 41, 6, 7, 107, 2.5, 82, 254, 0, 0, 0.05, 40, 'krajec'],
    ['chlebbily', 'Chlieb / toast biely', 'obilniny', 265, 9, 3.2, 0.7, 49, 5, 2.7, 144, 3.6, 25, 115, 0, 0, 0.03, 30, 'krajec'],
    ['rozok', 'Rožok / žemľa', 'obilniny', 290, 9, 3, 0.7, 55, 3, 2.5, 30, 1.5, 24, 120, 0, 0, 0.03, 45, 'ks'],
    ['tortilla', 'Tortilla pšeničná', 'obilniny', 310, 8.2, 7.9, 2.6, 51, 2.5, 3, 140, 2.9, 25, 120, 0, 0, 0.05, 60, 'ks'],
    ['ryzchleb', 'Ryžové chlebíčky', 'obilniny', 387, 8.2, 2.8, 0.6, 81.5, 0.5, 4.2, 11, 1.3, 100, 120, 0, 0, 0.05, 9, 'ks'],
    ['knackebrot', 'Knäckebrot ražný', 'obilniny', 334, 10, 1.5, 0.3, 66, 1.5, 16, 40, 3.4, 100, 480, 0, 0, 0.05, 11, 'ks'],
    ['musli', 'Müsli bez pridaného cukru', 'obilniny', 363, 10, 5.9, 1, 66, 10, 7.5, 50, 3.5, 100, 400, 0, 0, 0.1],
    ['polenta', 'Polenta (varená)', 'obilniny', 85, 2, 0.4, 0.1, 18, 0.2, 1, 3, 0.4, 14, 30, 0, 0, 0.01],
    ['muka', 'Pšeničná múka', 'obilniny', 364, 10.3, 1, 0.2, 76, 0.3, 2.7, 15, 1.2, 22, 107, 0, 0, 0.03],
    ['mukacelo', 'Celozrnná pšeničná múka', 'obilniny', 340, 13.2, 2.5, 0.4, 72, 0.4, 10.7, 34, 3.6, 137, 363, 0, 0, 0.05],
    ['ryzmuka', 'Ryžová múka', 'obilniny', 366, 6, 1.4, 0.4, 80, 0.1, 2.4, 10, 0.4, 35, 76, 0, 0, 0.02],

    /* ---------- zemiaky a zelenina ---------- */
    ['zemiaky', 'Zemiaky (varené)', 'zelenina', 87, 2, 0.1, 0, 20, 0.9, 1.8, 8, 0.3, 20, 379, 13, 0, 0.01],
    ['zemkasa', 'Zemiaková kaša (s olejom)', 'zelenina', 110, 2, 3.5, 0.5, 17, 1, 1.5, 15, 0.3, 19, 320, 10, 0, 0.02],
    ['hranolky', 'Zemiakové hranolky (pečené)', 'zelenina', 150, 2.5, 5, 0.6, 24, 0.5, 2.5, 10, 0.5, 22, 420, 8, 0, 0.03],
    ['bataty', 'Batáty (pečené)', 'zelenina', 90, 2, 0.15, 0, 21, 6.5, 3.3, 38, 0.7, 27, 475, 19.6, 0, 0.01],
    ['brokolica', 'Brokolica', 'zelenina', 34, 2.8, 0.4, 0.1, 7, 1.7, 2.6, 47, 0.7, 21, 316, 89, 0, 0.02],
    ['karfiol', 'Karfiol', 'zelenina', 25, 1.9, 0.3, 0.1, 5, 1.9, 2, 22, 0.4, 15, 299, 48, 0, 0.02],
    ['kale', 'Kel listový (kale)', 'zelenina', 49, 4.3, 0.9, 0.1, 9, 2.3, 3.6, 150, 1.5, 47, 491, 120, 0, 0.18],
    ['spenat', 'Špenát', 'zelenina', 23, 2.9, 0.4, 0.1, 3.6, 0.4, 2.2, 99, 2.7, 79, 558, 28, 0, 0.14],
    ['kapusta', 'Kapusta biela', 'zelenina', 25, 1.3, 0.1, 0, 5.8, 3.2, 2.5, 40, 0.5, 12, 170, 36, 0, 0.02],
    ['ruzkel', 'Ružičkový kel', 'zelenina', 43, 3.4, 0.3, 0.1, 9, 2.2, 3.8, 42, 1.4, 23, 389, 85, 0, 0.1],
    ['mrkva', 'Mrkva', 'zelenina', 41, 0.9, 0.2, 0, 10, 4.7, 2.8, 33, 0.3, 12, 320, 5.9, 0, 0.002],
    ['papcerv', 'Paprika červená', 'zelenina', 31, 1, 0.3, 0, 6, 4.2, 2.1, 7, 0.4, 12, 211, 128, 0, 0.02],
    ['paradajky', 'Paradajky', 'zelenina', 18, 0.9, 0.2, 0, 3.9, 2.6, 1.2, 10, 0.3, 11, 237, 14, 0, 0.003],
    ['uhorka', 'Uhorka', 'zelenina', 15, 0.7, 0.1, 0, 3.6, 1.7, 0.5, 16, 0.3, 13, 147, 2.8, 0, 0.005],
    ['cuketa', 'Cuketa', 'zelenina', 17, 1.2, 0.3, 0.1, 3.1, 2.5, 1, 16, 0.4, 18, 261, 17.9, 0, 0.03],
    ['baklazan', 'Baklažán', 'zelenina', 25, 1, 0.2, 0, 6, 3.5, 3, 9, 0.2, 14, 229, 2.2, 0, 0.01],
    ['cibula', 'Cibuľa', 'zelenina', 40, 1.1, 0.1, 0, 9.3, 4.2, 1.7, 23, 0.2, 10, 146, 7.4, 0, 0.004],
    ['cesnak', 'Cesnak', 'zelenina', 149, 6.4, 0.5, 0.1, 33, 1, 2.1, 181, 1.7, 25, 401, 31, 0, 0.02],
    ['sampinony', 'Šampiňóny', 'zelenina', 22, 3.1, 0.3, 0, 3.3, 1.7, 1, 3, 0.5, 9, 318, 2.1, 0.2, 0],
    ['hlivy', 'Hlivy ustricové', 'zelenina', 33, 3.3, 0.4, 0.1, 6.1, 1.1, 2.3, 3, 1.3, 18, 420, 0, 0.7, 0],
    ['hrasok', 'Hrášok zelený', 'zelenina', 81, 5.4, 0.4, 0.1, 14.4, 5.7, 5.7, 25, 1.5, 33, 244, 40, 0, 0.04],
    ['fazlusky', 'Fazuľové lúsky', 'zelenina', 31, 1.8, 0.1, 0, 7, 3.3, 2.7, 37, 1, 25, 211, 12, 0, 0.04],
    ['kyslakapusta', 'Kyslá kapusta', 'zelenina', 19, 0.9, 0.1, 0, 4.3, 1.8, 2.9, 30, 1.5, 13, 170, 15, 0, 0.01],
    ['kimchi', 'Kimchi', 'zelenina', 15, 1.1, 0.5, 0.1, 2.4, 1.1, 1.6, 33, 0.3, 14, 151, 15, 0, 0.01],
    ['rukola', 'Rukola', 'zelenina', 25, 2.6, 0.7, 0.1, 3.7, 2.1, 1.6, 160, 1.5, 47, 369, 15, 0, 0.17],
    ['salat', 'Ľadový salát', 'zelenina', 14, 0.9, 0.1, 0, 3, 1.8, 1.2, 18, 0.4, 7, 141, 2.8, 0, 0.06],
    ['cervrepa', 'Červená repa (varená)', 'zelenina', 44, 1.7, 0.2, 0, 10, 8, 2, 16, 0.8, 23, 305, 3.6, 0, 0.003],
    ['tekvica', 'Tekvica hokaido', 'zelenina', 26, 1, 0.1, 0, 6.5, 2.8, 0.5, 21, 0.8, 12, 340, 9, 0, 0.01],
    ['kukurica', 'Kukurica sladká (konzerva)', 'zelenina', 81, 2.9, 1.2, 0.2, 15, 3.4, 2, 4, 0.5, 25, 180, 5, 0, 0.02],
    ['spargla', 'Špargľa', 'zelenina', 20, 2.2, 0.1, 0, 3.9, 1.9, 2.1, 24, 2.1, 14, 202, 5.6, 0, 0.01],
    ['zelmix', 'Zeleninový mix (mrazený)', 'zelenina', 40, 2, 0.3, 0.1, 7, 3, 3, 30, 0.7, 20, 230, 15, 0, 0.02],
    ['olivy', 'Olivy zelené', 'zelenina', 145, 1, 15, 2, 3.8, 0.5, 3.3, 52, 0.5, 11, 42, 0, 0, 0.1],

    /* ---------- ovocie ---------- */
    ['banan', 'Banán', 'ovocie', 89, 1.1, 0.3, 0.1, 23, 12, 2.6, 5, 0.3, 27, 358, 8.7, 0, 0.03, 120, 'ks'],
    ['jablko', 'Jablko', 'ovocie', 52, 0.3, 0.2, 0, 14, 10, 2.4, 6, 0.1, 5, 107, 4.6, 0, 0.01, 180, 'ks'],
    ['hruska', 'Hruška', 'ovocie', 57, 0.4, 0.1, 0, 15, 10, 3.1, 9, 0.2, 7, 116, 4.3, 0, 0.01, 170, 'ks'],
    ['pomaranc', 'Pomaranč', 'ovocie', 47, 0.9, 0.1, 0, 12, 9, 2.4, 40, 0.1, 10, 181, 53, 0, 0.01, 150, 'ks'],
    ['mandarinka', 'Mandarínka', 'ovocie', 53, 0.8, 0.3, 0, 13, 11, 1.8, 37, 0.2, 12, 166, 27, 0, 0.02, 80, 'ks'],
    ['kivi', 'Kivi', 'ovocie', 61, 1.1, 0.5, 0, 15, 9, 3, 34, 0.3, 17, 312, 93, 0, 0.04, 75, 'ks'],
    ['jahody', 'Jahody', 'ovocie', 32, 0.7, 0.3, 0, 7.7, 4.9, 2, 16, 0.4, 13, 153, 59, 0, 0.07],
    ['maliny', 'Maliny', 'ovocie', 52, 1.2, 0.7, 0, 12, 4.4, 6.5, 25, 0.7, 22, 151, 26, 0, 0.13],
    ['cucoriedky', 'Čučoriedky', 'ovocie', 57, 0.7, 0.3, 0, 14, 10, 2.4, 6, 0.3, 6, 77, 9.7, 0, 0.06],
    ['hrozno', 'Hrozno', 'ovocie', 69, 0.7, 0.2, 0.1, 18, 16, 0.9, 10, 0.4, 7, 191, 3.2, 0, 0.02],
    ['melon', 'Melón červený', 'ovocie', 30, 0.6, 0.2, 0, 7.6, 6.2, 0.4, 7, 0.2, 10, 112, 8.1, 0, 0.01],
    ['mango', 'Mango', 'ovocie', 60, 0.8, 0.4, 0.1, 15, 14, 1.6, 11, 0.2, 10, 168, 36, 0, 0.05],
    ['ananas', 'Ananás', 'ovocie', 50, 0.5, 0.1, 0, 13, 10, 1.4, 13, 0.3, 12, 109, 48, 0, 0.02],
    ['marhule', 'Marhule', 'ovocie', 48, 1.4, 0.4, 0, 11, 9, 2, 13, 0.4, 10, 259, 10, 0, 0.01],
    ['slivky', 'Slivky', 'ovocie', 46, 0.7, 0.3, 0, 11, 10, 1.4, 6, 0.2, 7, 157, 9.5, 0, 0.01],
    ['ceresne', 'Čerešne', 'ovocie', 63, 1.1, 0.2, 0, 16, 13, 2.1, 13, 0.4, 11, 222, 7, 0, 0.03],
    ['datle', 'Datle sušené', 'ovocie', 282, 2.5, 0.4, 0, 75, 63, 8, 39, 1, 43, 656, 0.4, 0, 0.01],
    ['figy', 'Figy sušené', 'ovocie', 249, 3.3, 0.9, 0.1, 64, 48, 9.8, 162, 2, 68, 680, 1.2, 0, 0.01],
    ['hrozienka', 'Hrozienka', 'ovocie', 299, 3.1, 0.5, 0.1, 79, 59, 3.7, 50, 1.9, 32, 749, 2.3, 0, 0.02],
    ['brusnice', 'Brusnice sušené', 'ovocie', 308, 0.1, 1.4, 0.1, 82, 65, 5.7, 9, 0.4, 5, 40, 0.2, 0, 0.02],

    /* ---------- tuky, orechy, semienka ---------- */
    ['olivolej', 'Olivový olej', 'tuky', 884, 0, 100, 13.8, 0, 0, 0, 1, 0.6, 0, 1, 0, 0, 0.76, 10, 'lyžica'],
    ['repkolej', 'Repkový olej', 'tuky', 884, 0, 100, 7.4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9.1, 10, 'lyžica'],
    ['kokosolej', 'Kokosový olej', 'tuky', 862, 0, 100, 86.5, 0, 0, 0, 1, 0.1, 0, 0, 0, 0, 0, 10, 'lyžica'],
    ['avokado', 'Avokádo', 'tuky', 160, 2, 14.7, 2.1, 8.5, 0.7, 6.7, 12, 0.6, 29, 485, 10, 0, 0.11, 170, 'ks'],
    ['mandle', 'Mandle', 'tuky', 579, 21.2, 49.9, 3.8, 21.6, 4.4, 12.5, 269, 3.7, 270, 733, 0, 0, 0.006],
    ['mandmaslo', 'Mandľové maslo', 'tuky', 614, 21, 55.5, 4.2, 18.8, 4.4, 10.3, 347, 3.5, 279, 748, 0, 0, 0.01, 15, 'lyžica'],
    ['vlassky', 'Vlašské orechy', 'tuky', 654, 15.2, 65.2, 6.1, 13.7, 2.6, 6.7, 98, 2.9, 158, 441, 1.3, 0, 9.1],
    ['kesu', 'Kešu', 'tuky', 553, 18.2, 43.9, 7.8, 30, 5.9, 3.3, 37, 6.7, 292, 660, 0.5, 0, 0.06],
    ['para', 'Para orechy', 'tuky', 659, 14.3, 67, 16, 11.7, 2.3, 7.5, 160, 2.4, 376, 659, 0.7, 0, 0.02],
    ['lieskove', 'Lieskové orechy', 'tuky', 628, 15, 60.8, 4.5, 16.7, 4.3, 9.7, 114, 4.7, 163, 680, 6.3, 0, 0.09],
    ['arasidy', 'Arašidy', 'tuky', 567, 25.8, 49.2, 6.3, 16.1, 4, 8.5, 92, 4.6, 168, 705, 0, 0, 0.003],
    ['arasmaslo', 'Arašidové maslo 100 %', 'tuky', 588, 25, 50, 10, 20, 6, 6, 43, 1.9, 154, 649, 0, 0, 0.08, 15, 'lyžica'],
    ['tahini', 'Tahini (sezamová pasta)', 'tuky', 595, 17, 53.8, 7.6, 21.2, 0.5, 9.3, 426, 8.9, 95, 414, 0, 0, 0.4, 15, 'lyžica'],
    ['sezam', 'Sezamové semienka', 'tuky', 573, 17.7, 49.7, 7, 23.4, 0.3, 11.8, 975, 14.6, 351, 468, 0, 0, 0.38, 9, 'lyžica'],
    ['mak', 'Mak', 'tuky', 525, 18, 42, 4.5, 28, 3, 19.5, 1438, 9.8, 347, 719, 1, 0, 0.27, 9, 'lyžica'],
    ['chia', 'Chia semienka', 'tuky', 486, 16.5, 30.7, 3.3, 42, 0, 34.4, 631, 7.7, 335, 407, 1.6, 0, 17.8, 12, 'lyžica'],
    ['lanove', 'Ľanové semienko (mleté)', 'tuky', 534, 18.3, 42.2, 3.7, 28.9, 1.6, 27.3, 255, 5.7, 392, 813, 0.6, 0, 22.8, 10, 'lyžica'],
    ['slnecnica', 'Slnečnicové semienka', 'tuky', 584, 20.8, 51.5, 4.5, 20, 2.6, 8.6, 78, 5.2, 325, 645, 1.4, 0, 0.07],
    ['tekvsem', 'Tekvicové semienka', 'tuky', 559, 30.2, 49, 8.7, 10.7, 1.4, 6, 46, 8.8, 592, 809, 1.9, 0, 0.12],
    ['pistacie', 'Pistácie', 'tuky', 560, 20.2, 45.3, 5.6, 27.2, 7.7, 10.6, 105, 3.9, 121, 1025, 5.6, 0, 0.25],
    ['kokossus', 'Kokos sušený', 'tuky', 660, 6.9, 64.5, 57, 23.7, 7.4, 16.3, 26, 3.3, 90, 543, 1.5, 0, 0.02],
    ['cokolada85', 'Horká čokoláda 85 %', 'tuky', 584, 10, 46, 28, 29, 14, 11, 60, 11, 228, 715, 0, 0, 0.1],
    ['kakao', 'Kakao prášok (neslad.)', 'tuky', 228, 19.6, 13.7, 8.1, 57.9, 1.8, 37, 128, 13.9, 499, 1524, 0, 0, 0.1],
    ['kokosmlieko', 'Kokosové mlieko (konzerva)', 'tuky', 230, 2.3, 24, 21, 5.5, 3.3, 2.2, 16, 3.3, 46, 263, 2.8, 0, 0.02],

    /* ---------- nemliecne alternativy ---------- */
    ['sojanapoj', 'Sójový nápoj neslad. (fortifikovaný)', 'alternativy', 33, 3.3, 1.8, 0.3, 0.6, 0.3, 0.6, 120, 0.4, 15, 120, 0, 1.5, 0.1, 250, 'hrnček'],
    ['sojanapojsl', 'Sójový nápoj sladený (fort.)', 'alternativy', 54, 3, 1.8, 0.3, 6.3, 5.3, 0.5, 120, 0.4, 15, 120, 0, 1.5, 0.1, 250, 'hrnček'],
    ['mandnapoj', 'Mandľový nápoj neslad. (fort.)', 'alternativy', 14, 0.5, 1.1, 0.1, 0.3, 0.1, 0.3, 120, 0.1, 6, 60, 0, 1.5, 0.01, 250, 'hrnček'],
    ['ovsnapoj', 'Ovsený nápoj (fort.)', 'alternativy', 45, 0.3, 1.5, 0.2, 6.6, 4, 0.8, 120, 0.1, 10, 60, 0, 1.5, 0.02, 250, 'hrnček'],
    ['kokosnapoj', 'Kokosový nápoj (fort.)', 'alternativy', 20, 0.1, 0.9, 0.9, 2.7, 1.9, 0.2, 120, 0.1, 5, 30, 0, 1.5, 0, 250, 'hrnček'],
    ['ryznapoj', 'Ryžový nápoj (fort.)', 'alternativy', 47, 0.3, 1, 0.1, 9.5, 5.5, 0.1, 120, 0.1, 6, 30, 0, 1.5, 0.01, 250, 'hrnček'],
    ['sojajogurt', 'Sójový jogurt biely (fort.)', 'alternativy', 50, 4, 2, 0.3, 2.5, 1.5, 0.6, 120, 0.4, 15, 120, 0, 1.5, 0.1, 150, 'kelímok'],
    ['kokosjogurt', 'Kokosový jogurt', 'alternativy', 100, 1, 8, 7, 5, 3, 0.5, 120, 0.3, 10, 60, 0, 1.5, 0, 150, 'kelímok'],
    ['vegansyr', 'Vegánsky syr (strúhaný)', 'alternativy', 280, 1, 22, 20, 20, 1, 1, 0, 0.3, 5, 30, 0, 0, 0.02],

    /* ---------- ostatne ---------- */
    ['med', 'Med', 'ostatne', 304, 0.3, 0, 0, 82, 82, 0.2, 6, 0.4, 2, 52, 0.5, 0, 0, 20, 'lyžica'],
    ['cukor', 'Cukor', 'ostatne', 400, 0, 0, 0, 100, 100, 0, 1, 0, 0, 2, 0, 0, 0, 5, 'čajová lyž.'],
    ['javsirup', 'Javorový sirup', 'ostatne', 260, 0, 0.1, 0, 67, 60, 0, 102, 0.1, 21, 212, 0, 0, 0, 20, 'lyžica'],
    ['kecup', 'Kečup', 'ostatne', 101, 1.3, 0.1, 0, 25.8, 21, 0.3, 15, 0.4, 13, 281, 4.1, 0, 0.01],
    ['sojomacka', 'Sójová omáčka', 'ostatne', 53, 8, 0.6, 0.1, 4.9, 0.4, 0.8, 33, 1.9, 74, 435, 0, 0, 0.01],
    ['horcica', 'Horčica', 'ostatne', 66, 4.4, 4, 0.2, 5.8, 1, 3.3, 58, 1.5, 48, 152, 1.5, 0, 0.1],
    ['balzamico', 'Balzamikový ocot', 'ostatne', 88, 0.5, 0, 0, 17, 15, 0, 27, 0.7, 12, 112, 0, 0, 0],
    ['proteinbar', 'Proteínová tyčinka (bez mliečnej)', 'ostatne', 350, 30, 10, 3, 35, 5, 8, 150, 3, 80, 300, 0, 0, 0.05, 60, 'ks'],
    ['muslibar', 'Müsli tyčinka', 'ostatne', 400, 6, 14, 4, 60, 25, 4, 60, 1.5, 50, 250, 0, 0, 0.05, 25, 'ks'],
    ['dzem', 'Džem bez pridaného cukru', 'ostatne', 145, 0.5, 0.2, 0, 34, 30, 2, 15, 0.4, 8, 80, 5, 0, 0, 20, 'lyžica'],
    ['kava', 'Čierna káva', 'ostatne', 2, 0.1, 0, 0, 0.3, 0, 0, 2, 0, 3, 49, 0, 0, 0, 200, 'šálka'],
    ['cajzeleny', 'Zelený čaj', 'ostatne', 1, 0, 0, 0, 0.2, 0, 0, 1, 0, 1, 8, 0, 0, 0, 250, 'hrnček'],
    ['pivo', 'Pivo 12°', 'ostatne', 43, 0.5, 0, 0, 3.6, 0, 0, 4, 0.02, 6, 27, 0, 0, 0, 500, 'pol litra'],
    ['vinobiele', 'Biele vino suché', 'ostatne', 82, 0.1, 0, 0, 2.6, 0.6, 0, 9, 0.3, 10, 71, 0, 0, 0, 150, 'deci'],
    ['omega3kaps', 'Omega-3 kapsula (rybí/riasový olej)', 'ostatne', 900, 0, 100, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 60, 1, 'kapsula'],
    ['kreatin', 'Kreatín monohydrát', 'ostatne', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 'odmerka'],
    ['vitd', 'Vitamín D3 (2000 IU / kapsula)', 'ostatne', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5000, 0, 1, 'kapsula'],
    ['kalciumtab', 'Vápnik tableta (500 mg)', 'ostatne', 0, 0, 0, 0, 0, 0, 0, 50000, 0, 0, 0, 0, 0, 0, 1, 'tableta']
  ];

  /* diakritiku dole a von — aby "sosovica" nasla "Šošovica" */
  function norm(s) {
    return String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 %+]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  var FOODS = RAW.map(function (r) {
    var o = { id: r[0], n: r[1], cat: r[2], per100: {} };
    COLS.forEach(function (c, i) { o.per100[c] = r[3 + i] || 0; });
    if (r.length > 17) { o.unit = r[17]; o.unitN = r[18]; }
    o.q = norm(o.n) + ' ' + norm(CATS[o.cat] || '');
    return o;
  });

  var BY_ID = {};
  FOODS.forEach(function (f) { BY_ID[f.id] = f; });

  global.FoodsDB = {
    COLS: COLS,
    CATS: CATS,
    all: FOODS,
    byId: BY_ID,
    norm: norm,
    count: FOODS.length
  };
})(window);
