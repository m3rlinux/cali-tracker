/*
  Cali Tracker — Service Worker
  Copyright (c) 2026 Davide Gibilisco
  Released under the MIT License
  https://github.com/m3rlinux/cali-tracker
*/
const CACHE_VERSION = '3.16.0'; // Update this to invalidate old caches
const CACHE_NAME = `cali-tracker-${CACHE_VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './exercises.json',
  './exercises.en.json',
  './wod.json',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
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
      // Notify all clients that a new version is active
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION }));
      })
  );
});

// Fetch: cache-first for assets, network-first for JSON data files
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Always revalidate JSON data (exercises.json, exercises.en.json) and the
  // manifest, così cambi a nome/icone vengono letti subito dal browser
  // (l'auto-update PWA non parte se il manifest è servito stantio dalla cache)
  if (url.pathname.endsWith('.json') || url.pathname.endsWith('.webmanifest')) {
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
