
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

const CACHE_NAME = 'conferente-pro-v26';
const OFFLINE_PAGE = '/offline.html';

const bgSyncPlugin = new workbox.backgroundSync.BackgroundSyncPlugin('conferente-queue', {
  maxRetentionTime: 24 * 60,
});

self.addEventListener('install', (event) => {
  const urlsToCache = [
    OFFLINE_PAGE,
    '/index.html',
    '/manifest.json',
    '/icon.svg',
    '/icon-192.jpg',
    '/icon-512.jpg',
    '/',
    'https://fonts.googleapis.com/icon?family=Material+Icons+Round',
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap',
  ];

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && !name.includes('cdn-resources') && !name.includes('images')) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

const navigationRoute = new workbox.routing.NavigationRoute(async ({ event }) => {
  try {
    const networkResp = await fetch(event.request);
    return networkResp;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cachedIndex = await cache.match('/index.html');
    if (cachedIndex) return cachedIndex;

    const offlineCache = await caches.match(OFFLINE_PAGE);
    if (offlineCache) return offlineCache;
    return new Response("Offline - Conferente Pro", { headers: { "Content-Type": "text/html" } });
  }
});
workbox.routing.registerRoute(navigationRoute);

workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com' ||
    url.origin === 'https://cdn.jsdelivr.net' ||
    url.origin === 'https://placehold.co',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'cdn-resources',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
);

workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: 'images',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
);

workbox.routing.registerRoute(
  ({ url }) => url.href.includes('/api/sync') || url.href.includes('/api/analytics'),
  new workbox.strategies.NetworkOnly({
    plugins: [bgSyncPlugin]
  }),
  'POST'
);

workbox.routing.registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
);

workbox.routing.registerRoute(
  ({ url }) => url.href.includes('generativelanguage.googleapis.com'),
  new workbox.strategies.NetworkOnly()
);

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(
      console.log('[SW] Periodic Sync: Content Update'),
      Promise.resolve()
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'conferente-sync') {
    event.waitUntil(
      console.log('[SW] Background Sync triggered'),
      Promise.resolve()
    );
  }
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Conferente Pro', body: 'Nueva actualización.', url: '/' };

  const options = {
    body: data.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [100, 50, 100],
    data: { url: data.url || self.registration.scope },
    actions: [
      { action: 'open', title: 'Ver' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
