importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (workbox) {
  const CACHE_NAME = 'conferente-pro-v26';

  // Forzar actualización inmediata
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

  // Precache de archivos críticos con rutas absolutas
  workbox.precaching.precacheAndRoute([
    { url: '/My-PWA-IA/index.html', revision: '26' },
    { url: '/My-PWA-IA/manifest.json', revision: '26' },
    { url: '/My-PWA-IA/icon.svg', revision: '26' }
  ]);

  // Estrategia para navegación: Red primero con timeout de 3s antes de ir a Cache
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'pages',
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.expiration.ExpirationPlugin({ maxEntries: 10 })
      ]
    })
  );

  // Estrategia para assets (Scripts, Estilos, Imágenes): StaleWhileRevalidate
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'assets'
    })
  );
} else {
  console.error('Workbox no pudo cargarse.');
}