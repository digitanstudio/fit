/* ============================================================================
   targets.js — z profilu a reálne zapísaného pohybu vypočíta ciele dňa.

   BMR (Mifflin–St Jeor, žena) = 10*kg + 6,25*cm - 5*rokov - 161
   základ    = BMR * NEAT (1,2 = sedavá práca)
   TDEE      = základ + kalórie zo zapísaných tréningov a chôdze toho dňa
   cieľ kcal = TDEE + prebytok (150 kcal = pomalé naberanie, chudé brucho)
   bielkoviny= 2,0 g/kg (min. 130 g)   tuky = 1,0 g/kg   uhľohydráty = zostatok
   ============================================================================ */
(function (global) {
  'use strict';

  /* ciele mikrozivin pre 26-rocnu zenu bez mliecnych vyrobkov */
  var MICROS = [
    { k: 'fib', n: 'Vláknina', u: 'g', t: 30, col: '#34d399', why: 'trávenie a sýtosť' },
    { k: 'ca', n: 'Vápnik', u: 'mg', t: 1000, col: '#60a5fa', why: 'bez mliečnych výrobkov najkritickejšia živina' },
    { k: 'fe', n: 'Železo', u: 'mg', t: 18, col: '#f87171', why: 'menštruujúca žena — energia a výkon' },
    { k: 'mg', n: 'Magnézium', u: 'mg', t: 320, col: '#a78bfa', why: 'regenerácia svalov a spánok' },
    { k: 'k', n: 'Kálium', u: 'mg', t: 3500, col: '#fbbf24', why: 'krvný tlak, sťahy svalov' },
    { k: 'vc', n: 'Vitamín C', u: 'mg', t: 90, col: '#fb923c', why: 'pomáha vstrebať železo' },
    { k: 'o3', n: 'Omega-3', u: 'g', t: 1, col: '#38bdf8', why: 'zápaly a regenerácia' },
    { k: 'vd', n: 'Vitamín D', u: 'µg', t: 10, col: '#facc15', why: 'zo stravy sa nedá pokryť — ber D3 2000 IU denne' }
  ];

  /* odkiaľ danú živinu reálne doplniť — používa to tip na karte Dnes */
  var SOURCES = {
    ca: ['tahini', 'tofu', 'sojanapoj', 'sezam', 'chia', 'mandle', 'kale', 'sardvode', 'figy', 'sojajogurt'],
    fe: ['sosred', 'tekvsem', 'hovmlete', 'spenat', 'cicer', 'kurpecen', 'tofu', 'kakao'],
    mg: ['tekvsem', 'mandle', 'chia', 'kakao', 'ovsvlocky', 'lanove', 'cokolada85'],
    k: ['banan', 'zemiaky', 'bataty', 'spenat', 'fazbiela', 'avokado', 'datle'],
    vc: ['papcerv', 'brokolica', 'kivi', 'pomaranc', 'jahody', 'kale', 'ruzkel'],
    o3: ['lanove', 'chia', 'vlassky', 'losos', 'makrela', 'omega3kaps'],
    fib: ['chia', 'lanove', 'maliny', 'sosred', 'ovsvlocky', 'cicer', 'ruzkel', 'knackebrot'],
    vd: ['vitd', 'losos', 'makrela', 'sled', 'sardvode', 'vajce'],
    p: ['kurprsg', 'tofu', 'vajprot', 'sojaizo', 'blendprot', 'tunvode', 'bielok', 'tempeh', 'morcprs']
  };

  function r5(x) { return Math.round(x / 5) * 5; }

  function bmr(p) {
    var base = 10 * p.w + 6.25 * p.h - 5 * p.age;
    return Math.round(p.sex === 'm' ? base + 5 : base - 161);
  }

  /* cista energia nad pokojovy metabolizmus z jednej treningovej jednotky */
  function sessionKcal(w, kg) {
    if (!w) return 0;
    if (w.session === 'walk') {
      var km = +w.km || 0;
      var min = +w.min || 0;
      if (!km && min) km = min / 10;          // ~6 km/h rýchla chôdza
      return Math.round(0.63 * kg * km);       // ~211 kcal / 5 km pri 67 kg
    }
    var m = +w.min || (global.ExDB.SESSIONS[w.session] ? ExDB.SESSIONS[w.session].min : 45);
    return Math.round(4.0 * kg * (m / 60));    // ~290 kcal / 65 min pri 67 kg
  }

  function activityKcal(dateIso) {
    var kg = Store.profile.w;
    return Store.workouts(dateIso).reduce(function (s, w) { return s + sessionKcal(w, kg); }, 0);
  }

  function isTrainingDay(dateIso) {
    return Store.workouts(dateIso).some(function (w) { return w.session !== 'walk'; });
  }

  function forDate(dateIso) {
    var p = Store.profile;
    var b = bmr(p);
    var base = Math.round(b * (p.neat || 1.2));
    var act = activityKcal(dateIso);
    var tdee = base + act;
    var kcal = tdee + (p.surplus || 0);

    var prot = r5(Math.max((p.pPerKg || 2) * p.w, 130));
    var fat = Math.round((p.fPerKg || 1) * p.w);

    if (p.manual) {
      kcal = p.manual.kcal || kcal;
      prot = p.manual.p || prot;
      fat = p.manual.f || fat;
    }
    var carbs = Math.max(0, Math.round((kcal - prot * 4 - fat * 9) / 4));
    if (p.manual && p.manual.c) carbs = p.manual.c;

    var t = {
      bmr: b, base: base, act: act, tdee: tdee,
      kcal: kcal,
      band: [kcal - 120, kcal + 120],
      p: prot, f: fat, c: carbs,
      training: isTrainingDay(dateIso),
      manual: !!p.manual
    };
    MICROS.forEach(function (m) { t[m.k] = m.t; });
    return t;
  }

  /* kolko gramov ktorej potraviny dorovna chybajucu zivinu.
     Radime podla kaloricke ceny, nie podla gramaze — cielom je dorovnat
     zivinu za co najmenej kalorii, aby sa ciel dna neprestrelil. */
  function suggest(key, missing, max) {
    var ids = SOURCES[key] || [];
    var out = [];
    ids.forEach(function (id) {
      var f = FoodsDB.byId[id];
      if (!f) return;
      var per100 = f.per100[key] || 0;
      if (per100 <= 0) return;
      var g = (missing / per100) * 100;
      if (g < 3 || g > 350) return;
      out.push({
        f: f,
        g: g <= 20 ? Math.round(g) : Math.round(g / 5) * 5,
        kcal: Math.round((f.per100.kcal || 0) * g / 100)
      });
    });
    out.sort(function (a, b) { return a.kcal - b.kcal; });
    return out.slice(0, max || 2);
  }

  global.Targets = {
    MICROS: MICROS,
    SOURCES: SOURCES,
    bmr: bmr,
    sessionKcal: sessionKcal,
    activityKcal: activityKcal,
    isTrainingDay: isTrainingDay,
    forDate: forDate,
    suggest: suggest
  };
})(window);
