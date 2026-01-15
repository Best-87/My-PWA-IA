// Nombre de la cache
const CACHE_NAME = 'gemini-pwa-cache-v5';

// Archivos shell básicos (Rutas relativas)
// NOTA: No cacheamos index.tsx ni archivos fuente, ya que no existen en producción (build).
// El Service Worker cacheará los chunks JS/CSS generados por Vite dinámicamente.
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // Tesseract Dependencies for Offline Support
  'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/worker.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js',
  'https://tessdata.projectnaptha.com/4.0.0/por.traineddata.gz',
  'https://cdn.tailwindcss.com'
];

// Instalar el Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto - Pre-cargando shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptar solicitudes
self.addEventListener('fetch', event => {
  // Ignorar API Calls
  if (event.request.url.includes('generativelanguage.googleapis.com')) {
    return;
  }

  // Estrategia: Cache First, falling back to Network, then Cache Put
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(
          response => {
            if(!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
              return response;
            }
            
            // Cachear dinámicamente los recursos nuevos (chunks de JS, CSS, imágenes)
            const responseToCache = response.clone();
            
            if (event.request.url.startsWith('http')) {
                caches.open(CACHE_NAME)
                .then(cache => {
                    try {
                        cache.put(event.request, responseToCache);
                    } catch (err) {
                        // Ignorar errores de cacheo de streams o cuota
                    }
                });
            }
              
            return response;
          }
        );
      })
    );
});

// Limpiar caches antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});