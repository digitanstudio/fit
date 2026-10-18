/* ============================================================================
   charts.js — male inline-SVG grafy, bez kniznice.
   viewBox + width:100% => graf sa sam prisposobi sirke telefonu.
   ============================================================================ */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function svg(w, hh) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 ' + w + ' ' + hh);
    s.setAttribute('class', 'chart');
    // jednotne skalovanie: text sa nedeformuje, vysku urci pomer stran
    return s;
  }
  function mk(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  /* stlpcovy graf: data = [{label, value, color}], target = ciarkovana linka */
  function bars(opts) {
    var data = opts.data || [];
    var H = opts.height || 110;
    var padB = 16, padT = 6;
    var W = 300;
    var n = Math.max(1, data.length);
    var gap = n > 14 ? 1.5 : 4;
    var bw = (W - gap * (n - 1)) / n;

    var maxV = 0;
    data.forEach(function (d) { maxV = Math.max(maxV, +d.value || 0); });
    if (opts.target) maxV = Math.max(maxV, opts.target * 1.15);
    if (maxV <= 0) maxV = 1;

    var s = svg(W, H);
    var plotH = H - padB - padT;
    function y(v) { return padT + plotH - (v / maxV) * plotH; }

    s.appendChild(mk('line', { x1: 0, y1: y(0), x2: W, y2: y(0), class: 'gl' }));

    if (opts.target) {
      s.appendChild(mk('line', { x1: 0, y1: y(opts.target), x2: W, y2: y(opts.target), class: 'tgt' }));
    }

    data.forEach(function (d, i) {
      var v = +d.value || 0;
      var x = i * (bw + gap);
      var hgt = Math.max(v > 0 ? 2 : 0, (v / maxV) * plotH);
      var r = mk('rect', {
        x: x.toFixed(2), y: (padT + plotH - hgt).toFixed(2),
        width: bw.toFixed(2), height: hgt.toFixed(2),
        rx: Math.min(2.5, bw / 2).toFixed(2),
        fill: d.color || 'var(--acc)'
      });
      if (d.title) { var t = mk('title', {}); t.textContent = d.title; r.appendChild(t); }
      s.appendChild(r);
      if (d.label && (n <= 10 || i % Math.ceil(n / 8) === 0)) {
        var tx = mk('text', { x: (x + bw / 2).toFixed(2), y: H - 4, 'text-anchor': 'middle' });
        tx.textContent = d.label;
        s.appendChild(tx);
      }
    });
    return s;
  }

  /* spojnicovy graf s plochou pod krivkou — na trendy (objem, vaha) */
  function line(opts) {
    var data = (opts.data || []).filter(function (d) { return d.value != null; });
    var H = opts.height || 110;
    var W = 300, padB = 16, padT = 8, padL = 2, padR = 2;
    if (data.length < 2) {
      var e = document.createElement('div');
      e.className = 'empty';
      e.textContent = opts.empty || 'Na graf treba aspoň dva zápisy.';
      return e;
    }
    var vals = data.map(function (d) { return +d.value; });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    if (opts.target) { mn = Math.min(mn, opts.target); mx = Math.max(mx, opts.target); }
    var pad = (mx - mn) * 0.15 || Math.max(1, mx * 0.08);
    mn -= pad; mx += pad;

    var s = svg(W, H);
    var plotH = H - padB - padT, plotW = W - padL - padR;
    function x(i) { return padL + (i / (data.length - 1)) * plotW; }
    function y(v) { return padT + plotH - ((v - mn) / (mx - mn)) * plotH; }

    if (opts.target) {
      s.appendChild(mk('line', { x1: 0, y1: y(opts.target).toFixed(2), x2: W, y2: y(opts.target).toFixed(2), class: 'tgt' }));
    }

    var d1 = data.map(function (d, i) { return (i ? 'L' : 'M') + x(i).toFixed(2) + ' ' + y(d.value).toFixed(2); }).join(' ');
    var area = d1 + ' L' + x(data.length - 1).toFixed(2) + ' ' + (padT + plotH) + ' L' + x(0).toFixed(2) + ' ' + (padT + plotH) + ' Z';
    var col = opts.color || 'var(--acc)';

    var g = mk('path', { d: area, fill: col, opacity: '0.14' });
    s.appendChild(g);
    s.appendChild(mk('path', {
      d: d1, fill: 'none', stroke: col, 'stroke-width': '2',
      'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke'
    }));
    data.forEach(function (d, i) {
      s.appendChild(mk('circle', { cx: x(i).toFixed(2), cy: y(d.value).toFixed(2), r: 2.4, fill: col }));
    });
    data.forEach(function (d, i) {
      if (!d.label) return;
      if (data.length > 8 && i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return;
      var tx = mk('text', { x: x(i).toFixed(2), y: H - 4, 'text-anchor': i === 0 ? 'start' : (i === data.length - 1 ? 'end' : 'middle') });
      tx.textContent = d.label;
      s.appendChild(tx);
    });
    return s;
  }

  global.Charts = { bars: bars, line: line };
})(window);
