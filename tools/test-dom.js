/* Vykresli celu appku v simulovanom prehliadaci (jsdom) a overi,
   ze vsetky karty a interakcie naozaj funguju — bez skutocneho prehliadaca.

   Spustenie (jsdom je nainstalovany mimo repa):
     NODE_PATH=~/.cache/fitapp-test/node_modules node tools/test-dom.js        */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const CSS = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name + (extra ? '  — ' + extra : '')); }
  else { fail++; console.log('  CHYBA ' + name + (extra ? '  — ' + extra : '')); }
}
const wait = ms => new Promise(r => setTimeout(r, ms));

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + e.message));

const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
  virtualConsole: vc,
  url: 'http://localhost/',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});
const window = dom.window;
const d = window.document;
const $ = s => d.querySelector(s);
const $$ = s => Array.from(d.querySelectorAll(s));

/* jsdom nema matchMedia */
window.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
window.scrollTo = () => {};   // jsdom scrollTo neimplementuje
window.addEventListener('error', e => errors.push(String(e.error || e.message)));

function txt(sel) { const e = $(sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }
function btnBy(scope, re) { return $$(scope + ' button').find(b => re.test(b.textContent)); }

main().catch(e => { console.error(e); process.exit(1); });

async function main() {
  /* pockaj, kym jsdom dokonci nacitanie dokumentu, az potom spusti skripty */
  if (d.readyState !== 'complete') {
    await new Promise(r => window.addEventListener('load', r, { once: true }));
  }
  ['foods-db', 'exercises-db', 'store', 'targets', 'ui', 'charts', 'food', 'training', 'stats', 'app']
    .forEach(f => {
      try { window.eval(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8')); }
      catch (e) { errors.push(f + '.js: ' + e.message); }
    });
  await wait(30);

  console.log('\n1) Nacitanie a start');
  check('ziadna chyba pri nacitani skriptov', errors.length === 0, errors.join(' | ') || 'bez chyb');
  check('appka sa nastartovala', !!window.App);
  check('databaza potravin nacitana', window.FoodsDB.count > 150, window.FoodsDB.count + ' potravin');

  console.log('\n2) Karta Dnes');
  check('kcal kruh vykresleny', !!$('#v-dnes .ring-v'));
  check('makro pruhy (B/T/U/vlaknina)', $$('#v-dnes .bar-row').length >= 4, $$('#v-dnes .bar-row').length + ' pruhov');
  check('mikrozivinove chipy', $$('#v-dnes .mchip').length >= 5, $$('#v-dnes .mchip').length + ' chipov');
  check('tyzdenny objem na 6 partii', $$('#v-dnes .volrow').length === 6);
  check('veta "co este treba"', /kcal|bielkovin/i.test(txt('#v-dnes .hint')), txt('#v-dnes .hint').slice(0, 72));
  check('spodna navigacia ma 4 polozky', $$('#nav button').length === 4);
  check('FAB viditelny', !$('#fab').hidden);

  console.log('\n3) Pridanie jedla cez FAB');
  $('#fab').click();
  check('otvoril sa bottom sheet', !$('#sheet').hidden);
  const srch = $('#sheetBody input[type=search]');
  srch.value = 'kuracie prsia';
  srch.oninput();
  await wait(180);
  const rows = $$('#sheetBody .li');
  check('hladanie naslo vysledky', rows.length > 0, rows.length + ' vysledkov');
  rows[0].click();

  const stp = $('#sheetBody .stp input');
  check('stepper gramaze predvyplneny', !!stp && parseFloat(String(stp.value).replace(',', '.')) > 0, stp && stp.value + ' g');
  check('ciselna klavesnica na mobile', stp.getAttribute('inputmode') === 'decimal');
  check('vstupy maju font 16px (iOS nezoomne)', /input,select,textarea\{[^}]*font-size:16px/.test(CSS.replace(/\s+/g, '')));
  const chips = $$('#sheetBody .chip');
  check('rychle cipy gramaze', chips.length >= 5, chips.length + ' cipov');
  chips.find(c => c.textContent.trim() === '150 g').click();
  check('cip nastavil 150 g', String(stp.value) === '150', stp.value);
  btnBy('#sheetBody', /Pridať do dňa/).click();
  check('sheet sa zavrel', $('#sheet').hidden);

  const tot = window.Food.dayTotals(window.App.date);
  check('jedlo zapisane', tot.kcal > 100, Math.round(tot.kcal) + ' kcal · B ' + Math.round(tot.p) + ' g');
  check('objavilo sa na karte Dnes', /kuracie/i.test(txt('#v-dnes')));

  console.log('\n4) Karta Trening');
  window.App.go('trening');
  check('ponuka 4 jednotiek', $$('#v-trening .btn.sm').length >= 4);
  btnBy('#v-trening', /^\s*Fitko\s*$/).click();
  check('cviky predvyplnene z planu', $$('#v-trening .ex').length === 7, $$('#v-trening .ex').length + ' cvikov');
  check('prvy cvik je hip thrust', /Hip thrust/.test(txt('#v-trening .ex')));

  btnBy('#v-trening', /séria/).click();
  const stps = $$('#sheetBody .stp input');
  check('sheet serie ma vahu aj opakovania', stps.length === 2);
  stps[0].value = '40'; stps[0].onchange();
  stps[1].value = '8'; stps[1].onchange();
  const logBtn = btnBy('#sheetBody', /Zapísať sériu/);
  for (let i = 0; i < 4; i++) logBtn.click();
  check('zapisane 4 serie', $$('#sheetBody .sbadge').length === 4);
  check('spustil sa casovac prestavky', !$('#restBar').hidden, $('#restLeft').textContent);
  btnBy('#sheetBody', /^\s*Hotovo\s*$/).click();

  const w = window.Store.workouts(window.App.date).find(x => x.session === 'gym');
  check('objem 4 × 8 × 40 = 1280 kg', window.Training.workoutVolume(w) === 1280, window.Training.workoutVolume(w) + ' kg');
  const wr = window.Training.weekRange(window.App.date);
  const sets = window.Training.setsByGroup(wr.from, wr.to);
  check('4 serie pripocitane zadku', sets.zadok === 4, sets.zadok + ' sérií');
  check('objem sa ukazal aj na karte Dnes', (window.App.go('dnes'), /Fitko/.test(txt('#v-dnes'))));

  console.log('\n5) Karta Prehlad');
  window.App.go('prehlad');
  check('KPI dlazdice', $$('#v-prehlad .kpi').length >= 6, $$('#v-prehlad .kpi').length);
  check('graf kalorii po dnoch', !!$('#v-prehlad svg.chart'));
  check('slovne hodnotenie — 7 bodov', $$('#v-prehlad .vline').length === 7, $$('#v-prehlad .vline').length);
  check('zaverecna veta', !!$('#v-prehlad .summary'), txt('#v-prehlad .summary').slice(0, 80));
  $$('#v-prehlad .seg button')[2].click();
  check('prepnutie na Mesiac', /30 dní/.test(txt('#v-prehlad')));
  $$('#v-prehlad .seg button')[0].click();
  check('prepnutie na Den', /Tento deň/.test(txt('#v-prehlad')));

  console.log('\n6) Karta Jedlo');
  window.App.go('jedlo');
  check('hladacie pole', !!$('#v-jedlo input[type=search]'));
  check('kategorie na prehliadanie', $$('#v-jedlo .chip').length >= 8, $$('#v-jedlo .chip').length);
  check('oblubene sa naplnili samy', /Obľúbené/.test(txt('#v-jedlo')));
  check('rychle akcie', /Skopíruj včerajšie/.test(txt('#v-jedlo')));

  console.log('\n7) Nastavenia, tema, zaloha');
  window.App.go('nastavenia');
  check('profil so steppermi', $$('#v-nastavenia .stp').length >= 6, $$('#v-nastavenia .stp').length);
  check('prepocet BMR/TDEE', /BMR/.test(txt('#v-nastavenia')));
  check('FAB skryty v nastaveniach', $('#fab').hidden);
  btnBy('#v-nastavenia', /^\s*Svetlý\s*$/).click();
  check('svetla tema', d.documentElement.getAttribute('data-theme') === 'light');
  btnBy('#v-nastavenia', /^\s*Tmavý\s*$/).click();
  check('spat na tmavu', d.documentElement.getAttribute('data-theme') === 'dark');

  /* zmena vahy musi prepocitat ciele */
  const before = window.Targets.forDate(window.App.date).p;
  const wStp = $$('#v-nastavenia .stp')[2];
  wStp.setValue(80);
  const after = window.Targets.forDate(window.App.date).p;
  check('zmena vahy prepocita bielkoviny', after > before, before + ' g -> ' + after + ' g');
  wStp.setValue(67);

  const json = window.Store.exportJSON();
  check('export obsahuje data', json.length > 500 && json.includes('workouts'), Math.round(json.length / 1024) + ' kB');
  window.Store.importJSON(json);
  check('import prebehol', window.Food.dayTotals(window.App.date).kcal > 100);

  console.log('\n8) Navigacia po dnoch');
  window.App.go('dnes');
  const dnesIso = window.App.date;
  $('#prevDay').click();
  check('posun na vcerajsok', window.App.date < dnesIso, window.App.date);
  check('hlavicka ukazuje Včera', $('#dayTitle').textContent === 'Včera', $('#dayTitle').textContent);
  $('#nextDay').click();
  check('spat na Dnes', window.App.date === dnesIso && $('#dayTitle').textContent === 'Dnes');
  $('#nextDay').click();
  check('do buducnosti sa prepnut neda', window.App.date === dnesIso);

  console.log('\n9) Prazdny stav (nova pouzivatelka)');
  window.Store.reset();
  await wait(10);
  check('appka nespadne na prazdnych datach', !!$('#v-dnes .ring-v'));
  check('vyzva na zapis', /ešte nič zapísané/i.test(txt('#v-dnes')));
  window.App.go('prehlad');
  check('prehlad zvlada prazdne data', /nemáš zapísané/i.test(txt('#v-prehlad')));

  check('ziadna chyba pocas celeho testu', errors.length === 0, errors.join(' | ') || 'bez chyb');

  console.log('\n' + (fail ? 'NEPRESLO: ' + fail + ' chyb, ' : 'VSETKO PRESLO: ') + pass + ' kontrol ok\n');
  process.exit(fail ? 1 : 0);
}
