/* ============================================================================
   app.js — prepinanie kariet, navigacia po dnoch, karta Dnes a Nastavenia.
   ============================================================================ */
(function (global) {
  'use strict';

  var h = UI.h, esc = UI.esc, $ = UI.$, $$ = UI.$$;

  var cur = Store.today();
  var view = 'dnes';

  var DOW_FULL = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];
  var MON = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];

  /* ================= hlavicka ================= */
  function paintHeader() {
    var d = Store.toDate(cur);
    var today = Store.today();
    var title = cur === today ? 'Dnes'
      : cur === Store.shift(today, -1) ? 'Včera'
        : cur === Store.shift(today, 1) ? 'Zajtra'
          : d.getDate() + '. ' + MON[d.getMonth()];
    $('#dayTitle').textContent = title;
    var t = Targets.forDate(cur);
    $('#daySub').textContent = DOW_FULL[d.getDay()] + ' · ' + d.getDate() + '. ' + (d.getMonth() + 1) + '. · ' +
      (t.training ? 'tréningový deň' : 'bez silového tréningu');
    $('#nextDay').style.opacity = cur >= today ? '.35' : '1';
  }

  /* ================= karta DNES ================= */
  function renderDnes(root) {
    root.innerHTML = '';
    var t = Targets.forDate(cur);
    var n = Food.dayTotals(cur);

    /* --- kruh kcal --- */
    var state = n.kcal < t.band[0] ? 'under' : n.kcal > t.band[1] ? 'over' : 'ok';
    var col = state === 'ok' ? 'var(--ok)' : state === 'under' ? 'var(--warn)' : 'var(--bad)';
    var pct = t.kcal > 0 ? Math.min(1, n.kcal / t.kcal) : 0;
    var R = 87, C = 2 * Math.PI * R;

    var card = h('<div class="card"></div>');
    var ring = h(
      '<div class="ring-wrap"><div class="ring">' +
      '<svg width="188" height="188" viewBox="0 0 188 188" aria-hidden="true">' +
      '<circle class="ring-c" cx="94" cy="94" r="' + R + '" fill="none" stroke-width="13"/>' +
      '<circle class="ring-v" cx="94" cy="94" r="' + R + '" fill="none" stroke-width="13" stroke-linecap="round"/>' +
      '</svg>' +
      '<div class="ring-mid"><b>' + UI.n0(n.kcal) + '</b><span>z ' + UI.n0(t.kcal) + ' kcal</span></div>' +
      '</div></div>'
    );
    var rv = $('.ring-v', ring);
    rv.setAttribute('stroke', col);
    rv.setAttribute('stroke-dasharray', C.toFixed(1));
    rv.setAttribute('stroke-dashoffset', (C * (1 - pct)).toFixed(1));

    var tagTxt = state === 'ok' ? 'v pásme' : state === 'under' ? 'pod cieľom' : 'nad cieľom';
    var tag = h('<div class="ring-tag">' + tagTxt + '</div>');
    tag.style.background = col;
    tag.style.color = '#06121a';
    ring.appendChild(tag);
    card.appendChild(ring);

    /* --- jedna veta, co robit --- */
    var missP = Math.max(0, t.p - n.p);
    var missK = t.kcal - n.kcal;
    var hint;
    if (n.kcal === 0) {
      hint = 'Dnes ešte nič zapísané. Cieľ: <b>' + UI.n0(t.kcal) + ' kcal</b> a <b>' + t.p + ' g bielkovín</b>.';
    } else if (missK > 120) {
      hint = 'Ešte <b>' + UI.n0(missK) + ' kcal</b>' + (missP > 3 ? ' a <b>' + UI.n1(missP) + ' g bielkovín</b>' : '') + '.';
    } else if (missK < -120) {
      hint = 'Si <b>' + UI.n0(-missK) + ' kcal</b> nad cieľom' +
        (missP > 3 ? ', a ešte ti chýba <b>' + UI.n1(missP) + ' g bielkovín</b> — doplň ich radšej z chudého zdroja.' : '. Jeden deň nič nepokazí.');
    } else {
      hint = missP > 3
        ? 'Kalórie sú v pásme, ale chýba ti <b>' + UI.n1(missP) + ' g bielkovín</b>.'
        : 'Kalórie aj bielkoviny máš dnes presne tak, ako treba.';
    }
    card.appendChild(h('<div class="hint">' + hint + '</div>'));

    /* navrh, cim doplnit bielkoviny */
    if (missP > 10) {
      var sp = Targets.suggest('p', missP, 2);
      if (sp.length) {
        var txt = sp.map(function (x) { return x.g + ' g ' + x.f.n.toLowerCase().split(' (')[0]; }).join(' alebo ');
        card.appendChild(h('<div class="tip"><div>Chýbajúce bielkoviny dorovná <b>' + esc(txt) + '</b>.</div></div>'));
      }
    }
    root.appendChild(card);

    /* --- makro pruhy --- */
    var mcard = h('<div class="card"><div class="card-h"><h2>Makroživiny</h2><small>' +
      (t.manual ? 'ručné ciele' : 'výdaj ' + UI.n0(t.tdee) + ' kcal · prebytok +' + (t.kcal - t.tdee)) + '</small></div></div>');
    var bars = h('<div class="bars"></div>');
    bars.appendChild(UI.bar('Bielkoviny', n.p, t.p, 'g', 'var(--p)'));
    bars.appendChild(UI.bar('Tuky', n.f, t.f, 'g', 'var(--f)'));
    bars.appendChild(UI.bar('Uhľohydráty', n.c, t.c, 'g', 'var(--c)'));
    bars.appendChild(UI.bar('Vláknina', n.fib, t.fib, 'g', 'var(--fib)'));
    mcard.appendChild(bars);
    root.appendChild(mcard);

    /* --- mikroziviny + konkretny tip --- */
    var micard = h('<div class="card"><div class="card-h"><h2>Živiny</h2><small>aby ti nič nechýbalo</small></div></div>');
    var chips = h('<div class="micros"></div>');
    var worst = null;
    Targets.MICROS.forEach(function (m) {
      if (m.k === 'fib') return;
      var have = n[m.k] || 0;
      var ratio = have / m.t;
      var ch = h('<div class="mchip"><i></i><span>' + esc(m.n) + '</span> ' +
        (m.t >= 100 ? UI.n0(have) : UI.n1(have)) + '/' + m.t + '</div>');
      $('i', ch).style.background = ratio >= 0.9 ? m.col : (ratio >= 0.6 ? 'var(--warn)' : 'var(--bad)');
      chips.appendChild(ch);
      if (m.k !== 'vd' && (!worst || ratio < worst.ratio)) worst = { m: m, ratio: ratio, missing: m.t - have };
    });
    micard.appendChild(chips);

    if (worst && worst.ratio < 0.85 && worst.missing > 0) {
      var sg = Targets.suggest(worst.m.k, worst.missing, 2);
      var how = sg.length
        ? sg.map(function (x) { return '<b>' + esc(x.g + ' g ' + x.f.n.toLowerCase().split(' (')[0]) + '</b>'; }).join(' alebo ')
        : '';
      micard.appendChild(h('<div class="tip"><div>Najviac ti chýba <b>' + esc(worst.m.n.toLowerCase()) + '</b> — ' +
        esc(worst.m.why) + '.' + (how ? ' Dorovná to ' + how + '.' : '') + '</div></div>'));
    }
    root.appendChild(micard);

    /* --- trening dna --- */
    var ws = Store.workouts(cur);
    var tcard = h('<div class="card"><div class="card-h"><h2>Pohyb</h2><small>' +
      (t.act ? '+' + UI.n0(t.act) + ' kcal k cieľu' : 'zatiaľ nič') + '</small></div></div>');
    if (ws.length) {
      var lst = h('<div class="lst"></div>');
      ws.forEach(function (w) {
        var def = ExDB.SESSIONS[w.session] || { n: w.session };
        var sub = w.session === 'walk'
          ? UI.nx(w.km || 0, 1) + ' km · ' + (w.min || 0) + ' min'
          : (w.entries || []).reduce(function (s, e) { return s + (e.sets || []).length; }, 0) + ' sérií · ' +
          UI.n0(Training.workoutVolume(w)) + ' kg';
        lst.appendChild(h('<div class="li"><div class="li-mid"><b>' + esc(def.n) + '</b><small>' + esc(sub) +
          '</small></div><div class="li-end"><b>' + Targets.sessionKcal(w, Store.profile.w) + '</b><small>kcal</small></div></div>'));
      });
      tcard.appendChild(lst);
    } else {
      var planKey = ExDB.PLAN[Store.toDate(cur).getDay()];
      var pd = ExDB.SESSIONS[planKey];
      tcard.appendChild(h('<div class="empty">Plán na tento deň: <b>' + esc(pd.n) + '</b> — ' + esc(pd.sub) + '</div>'));
      var go = h('<button class="btn pri">Začať ' + esc(pd.n) + '</button>');
      go.onclick = function () { Training.startSession(cur, planKey); go2('trening'); };
      tcard.appendChild(go);
    }
    root.appendChild(tcard);

    /* --- tyzdenny objem --- */
    root.appendChild(h('<div class="sec-t">Tento týždeň — série na partiu</div>'));
    root.appendChild(Training.volumeCard(cur));

    /* --- zapisane jedlo --- */
    root.appendChild(h('<div class="sec-t">Čo som dnes zjedla</div>'));
    root.appendChild(Food.renderMeals(cur));
  }

  /* ================= hladanie jedla zo FAB ================= */
  function openFoodSearch() {
    UI.sheet({
      title: 'Pridať jedlo',
      build: function (b) {
        var inp = h('<input type="search" placeholder="Hľadaj potravinu…" autocomplete="off" enterkeyhint="search">');
        b.appendChild(inp);

        var quick = h('<div class="fav-grid"></div>');
        var lst = h('<div class="lst"></div>');
        b.appendChild(quick);
        b.appendChild(lst);

        var act = h('<div class="row-btns"></div>');
        var b1 = h('<button class="btn sm gho">Rýchly zápis</button>');
        b1.onclick = function () { UI.close(); Food.openQuick(cur); };
        var b2 = h('<button class="btn sm gho">Vlastná potravina</button>');
        b2.onclick = function () { UI.close(); Food.openNewFood(cur); };
        act.appendChild(b1); act.appendChild(b2);
        b.appendChild(act);

        function paint() {
          var q = inp.value.trim();
          lst.innerHTML = '';
          if (!q) {
            quick.hidden = false;
            quick.innerHTML = '';
            var favs = Food.favourites(9);
            if (!favs.length) {
              lst.appendChild(h('<div class="empty">Napíš názov potraviny.<br>Čo budeš používať často, sa tu potom objaví samo.</div>'));
              return;
            }
            favs.forEach(function (f) {
              var btn = h('<button class="fav"><b>' + esc(f.n) + '</b><small>' +
                (f.unit ? '1 ' + f.unitN : Math.round(f.per100.kcal) + ' kcal/100 g') + '</small></button>');
              btn.onclick = function () { UI.close(); Food.openAdd(cur, f); };
              quick.appendChild(btn);
            });
            return;
          }
          quick.hidden = true;
          var res = Food.search(q);
          if (!res.length) {
            lst.appendChild(h('<div class="empty">Nič sa nenašlo — pridaj si to ako vlastnú potravinu.</div>'));
            return;
          }
          res.slice(0, 30).forEach(function (f) {
            var row = h('<button class="li"><div class="li-mid"><b>' + esc(f.n) + '</b><small>B ' +
              UI.n1(f.per100.p) + ' g · T ' + UI.n1(f.per100.f) + ' g · U ' + UI.n1(f.per100.c) +
              ' g / 100 g</small></div><div class="li-end"><b>' + Math.round(f.per100.kcal) +
              '</b><small>kcal</small></div></button>');
            row.onclick = function () { UI.close(); Food.openAdd(cur, f); };
            lst.appendChild(row);
          });
        }
        var tm = null;
        inp.oninput = function () { if (tm) clearTimeout(tm); tm = setTimeout(paint, 110); };
        paint();
      },
      focus: 'input[type=search]'
    });
  }

  /* ================= NASTAVENIA ================= */
  function renderSettings(root) {
    root.innerHTML = '';
    var p = Store.profile;

    var pc = h('<div class="card"><div class="card-h"><h2>Moje údaje</h2><small>ciele sa prepočítajú samé</small></div></div>');
    var age = UI.stepper({ value: p.age, step: 1, min: 14, max: 99, onChange: function (v) { p.age = v; Store.touch(); } });
    var hh = UI.stepper({ value: p.h, step: 0.5, min: 120, max: 220, dec: 1, onChange: function (v) { p.h = v; Store.touch(); } });
    var ww = UI.stepper({ value: p.w, step: 0.5, min: 35, max: 200, dec: 1, onChange: function (v) { p.w = v; Store.touch(); } });
    pc.appendChild(UI.field('Vek', age));
    var r2 = h('<div class="row2"></div>');
    r2.appendChild(UI.field('Výška (cm)', hh));
    r2.appendChild(UI.field('Váha (kg)', ww));
    pc.appendChild(r2);

    var neat = h('<select>' +
      '<option value="1.2">Sedavá práca (1,2)</option>' +
      '<option value="1.3">Sedavá, ale veľa chodím (1,3)</option>' +
      '<option value="1.4">Na nohách väčšinu dňa (1,4)</option>' +
      '</select>');
    neat.value = String(p.neat);
    neat.onchange = function () { p.neat = parseFloat(neat.value); Store.touch(); };
    pc.appendChild(UI.field('Aktivita mimo tréningov', neat));

    var sur = UI.stepper({
      value: p.surplus, step: 25, min: -500, max: 700,
      onChange: function (v) { p.surplus = v; Store.touch(); }
    });
    pc.appendChild(UI.field('Prebytok kalórií nad výdajom (150 = pomalé naberanie)', sur));

    var pk = UI.stepper({ value: p.pPerKg, step: 0.1, min: 1, max: 3.5, dec: 1, onChange: function (v) { p.pPerKg = v; Store.touch(); } });
    var fk = UI.stepper({ value: p.fPerKg, step: 0.1, min: 0.5, max: 2, dec: 1, onChange: function (v) { p.fPerKg = v; Store.touch(); } });
    var r3 = h('<div class="row2"></div>');
    r3.appendChild(UI.field('Bielkoviny g/kg', pk));
    r3.appendChild(UI.field('Tuky g/kg', fk));
    pc.appendChild(r3);
    root.appendChild(pc);

    /* prepocet */
    var t = Targets.forDate(Store.today());
    var cc = h('<div class="card"><div class="card-h"><h2>Čo z toho vychádza</h2></div></div>');
    var kp = h('<div class="kpis"></div>');
    [[UI.n0(t.bmr) + ' kcal', 'BMR (pokojový výdaj)'],
      [UI.n0(t.base) + ' kcal', 'základ pri sedavej práci'],
      [UI.n0(t.tdee) + ' kcal', 'dnešný výdaj vrátane pohybu'],
      [UI.n0(t.kcal) + ' kcal', 'dnešný cieľ'],
      [t.p + ' g', 'bielkoviny'],
      [t.f + ' g', 'tuky'],
      [t.c + ' g', 'uhľohydráty'],
      ['30 g', 'vláknina (minimum)']
    ].forEach(function (x) {
      kp.appendChild(h('<div class="kpi"><b>' + x[0] + '</b><small>' + x[1] + '</small></div>'));
    });
    cc.appendChild(kp);
    cc.appendChild(h('<div class="tip"><div>Výdaj sa počíta z reálne zapísaného pohybu, takže v deň s tréningom ' +
      'alebo chôdzou môžeš zjesť viac. Keď nič nezapíšeš, cieľ je nižší — to je správne.</div></div>'));
    root.appendChild(cc);

    /* rucne ciele */
    var man = h('<div class="card"><div class="card-h"><h2>Ručné ciele</h2><small>' +
      (p.manual ? 'zapnuté' : 'vypnuté — počíta sa automaticky') + '</small></div></div>');
    if (!p.manual) {
      var on = h('<button class="btn gho">Nastaviť ciele ručne</button>');
      on.onclick = function () {
        p.manual = { kcal: t.kcal, p: t.p, f: t.f, c: t.c };
        Store.touch();
      };
      man.appendChild(on);
    } else {
      var mk = UI.stepper({ value: p.manual.kcal, step: 50, min: 800, max: 5000, onChange: function (v) { p.manual.kcal = v; Store.touch(); } });
      var mp = UI.stepper({ value: p.manual.p, step: 5, min: 40, max: 300, onChange: function (v) { p.manual.p = v; Store.touch(); } });
      var mf = UI.stepper({ value: p.manual.f, step: 5, min: 20, max: 200, onChange: function (v) { p.manual.f = v; Store.touch(); } });
      var mcb = UI.stepper({ value: p.manual.c, step: 10, min: 0, max: 700, onChange: function (v) { p.manual.c = v; Store.touch(); } });
      man.appendChild(UI.field('Kalórie', mk));
      var rr = h('<div class="row2"></div>');
      rr.appendChild(UI.field('Bielkoviny (g)', mp));
      rr.appendChild(UI.field('Tuky (g)', mf));
      man.appendChild(rr);
      man.appendChild(UI.field('Uhľohydráty (g)', mcb));
      var off = h('<button class="btn gho">Späť na automatický prepočet</button>');
      off.onclick = function () { p.manual = null; Store.touch(); };
      man.appendChild(off);
    }
    root.appendChild(man);

    /* vzhlad */
    var ap = h('<div class="card"><div class="card-h"><h2>Vzhľad</h2></div></div>');
    var seg = h('<div class="seg"></div>');
    [['dark', 'Tmavý'], ['light', 'Svetlý'], ['auto', 'Podľa telefónu']].forEach(function (x) {
      var b = h('<button type="button"' + (Store.settings.theme === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>');
      b.onclick = function () { Store.settings.theme = x[0]; applyTheme(); Store.touch(); };
      seg.appendChild(b);
    });
    ap.appendChild(seg);
    root.appendChild(ap);

    /* zaloha */
    var bc = h('<div class="card"><div class="card-h"><h2>Záloha dát</h2><small>' +
      Object.keys(Store.state.days).length + ' dní jedla · ' + Object.keys(Store.state.workouts).length + ' dní tréningu</small></div></div>');
    bc.appendChild(h('<div class="tip"><div>Dáta sú uložené <b>len v tomto prehliadači na tomto zariadení</b>. ' +
      'Zápisy z telefónu sa v notebooku neukážu. Raz za mesiac si urob export a súbor ulož napr. do OneDrivu.</div></div>'));
    var br = h('<div class="row2" style="margin-top:12px"></div>');
    var exp = h('<button class="btn">Export JSON</button>');
    exp.onclick = doExport;
    var imp = h('<button class="btn">Import JSON</button>');
    imp.onclick = doImport;
    br.appendChild(exp); br.appendChild(imp);
    bc.appendChild(br);
    var rst = h('<button class="btn dan" style="margin-top:9px">Vymazať všetky dáta</button>');
    rst.onclick = function () {
      UI.confirm({
        title: 'Vymazať všetko?', sub: 'Všetky zápisy jedla, tréningov a vlastné potraviny sa nenávratne stratia.',
        danger: true, ok: 'Vymazať',
        onOk: function () { Store.reset(); UI.toast('Vymazané.'); }
      });
    };
    bc.appendChild(rst);
    root.appendChild(bc);

    /* vlastne potraviny */
    if (Store.state.foods.length) {
      var fc = h('<div class="card"><div class="card-h"><h2>Moje potraviny</h2><small>' +
        Store.state.foods.length + '</small></div></div>');
      var fl = h('<div class="lst"></div>');
      Store.state.foods.forEach(function (f) {
        var row = h('<div class="li"><div class="li-mid"><b>' + esc(f.n) + '</b><small>' +
          Math.round(f.per100.kcal) + ' kcal · B ' + UI.n1(f.per100.p) + ' g / 100 g</small></div></div>');
        var x = h('<button class="li-x" aria-label="Odstrániť">×</button>');
        x.onclick = function () {
          UI.confirm({
            title: 'Odstrániť „' + f.n + '“?', sub: 'Už zapísané dni si hodnoty nepamätajú — prepočítajú sa na nulu.',
            danger: true, ok: 'Odstrániť', onOk: function () { Store.deleteFood(f.id); }
          });
        };
        row.appendChild(x);
        fl.appendChild(row);
      });
      fc.appendChild(fl);
      root.appendChild(fc);
    }

    /* o appke */
    root.appendChild(h('<div class="card"><div class="card-h"><h2>O appke</h2></div>' +
      '<div class="tip"><div>Databáza má ' + FoodsDB.count + ' potravín, <b>bez mliečnych výrobkov</b> — ' +
      'mliečna bielkovina je vylúčená. Hodnoty sú približné, z bežných zložkových tabuliek. ' +
      'Appka nie je zdravotné poradenstvo.</div></div></div>'));
  }

  /* v nahlade (appka bezi vnorena v inej stranke) prehliadac sťahovanie blokuje */
  function isEmbedded() {
    try { return global.self !== global.top; } catch (e) { return true; }
  }

  function doExport() {
    var json = Store.exportJSON();
    var name = 'fitapp-zaloha-' + Store.today() + '.json';
    var embedded = isEmbedded();
    UI.sheet({
      title: 'Export dát',
      sub: embedded
        ? 'V náhľade prehliadač sťahovanie blokuje — skopíruj text a ulož si ho. Na tvojej GitHub adrese bude fungovať aj uloženie súboru.'
        : 'Ulož súbor, alebo skopíruj text a vlož ho kam chceš.',
      build: function (b) {
        var ta = h('<textarea readonly style="min-height:160px;font-size:12px"></textarea>');
        ta.value = json;
        var dl = h('<button class="btn' + (embedded ? ' gho' : ' pri') + '">Uložiť súbor ' + esc(name) + '</button>');
        dl.onclick = function () {
          try {
            var blob = new Blob([json], { type: 'application/json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = name;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
            UI.toast('Súbor uložený do Stiahnuté.');
          } catch (e) {
            UI.toast('Sťahovanie tu nefunguje — skopíruj text nižšie.');
          }
        };
        var cp = h('<button class="btn' + (embedded ? ' pri' : '') + '">Skopírovať do schránky</button>');
        cp.onclick = function () {
          ta.select();
          if (navigator.clipboard) {
            navigator.clipboard.writeText(json).then(function () { UI.toast('Skopírované.'); },
              function () { UI.toast('Skopíruj to ručne z textu nižšie.'); });
          } else {
            try { document.execCommand('copy'); UI.toast('Skopírované.'); }
            catch (e) { UI.toast('Skopíruj to ručne.'); }
          }
        };
        if (embedded) { b.appendChild(cp); b.appendChild(ta); b.appendChild(dl); }
        else { b.appendChild(dl); b.appendChild(cp); b.appendChild(ta); }
      }
    });
  }

  function doImport() {
    UI.sheet({
      title: 'Import dát',
      sub: 'Pozor: nahradí to všetko, čo máš teraz v appke.',
      build: function (b) {
        var file = h('<input type="file" accept="application/json,.json">');
        var ta = h('<textarea placeholder="…alebo tu vlož obsah záložného súboru" style="min-height:140px;font-size:12px"></textarea>');
        b.appendChild(UI.field('Vybrať súbor', file));
        b.appendChild(ta);
        function apply(text) {
          try {
            Store.importJSON(text);
            UI.close();
            UI.toast('Dáta nahraté.');
          } catch (e) {
            UI.toast('Nepodarilo sa: ' + e.message);
          }
        }
        file.onchange = function () {
          var f = file.files && file.files[0];
          if (!f) return;
          var fr = new FileReader();
          fr.onload = function () { apply(String(fr.result)); };
          fr.readAsText(f);
        };
        var ok = h('<button class="btn pri">Nahrať z textu</button>');
        ok.onclick = function () {
          if (!ta.value.trim()) { UI.toast('Vlož obsah súboru.'); return; }
          UI.confirm({
            title: 'Nahradiť všetky dáta?', danger: true, ok: 'Nahradiť',
            onOk: function () { apply(ta.value); }
          });
        };
        b.appendChild(ok);
      }
    });
  }

  /* ================= tema ================= */
  function applyTheme() {
    var th = Store.settings.theme || 'dark';
    if (th === 'auto') {
      var light = global.matchMedia && global.matchMedia('(prefers-color-scheme: light)').matches;
      document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', th);
    }
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) {
      meta.setAttribute('content',
        document.documentElement.getAttribute('data-theme') === 'light' ? '#f5f6fa' : '#0e1016');
    }
  }

  /* ================= prepinanie kariet ================= */
  function go2(v) {
    view = v;
    $$('#nav button').forEach(function (b) { b.classList.toggle('active', b.dataset.v === v); });
    $$('.view').forEach(function (s) { s.hidden = true; });
    var root = $('#v-' + v);
    root.hidden = false;
    render();
    global.scrollTo(0, 0);
  }

  function render() {
    paintHeader();
    var root = $('#v-' + view);
    if (!root) return;
    if (view === 'dnes') renderDnes(root);
    else if (view === 'jedlo') Food.renderView(root, cur);
    else if (view === 'trening') Training.renderView(root, cur);
    else if (view === 'prehlad') Stats.renderView(root, cur);
    else if (view === 'nastavenia') renderSettings(root);
    $('#fab').hidden = (view === 'nastavenia');
  }

  function setDay(iso) {
    if (iso > Store.today()) return;
    cur = iso;
    render();
  }

  /* ================= start ================= */
  function init() {
    applyTheme();
    if (global.matchMedia) {
      try {
        global.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () {
          if (Store.settings.theme === 'auto') applyTheme();
        });
      } catch (e) {}
    }

    $$('#nav button').forEach(function (b) {
      b.onclick = function () { go2(b.dataset.v); };
    });
    $('#btnSettings').onclick = function () { go2(view === 'nastavenia' ? 'dnes' : 'nastavenia'); };
    $('#prevDay').onclick = function () { setDay(Store.shift(cur, -1)); };
    $('#nextDay').onclick = function () { setDay(Store.shift(cur, 1)); };
    $('#restStop').onclick = UI.restStop;

    $('#fab').onclick = function () {
      if (view === 'trening') {
        var ws = Store.workouts(cur);
        var open = -1;
        for (var i = 0; i < ws.length; i++) if (ws[i].session !== 'walk') { open = i; break; }
        if (open >= 0) {
          var w = ws[open];
          var ei = 0;
          for (var j = 0; j < w.entries.length; j++) {
            if (!(w.entries[j].sets || []).length) { ei = j; break; }
            ei = j;
          }
          Training.openSet(cur, open, ei);
        } else {
          var planKey = ExDB.PLAN[Store.toDate(cur).getDay()];
          Training.startSession(cur, planKey);
        }
        return;
      }
      openFoodSearch();
    };

    /* swipe doleva/doprava = zmena dna */
    var sx = 0, sy = 0, tracking = false;
    var main = $('#main');
    main.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1 || UI.isSheetOpen()) { tracking = false; return; }
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true;
    }, { passive: true });
    main.addEventListener('touchend', function (e) {
      if (!tracking) return;
      tracking = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 70 || Math.abs(dy) > 50) return;
      setDay(Store.shift(cur, dx < 0 ? 1 : -1));
    }, { passive: true });

    /* pri kazdej zmene dat prekresli */
    Store.onChange(render);

    /* po polnoci prepni na novy den */
    setInterval(function () {
      if (view === 'dnes' && cur < Store.today() && cur === Store.shift(Store.today(), -1)) {
        /* nechaj byt — pouzivatelka moze dopisovat vcerajsi den */
      }
    }, 60000);

    go2('dnes');

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.App = { render: render, go: go2, get date() { return cur; } };
})(window);
