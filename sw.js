const CACHE_NAME = 'conferente-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // Estrategia simple: Red primero, si falla cache.
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});