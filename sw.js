// Nombre de la cache
const CACHE_NAME = 'gemini-pwa-cache-v4';

// Archivos para cachear (Rutas relativas para soportar subdirectorios de GH Pages)
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // Tesseract Dependencies for Offline Support (Explicit Versions)
  'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/worker.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js',
  'https://tessdata.projectnaptha.com/4.0.0/por.traineddata.gz'
];

// Instalar el Service Worker y cachear recursos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto - Pre-cargando recursos offline');
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptar solicitudes y servir desde cache cuando sea posible
self.addEventListener('fetch', event => {
  // No cachear llamadas a la API de Google AI
  if (event.request.url.includes('generativelanguage.googleapis.com')) {
    return;
  }

  // Estrategia: Cache First, falling back to Network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - devolver la respuesta desde cache
        if (response) {
          return response;
        }
        
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(
          response => {
            // Verificar que la respuesta sea válida
            // Permitir cachear respuestas opacas (type basic/cors) y CDN
            if(!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
              return response;
            }
            
            // Clonar la respuesta para cachearla
            const responseToCache = response.clone();
            
            // Solo cachear si la request es del mismo origen o CDNs permitidos, evitando extensiones de chrome
            if (event.request.url.startsWith('http')) {
                caches.open(CACHE_NAME)
                .then(cache => {
                    try {
                        cache.put(event.request, responseToCache);
                    } catch (err) {
                        console.warn('Error caching stream', err);
                    }
                });
            }
              
            return response;
          }
        );
      })
      .catch(() => {
          // Fallback simple si falla red y no está en caché
          console.log('Fetch failed, user might be offline');
      })
    );
});

// Limpiar caches antiguas al activar
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando cache antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});