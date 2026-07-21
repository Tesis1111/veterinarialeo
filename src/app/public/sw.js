const CACHE_NAME = 'vetcare-v2';
const RUNTIME_CACHE = 'vetcare-runtime-v2';
const RUNTIME_MAX_ENTRIES = 60;

// Recursos críticos para cachear durante la instalación
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Instalación del Service Worker.
// Precache tolerante: si un recurso falta (p. ej. un ícono), no aborta la
// instalación entera como haría cache.addAll (que es atómico).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((url) => cache.add(url).catch(() => null))
        )
      )
      .then(() => self.skipWaiting())
  );
});

// Activación y limpieza de cachés antiguas
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName));
    }).then((cachesToDelete) => {
      return Promise.all(cachesToDelete.map((cacheToDelete) => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

// Limita el tamaño del cache de runtime (elimina las entradas más viejas)
async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

// Estrategia de caché: Network First con fallback a Cache — SOLO para
// recursos estáticos del propio origen. Nunca interceptar Firestore,
// Google APIs, ni el endpoint serverless /api.
self.addEventListener('fetch', (event) => {
  // Omitir requests que no son GET
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Solo same-origin: excluye firestore.googleapis.com, identitytoolkit,
  // securetoken, gstatic, extensiones, etc.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Nunca cachear el endpoint serverless
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Omitir desarrollo local
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return;
  }

  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) => {
      return fetch(event.request)
        .then((response) => {
          // Si la respuesta es válida, clonamos y guardamos en cache
          if (response.status === 200) {
            cache.put(event.request, response.clone());
            trimCache(cache, RUNTIME_MAX_ENTRIES);
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, intentamos servir desde cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Si no está en cache, retornamos una respuesta offline básica
            return new Response('Offline - No hay conexión', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
        });
    })
  );
});

// Mensaje para actualizar el service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
