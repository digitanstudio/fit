/* ============================================================================
   exercises-db.js — cviky a tri treningove jednotky z planu.
   g  = primarna partia (plny kredit do tyzdenneho objemu)
   g2 = sekundarna partia (polovicny kredit)
   kind: 'w' = na vahu (kg x opakovania), 't' = na cas (sekundy), 'b' = vlastna vaha
   ============================================================================ */
(function (global) {
  'use strict';

  var GROUPS = {
    zadok: { n: 'Zadok', short: 'Zadok', min: 12, max: 18, col: '#7c5cff' },
    stehna: { n: 'Stehná (predná)', short: 'Stehná', min: 8, max: 12, col: '#38bdf8' },
    zadna: { n: 'Zadná strana stehien', short: 'Zadná str.', min: 8, max: 10, col: '#34d399' },
    lytka: { n: 'Lýtka', short: 'Lýtka', min: 3, max: 6, col: '#f5a524' },
    jadro: { n: 'Jadro / pás', short: 'Jadro', min: 6, max: 12, col: '#f472b6' },
    vrch: { n: 'Vrch tela', short: 'Vrch tela', min: 6, max: 10, col: '#94a3b8' }
  };

  var EX = [
    /* ---- FITKO ---- */
    ['hipthrust_bar', 'Hip thrust s osou', 'zadok', '', 'w', 4, '6–10', 'Hlavný cvik na zadok. Brada k hrudi, panvu dotlač do plného výkmitu a na vrchu stlač zadok na 1 s.'],
    ['rdl_bar', 'Rumunský mŕtvy tah s osou', 'zadok', 'zadna', 'w', 3, '8–10', 'Kolená mierne pokrčené, os ťahaj po stehnách, dole cíť zadnú stranu — nie kríže.'],
    ['legpress', 'Leg press / hack drep', 'stehna', 'zadok', 'w', 3, '10–12', 'Chodidlá vyššie a širšie = viac zadok. Nezamykaj kolená na vrchu.'],
    ['bulgarian', 'Bulharský drep s jednoručkami', 'stehna', 'zadok', 'w', 3, '8–10 / nohu', 'Predkloň trup o ~20° — tým presuneš prácu z kolena do zadku.'],
    ['abduction', 'Stroj na abdukciu (odťahovanie)', 'zadok', '', 'w', 3, '15–20', 'Mierny predklon trupu zapojí horný zadok (gluteus medius) — ten tvaruje bok.'],
    ['legext', 'Predkopávanie', 'stehna', '', 'w', 2, '12–15', 'Posledné 2 série do takmer zlyhania, hore 1 s zadrž.'],
    ['latpull', 'Sťahovanie kladky na hrudník', 'vrch', '', 'w', 2, '10', 'Širší chrbát opticky zužuje pás.'],

    /* ---- DOMA A: zadok ---- */
    ['hipthrust_db', 'Hip thrust s činkou (lopatky na pohovke)', 'zadok', '', 'w', 4, '12–15', 'Činku drž na panve cez zrolovaný uterák. Tempo 2 s dole, 1 s stlačiť.'],
    ['rdl_db', 'Rumunský mŕtvy tah s jednoručkami', 'zadok', 'zadna', 'w', 4, '10–12', 'Činky po stranách alebo pred stehnami, zadok dozadu, chrbát rovný.'],
    ['revlunge', 'Zakročný výpad s činkami', 'stehna', 'zadok', 'w', 3, '10–12 / nohu', 'Krok dozadu je k zadku šetrnejší ku kolenám než výkrok vpred.'],
    ['sl_bridge', 'Jednonožný glute bridge', 'zadok', '', 'b', 3, '12–15 / nohu', 'Druhú nohu pritiahni k hrudi, aby sa nezapájala zadná strana.'],
    ['band_abd', 'Abdukcia s gumou', 'zadok', '', 'b', 3, '20–25', 'Guma nad kolenami. Stojaci na jednej nohe alebo na boku na zemi.'],
    ['band_pull', 'Pull-through / kickback s gumou', 'zadok', '', 'b', 2, '20', 'Na konci pohybu výdrž 1 s — tu sa zadok najviac zapája.'],
    ['db_row', 'Veslovanie s činkami v predklone', 'vrch', '', 'w', 3, '10', 'Lopatky stiahni k sebe, lokte popri tele.'],
    ['db_press', 'Tlak s činkami nad hlavu', 'vrch', '', 'w', 3, '10', 'Rebrá dole, nevyklenuj kríže.'],

    /* ---- DOMA B: stehna, zadna strana, jadro ---- */
    ['goblet', 'Goblet drep', 'stehna', 'zadok', 'w', 4, '10–15', 'Činku drž pri hrudi, kolená von, choď tak hlboko, ako udržíš rovný chrbát.'],
    ['stepup', 'Výstupy na stoličku s činkami', 'stehna', 'zadok', 'w', 3, '12 / nohu', 'Nepomáhaj si odrazom spodnej nohy — celú prácu nechaj hornej.'],
    ['band_curl', 'Zakopávanie s gumou / nordic curl', 'zadna', '', 'b', 3, '8–12', 'Nordic curl rob len excentricky (pomaly dole) — aj 5 s stačí.'],
    ['calf', 'Výpony na špičky', 'lytka', '', 'w', 3, '15–20', 'Hore 1 s, dole až do plného natiahnutia.'],
    ['deadbug', 'Dead bug', 'jadro', '', 't', 3, '10 / stranu', 'Kríže pritlač k zemi po celý čas — to je celý cvik.'],
    ['pallof', 'Pallof press s gumou', 'jadro', '', 't', 3, '12 / stranu', 'Anti-rotácia: pás sa spevní, ale nezhrubne.'],
    ['hollow', 'Hollow hold', 'jadro', '', 't', 3, '20–30 s', 'Keď sa zdvihnú kríže, skonči sériu.'],
    ['sideplank', 'Bočný plank', 'jadro', '', 't', 3, '30 s / stranu', 'Bez zaťaženia — zaťažené úklony pás rozširujú.']
  ];

  var SESSIONS = {
    gym: {
      n: 'Fitko', sub: 'ťažký deň na zadok a nohy', min: 65, icon: 'G',
      ex: ['hipthrust_bar', 'rdl_bar', 'legpress', 'bulgarian', 'abduction', 'legext', 'latpull']
    },
    homeA: {
      n: 'Doma A', sub: 'zadok + vrch tela', min: 45, icon: 'A',
      ex: ['hipthrust_db', 'rdl_db', 'revlunge', 'sl_bridge', 'band_abd', 'band_pull', 'db_row', 'db_press']
    },
    homeB: {
      n: 'Doma B', sub: 'stehná, zadná strana + jadro', min: 45, icon: 'B',
      ex: ['goblet', 'bulgarian', 'stepup', 'band_curl', 'calf', 'deadbug', 'pallof', 'hollow', 'sideplank']
    },
    walk: { n: 'Chôdza', sub: '5 km v prírode', min: 50, icon: 'CH', ex: [] }
  };

  /* odporucany tyzdenny rozvrh (0 = nedela, kvoli Date.getDay) */
  var PLAN = { 1: 'gym', 2: 'walk', 3: 'homeA', 4: 'walk', 5: 'homeB', 6: 'walk', 0: 'walk' };

  var LIST = EX.map(function (r) {
    return { id: r[0], n: r[1], g: r[2], g2: r[3] || '', kind: r[4], sets: r[5], reps: r[6], note: r[7] };
  });
  var BY_ID = {};
  LIST.forEach(function (e) { BY_ID[e.id] = e; });

  global.ExDB = {
    GROUPS: GROUPS,
    SESSIONS: SESSIONS,
    PLAN: PLAN,
    all: LIST,
    byId: BY_ID
  };
})(window);
