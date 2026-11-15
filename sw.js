/* Service worker for the PWA (AR table). Network first for files of this site, cache as offline fallback.
 * Requests to other hosts (NASA tiles and APIs, fonts, Leaflet CDN) are not intercepted.
 * Bump VERSION when files change so old caches are removed. */
var VERSION = "abf-2026-11-15b";
var PRECACHE = [
    "./",
    "css/ar.css",
    "css/quiz.css",
    "css/relics.css",
    "css/space.css",
    "css/styles.css",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "index.html",
    "js/app.js",
    "js/ar.i18n.js",
    "js/ar.js",
    "js/archaeology.i18n.js",
    "js/archaeology.js",
    "js/ba.js",
    "js/comparison.i18n.js",
    "js/comparison.js",
    "js/condition.js",
    "js/data.js",
    "js/globe.js",
    "js/i18n.js",
    "js/impact.i18n.js",
    "js/impact.js",
    "js/journey.i18n.js",
    "js/journey.js",
    "js/models.js",
    "js/mtl.js",
    "js/photos.i18n.js",
    "js/photos.js",
    "js/quiz.data.js",
    "js/quiz.i18n.js",
    "js/quiz.js",
    "js/quiz.questions.i18n.js",
    "js/relics.data.js",
    "js/relics.i18n.js",
    "js/relics.js",
    "js/space.js",
    "js/stats.i18n.js",
    "js/stats.js",
    "js/ui.i18n.js",
    "manifest.webmanifest",
];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(PRECACHE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match("./index.html"); });
  }));
});
