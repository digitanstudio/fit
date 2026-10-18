/* ============================================================================
   ui.js — male UI nastroje: bottom sheet, toast, steppery, casovac prestavky.
   Vsetko navrhnute na palec: vysoke tlacidla, ciselna klavesnica, ziadne modaly.
   ============================================================================ */
(function (global) {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* html string -> element */
  function h(html) {
    var t = document.createElement('template');
    t.innerHTML = String(html).trim();
    return t.content.firstElementChild;
  }

  /* cisla: 1 234 namiesto 1234, desatinne s ciarkou */
  function n0(x) {
    var v = Math.round(+x || 0);
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function n1(x) {
    var v = (+x || 0);
    var s = (Math.abs(v) < 10 ? v.toFixed(1) : String(Math.round(v)));
    return s.replace('.', ',').replace(/,0$/, '');
  }
  function nx(x, d) {
    return (+x || 0).toFixed(d).replace('.', ',').replace(/,?0+$/, function (m) { return m.indexOf(',') === 0 ? '' : m; });
  }

  /* ---------- toast ---------- */
  var toastT = null;
  function toast(msg, ms) {
    var el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    if (toastT) clearTimeout(toastT);
    toastT = setTimeout(function () { el.hidden = true; }, ms || 2200);
  }

  /* ---------- bottom sheet ---------- */
  var sheetEl, bodyEl, onCloseCb = null;

  function openSheet(opts) {
    sheetEl = $('#sheet'); bodyEl = $('#sheetBody');
    bodyEl.innerHTML = '';
    if (opts.title) {
      bodyEl.appendChild(h('<div class="sheet-t">' + esc(opts.title) + '</div>'));
      if (opts.sub) bodyEl.appendChild(h('<div class="sheet-sub">' + esc(opts.sub) + '</div>'));
    }
    if (opts.build) opts.build(bodyEl);
    sheetEl.hidden = false;
    onCloseCb = opts.onClose || null;
    if (opts.focus) {
      setTimeout(function () { var f = $(opts.focus, bodyEl); if (f) f.focus(); }, 80);
    }
  }

  function closeSheet() {
    if (!sheetEl) sheetEl = $('#sheet');
    sheetEl.hidden = true;
    if (bodyEl) bodyEl.innerHTML = '';
    var cb = onCloseCb; onCloseCb = null;
    if (cb) cb();
  }

  function isSheetOpen() { return !$('#sheet').hidden; }

  /* potvrdenie — tiez ako sheet, nie ako systemovy dialog */
  function confirm(opts) {
    openSheet({
      title: opts.title,
      sub: opts.sub,
      build: function (b) {
        var row = h('<div class="row2"></div>');
        var no = h('<button class="btn gho">Zrušiť</button>');
        var yes = h('<button class="btn ' + (opts.danger ? 'dan' : 'pri') + '">' + esc(opts.ok || 'Potvrdiť') + '</button>');
        no.onclick = closeSheet;
        yes.onclick = function () { closeSheet(); opts.onOk(); };
        row.appendChild(no); row.appendChild(yes);
        b.appendChild(row);
      }
    });
  }

  /* ---------- stepper ---------- */
  /* velke -/+ tlacidla, do polia sa da aj pisat (ciselna klavesnica) */
  function stepper(opts) {
    var step = opts.step || 1;
    var dec = opts.dec || 0;
    var min = opts.min === undefined ? 0 : opts.min;
    var max = opts.max === undefined ? 9999 : opts.max;
    var wrap = h(
      '<div class="stp">' +
      '<button type="button" aria-label="Menej">−</button>' +
      '<input type="text" inputmode="decimal" enterkeyhint="done">' +
      '<button type="button" aria-label="Viac">+</button>' +
      '</div>'
    );
    var btns = $$('button', wrap);
    var inp = $('input', wrap);

    function fmt(v) { return dec ? String(v.toFixed(dec)).replace('.', ',') : String(Math.round(v)); }
    function read() {
      var v = parseFloat(String(inp.value).replace(',', '.'));
      return isNaN(v) ? (opts.value || min) : v;
    }
    function set(v, silent) {
      v = Math.min(max, Math.max(min, v));
      v = Math.round(v / (dec ? Math.pow(10, -dec) : 1)) * (dec ? Math.pow(10, -dec) : 1);
      inp.value = fmt(v);
      if (!silent && opts.onChange) opts.onChange(v);
    }
    btns[0].onclick = function () { set(read() - step); };
    btns[1].onclick = function () { set(read() + step); };
    inp.onchange = function () { set(read()); };
    inp.onfocus = function () { inp.select(); };
    set(opts.value === undefined ? min : opts.value, true);

    wrap.getValue = read;
    wrap.setValue = set;
    return wrap;
  }

  function field(labelText, control) {
    var l = h('<label class="fld"><span>' + esc(labelText) + '</span></label>');
    l.appendChild(control);
    return l;
  }

  /* ---------- casovac prestavky medzi seriami ---------- */
  var restEnd = 0, restTick = null;
  function restStart(sec) {
    restEnd = Date.now() + sec * 1000;
    $('#restBar').hidden = false;
    if (restTick) clearInterval(restTick);
    restTick = setInterval(restRender, 250);
    restRender();
  }
  function restRender() {
    var left = Math.max(0, Math.round((restEnd - Date.now()) / 1000));
    $('#restLeft').textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
    if (left <= 0) {
      restStop();
      toast('Prestávka hotová — ďalšia séria.');
      if (navigator.vibrate) { try { navigator.vibrate([120, 80, 120]); } catch (e) {} }
    }
  }
  function restStop() {
    if (restTick) clearInterval(restTick);
    restTick = null;
    $('#restBar').hidden = true;
  }

  /* ---------- pruh (makro bar) ---------- */
  function bar(name, have, target, unit, col) {
    var pct = target > 0 ? Math.min(100, (have / target) * 100) : 0;
    var over = target > 0 && have > target * 1.0001;
    var row = h(
      '<div class="bar-row">' +
      '<div class="nm">' + esc(name) + '</div>' +
      '<div class="vl"><b>' + n1(have) + '</b> / ' + n1(target) + ' ' + esc(unit) + '</div>' +
      '<div class="track"><div class="fill' + (over ? ' over' : '') + '"></div></div>' +
      '</div>'
    );
    var fill = $('.fill', row);
    fill.style.width = pct.toFixed(1) + '%';
    fill.style.background = col;
    return row;
  }

  /* zavretie sheetu kliknutim na pozadie / uchytku / Escape */
  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('[data-close]')) closeSheet();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isSheetOpen()) closeSheet();
  });

  global.UI = {
    $: $, $$: $$, h: h, esc: esc,
    n0: n0, n1: n1, nx: nx,
    toast: toast,
    sheet: openSheet,
    close: closeSheet,
    isSheetOpen: isSheetOpen,
    confirm: confirm,
    stepper: stepper,
    field: field,
    restStart: restStart,
    restStop: restStop,
    bar: bar
  };
})(window);
