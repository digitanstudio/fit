/* Logicky test vypoctov bez prehliadaca:
   overi ciele, kalorie z pohybu, sucty jedla, tyzdenny objem a hodnotenie.
   Spustenie:  node tools/test-logic.js                                      */
'use strict';
const path = require('path');

/* --- minimalna nahrada prehliadaca pre moduly, ktore nepotrebuju DOM --- */
const store = {};
global.window = global;
global.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] === undefined ? null : this._d[k]; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; }
};
global.console = console;

function load(f) { require(path.join(__dirname, '..', 'js', f)); }
load('foods-db.js');
load('exercises-db.js');
load('store.js');
load('targets.js');

/* UI/Food/Training/Stats potrebuju DOM — doplnime len tie casti, ktore
   pouziva vypoctova logika (sucty jedla, objem, agregacia). */
global.UI = {
  n0: x => String(Math.round(x)), n1: x => String(Math.round(x * 10) / 10),
  nx: (x, d) => (+x).toFixed(d), esc: s => s, h: () => ({ appendChild() {} })
};
const FoodsDB = window.FoodsDB, Store = window.Store, Targets = window.Targets, ExDB = window.ExDB;

/* --- minimalna kopia suctovacej logiky z food.js / training.js --- */
const COLS = FoodsDB.COLS;
function foodById(id) { return FoodsDB.byId[id] || Store.state.foods.find(f => f.id === id) || null; }
function itemNutr(it) {
  const o = {}; COLS.forEach(c => o[c] = 0);
  if (it.t === 'q') { o.kcal = it.kcal || 0; o.p = it.p || 0; o.f = it.f || 0; o.c = it.c || 0; return o; }
  const f = foodById(it.id); if (!f) return o;
  const k = (it.g || 0) / 100;
  COLS.forEach(c => o[c] = (f.per100[c] || 0) * k);
  return o;
}
function dayTotals(d) {
  const o = {}; COLS.forEach(c => o[c] = 0);
  const day = Store.day(d);
  Store.SLOTS.forEach(s => (day.meals[s] || []).forEach(it => {
    const n = itemNutr(it); COLS.forEach(c => o[c] += n[c]);
  }));
  return o;
}
function workoutVolume(w) {
  return (w.entries || []).reduce((t, e) =>
    t + (e.sets || []).reduce((s, x) => s + (x.kg || 0) * (x.reps || 0), 0), 0);
}
function setsByGroup(from, to) {
  const out = {}; Object.keys(ExDB.GROUPS).forEach(k => out[k] = 0);
  Object.keys(Store.state.workouts).forEach(d => {
    if (d < from || d > to) return;
    Store.workouts(d).forEach(w => (w.entries || []).forEach(e => {
      const def = ExDB.byId[e.exId] || {};
      const n = (e.sets || []).length; if (!n) return;
      const g = e.g || def.g, g2 = e.g2 || def.g2;
      if (g && out[g] !== undefined) out[g] += n;
      if (g2 && out[g2] !== undefined) out[g2] += n * 0.5;
    }));
  });
  return out;
}

/* ---------------------------- testy ---------------------------- */
let pass = 0, fail = 0;
function check(name, got, want, tol) {
  const ok = tol == null ? got === want : Math.abs(got - want) <= tol;
  if (ok) { pass++; console.log('  ok   ' + name + '  = ' + got); }
  else { fail++; console.log('  CHYBA ' + name + '  = ' + got + '  (ocakavane ' + want + (tol ? ' ±' + tol : '') + ')'); }
}

const D = '2026-10-19';   // pondelok

console.log('\n1) Profil 26 r. / 174,5 cm / 67 kg — ciele bez zapisaneho pohybu');
const t0 = Targets.forDate(D);
check('BMR', t0.bmr, 1470, 2);
check('zaklad pri sedavej praci', t0.base, 1764, 3);
check('TDEE bez pohybu', t0.tdee, 1764, 3);
check('ciel kcal', t0.kcal, 1914, 3);
check('bielkoviny g', t0.p, 135);
check('tuky g', t0.f, 67);
check('uhlohydraty g', t0.c, Math.round((1914 - 135 * 4 - 67 * 9) / 4), 1);

