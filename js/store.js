/* ============================================================================
   store.js — vsetky data v jednom localStorage kluci, zapis je debouncovany.
   Zadne tlacidlo "Ulozit": kazda zmena sa ulozi sama.
   Zaloha: Nastavenia -> Export JSON (localStorage zije len v tomto prehliadaci).
   ============================================================================ */
(function (global) {
  'use strict';

  var KEY = 'fitapp.v1';
  var SCHEMA = 1;

  var DEFAULTS = {
    v: SCHEMA,
    profile: {
      age: 26,
      h: 174.5,
      w: 67,
      sex: 'f',
      neat: 1.2,        // sedava praca
      surplus: 150,     // kcal nad TDEE — pomale naberanie
      pPerKg: 2.0,
      fPerKg: 1.0,
      manual: null      // { kcal, p, f, c } ak si ciele prepise rucne
    },
    days: {},           // '2026-10-18' -> { meals: {...}, water: 0, note: '' }
    workouts: {},       // '2026-10-18' -> [ sessions ]
    foods: [],          // vlastne potraviny
    recipes: [],        // moje jedla
    favs: {},           // foodId -> pocet pouziti
    weights: {},        // '2026-10-18' -> kg (nepovinne)
    settings: { theme: 'dark', rest: 120 }
  };

  var state = null;
  var timer = null;
  var listeners = [];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function fill(target, def) {
    Object.keys(def).forEach(function (k) {
      if (target[k] === undefined || target[k] === null && def[k] !== null) {
        target[k] = clone(def[k]);
      } else if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k]) && typeof target[k] === 'object') {
        fill(target[k], def[k]);
      }
    });
    return target;
  }

  function load() {
    var raw = null;
    try { raw = global.localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (!raw) { state = clone(DEFAULTS); return; }
    try {
      var parsed = JSON.parse(raw);
      state = fill(parsed && typeof parsed === 'object' ? parsed : {}, DEFAULTS);
      state.v = SCHEMA;
    } catch (e) {
      state = clone(DEFAULTS);
    }
  }

  function flush() {
    timer = null;
    try {
      global.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      if (global.UI && UI.toast) UI.toast('Nepodarilo sa uložiť — pamäť prehliadača je plná.');
    }
  }

  /* zmena -> ulozit do 250 ms + prekreslit */
  function touch(silent) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 250);
    if (!silent) listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
  }

  /* ---------- datumy ---------- */
  function iso(d) {
    var dt = d instanceof Date ? d : new Date(d);
    return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  }
  function today() { return iso(new Date()); }
  function shift(dateIso, days) {
    var p = dateIso.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    d.setDate(d.getDate() + days);
    return iso(d);
  }
  function toDate(dateIso) {
    var p = dateIso.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  /* ---------- den jedla ---------- */
  var SLOTS = ['ranajky', 'obed', 'vecera', 'snack'];
  var SLOT_N = { ranajky: 'Raňajky', obed: 'Obed', vecera: 'Večera', snack: 'Snack' };

  function day(dateIso, create) {
    var d = state.days[dateIso];
    if (!d && create) {
      d = state.days[dateIso] = { meals: { ranajky: [], obed: [], vecera: [], snack: [] }, water: 0, note: '' };
    }
    if (d && !d.meals) d.meals = { ranajky: [], obed: [], vecera: [], snack: [] };
    if (d) SLOTS.forEach(function (s) { if (!d.meals[s]) d.meals[s] = []; });
    return d || { meals: { ranajky: [], obed: [], vecera: [], snack: [] }, water: 0, note: '' };
  }

  function addItem(dateIso, slot, item) {
    var d = day(dateIso, true);
    d.meals[slot].push(item);
    if (item.t === 'f') state.favs[item.id] = (state.favs[item.id] || 0) + 1;
    touch();
  }
  function removeItem(dateIso, slot, idx) {
    var d = state.days[dateIso];
    if (!d || !d.meals[slot]) return;
    d.meals[slot].splice(idx, 1);
    touch();
  }
  function updateItem(dateIso, slot, idx, patch) {
    var d = state.days[dateIso];
    if (!d || !d.meals[slot] || !d.meals[slot][idx]) return;
    Object.assign(d.meals[slot][idx], patch);
    touch();
  }

  /* ---------- treningy ---------- */
  function workouts(dateIso) {
    var w = state.workouts[dateIso];
    return Array.isArray(w) ? w : [];
  }
  function addWorkout(dateIso, w) {
    if (!Array.isArray(state.workouts[dateIso])) state.workouts[dateIso] = [];
    state.workouts[dateIso].push(w);
    touch();
    return state.workouts[dateIso].length - 1;
  }
  function removeWorkout(dateIso, idx) {
    var arr = state.workouts[dateIso];
    if (!arr) return;
    arr.splice(idx, 1);
    if (!arr.length) delete state.workouts[dateIso];
    touch();
  }

  /* posledny zapisany vykon daneho cviku pred datumom — "co mam prekonat" */
  function lastPerf(exId, beforeIso) {
    var dates = Object.keys(state.workouts).filter(function (d) { return d < beforeIso; }).sort().reverse();
    for (var i = 0; i < dates.length; i++) {
      var list = workouts(dates[i]);
      for (var j = list.length - 1; j >= 0; j--) {
        var entries = list[j].entries || [];
        for (var k = 0; k < entries.length; k++) {
          if (entries[k].exId === exId && (entries[k].sets || []).length) {
            return { date: dates[i], sets: entries[k].sets };
          }
        }
      }
    }
    return null;
  }

  /* ---------- vlastne potraviny a recepty ---------- */
  function addFood(f) {
    f.id = 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    f.cat = 'vlastne';
    state.foods.push(f);
    touch();
    return f;
  }
  function deleteFood(id) {
    state.foods = state.foods.filter(function (f) { return f.id !== id; });
    touch();
  }
  function addRecipe(r) {
    r.id = 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    state.recipes.push(r);
    touch();
    return r;
  }
  function deleteRecipe(id) {
    state.recipes = state.recipes.filter(function (r) { return r.id !== id; });
    touch();
  }

  /* ---------- export / import ---------- */
  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }
  function importJSON(text) {
    var parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || !parsed.profile) {
      throw new Error('Toto nie je záložný súbor tejto appky.');
    }
    state = fill(parsed, DEFAULTS);
    state.v = SCHEMA;
    flush();
    listeners.forEach(function (fn) { fn(); });
  }
  function reset() {
    state = clone(DEFAULTS);
    flush();
    listeners.forEach(function (fn) { fn(); });
  }

  load();

  global.Store = {
    SLOTS: SLOTS,
    SLOT_N: SLOT_N,
    get state() { return state; },
    get profile() { return state.profile; },
    get settings() { return state.settings; },
    touch: touch,
    onChange: function (fn) { listeners.push(fn); },
    iso: iso,
    today: today,
    shift: shift,
    toDate: toDate,
    day: day,
    addItem: addItem,
    removeItem: removeItem,
    updateItem: updateItem,
    workouts: workouts,
    addWorkout: addWorkout,
    removeWorkout: removeWorkout,
    lastPerf: lastPerf,
    addFood: addFood,
    deleteFood: deleteFood,
    addRecipe: addRecipe,
    deleteRecipe: deleteRecipe,
    exportJSON: exportJSON,
    importJSON: importJSON,
    reset: reset
  };
})(window);
