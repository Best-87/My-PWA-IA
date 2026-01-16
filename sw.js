importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

const CACHE_NAME = 'conferente-pro-v7'; // Incremented version
const OFFLINE_PAGE = './offline.html';

// 1. Precache Offline Page
self.addEventListener('install', (event) => {
  const urlsToCache = [
    OFFLINE_PAGE,
    './index.html',
    './manifest.json',
    './', // Alias for index
    // Precache Critical CDNs for UI
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/icon?family=Material+Icons+Round',
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap'
  ];

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  // REMOVED self.skipWaiting() to allow manual update flow controlled by UI
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener for SKIP_WAITING message from the UI
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 2. Navigation Route (The Core PWA Logic)
// Try Network -> Fallback to Cache (index.html) -> Fallback to Offline Page
const navigationRoute = new workbox.routing.NavigationRoute(async ({ event }) => {
  try {
    const networkResp = await fetch(event.request);
    return networkResp;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    // Try to return index.html from cache first (SPA behavior)
    const cachedIndex = await cache.match('./index.html');
    if (cachedIndex) return cachedIndex;
    
    // Finally return custom offline page
    return await cache.match(OFFLINE_PAGE);
  }
});
workbox.routing.registerRoute(navigationRoute);

// 3. Cache CDNs (Tailwind, Fonts, Tesseract) - StaleWhileRevalidate
// This makes the app load instantly even if offline or slow
workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://cdn.tailwindcss.com' ||
               url.origin === 'https://fonts.googleapis.com' ||
               url.origin === 'https://fonts.gstatic.com' ||
               url.origin === 'https://cdn.jsdelivr.net' || 
               url.origin === 'https://tessdata.projectnaptha.com',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'cdn-resources',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  })
);

// 4. Cache Images - CacheFirst
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: 'images',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  })
);

// 5. Scripts and Styles (Local build chunks) - StaleWhileRevalidate
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
);

// 6. API Calls (Gemini) - NetworkOnly
workbox.routing.registerRoute(
  ({ url }) => url.href.includes('generativelanguage.googleapis.com'),
  new workbox.strategies.NetworkOnly()
);

// --- PUSH NOTIFICATIONS LOGIC ---

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Conferente Pro', body: 'Nueva actualización disponible.' };
  
  const options = {
    body: data.body,
    icon: 'https://picsum.photos/192/192', // Replace with your actual icon path
    badge: 'https://picsum.photos/96/96', // Small monochrome icon for status bar
    vibrate: [100, 50, 100],
    data: {
      url: data.url || self.registration.scope
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});