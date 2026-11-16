// Service worker: saves the whole game on first visit so it works offline.
// Online it always fetches the newest files (and refreshes the saved copy);
// offline it falls back to the saved copy.
// If you add new files to the game, add them to FILES and bump VERSION.
const VERSION = 'monster-rally-v3';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './vendor/three.module.min.js',
  './js/main.js',
  './js/trucks.config.js',
  './js/truck.js',
  './js/world.js',
  './js/camera.js',
  './js/input.js',
  './js/ui.js',
  './js/audio.js',
  './js/particles.js',
  './js/pyramid.js',
  './js/select.js',
  './js/modes/arena.js',
  './js/modes/megaramp.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))),
  );
});
