// Love Story Builder - Service Worker
// Handles offline support, caching, and PWA functionality

const CACHE_NAME = 'love-story-builder-v1';
const RUNTIME_CACHE = 'love-story-runtime-v1';
const ASSET_CACHE = 'love-story-assets-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/admin.html',
  '/css/reset.css',
  '/css/variables.css',
  '/css/style.css',
  '/js/app.js',
  '/js/storage.js',
  '/js/utils.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(err => console.log('Precache failed:', err)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE && cacheName !== ASSET_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') return;

  if (request.destination === 'image' || request.destination === 'font' || request.destination === 'audio' || request.destination === 'video') {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            caches.open(ASSET_CACHE).then(c => c.put(request, response.clone()));
          }
          return response;
        }).catch(() => {
          if (request.destination === 'image') {
            return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#f0f" width="100" height="100"/></svg>', { headers: { 'Content-Type': 'image/svg+xml' } });
          }
          return new Response('', { status: 404 });
        });
      })
    );
  } else {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            caches.open(RUNTIME_CACHE).then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});