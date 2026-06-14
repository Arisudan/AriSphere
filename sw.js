// sw.js
// Service Worker for AriSphere PWA - Cache assets & offline articles

const CACHE_NAME = 'arisphere-cache-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/css/variables.css',
  '/css/main.css',
  '/css/components.css',
  '/css/pages.css',
  '/js/db.js',
  '/js/router.js',
  '/js/app.js',
  '/manifest.json'
];

// Install Event - Precache core resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Precaching core assets');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[ServiceWorker] Sweeping old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Serve cached assets when offline
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip API queries or database endpoints (needs live data or dynamic handling)
  if (requestUrl.origin !== self.location.origin || event.request.url.includes('/api/') || event.request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Return fallback or offline message if network fails on API
        return new Response(JSON.stringify({ error: 'Offline - connection unavailable.' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Pre-cached assets & pages (Cache First, Network Fallback)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Dynamically cache visited pages and media
        if (networkResponse.ok && event.request.method === 'GET') {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for HTML pages when offline
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/');
        }
      });
    })
  );
});
