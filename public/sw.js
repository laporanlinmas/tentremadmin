/* TENTREM Service Worker — PWA Offline Cache */
const CACHE_NAME = 'tentrem-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icon-32.png',
  '/assets/icon-192.png',
  '/assets/icon-full.png'
];

/* Install: cache semua aset statis */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

/* Activate: hapus cache lama */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

/* Fetch: network-first untuk API dan update development */
self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);

  /* Selalu network-first untuk API calls */
  if (url.pathname.startsWith('/api/') || url.hostname !== location.hostname) {
    event.respondWith(
      fetch(event.request).catch(function () {
        return caches.match(event.request);
      })
    );
    return;
  }

  /* Network-first untuk aset statis agar selalu up-to-date */
  event.respondWith(
    fetch(event.request).then(function (response) {
      if (response && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function () {
      // Fallback ke cache saat offline
      return caches.match(event.request);
    })
  );
});
