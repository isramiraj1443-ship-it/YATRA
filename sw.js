/* ==========================================================================
   YATRA v3 — Service Worker
   Strategi: app shell precache (cache-first) + network-first untuk /api.
   ========================================================================== */
const VERSION    = 'yatra-v3.0.0';
const SHELL      = VERSION + '-shell';
const RUNTIME    = VERSION + '-runtime';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/app.css',
  '/js/api.js',
  '/js/utils.js',
  '/js/charts.js',
  '/js/tracker.js',
  '/js/app.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL)
      .then((c) => c.addAll(SHELL_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // POST /api tidak di-cache
  const url = new URL(req.url);

  // API: selalu jaringan (data harus segar)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(req).catch(() => new Response(
      JSON.stringify({ ok: false, error: 'Sedang offline.' }),
      { headers: { 'Content-Type': 'application/json' } }
    )));
    return;
  }

  // Navigasi halaman: network-first, fallback ke shell/offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { caches.open(RUNTIME).then((c) => c.put(req, res.clone())); return res; })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/offline.html')))
    );
    return;
  }

  // Aset: cache-first + revalidate di belakang layar
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

/* Sinkronisasi latar belakang saat kembali online */
self.addEventListener('sync', (e) => {
  if (e.tag === 'yatra-sync') {
    e.waitUntil(self.clients.matchAll().then((cs) => cs.forEach((c) => c.postMessage({ type: 'flush-queue' }))));
  }
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
