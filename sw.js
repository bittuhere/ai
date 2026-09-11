/* ═══ BitBot service worker (v9) ═══════════════════════════════════════════
   Caches the whole AI (index, brain, math engine, data, weights, icon) so
   repeat visits load INSTANTLY and work offline. Cache name bumps on every release. */
var CACHE = 'bitbot-v9';
var ASSETS = [
    './',
    './index.html',
    './brain.js',
    './math.js',
    './data.js',
    './data2.js',
    './data3.js',
    './weights.js',
    './icon-512.png',
    './manifest.webmanifest'
];

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(CACHE)
            .then(function (c) { return c.addAll(ASSETS); })
            .then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys
                .filter(function (k) { return k !== CACHE; })
                .map(function (k) { return caches.delete(k); }));
        }).then(function () { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function (e) {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
            if (hit) return hit;
            return fetch(e.request).then(function (res) {
                try {
                    if (res.ok && new URL(e.request.url).origin === self.location.origin) {
                        var copy = res.clone();
                        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
                    }
                } catch (err) { /* ignore */ }
                return res;
            }).catch(function () {
                if (e.request.mode === 'navigate') return caches.match('./index.html');
            });
        })
    );
});
