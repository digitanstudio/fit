/* ============================================================================
   stats.js — agregacia za den / tyzden / mesiac a slovne vyhodnotenie.
   Pravidla hodnotenia su tu zapisane explicitne, aby sa dali lahko doladit.
   ============================================================================ */
(function (global) {
  'use strict';

  var h = UI.h, esc = UI.esc;
  var G = ExDB.GROUPS;

  var DOW = ['ne', 'po', 'ut', 'st', 'št', 'pi', 'so'];

  function datesBetween(fromIso, toIso) {
    var out = [], d = fromIso;
    var guard = 0;
    while (d <= toIso && guard++ < 400) { out.push(d); d = Store.shift(d, 1); }
    return out;
  }

  function hasFood(dateIso) {
    var d = Store.state.days[dateIso];
    if (!d) return false;
    return Store.SLOTS.some(function (s) { return (d.meals[s] || []).length > 0; });
  }

  /* ---------- agregat za obdobie ---------- */
  function agg(fromIso, toIso) {
    var today = Store.today();
    var end = toIso > today ? today : toIso;
    var dates = datesBetween(fromIso, end);

    var a = {
      from: fromIso, to: end, dates: dates,
      days: [],
      logged: 0,
      kcal: 0, p: 0, f: 0, c: 0, fib: 0, ca: 0, fe: 0, mg: 0, k: 0, vc: 0, vd: 0, o3: 0,
      tdee: 0, kcalTarget: 0,
      proteinHit: 0, inBand: 0, over: 0, under: 0,
      strength: 0, walks: 0, km: 0, volume: 0, sets: 0
    };

    dates.forEach(function (d) {
      var t = Targets.forDate(d);
      var n = Food.dayTotals(d);
      var ws = Store.workouts(d);
      var food = hasFood(d);

      var vol = 0, setCount = 0;
      ws.forEach(function (w) {
        if (w.session === 'walk') { a.walks++; a.km += +w.km || 0; return; }
        a.strength++;
        vol += Training.workoutVolume(w);
        setCount += (w.entries || []).reduce(function (s, e) { return s + (e.sets || []).length; }, 0);
      });
      a.volume += vol; a.sets += setCount;

      a.tdee += t.tdee; a.kcalTarget += t.kcal;

      if (food) {
        a.logged++;
        ['kcal', 'p', 'f', 'c', 'fib', 'ca', 'fe', 'mg', 'k', 'vc', 'vd', 'o3'].forEach(function (key) {
          a[key] += n[key] || 0;
        });
        if (n.p >= t.p * 0.95) a.proteinHit++;
        if (n.kcal < t.band[0]) a.under++;
        else if (n.kcal > t.band[1]) a.over++;
        else a.inBand++;
      }

      a.days.push({ d: d, t: t, n: n, food: food, vol: vol, sets: setCount, ws: ws });
    });

    a.avg = {};
    ['kcal', 'p', 'f', 'c', 'fib', 'ca', 'fe', 'mg', 'k', 'vc', 'vd', 'o3'].forEach(function (key) {
      a.avg[key] = a.logged ? a[key] / a.logged : 0;
    });
    a.avgTdee = dates.length ? a.tdee / dates.length : 0;
    a.avgTarget = dates.length ? a.kcalTarget / dates.length : 0;
    a.surplus = a.avg.kcal - a.avgTdee;
    return a;
  }

  /* ---------- pravidla vyhodnotenia ---------- */
  /* vsetky prepocitane na 7 dni, aby mesiac a tyzden boli porovnatelne */
  function verdict(a, weeks) {
    var w = weeks || 1;
    var out = [];
    function line(state, text) { out.push({ s: state, t: text }); }

    if (!a.logged) {
      return { lines: [{ s: 'm', t: 'V tomto období nemáš zapísané žiadne jedlo — nedá sa to vyhodnotiť.' }], score: 0, max: 1 };
    }

    /* 1. bielkoviny */
    var pRate = a.proteinHit / a.logged;
    line(pRate >= 0.7 ? 'y' : (pRate >= 0.5 ? 'm' : 'n'),
      'Bielkoviny dosiahnuté <b>' + a.proteinHit + ' / ' + a.logged + '</b> zapísaných dní' +
      (pRate >= 0.7 ? ' — to je presne to, čo rast svalu potrebuje.' :
        ' — cieľ je aspoň 5 zo 7 dní. Bez bielkovín sa z prebytku kalórií stane tuk.'));

    /* 2. kaloricke pasmo a prebytok */
    var sur = a.avg.kcal - a.avgTdee;
    var surOk = sur >= 50 && sur <= 300;
    line(surOk ? 'y' : 'n',
      'Priemerný prebytok <b>' + (sur >= 0 ? '+' : '') + UI.n0(sur) + ' kcal</b> nad výdajom' +
      (surOk ? ' — ideálne pomalé naberanie.' :
        (sur < 50 ? ' — je to málo, sval z toho nevyrastie. Pridaj si k dňu 150–250 kcal.'
          : ' — privysoko, časť pôjde do tuku. Uber ~' + UI.n0(sur - 200) + ' kcal denne.')));

    /* 3. objem na zadok */
    var gl = a.setsByGroup ? a.setsByGroup.zadok : 0;
    var glWk = gl / w;
    line(glWk >= G.zadok.min ? 'y' : (glWk >= G.zadok.min * 0.6 ? 'm' : 'n'),
      '<b>' + UI.nx(glWk, 1) + ' sérií</b> na zadok za týždeň (cieľ ' + G.zadok.min + '–' + G.zadok.max + ')' +
      (glWk >= G.zadok.min ? ' — hlavná páka na tvoj cieľ je pokrytá.' : ' — tu sa rozhoduje, či zadok vyrastie.'));

    /* 4. silove treningy */
    var stWk = a.strength / w;
    line(stWk >= 2.7 ? 'y' : (stWk >= 1.7 ? 'm' : 'n'),
      '<b>' + UI.nx(stWk, 1) + ' silových tréningov</b> za týždeň (plán: 3 — fitko + Doma A + Doma B)');

    /* 5. chodza */
    var wkWk = a.walks / w;
    line(wkWk >= 3.5 ? 'y' : (wkWk >= 2 ? 'm' : 'n'),
      '<b>' + UI.nx(wkWk, 1) + ' chôdzí</b> za týždeň, celkom ' + UI.nx(a.km, 1) + ' km');

    /* 6. vlaknina */
    line(a.avg.fib >= 25 ? 'y' : 'm',
      'Vláknina v priemere <b>' + UI.n1(a.avg.fib) + ' g</b> denne (cieľ 30 g)');

    /* 7. vapnik — bez mliecnych vyrobkov najcastejsia diera */
    line(a.avg.ca >= 800 ? 'y' : (a.avg.ca >= 600 ? 'm' : 'n'),
      'Vápnik v priemere <b>' + UI.n0(a.avg.ca) + ' mg</b> denne (cieľ 1000 mg)' +
      (a.avg.ca < 800 ? ' — pridaj tahini, kalciové tofu, fortifikovaný sójový nápoj alebo mak.' : ''));

    var score = out.filter(function (x) { return x.s === 'y'; }).length;
    return { lines: out, score: score, max: out.length };
  }

  function summaryText(v, a) {
    if (!a.logged) return { cls: '', t: 'Zapíš si aspoň jeden deň jedla a vyhodnotenie sa tu objaví samo.' };
    if (a.logged < 3) {
      return {
        cls: '',
        t: 'Zatiaľ máš zapísané ' + a.logged + (a.logged === 1 ? ' deň' : ' dni') +
          ' — na poctivé hodnotenie treba aspoň 3–4. Body vyššie ber zatiaľ len ako orientáciu.'
      };
    }
    if (v.score >= v.max - 1) {
      return { cls: 'good', t: 'Ideš presne na naberanie svalu, nie tuku. Takto pokračuj — zmenu na zadku a stehnách uvidíš za 3–4 mesiace.' };
    }
    if (v.score >= Math.ceil(v.max * 0.6)) {
      return { cls: '', t: 'Základ máš dobrý. Doladením dvoch–troch červených bodov vyššie zrýchliš progres bez toho, aby pribúdal tuk.' };
    }
    return { cls: 'bad', t: 'Takto to k svalnatému zadku nevedie. Začni dvoma vecami: dosiahni bielkoviny každý deň a zapíš 3 silové tréningy za týždeň. Ostatné doladíš potom.' };
  }

  /* ---------- vykreslenie karty Prehlad ---------- */
  var mode = 'tyzden';

  function renderView(root, dateIso) {
    root.innerHTML = '';

    var seg = h('<div class="seg"></div>');
    [['den', 'Deň'], ['tyzden', 'Týždeň'], ['mesiac', 'Mesiac']].forEach(function (m) {
      var b = h('<button type="button"' + (mode === m[0] ? ' class="on"' : '') + '>' + m[1] + '</button>');
      b.onclick = function () { mode = m[0]; renderView(root, dateIso); };
      seg.appendChild(b);
    });
    root.appendChild(seg);

    var r, weeks, label;
    if (mode === 'den') { r = { from: dateIso, to: dateIso }; weeks = 1 / 7; }
    else if (mode === 'tyzden') { r = Training.weekRange(dateIso); weeks = 1; }
    else { r = { from: Store.shift(dateIso, -29), to: dateIso }; weeks = 30 / 7; }

    var a = agg(r.from, r.to);
    a.setsByGroup = Training.setsByGroup(r.from, r.to);

    var dFrom = Store.toDate(a.from), dTo = Store.toDate(a.to);
    label = mode === 'den'
      ? dFrom.getDate() + '. ' + (dFrom.getMonth() + 1) + '. ' + dFrom.getFullYear()
      : dFrom.getDate() + '. ' + (dFrom.getMonth() + 1) + '. – ' + dTo.getDate() + '. ' + (dTo.getMonth() + 1) + '.';

    /* --- KPI --- */
    var kcard = h('<div class="card"><div class="card-h"><h2>' +
      (mode === 'den' ? 'Tento deň' : mode === 'tyzden' ? 'Tento týždeň' : 'Posledných 30 dní') +
      '</h2><small>' + esc(label) + '</small></div></div>');
    var kpis = h('<div class="kpis"></div>');
    function kpi(val, lab) { kpis.appendChild(h('<div class="kpi"><b>' + val + '</b><small>' + lab + '</small></div>')); }

    if (mode === 'den') {
      var t0 = Targets.forDate(dateIso), n0 = Food.dayTotals(dateIso);
      kpi(UI.n0(n0.kcal) + ' <span class="sub">/ ' + UI.n0(t0.kcal) + '</span>', 'kcal zjedené / cieľ');
      kpi(UI.n1(n0.p) + ' <span class="sub">/ ' + t0.p + ' g</span>', 'bielkoviny');
      kpi(UI.n0(t0.act) + ' kcal', 'spálené pohybom');
      kpi(UI.n0(a.volume) + ' kg', 'objem tréningu');
    } else {
      kpi(UI.n0(a.avg.kcal), 'priemer kcal / deň' + (a.logged < a.dates.length ? ' (' + a.logged + ' zapísaných dní)' : ''));
      kpi(UI.n1(a.avg.p) + ' g', 'priemer bielkovín / deň');
      kpi((a.surplus >= 0 ? '+' : '') + UI.n0(a.avg.kcal - a.avgTdee), 'prebytok nad výdajom');
      kpi(a.proteinHit + ' / ' + a.logged, 'dní s dosiahnutými bielkovinami');
      kpi(a.inBand + ' / ' + a.logged, 'dní v kalorickom pásme');
      kpi(UI.nx(a.setsByGroup.zadok / weeks, 1), 'sérií na zadok / týždeň');
      kpi(a.strength + ' + ' + a.walks, 'silových tréningov + chôdzí');
      kpi(UI.nx(a.km, 1) + ' km', 'nachodené');
    }
    kcard.appendChild(kpis);
    root.appendChild(kcard);

    /* --- graf kcal po dnoch --- */
    if (mode !== 'den') {
      var gc = h('<div class="card"><div class="card-h"><h2>Kalórie po dňoch</h2><small>čiarka = cieľ</small></div></div>');
      var data = a.days.map(function (x) {
        var col = !x.food ? 'var(--surf3)'
          : x.n.kcal > x.t.band[1] ? 'var(--bad)'
            : x.n.kcal < x.t.band[0] ? 'var(--warn)' : 'var(--ok)';
        var dt = Store.toDate(x.d);
        return {
          value: x.n.kcal,
          label: mode === 'tyzden' ? DOW[dt.getDay()] : (dt.getDate() + '.'),
          color: col,
          title: x.d + ': ' + Math.round(x.n.kcal) + ' / ' + x.t.kcal + ' kcal'
        };
      });
      gc.appendChild(Charts.bars({ data: data, target: a.avgTarget, height: 118 }));
      gc.appendChild(h('<div class="tip"><div>Zelená = v pásme ±120 kcal, oranžová = pod cieľom, červená = nad. ' +
        'Jeden deň nad cieľom nič nepokazí — rozhoduje priemer.</div></div>'));
      root.appendChild(gc);

      /* --- graf bielkovin --- */
      var pc = h('<div class="card"><div class="card-h"><h2>Bielkoviny po dňoch</h2><small>čiarka = cieľ ' +
        Targets.forDate(dateIso).p + ' g</small></div></div>');
      pc.appendChild(Charts.bars({
        data: a.days.map(function (x) {
          var dt = Store.toDate(x.d);
          return {
            value: x.n.p,
            label: mode === 'tyzden' ? DOW[dt.getDay()] : (dt.getDate() + '.'),
            color: x.food ? (x.n.p >= x.t.p * 0.95 ? 'var(--p)' : 'var(--surf3)') : 'var(--surf3)'
          };
        }),
        target: Targets.forDate(dateIso).p, height: 100
      }));
      root.appendChild(pc);
    }

    /* --- pas dni --- */
    if (mode === 'tyzden') {
      var sc = h('<div class="card"><div class="card-h"><h2>Dni v týždni</h2></div></div>');
      var strip = h('<div class="strip"></div>');
      a.days.forEach(function (x) {
        var dt = Store.toDate(x.d);
        var el = h('<div class="sday' + (x.d === Store.today() ? ' today' : '') + '"><small>' +
          DOW[dt.getDay()] + ' ' + dt.getDate() + '.</small><b>' + (x.food ? UI.n0(x.n.kcal) : '–') + '</b>' +
          '<div class="dots"><i></i><i></i></div></div>');
        var dots = UI.$$('i', UI.$('.dots', el));
        if (x.food && x.n.p >= x.t.p * 0.95) dots[0].style.background = 'var(--p)';
        if (x.ws.some(function (w) { return w.session !== 'walk'; })) dots[1].style.background = 'var(--acc)';
        else if (x.ws.length) dots[1].style.background = 'var(--fib)';
        strip.appendChild(el);
      });
      sc.appendChild(strip);
      sc.appendChild(h('<div class="tip"><div>Prvá bodka = bielkoviny dosiahnuté, druhá = silový tréning (fialová) alebo chôdza (zelená).</div></div>'));
      root.appendChild(sc);
    }

    /* --- objem na partiu --- */
    if (mode !== 'den') {
      root.appendChild(h('<div class="sec-t">Série na partiu' + (mode === 'mesiac' ? ' (celkom za 30 dní)' : '') + '</div>'));
      var vcard = h('<div class="card"></div>');
      var box = h('<div class="volbar"></div>');
      Object.keys(G).forEach(function (gk) {
        var g = G[gk];
        var v = a.setsByGroup[gk] || 0;
        var per = v / weeks;
        var pct = Math.min(100, (per / g.max) * 100);
        var row = h('<div class="volrow"><span>' + esc(g.short) + '</span><span class="vb"><i></i><u></u></span>' +
          '<em>' + UI.nx(per, 1) + ' / tž</em></div>');
        var fill = UI.$('i', row);
        fill.style.width = pct.toFixed(1) + '%';
        fill.style.background = per >= g.min ? g.col : 'var(--surf3)';
        UI.$('u', row).style.left = Math.min(100, (g.min / g.max) * 100).toFixed(1) + '%';
        box.appendChild(row);
      });
      vcard.appendChild(box);
      root.appendChild(vcard);

      /* --- trend objemu --- */
      if (mode === 'mesiac') {
        var tc = h('<div class="card"><div class="card-h"><h2>Trend objemu tréningu</h2><small>kg za deň</small></div></div>');
        var vd = a.days.filter(function (x) { return x.vol > 0; }).map(function (x) {
          var dt = Store.toDate(x.d);
          return { value: x.vol, label: dt.getDate() + '.' };
        });
        tc.appendChild(Charts.line({ data: vd, height: 110, empty: 'Na trend treba aspoň dva zapísané tréningy.' }));
        tc.appendChild(h('<div class="tip"><div>Objem = súčet váha × opakovania. Ak krivka dlhodobo stúpa, ' +
          'progresívne preťažovanie funguje a sval má dôvod rásť.</div></div>'));
        root.appendChild(tc);
      }
    }

    /* --- mikroziviny --- */
    var mc = h('<div class="card"><div class="card-h"><h2>Živiny ' +
      (mode === 'den' ? 'tento deň' : 'v priemere na deň') + '</h2></div></div>');
    var src = mode === 'den' ? Food.dayTotals(dateIso) : a.avg;
    var mb = h('<div class="bars"></div>');
    Targets.MICROS.forEach(function (m) {
      mb.appendChild(UI.bar(m.n, src[m.k] || 0, m.t, m.u, m.col));
    });
    mc.appendChild(mb);
    mc.appendChild(h('<div class="tip"><div><b>Vitamín D</b> sa zo stravy pokryť nedá — od októbra do apríla ber ' +
      'D3 2000 IU denne. K tomu <b>kreatín 3–5 g</b> denne: najlepšie overený doplnok na silu a rast svalu, vegánsky.</div></div>'));
    root.appendChild(mc);

    /* --- hodnotenie --- */
    root.appendChild(h('<div class="sec-t">Hodnotenie</div>'));
    var v = verdict(a, mode === 'den' ? 1 / 7 : weeks);
    var vc2 = h('<div class="card"></div>');
    var vb = h('<div class="verdict"></div>');
    v.lines.forEach(function (l) {
      vb.appendChild(h('<div class="vline"><i class="' + l.s + '">' +
        (l.s === 'y' ? '✓' : l.s === 'n' ? '!' : '~') + '</i><div>' + l.t + '</div></div>'));
    });
    vc2.appendChild(vb);
    var s = summaryText(v, a);
    vc2.appendChild(h('<div class="summary ' + s.cls + '" style="margin-top:12px">' + esc(s.t) + '</div>'));
    root.appendChild(vc2);
  }

  global.Stats = {
    agg: agg,
    verdict: verdict,
    hasFood: hasFood,
    datesBetween: datesBetween,
    renderView: renderView,
    get mode() { return mode; },
    set mode(m) { mode = m; }
  };
})(window);
