/* ============================================================================
   training.js — dennik treningu. Navrhnute na pouzitie v posilnovni:
   velke steppery namiesto pisania, "rovnako ako naposledy", casovac prestavky
   a pri kazdom cviku je vidiet, co treba prekonat.
   ============================================================================ */
(function (global) {
  'use strict';

  var h = UI.h, esc = UI.esc, $ = UI.$;
  var G = ExDB.GROUPS, S = ExDB.SESSIONS;

  /* ---------- pomocne ---------- */
  function exMeta(entry) {
    var e = ExDB.byId[entry.exId];
    return {
      n: entry.n || (e ? e.n : entry.exId),
      g: entry.g || (e ? e.g : ''),
      g2: entry.g2 || (e ? e.g2 : ''),
      kind: entry.kind || (e ? e.kind : 'w'),
      reps: e ? e.reps : '',
      sets: e ? e.sets : 3,
      note: e ? e.note : ''
    };
  }

  function e1rm(s) {
    var kg = +s.kg || 0, reps = +s.reps || 0;
    if (!kg || !reps) return 0;
    return kg * (1 + reps / 30);
  }

  function setLabel(s, kind) {
    if (kind === 't') return (s.reps || 0) + ' s';
    if (!s.kg) return (s.reps || 0) + '×';
    return UI.nx(s.kg, 1) + ' kg × ' + (s.reps || 0);
  }

  function entryVolume(entry) {
    return (entry.sets || []).reduce(function (t, s) { return t + (+s.kg || 0) * (+s.reps || 0); }, 0);
  }

  function workoutVolume(w) {
    return (w.entries || []).reduce(function (t, e) { return t + entryVolume(e); }, 0);
  }

  function prevBest(exId, dateIso) {
    var lp = Store.lastPerf(exId, dateIso);
    if (!lp) return null;
    var best = 0;
    lp.sets.forEach(function (s) { best = Math.max(best, e1rm(s)); });
    return { date: lp.date, sets: lp.sets, best: best };
  }

  function prevText(exId, dateIso) {
    var lp = Store.lastPerf(exId, dateIso);
    if (!lp) return '';
    var kinds = {};
    lp.sets.forEach(function (s) {
      var key = (s.kg || 0) + '|' + (s.reps || 0);
      kinds[key] = (kinds[key] || 0) + 1;
    });
    var parts = Object.keys(kinds).map(function (k) {
      var p = k.split('|');
      var n = kinds[k];
      return (n > 1 ? n + '× ' : '') + (+p[0] ? UI.nx(+p[0], 1) + ' kg × ' + p[1] : p[1] + '×');
    });
    var d = Store.toDate(lp.date);
    return parts.join(' · ') + ' (' + d.getDate() + '. ' + (d.getMonth() + 1) + '.)';
  }

  /* ---------- tyzdenny objem serii na partiu ---------- */
  /* primarna partia = 1 seria, sekundarna = 0,5 serie */
  function setsByGroup(fromIso, toIso) {
    var out = {};
    Object.keys(G).forEach(function (k) { out[k] = 0; });
    Object.keys(Store.state.workouts).forEach(function (d) {
      if (d < fromIso || d > toIso) return;
      Store.workouts(d).forEach(function (w) {
        (w.entries || []).forEach(function (e) {
          var m = exMeta(e);
          var n = (e.sets || []).length;
          if (!n) return;
          if (m.g && out[m.g] !== undefined) out[m.g] += n;
          if (m.g2 && out[m.g2] !== undefined) out[m.g2] += n * 0.5;
        });
      });
    });
    return out;
  }

  /* ---------- zacatie jednotky ---------- */
  function startSession(dateIso, key) {
    if (key === 'walk') { openWalk(dateIso); return; }
    var def = S[key];
    var w = {
      session: key,
      min: def.min,
      entries: def.ex.map(function (id) {
        var e = ExDB.byId[id];
        return { exId: id, n: e.n, g: e.g, g2: e.g2, kind: e.kind, sets: [] };
      })
    };
    Store.addWorkout(dateIso, w);
    UI.toast(def.n + ' pripravené — zapisuj série.');
  }

  /* ---------- chodza ---------- */
  function openWalk(dateIso, wIdx) {
    var exist = wIdx != null ? Store.workouts(dateIso)[wIdx] : null;
    UI.sheet({
      title: 'Chôdza',
      sub: '4× týždenne 5 km je presne to, čo plán chce — nenavyšuj to.',
      build: function (b) {
        var km = UI.stepper({ value: exist ? exist.km : 5, step: 0.5, min: 0, max: 60, dec: 1 });
        var min = UI.stepper({ value: exist ? exist.min : 50, step: 5, min: 0, max: 400 });
        b.appendChild(UI.field('Kilometre', km));
        b.appendChild(UI.field('Minúty', min));
        var info = h('<div class="tip"><div>Pripočíta sa ti k dennému cieľu kalórií, takže môžeš zjesť viac.</div></div>');
        b.appendChild(info);
        var ok = h('<button class="btn pri">' + (exist ? 'Uložiť' : 'Zapísať chôdzu') + '</button>');
        ok.onclick = function () {
          var data = { session: 'walk', km: km.getValue(), min: min.getValue(), entries: [] };
          if (exist) { Object.assign(exist, data); Store.touch(); }
          else Store.addWorkout(dateIso, data);
          UI.close();
          UI.toast('Zapísané: ' + UI.nx(data.km, 1) + ' km · +' + Targets.sessionKcal(data, Store.profile.w) + ' kcal');
        };
        b.appendChild(ok);
        if (exist) {
          var del = h('<button class="btn dan">Odstrániť zápis</button>');
          del.onclick = function () { Store.removeWorkout(dateIso, wIdx); UI.close(); };
          b.appendChild(del);
        }
      }
    });
  }

  /* ---------- zapis serie ---------- */
  function openSet(dateIso, wIdx, eIdx) {
    var w = Store.workouts(dateIso)[wIdx];
    if (!w) return;
    var entry = w.entries[eIdx];
    var m = exMeta(entry);
    var pb = prevBest(entry.exId, dateIso);

    /* predvolba: posledna zapisana seria dnes, inak posledna z minula */
    function seed() {
      var last = (entry.sets || [])[entry.sets.length - 1];
      if (last) return { kg: last.kg, reps: last.reps };
      if (pb && pb.sets.length) return { kg: pb.sets[pb.sets.length - 1].kg, reps: pb.sets[pb.sets.length - 1].reps };
      return { kg: m.kind === 'w' ? 10 : 0, reps: m.kind === 't' ? 30 : 10 };
    }

    UI.sheet({
      title: m.n,
      sub: 'Plán: ' + m.sets + ' × ' + m.reps + (pb ? ' · naposledy ' + prevText(entry.exId, dateIso) : ' · prvý raz'),
      build: function (b) {
        var sd = seed();
        var kgStp = UI.stepper({ value: sd.kg || 0, step: 2.5, min: 0, max: 400, dec: 1 });
        var repStp = UI.stepper({ value: sd.reps || 10, step: m.kind === 't' ? 5 : 1, min: 1, max: 600 });

        if (m.kind !== 't') b.appendChild(UI.field('Váha (kg) — 0 = vlastná váha alebo guma', kgStp));
        b.appendChild(UI.field(m.kind === 't' ? 'Sekundy' : 'Opakovania', repStp));
        if (m.kind === 't') { kgStp.setValue(0, true); }

        if (m.note) b.appendChild(h('<div class="tip"><div>' + esc(m.note) + '</div></div>'));

        var done = h('<div class="ex-sets" style="padding:0"></div>');
        b.appendChild(done);

        function paintDone() {
          done.innerHTML = '';
          (entry.sets || []).forEach(function (s, i) {
            var bd = h('<button class="sbadge' + (s.pr ? ' pr' : '') + '">' + esc(setLabel(s, m.kind)) + '</button>');
            bd.title = 'Ťuknutím odstrániš sériu';
            bd.onclick = function () { entry.sets.splice(i, 1); Store.touch(); paintDone(); };
            done.appendChild(bd);
          });
          if (!(entry.sets || []).length) {
            done.appendChild(h('<small style="color:var(--mut)">Ešte žiadna séria v tomto cviku.</small>'));
          }
        }
        paintDone();

        var log = h('<button class="btn pri">Zapísať sériu</button>');
        log.onclick = function () {
          var s = { kg: kgStp.getValue(), reps: repStp.getValue() };
          if (pb && e1rm(s) > pb.best && pb.best > 0) s.pr = true;
          entry.sets = entry.sets || [];
          entry.sets.push(s);
          Store.touch();
          paintDone();
          UI.restStart(Store.settings.rest || 120);
          if (s.pr) UI.toast('Osobný rekord! ' + setLabel(s, m.kind));
        };
        b.appendChild(log);

        if (pb) {
          var same = h('<button class="btn">Rovnako ako naposledy (' + pb.sets.length + ' sérií)</button>');
          same.onclick = function () {
            entry.sets = pb.sets.map(function (s) { return { kg: s.kg, reps: s.reps }; });
            Store.touch(); paintDone();
            UI.toast('Predvyplnené — dolaď, čo bolo inak.');
          };
          b.appendChild(same);
        }

        var fin = h('<button class="btn gho">Hotovo</button>');
        fin.onclick = UI.close;
        b.appendChild(fin);
      }
    });
  }

  /* ---------- pridanie cviku do jednotky ---------- */
  function openAddExercise(dateIso, wIdx) {
    UI.sheet({
      title: 'Pridať cvik',
      build: function (b) {
        var inp = h('<input type="search" placeholder="Hľadaj cvik…" autocomplete="off">');
        b.appendChild(inp);
        var lst = h('<div class="lst"></div>');
        b.appendChild(lst);

        function paint() {
          var q = FoodsDB.norm(inp.value);
          lst.innerHTML = '';
          ExDB.all.filter(function (e) { return !q || FoodsDB.norm(e.n).indexOf(q) >= 0; })
            .forEach(function (e) {
              var row = h('<button class="li"><div class="li-mid"><b>' + esc(e.n) + '</b><small>' +
                esc(G[e.g] ? G[e.g].n : '') + ' · ' + e.sets + ' × ' + esc(e.reps) + '</small></div></button>');
              row.onclick = function () {
                var w = Store.workouts(dateIso)[wIdx];
                w.entries.push({ exId: e.id, n: e.n, g: e.g, g2: e.g2, kind: e.kind, sets: [] });
                Store.touch(); UI.close();
              };
              lst.appendChild(row);
            });
        }
        inp.oninput = paint;
        paint();
      }
    });
  }

  /* ---------- vykreslenie karty Trening ---------- */
  function renderView(root, dateIso) {
    root.innerHTML = '';

    var list = Store.workouts(dateIso);
    var dow = Store.toDate(dateIso).getDay();
    var planKey = ExDB.PLAN[dow];

    /* 1) volba jednotky */
    var pick = h('<div class="card"><div class="card-h"><h2>Zapísať tréning</h2><small>plán na dnes: ' +
      esc(S[planKey].n) + '</small></div></div>');
    var pb = h('<div class="row-btns"></div>');
    ['gym', 'homeA', 'homeB', 'walk'].forEach(function (k) {
      var b = h('<button class="btn sm' + (k === planKey ? ' pri' : '') + '">' + esc(S[k].n) + '</button>');
      b.onclick = function () { startSession(dateIso, k); };
      pb.appendChild(b);
    });
    pick.appendChild(pb);
    root.appendChild(pick);

    /* 2) zapisane jednotky */
    if (!list.length) {
      root.appendChild(h('<div class="card"><div class="empty">V tento deň ešte nemáš zápis.<br>' +
        'Vyber jednotku vyššie — cviky sa predvyplnia z plánu.</div></div>'));
    }

    list.forEach(function (w, wIdx) {
      var def = S[w.session] || { n: w.session, sub: '' };
      var card = h('<div class="card"></div>');
      var kc = Targets.sessionKcal(w, Store.profile.w);

      if (w.session === 'walk') {
        var wh = h('<div class="card-h"><h2>Chôdza</h2><small>' + UI.nx(w.km || 0, 1) + ' km · ' +
          (w.min || 0) + ' min · +' + kc + ' kcal</small></div>');
        var ed = h('<button class="li-x" aria-label="Upraviť">✎</button>');
        ed.onclick = function () { openWalk(dateIso, wIdx); };
        wh.appendChild(ed);
        card.appendChild(wh);
        root.appendChild(card);
        return;
      }

      var vol = workoutVolume(w);
      var nSets = (w.entries || []).reduce(function (s, e) { return s + (e.sets || []).length; }, 0);
      var head = h('<div class="card-h"><h2>' + esc(def.n) + '</h2><small>' + nSets + ' sérií · ' +
        UI.n0(vol) + ' kg objem · +' + kc + ' kcal</small></div>');
      var del = h('<button class="li-x" aria-label="Odstrániť tréning">×</button>');
      del.onclick = function () {
        UI.confirm({
          title: 'Odstrániť celý tréning?', sub: def.n + ' · ' + nSets + ' sérií', danger: true, ok: 'Odstrániť',
          onOk: function () { Store.removeWorkout(dateIso, wIdx); }
        });
      };
      head.appendChild(del);
      card.appendChild(head);
      root.appendChild(card);

      (w.entries || []).forEach(function (entry, eIdx) {
        var m = exMeta(entry);
        var ex = h('<div class="ex"></div>');
        var gl = G[m.g] ? G[m.g].short : '';
        var hd = h('<div class="ex-h"><div class="ex-nm"><b>' + esc(m.n) + '</b><small>' +
          m.sets + ' × ' + esc(m.reps) + '</small></div>' +
          (gl ? '<span class="gtag">' + esc(gl) + '</span>' : '') + '</div>');
        ex.appendChild(hd);

        var pt = prevText(entry.exId, dateIso);
        if (pt) ex.appendChild(h('<div class="prev">naposledy <b>' + esc(pt) + '</b></div>'));

        if ((entry.sets || []).length) {
          var sets = h('<div class="ex-sets"></div>');
          entry.sets.forEach(function (s) {
            sets.appendChild(h('<span class="sbadge' + (s.pr ? ' pr' : '') + '">' + esc(setLabel(s, m.kind)) + '</span>'));
          });
          ex.appendChild(sets);
        }

        var act = h('<div class="ex-act"></div>');
        var addS = h('<button class="btn sm pri">+ séria</button>');
        addS.onclick = function () { openSet(dateIso, wIdx, eIdx); };
        act.appendChild(addS);
        var rm = h('<button class="btn sm gho">Odstrániť cvik</button>');
        rm.onclick = function () {
          w.entries.splice(eIdx, 1); Store.touch();
        };
        act.appendChild(rm);
        ex.appendChild(act);
        root.appendChild(ex);
      });

      var addEx = h('<button class="btn gho" style="margin-top:10px">+ Pridať ďalší cvik</button>');
      addEx.onclick = function () { openAddExercise(dateIso, wIdx); };
      root.appendChild(addEx);
    });

    /* 3) tyzdenny objem na partiu */
    root.appendChild(h('<div class="sec-t">Tento týždeň — série na partiu</div>'));
    root.appendChild(volumeCard(dateIso));

    /* 4) prestavka */
    var rest = h('<div class="card"><div class="card-h"><h2>Prestávka medzi sériami</h2></div></div>');
    var seg = h('<div class="seg"></div>');
    [90, 120, 180].forEach(function (s) {
      var b = h('<button type="button"' + ((Store.settings.rest || 120) === s ? ' class="on"' : '') + '>' +
        (s / 60 === 1.5 ? '1:30' : (s / 60) + ':00') + '</button>');
      b.onclick = function () {
        Store.settings.rest = s; Store.touch(true);
        UI.$$('button', seg).forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        UI.restStart(s);
      };
      seg.appendChild(b);
    });
    rest.appendChild(seg);
    rest.appendChild(h('<div class="tip"><div>Ťuknutím na čas rovno spustíš odpočet. Spustí sa aj sám po každej zapísanej série.</div></div>'));
    root.appendChild(rest);
  }

  function weekRange(dateIso) {
    var d = Store.toDate(dateIso);
    var dow = (d.getDay() + 6) % 7;           // pondelok = 0
    return { from: Store.shift(dateIso, -dow), to: Store.shift(dateIso, 6 - dow) };
  }

  function volumeCard(dateIso) {
    var r = weekRange(dateIso);
    var sets = setsByGroup(r.from, r.to);
    var card = h('<div class="card"></div>');
    var box = h('<div class="volbar"></div>');
    Object.keys(G).forEach(function (k) {
      var g = G[k];
      var v = sets[k] || 0;
      var pct = Math.min(100, (v / g.max) * 100);
      var row = h('<div class="volrow"><span>' + esc(g.short) + '</span>' +
        '<span class="vb"><i></i><u></u></span>' +
        '<em>' + UI.nx(v, 1) + ' / ' + g.min + '–' + g.max + '</em></div>');
      var fill = $('i', row);
      fill.style.width = pct.toFixed(1) + '%';
      fill.style.background = v >= g.min ? g.col : 'var(--surf3)';
      $('u', row).style.left = Math.min(100, (g.min / g.max) * 100).toFixed(1) + '%';
      box.appendChild(row);
    });
    card.appendChild(box);
    card.appendChild(h('<div class="tip"><div>Čiarka na pruhu je <b>minimum na rast</b>. ' +
      'Zadok potrebuje 12–18 sérií za týždeň — to je hlavná páka na tvoj cieľ.</div></div>'));
    return card;
  }

  global.Training = {
    exMeta: exMeta,
    setLabel: setLabel,
    workoutVolume: workoutVolume,
    setsByGroup: setsByGroup,
    weekRange: weekRange,
    startSession: startSession,
    openWalk: openWalk,
    openSet: openSet,
    renderView: renderView,
    volumeCard: volumeCard
  };
})(window);
