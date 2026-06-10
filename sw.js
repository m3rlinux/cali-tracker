/*
  Cali Tracker — Service Worker
  Copyright (c) 2026 Davide Gibilisco
  Released under the MIT License
  https://github.com/m3rlinux/cali-tracker
*/
const CACHE_VERSION = '2.7.0-a';
const CACHE_NAME = `cali-tracker-${CACHE_VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './exercises.json'
];

// Install: cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('cali-tracker-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
  // Notify all clients that a new version is active
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(client => client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION }));
  });
});

// Fetch: cache-first for assets, network-first for exercises.json
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Always revalidate exercises.json
  if (url.pathname.endsWith('exercises.json')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
