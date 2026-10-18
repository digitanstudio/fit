/* ============================================================================
   sw.js — service worker: appka funguje aj bez internetu.
   Strategia: najprv cache (okamzite sa otvori), na pozadi stiahne novu verziu
   a ulozi ju — pri dalsom otvoreni uz mas aktualnu appku.
   Po zmene suborov zvys VERSION, aby sa stara cache zahodila.
   ============================================================================ */
var VERSION = 'v1';
var CACHE = 'fitapp-' + VERSION;

var ASSETS = [
  './',
  'index.html',
  'css/style.css',
  'js/foods-db.js',
  'js/exercises-db.js',
  'js/store.js',
  'js/targets.js',
  'js/ui.js',
  'js/charts.js',
  'js/food.js',
  'js/training.js',
  'js/stats.js',
  'js/app.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { /* ked nieco chyba, appka aj tak pobezi zo siete */ })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        /* offline: ak ide o navigaciu, vrat ulozenu uvodnu stranku */
        return hit || caches.match('index.html');
      });
      return hit || net;
    })
  );
});
