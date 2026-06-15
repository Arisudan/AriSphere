// sw.js
// Service Worker for AriSphere PWA - Phase 7F
// Version bump forces old caches to be replaced cleanly on update

const CACHE_VERSION = 'v4';
const CACHE_NAME = `arisphere-cache-${CACHE_VERSION}`;
const PRECACHE_ASSETS = [
  '/',
  '/css/variables.css',
  '/css/main.css',
  '/css/components.css',
  '/css/pages.css',
  '/js/supabase.js',
  '/js/purify.min.js',
  '/js/db.js',
  '/js/router.js',
  '/js/app.js',
  '/manifest.json',
  '/assets/images/business-cover.png',
  '/assets/images/ai-cover.png',
  '/assets/images/author.png'
];

// Install Event - Precache core resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Precaching core assets');
      // addAll fails if any request fails; use individual adds for resilience
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('[ServiceWorker] Precache miss:', url, err))
        )
      );
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

// Fetch Event - Network-first for HTML/API, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // 1. Skip cross-origin requests (Supabase, GA, Cloudflare, fonts)
  if (requestUrl.origin !== self.location.origin) {
    // For cross-origin API calls, just pass through without caching
    return;
  }

  // 2. Skip API calls - always need live data
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline - connection unavailable.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // 3. Network-first for HTML navigation (ensures fresh pre-rendered pages)
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then(c => c.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('/')))
    );
    return;
  }

  // 4. Cache-first for static assets (JS, CSS, images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok && event.request.method === 'GET') {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        // Last resort fallback for HTML
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/');
        }
      });
    })
  );
});