console.log('\n2) Kalorie z pohybu');
check('chodza 5 km', Targets.sessionKcal({ session: 'walk', km: 5 }, 67), 211, 2);
check('fitko 65 min', Targets.sessionKcal({ session: 'gym', min: 65 }, 67), 290, 2);

console.log('\n3) Den s fitkom a chodzou -> vyssi ciel');
Store.addWorkout(D, { session: 'gym', min: 65, entries: [] });
Store.addWorkout(D, { session: 'walk', km: 5, min: 50, entries: [] });
const t1 = Targets.forDate(D);
check('TDEE s pohybom', t1.tdee, 1764 + 290 + 211, 3);
check('ciel kcal treningovy den', t1.kcal, 1764 + 290 + 211 + 150, 3);
check('je to treningovy den', t1.training, true);

console.log('\n4) Zapis jedla');
Store.addItem(D, 'obed', { t: 'f', id: 'kurprsg', g: 150 });   // grilovane kuracie
Store.addItem(D, 'obed', { t: 'f', id: 'ryzabiela', g: 200 });
Store.addItem(D, 'vecera', { t: 'f', id: 'tofu', g: 150 });
Store.addItem(D, 'ranajky', { t: 'f', id: 'tahini', g: 20 });
const n = dayTotals(D);
check('150 g kuraciny: bielkoviny', Math.round(itemNutr({ t: 'f', id: 'kurprsg', g: 150 }).p), 47, 1);
check('150 g kuraciny: kcal', Math.round(itemNutr({ t: 'f', id: 'kurprsg', g: 150 }).kcal), 248, 2);
check('20 g tahini: vapnik mg', Math.round(itemNutr({ t: 'f', id: 'tahini', g: 20 }).ca), 85, 1);
check('vapnik spolu (tofu+tahini+ryza+kura)', Math.round(n.ca), 653, 3);
check('bielkoviny spolu', Math.round(n.p), 79, 2);

console.log('\n5) Trening: objem a tyzdenny pocet serii');
const wi = Store.addWorkout(D, {
  session: 'homeA', min: 45,
  entries: [
    { exId: 'hipthrust_bar', sets: [{ kg: 40, reps: 8 }, { kg: 40, reps: 8 }, { kg: 40, reps: 8 }, { kg: 40, reps: 8 }] },
    { exId: 'rdl_db', sets: [{ kg: 20, reps: 10 }, { kg: 20, reps: 10 }] }
  ]
});
check('objem hip thrust 4x8x40', workoutVolume(Store.workouts(D)[wi]), 4 * 8 * 40 + 2 * 10 * 20);
const wr = { from: '2026-10-19', to: '2026-10-25' };
const sg = setsByGroup(wr.from, wr.to);
check('serie na zadok (4 hip thrust + 2 RDL)', sg.zadok, 6);
check('serie na zadnu stranu (polovicny kredit z RDL)', sg.zadna, 1);

console.log('\n6) Posledny vykon cviku (co mam prekonat)');
Store.addWorkout('2026-10-26', { session: 'homeA', min: 45, entries: [{ exId: 'hipthrust_bar', sets: [] }] });
const lp = Store.lastPerf('hipthrust_bar', '2026-10-26');
check('nasiel predchadzajuci zapis', lp && lp.date, D);
check('pocet serii v nom', lp && lp.sets.length, 4);

console.log('\n7) Navrhy na doplnenie zivin');
const sug = Targets.suggest('ca', 400, 2);
check('navrhy na vapnik existuju', sug.length > 0, true);
console.log('       -> ' + sug.map(s => s.g + ' g ' + s.f.n).join(' alebo '));
const sp = Targets.suggest('p', 30, 2);
console.log('       -> bielkoviny: ' + sp.map(s => s.g + ' g ' + s.f.n).join(' alebo '));

console.log('\n8) Export / import zaloha');
const json = Store.exportJSON();
const before = Math.round(dayTotals(D).kcal);
Store.reset();
check('po resete je den prazdny', Math.round(dayTotals(D).kcal), 0);
Store.importJSON(json);
check('po importe su data spat', Math.round(dayTotals(D).kcal), before);

console.log('\n' + (fail ? 'NEPRESLO: ' + fail + ' chyb, ' : 'VSETKO PRESLO: ') + pass + ' kontrol ok\n');
process.exit(fail ? 1 : 0);
