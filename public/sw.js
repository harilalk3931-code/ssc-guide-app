// Service Worker for SSC CGL Guide PWA
const CACHE_NAME = 'ssc-guide-v1';
const STATIC_CACHE = 'ssc-guide-static-v1';
const DYNAMIC_CACHE = 'ssc-guide-dynamic-v1';
const NOTOPEDIA_CACHE = 'ssc-guide-notopedia-v1';
const NEMOTRON_CACHE = 'ssc-guide-nemotron-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name !== STATIC_CACHE &&
                     name !== DYNAMIC_CACHE &&
                     name !== NOTOPEDIA_CACHE &&
                     name !== NEMOTRON_CACHE;
            })
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // API requests - Network First with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE));
    return;
  }

  // Notopedia requests - Network First with longer cache
  if (url.hostname === 'www.notopedia.com') {
    event.respondWith(networkFirstWithCache(request, NOTOPEDIA_CACHE, 7 * 24 * 60 * 60 * 1000));
    return;
  }

  // Nemotron API requests - Network First with short cache
  if (url.hostname === 'integrate.api.nvidia.com') {
    event.respondWith(networkFirstWithCache(request, NEMOTRON_CACHE, 24 * 60 * 60 * 1000));
    return;
  }

  // Static assets - Cache First
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Default - Network First for HTML, Cache First for others
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE));
  } else {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
  }
});

// Cache First Strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Update cache in background
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
      })
      .catch(() => {});
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return cache.match('/');
    }
    throw error;
  }
}

// Network First with Cache Fallback
async function networkFirstWithCache(request, cacheName, maxAge = 24 * 60 * 60 * 1000) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Clone response before caching
      const responseToCache = networkResponse.clone();

      // Add timestamp header for cache expiration
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-at', Date.now().toString());

      const responseWithTimestamp = new Response(
        await responseToCache.blob(),
        {
          status: responseToCache.status,
          statusText: responseToCache.statusText,
          headers,
        }
      );

      await cache.put(request, responseWithTimestamp);
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Check if cache is expired
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      if (cachedAt && (Date.now() - parseInt(cachedAt)) > maxAge) {
        // Cache expired, but return it anyway for offline support
        console.log('Returning expired cache for:', request.url);
      }
      return cachedResponse;
    }

    // No cache available
    if (request.mode === 'navigate') {
      return cache.match('/');
    }

    throw error;
  }
}

// Check if asset is static
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|avif)$/i.test(pathname);
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data === 'clearCache') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }

  if (event.data?.type === 'cacheNotopedia') {
    // Pre-cache Notopedia questions
    cacheNotopediaQuestions(event.data.url);
  }
});

// Pre-cache Notopedia questions for offline use
async function cacheNotopediaQuestions(url) {
  const cache = await caches.open(NOTOPEDIA_CACHE);
  try {
    const response = await fetch(url);
    if (response.ok) {
      await cache.put(url, response.clone());
      console.log('Cached Notopedia questions');
    }
  } catch (error) {
    console.error('Failed to cache Notopedia:', error);
  }
}

// Background Sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-test-results') {
    event.waitUntil(syncTestResults());
  }
});

async function syncTestResults() {
  // Implementation for syncing test results when online
  console.log('Syncing test results...');
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-questions') {
    event.waitUntil(updateQuestionsCache());
  }
});

async function updateQuestionsCache() {
  console.log('Updating questions cache...');
  // Fetch latest questions from Notopedia/Nemotron
}