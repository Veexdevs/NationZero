/* Service worker do NationZero — cache offline do jogo. */

const CACHE = 'nationzero-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/ui/style.css',
  './src/ui/app.js',
  './src/ui/dom.js',
  './src/ui/parts.js',
  './src/ui/registry.js',
  './src/ui/modals.js',
  './src/ui/screens/overview.js',
  './src/ui/screens/laws.js',
  './src/ui/screens/actions.js',
  './src/ui/screens/power.js',
  './src/ui/screens/economy.js',
  './src/ui/screens/politics.js',
  './src/ui/icons.js',
  './src/ui/map.js',
  './src/ui/panels.js',
  './src/engine/worldmap.js',
  './src/engine/nations.js',
  './src/engine/ai.js',
  './src/engine/campaign.js',
  './src/data/worldmap.json',
  './assets/logo.png',
  './assets/logo-mark.png',
  './src/ui/screens/chronicle.js',
  './src/ui/screens/legacy.js',
  './src/engine/state.js',
  './src/engine/simulation.js',
  './src/engine/politics.js',
  './src/engine/world.js',
  './src/data/laws.js',
  './src/data/actions.js',
  './src/data/events.js',
  './src/data/world.js',
  './src/data/origins.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
