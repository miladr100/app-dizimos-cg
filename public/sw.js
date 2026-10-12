const CACHE = 'dizimos-shell-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['/', '/icons/icon-192.png', '/icons/icon-512.png'])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const r = event.request;
  if (r.method !== 'GET' || r.url.includes('/api/')) return;
  if (r.mode === 'navigate') {
    event.respondWith(fetch(r).catch(() => caches.match('/')));
    return;
  }
});
