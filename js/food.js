/* ============================================================================
   food.js — dennik jedla: hladanie, porcie, oblubene, moje jedla, sucty.
   Zapis je navrhnuty na dva tuknutia: oblubena potravina -> rychly cip gramaze.
   ============================================================================ */
(function (global) {
  'use strict';

  var COLS = FoodsDB.COLS;
  var $ = UI.$, h = UI.h, esc = UI.esc;

  /* ---------- rozlisenie potraviny (vstavana alebo moja vlastna) ---------- */
  function foodById(id) {
    if (FoodsDB.byId[id]) return FoodsDB.byId[id];
    var arr = Store.state.foods;
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }

  function allFoods() {
    return Store.state.foods.concat(FoodsDB.all);
  }

  function zero() {
    var o = {};
    COLS.forEach(function (c) { o[c] = 0; });
    return o;
  }

  /* zivinovy prinos jednej polozky v dennom zapise */
  function itemNutr(it) {
    var o = zero();
    if (it.t === 'q') {
      o.kcal = +it.kcal || 0; o.p = +it.p || 0; o.f = +it.f || 0; o.c = +it.c || 0;
      o.fib = +it.fib || 0;
      return o;
    }
    var f = foodById(it.id);
    if (!f) return o;
    var k = (+it.g || 0) / 100;
    COLS.forEach(function (c) { o[c] = (f.per100[c] || 0) * k; });
    return o;
  }

  function itemName(it) {
    if (it.t === 'q') return it.n || 'Rýchly zápis';
    var f = foodById(it.id);
    return f ? f.n : 'Neznáma potravina';
  }

  function itemDesc(it) {
    if (it.t === 'q') return 'rýchly zápis';
    var f = foodById(it.id);
    var g = Math.round(+it.g || 0);
    if (f && f.unit) {
      var pieces = g / f.unit;
      if (Math.abs(pieces - Math.round(pieces)) < 0.06 && pieces >= 0.5) {
        return UI.nx(pieces, 1) + ' ' + f.unitN + ' · ' + g + ' g';
      }
    }
    return g + ' g';
  }

  function add(a, b) { COLS.forEach(function (c) { a[c] += b[c] || 0; }); return a; }

  function slotTotals(dateIso, slot) {
    var d = Store.day(dateIso);
    return (d.meals[slot] || []).reduce(function (s, it) { return add(s, itemNutr(it)); }, zero());
  }

  function dayTotals(dateIso) {
    var t = zero();
    Store.SLOTS.forEach(function (s) { add(t, slotTotals(dateIso, s)); });
    return t;
  }

  /* ---------- hladanie ---------- */
  function search(q, cat) {
    var list = allFoods();
    if (cat) list = list.filter(function (f) { return f.cat === cat; });
    var nq = FoodsDB.norm(q || '');
    if (!nq) return cat ? list.slice(0, 200) : [];
    var toks = nq.split(' ').filter(Boolean);
    var scored = [];
    list.forEach(function (f) {
      var q2 = f.q || (f.q = FoodsDB.norm(f.n));
      for (var i = 0; i < toks.length; i++) if (q2.indexOf(toks[i]) < 0) return;
      scored.push({ f: f, s: q2.indexOf(toks[0]) });
    });
    scored.sort(function (a, b) { return a.s - b.s || a.f.n.localeCompare(b.f.n, 'sk'); });
    return scored.slice(0, 60).map(function (x) { return x.f; });
  }

  function favourites(limit) {
    var favs = Store.state.favs || {};
    return Object.keys(favs)
      .map(function (id) { return { f: foodById(id), c: favs[id] }; })
      .filter(function (x) { return x.f; })
      .sort(function (a, b) { return b.c - a.c; })
      .slice(0, limit || 12)
      .map(function (x) { return x.f; });
  }

  function defaultSlot() {
    var hr = new Date().getHours();
    if (hr < 10) return 'ranajky';
    if (hr < 15) return 'obed';
    if (hr < 20) return 'vecera';
    return 'snack';
  }

  /* ---------- sheet: pridanie potraviny ---------- */
  function openAdd(dateIso, food, slot, editRef) {
    var curSlot = slot || (editRef ? editRef.slot : defaultSlot());
    var startG = editRef ? editRef.item.g : (food.unit ? food.unit : 100);

    UI.sheet({
      title: food.n,
      sub: 'Na 100 g: ' + Math.round(food.per100.kcal) + ' kcal · B ' + UI.n1(food.per100.p) +
        ' g · T ' + UI.n1(food.per100.f) + ' g · U ' + UI.n1(food.per100.c) + ' g',
      build: function (b) {
        /* rychle cipy gramaze — vacsinu jedal zapises bez pisania */
        var quick = [];
        if (food.unit) {
          quick.push({ l: '1 ' + food.unitN, g: food.unit });
          quick.push({ l: '2 ' + food.unitN, g: food.unit * 2 });
          if (food.unit >= 60) quick.push({ l: '½ ' + food.unitN, g: Math.round(food.unit / 2) });
        }
        [30, 50, 100, 150, 200, 250].forEach(function (g) { quick.push({ l: g + ' g', g: g }); });

        var chips = h('<div class="chips"></div>');
        var stp = UI.stepper({
          value: startG, step: 10, min: 1, max: 3000,
          onChange: function () { paint(); mark(); }
        });

        quick.forEach(function (q) {
          var c = h('<button type="button" class="chip">' + esc(q.l) + '</button>');
          c.dataset.g = q.g;
          c.onclick = function () { stp.setValue(q.g); };
          chips.appendChild(c);
        });
        function mark() {
          var g = stp.getValue();
          UI.$$('.chip', chips).forEach(function (c) { c.classList.toggle('on', +c.dataset.g === g); });
        }

        b.appendChild(chips);
        b.appendChild(UI.field('Množstvo v gramoch', stp));

        /* nahlad toho, co prave pridavam */
        var prev = h('<div class="card tight"><div class="bars"></div></div>');
        b.appendChild(prev);

        var slotSeg = h('<div class="seg"></div>');
        Store.SLOTS.forEach(function (s) {
          var btn = h('<button type="button"' + (s === curSlot ? ' class="on"' : '') + '>' + esc(Store.SLOT_N[s]) + '</button>');
          btn.onclick = function () {
            curSlot = s;
            UI.$$('button', slotSeg).forEach(function (x) { x.classList.remove('on'); });
            btn.classList.add('on');
          };
          slotSeg.appendChild(btn);
        });
        b.appendChild(UI.field('Kam to zapísať', slotSeg));

        var ok = h('<button class="btn pri">' + (editRef ? 'Uložiť zmenu' : 'Pridať do dňa') + '</button>');
        ok.onclick = function () {
          var g = stp.getValue();
          if (!(g > 0)) { UI.toast('Zadaj gramáž.'); return; }
          if (editRef) {
            if (editRef.slot !== curSlot) {
              Store.removeItem(dateIso, editRef.slot, editRef.idx);
              Store.addItem(dateIso, curSlot, { t: 'f', id: food.id, g: g });
            } else {
              Store.updateItem(dateIso, editRef.slot, editRef.idx, { g: g });
            }
            UI.toast('Upravené.');
          } else {
            Store.addItem(dateIso, curSlot, { t: 'f', id: food.id, g: g });
            UI.toast(food.n + ' · ' + g + ' g pridané.');
          }
          UI.close();
        };
        b.appendChild(ok);

        if (editRef) {
          var del = h('<button class="btn dan">Odstrániť zo dňa</button>');
          del.onclick = function () {
            Store.removeItem(dateIso, editRef.slot, editRef.idx);
            UI.close(); UI.toast('Odstránené.');
          };
          b.appendChild(del);
        }

        function paint() {
          var g = stp.getValue();
          var k = g / 100;
          var bars = $('.bars', prev);
          bars.innerHTML = '';
          var t = Targets.forDate(dateIso);
          bars.appendChild(h('<div class="bar-row"><div class="nm">Energia</div><div class="vl"><b>' +
            UI.n0(food.per100.kcal * k) + '</b> kcal</div></div>'));
          bars.appendChild(UI.bar('Bielkoviny', food.per100.p * k, t.p, 'g', 'var(--p)'));
          bars.appendChild(UI.bar('Tuky', food.per100.f * k, t.f, 'g', 'var(--f)'));
          bars.appendChild(UI.bar('Uhľohydráty', food.per100.c * k, t.c, 'g', 'var(--c)'));
          if (food.per100.ca * k >= 40) {
            bars.appendChild(h('<div class="bar-row"><div class="nm">Vápnik</div><div class="vl"><b>' +
              UI.n0(food.per100.ca * k) + '</b> mg</div></div>'));
          }
        }
        paint(); mark();
      }
    });
  }

  /* ---------- sheet: rychly zapis bez databazy ---------- */
  function openQuick(dateIso) {
    var slot = defaultSlot();
    UI.sheet({
      title: 'Rýchly zápis',
      sub: 'Keď potravinu nenájdeš — opíš ju z obalu. Mikroživiny sa z toho nedopočítajú.',
      build: function (b) {
        var nm = h('<input type="text" placeholder="napr. obed v kantíne" enterkeyhint="next">');
        var kcal = UI.stepper({ value: 400, step: 25, min: 0, max: 4000 });
        var p = UI.stepper({ value: 20, step: 5, min: 0, max: 300 });
        var f = UI.stepper({ value: 15, step: 5, min: 0, max: 300 });
        var c = UI.stepper({ value: 40, step: 5, min: 0, max: 600 });
        b.appendChild(UI.field('Názov', nm));
        b.appendChild(UI.field('Kalórie (kcal)', kcal));
        var g2 = h('<div class="row2"></div>');
        g2.appendChild(UI.field('Bielkoviny (g)', p));
        g2.appendChild(UI.field('Tuky (g)', f));
        b.appendChild(g2);
        b.appendChild(UI.field('Uhľohydráty (g)', c));

        var seg = h('<div class="seg"></div>');
        Store.SLOTS.forEach(function (s) {
          var btn = h('<button type="button"' + (s === slot ? ' class="on"' : '') + '>' + esc(Store.SLOT_N[s]) + '</button>');
          btn.onclick = function () {
            slot = s;
            UI.$$('button', seg).forEach(function (x) { x.classList.remove('on'); });
            btn.classList.add('on');
          };
          seg.appendChild(btn);
        });
        b.appendChild(UI.field('Kam to zapísať', seg));

        var ok = h('<button class="btn pri">Pridať</button>');
        ok.onclick = function () {
          Store.addItem(dateIso, slot, {
            t: 'q', n: nm.value.trim() || 'Rýchly zápis',
            kcal: kcal.getValue(), p: p.getValue(), f: f.getValue(), c: c.getValue()
          });
          UI.close(); UI.toast('Pridané.');
        };
        b.appendChild(ok);
      },
      focus: 'input[type=text]'
    });
  }

  /* ---------- sheet: vlastna potravina ---------- */
  function openNewFood(dateIso) {
    UI.sheet({
      title: 'Nová vlastná potravina',
      sub: 'Prepíš hodnoty z obalu — vždy tie na 100 g. Zostane ti uložená natrvalo.',
      build: function (b) {
        var nm = h('<input type="text" placeholder="napr. môj proteín hrach+ryža">');
        b.appendChild(UI.field('Názov', nm));

        var flds = [
          ['kcal', 'Kalórie (kcal / 100 g)', 100, 10],
          ['p', 'Bielkoviny (g)', 10, 1],
          ['f', 'Tuky (g)', 5, 1],
          ['c', 'Uhľohydráty (g)', 10, 1],
          ['fib', 'Vláknina (g)', 2, 1],
          ['ca', 'Vápnik (mg)', 0, 10],
          ['fe', 'Železo (mg)', 0, 0.5],
          ['mg', 'Magnézium (mg)', 0, 10]
        ];
        var inputs = {};
        flds.forEach(function (fl) {
          inputs[fl[0]] = UI.stepper({ value: fl[2], step: fl[3], min: 0, max: 9999, dec: fl[3] < 1 ? 1 : 0 });
          b.appendChild(UI.field(fl[1], inputs[fl[0]]));
        });

        var unit = UI.stepper({ value: 0, step: 5, min: 0, max: 1000 });
        b.appendChild(UI.field('Hmotnosť 1 porcie/kusu v g (0 = nepoužívam)', unit));

        var ok = h('<button class="btn pri">Uložiť potravinu</button>');
        ok.onclick = function () {
          var name = nm.value.trim();
          if (!name) { UI.toast('Zadaj názov.'); return; }
          var per100 = {};
          COLS.forEach(function (cc) { per100[cc] = inputs[cc] ? inputs[cc].getValue() : 0; });
          var f = { n: name, per100: per100 };
          if (unit.getValue() > 0) { f.unit = unit.getValue(); f.unitN = 'porcia'; }
          f.q = FoodsDB.norm(name);
          var saved = Store.addFood(f);
          UI.close();
          openAdd(dateIso, saved);
        };
        b.appendChild(ok);
      },
      focus: 'input[type=text]'
    });
  }

  /* ---------- moje jedla (recepty) ---------- */
  function recipeNutr(r) {
    return (r.items || []).reduce(function (s, it) { return add(s, itemNutr(it)); }, zero());
  }

  function saveSlotAsRecipe(dateIso, slot) {
    var items = Store.day(dateIso).meals[slot] || [];
    if (!items.length) { UI.toast('V tomto jedle nič nie je.'); return; }
    UI.sheet({
      title: 'Uložiť ako moje jedlo',
      sub: Store.SLOT_N[slot] + ' — ' + items.length + ' položiek. Nabudúce ho pridáš jedným ťuknutím.',
      build: function (b) {
        var nm = h('<input type="text" placeholder="napr. moje raňajky s ovsom">');
        b.appendChild(UI.field('Názov jedla', nm));
        var ok = h('<button class="btn pri">Uložiť</button>');
        ok.onclick = function () {
          var name = nm.value.trim();
          if (!name) { UI.toast('Zadaj názov.'); return; }
          Store.addRecipe({ n: name, items: JSON.parse(JSON.stringify(items)) });
          UI.close(); UI.toast('Uložené do Moje jedlá.');
        };
        b.appendChild(ok);
      },
      focus: 'input[type=text]'
    });
  }

  function addRecipeToDay(dateIso, r) {
    var slot = defaultSlot();
    UI.sheet({
      title: r.n,
      sub: (function () {
        var t = recipeNutr(r);
        return Math.round(t.kcal) + ' kcal · B ' + UI.n1(t.p) + ' g · T ' + UI.n1(t.f) + ' g · U ' + UI.n1(t.c) + ' g';
      })(),
      build: function (b) {
        var lst = h('<div class="lst"></div>');
        (r.items || []).forEach(function (it) {
          lst.appendChild(h('<div class="li"><div class="li-mid"><b>' + esc(itemName(it)) +
            '</b><small>' + esc(itemDesc(it)) + '</small></div><div class="li-end"><b>' +
            UI.n0(itemNutr(it).kcal) + '</b><small>kcal</small></div></div>'));
        });
        b.appendChild(h('<div class="card tight"></div>')).appendChild(lst);

        var seg = h('<div class="seg"></div>');
        Store.SLOTS.forEach(function (s) {
          var btn = h('<button type="button"' + (s === slot ? ' class="on"' : '') + '>' + esc(Store.SLOT_N[s]) + '</button>');
          btn.onclick = function () {
            slot = s;
            UI.$$('button', seg).forEach(function (x) { x.classList.remove('on'); });
            btn.classList.add('on');
          };
          seg.appendChild(btn);
        });
        b.appendChild(UI.field('Kam to zapísať', seg));

        var ok = h('<button class="btn pri">Pridať celé jedlo</button>');
        ok.onclick = function () {
          (r.items || []).forEach(function (it) { Store.addItem(dateIso, slot, JSON.parse(JSON.stringify(it))); });
          UI.close(); UI.toast(r.n + ' pridané.');
        };
        b.appendChild(ok);

        var del = h('<button class="btn gho">Odstrániť toto jedlo zo zoznamu</button>');
        del.onclick = function () {
          UI.confirm({
            title: 'Odstrániť „' + r.n + '“?', danger: true, ok: 'Odstrániť',
            onOk: function () { Store.deleteRecipe(r.id); UI.toast('Odstránené.'); }
          });
        };
        b.appendChild(del);
      }
    });
  }

  function copyYesterday(dateIso) {
    var prev = Store.shift(dateIso, -1);
    var src = Store.state.days[prev];
    if (!src) { UI.toast('Včera nemáš nič zapísané.'); return; }
    var count = Store.SLOTS.reduce(function (s, sl) { return s + (src.meals[sl] || []).length; }, 0);
    if (!count) { UI.toast('Včera nemáš nič zapísané.'); return; }
    UI.confirm({
      title: 'Skopírovať včerajšie jedlo?',
      sub: count + ' položiek z ' + prev + ' sa pridá k dnešnému dňu.',
      ok: 'Skopírovať',
      onOk: function () {
        Store.SLOTS.forEach(function (sl) {
          (src.meals[sl] || []).forEach(function (it) { Store.addItem(dateIso, sl, JSON.parse(JSON.stringify(it))); });
        });
        UI.toast('Skopírované.');
      }
    });
  }

  /* ---------- vykreslenie: dnesny zapis jedla po jedlach ---------- */
  function renderMeals(dateIso, compact) {
    var wrap = h('<div class="card"></div>');
    var any = false;
    Store.SLOTS.forEach(function (slot) {
      var items = Store.day(dateIso).meals[slot] || [];
      if (!items.length) return;
      any = true;
      var tot = slotTotals(dateIso, slot);
      var blk = h('<div class="meal"></div>');
      var head = h('<div class="meal-h"><b>' + esc(Store.SLOT_N[slot]) + '</b><small>' +
        UI.n0(tot.kcal) + ' kcal · B ' + UI.n1(tot.p) + ' g</small></div>');
      if (!compact) {
        var sv = h('<button class="li-x" title="Uložiť ako moje jedlo" aria-label="Uložiť ako moje jedlo">☆</button>');
        sv.onclick = function () { saveSlotAsRecipe(dateIso, slot); };
        head.appendChild(sv);
      }
      blk.appendChild(head);
      var lst = h('<div class="lst"></div>');
      items.forEach(function (it, idx) {
        var nu = itemNutr(it);
        var row = h('<button class="li"><div class="li-mid"><b>' + esc(itemName(it)) +
          '</b><small>' + esc(itemDesc(it)) + ' · B ' + UI.n1(nu.p) + ' g</small></div>' +
          '<div class="li-end"><b>' + UI.n0(nu.kcal) + '</b><small>kcal</small></div></button>');
        row.onclick = function () {
          if (it.t === 'q') {
            UI.confirm({
              title: itemName(it), sub: 'Rýchly zápis sa nedá upraviť — len odstrániť.',
              ok: 'Odstrániť', danger: true,
              onOk: function () { Store.removeItem(dateIso, slot, idx); }
            });
          } else {
            var f = foodById(it.id);
            if (f) openAdd(dateIso, f, slot, { slot: slot, idx: idx, item: it });
          }
        };
        lst.appendChild(row);
      });
      blk.appendChild(lst);
      wrap.appendChild(blk);
    });
    if (!any) {
      wrap.appendChild(h('<div class="empty">Dnes ešte nič zapísané.<br>Ťuknutím na <b>+</b> pridáš jedlo.</div>'));
    }
    return wrap;
  }

  /* ---------- vykreslenie: karta Jedlo ---------- */
  /* hladanie si drzi stav aj po prekresleni — po pridani potraviny
     zostane dopyt v poli a nemusis pisat znova */
  var state = { q: '', cat: '' };

  function renderView(root, dateIso) {
    root.innerHTML = '';

    var card = h('<div class="card"></div>');
    var inp = h('<input type="search" placeholder="Hľadaj potravinu…" autocomplete="off" enterkeyhint="search">');
    inp.value = state.q;
    card.appendChild(inp);
    var cats = h('<div class="chips" style="margin-top:10px"></div>');
    Object.keys(FoodsDB.CATS).forEach(function (cid) {
      if (cid === 'vlastne' && !Store.state.foods.length) return;
      var c = h('<button type="button" class="chip' + (state.cat === cid ? ' on' : '') + '">' + esc(FoodsDB.CATS[cid]) + '</button>');
      c.onclick = function () {
        state.cat = state.cat === cid ? '' : cid;
        UI.$$('.chip', cats).forEach(function (x) { x.classList.remove('on'); });
        if (state.cat) c.classList.add('on');
        paintResults();
      };
      cats.appendChild(c);
    });
    card.appendChild(cats);
    root.appendChild(card);

    var results = h('<div></div>');
    root.appendChild(results);

    function paintResults() {
      results.innerHTML = '';
      if (!state.q && !state.cat) { paintBrowse(); return; }
      browse.hidden = true;
      var list = search(state.q, state.cat);
      var box = h('<div class="card"></div>');
      if (!list.length) {
        box.appendChild(h('<div class="empty">Nič sa nenašlo.<br>Skús iné slovo alebo si potravinu pridaj ako vlastnú.</div>'));
      } else {
        var lst = h('<div class="lst"></div>');
        list.forEach(function (f) {
          var row = h('<button class="li"><div class="li-mid"><b>' + esc(f.n) +
            '</b><small>' + esc(FoodsDB.CATS[f.cat] || '') + ' · B ' + UI.n1(f.per100.p) + ' g / 100 g</small></div>' +
            '<div class="li-end"><b>' + Math.round(f.per100.kcal) + '</b><small>kcal/100 g</small></div></button>');
          row.onclick = function () { openAdd(dateIso, f); };
          lst.appendChild(row);
        });
        box.appendChild(lst);
      }
      results.appendChild(box);
    }

    var browse = h('<div></div>');
    root.appendChild(browse);

    function paintBrowse() {
      browse.hidden = false;
      browse.innerHTML = '';

      var favs = favourites(12);
      if (favs.length) {
        var fc = h('<div class="card"><div class="card-h"><h2>Obľúbené</h2><small>' + favs.length + '</small></div></div>');
        var grid = h('<div class="fav-grid"></div>');
        favs.forEach(function (f) {
          var b = h('<button class="fav"><b>' + esc(f.n) + '</b><small>' +
            (f.unit ? '1 ' + f.unitN + ' · ' : '') + Math.round(f.per100.kcal) + ' kcal/100 g</small></button>');
          b.onclick = function () { openAdd(dateIso, f); };
          grid.appendChild(b);
        });
        fc.appendChild(grid);
        browse.appendChild(fc);
      }

      var recs = Store.state.recipes || [];
      if (recs.length) {
        var rc = h('<div class="card"><div class="card-h"><h2>Moje jedlá</h2><small>celé jedlo jedným ťuknutím</small></div></div>');
        var rl = h('<div class="lst"></div>');
        recs.forEach(function (r) {
          var t = recipeNutr(r);
          var row = h('<button class="li"><div class="li-mid"><b>' + esc(r.n) + '</b><small>' +
            (r.items || []).length + ' položiek · B ' + UI.n1(t.p) + ' g</small></div>' +
            '<div class="li-end"><b>' + UI.n0(t.kcal) + '</b><small>kcal</small></div></button>');
          row.onclick = function () { addRecipeToDay(dateIso, r); };
          rl.appendChild(row);
        });
        rc.appendChild(rl);
        browse.appendChild(rc);
      }

      var act = h('<div class="card"><div class="card-h"><h2>Rýchle akcie</h2></div></div>');
      var btns = h('<div class="row-btns"></div>');
      var b1 = h('<button class="btn sm">Vlastná potravina</button>');
      b1.onclick = function () { openNewFood(dateIso); };
      var b2 = h('<button class="btn sm">Rýchly zápis</button>');
      b2.onclick = function () { openQuick(dateIso); };
      var b3 = h('<button class="btn sm">Skopíruj včerajšie</button>');
      b3.onclick = function () { copyYesterday(dateIso); };
      btns.appendChild(b1); btns.appendChild(b2); btns.appendChild(b3);
      act.appendChild(btns);
      browse.appendChild(act);

      browse.appendChild(h('<div class="sec-t">Zapísané v tento deň</div>'));
      browse.appendChild(renderMeals(dateIso));
    }

    var tmr = null;
    inp.oninput = function () {
      state.q = inp.value;
      if (tmr) clearTimeout(tmr);
      tmr = setTimeout(paintResults, 120);
    };
    inp.onsearch = paintResults;

    paintResults();
  }

  global.Food = {
    foodById: foodById,
    allFoods: allFoods,
    zero: zero,
    itemNutr: itemNutr,
    itemName: itemName,
    itemDesc: itemDesc,
    dayTotals: dayTotals,
    slotTotals: slotTotals,
    search: search,
    favourites: favourites,
    defaultSlot: defaultSlot,
    openAdd: openAdd,
    openQuick: openQuick,
    openNewFood: openNewFood,
    copyYesterday: copyYesterday,
    renderMeals: renderMeals,
    renderView: renderView
  };
})(window);
