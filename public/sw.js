/**
 * Course Companion - Offline Caching Service Worker
 * Robust Ethiopian Internet Optimization Core Sync System
 */
const CACHE_NAME = 'companion-cache-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip tracking non-HTTP schemas like browser extensions
  if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) {
    return;
  }

  // Cache-first strategy for Static Assets (scripts, stylesheets, webfonts, and static images)
  const isStaticAsset = 
    url.pathname.includes('/assets/') || 
    url.pathname.endsWith('.js') || 
    url.pathname.endsWith('.css') || 
    url.pathname.endsWith('.png') || 
    url.pathname.endsWith('.jpg') || 
    url.pathname.endsWith('.svg') || 
    url.pathname.endsWith('.json') || 
    url.pathname.includes('fonts.googleapis.com') ||
    url.pathname.includes('fonts.gstatic.com');

  if (isStaticAsset) {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(e.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Failure fallback
          return new Response("Asset offline placeholder", { status: 457 });
        });
      })
    );
  } else {
    // Network-first falling back to offline Cache for dynamic shell requests and paths
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(e.request).then((cached) => {
            if (cached) {
              return cached;
            }
            // Fallback to / if everything fails
            return caches.match('/');
          });
        })
    );
  }
});

