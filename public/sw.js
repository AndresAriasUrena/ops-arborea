// Service Worker para Arbórea Operaciones
// Cachea el app shell para funcionamiento offline

const CACHE_NAME = 'arborea-ops-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/sub-logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

// Background Sync API - reintentar sincronización cuando vuelva la conexión
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-submissions') {
    event.waitUntil(syncPendingSubmissions());
  }
});

async function syncPendingSubmissions() {
  try {
    // Importar la lógica de sync desde el módulo
    // Nota: en un SW real, necesitamos acceso a IndexedDB directamente
    // Por ahora, enviamos un mensaje a todos los clientes activos
    const clients = await self.clients.matchAll({ type: 'window' });

    for (const client of clients) {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        tag: 'sync-submissions'
      });
    }
  } catch (error) {
    console.error('Error en background sync:', error);
    throw error; // Re-throw para que el navegador reintente
  }
}
