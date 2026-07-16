// Love Story Builder - Service Worker
// Enables offline support and caching strategy

const CACHE_NAME = 'love-story-builder-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './admin.html',
  './preview.html',
  './settings.html',
  './gallery.html',
  './timeline.html',
  './manifest.json',
  './css/reset.css',
  './css/variables.css',
  './css/style.css',
  './css/loading.css',
  './css/animations.css',
  './css/gallery.css',
  './css/player.css',
  './css/timeline.css',
  './css/modal.css',
  './css/admin.css',
  './css/components.css',
  './css/responsive.css',
  './js/app.js',
  './js/loading.js',
  './js/background.js',
  './js/gallery.js',
  './js/player.js',
  './js/story.js',
  './js/timeline.js',
  './js/memories.js',
  './js/admin.js',
  './js/theme.js',
  './js/storage.js',
  './js/export.js',
  './js/import.js',
  './js/router.js',
  './js/cursor.js',
  './js/particles.js',
  './js/modal.js',
  './js/animations.js',
  './js/utils.js'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.log('Cache addAll error:', err);
        // Continue even if some assets fail to cache
        return Promise.resolve();
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Service Worker
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
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network First, then Cache
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API calls and external resources
  if (request.url.includes('/api/') || request.url.includes('cdn')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then(response => {
            return response || new Response('Offline - Resource not available', { status: 503 });
          });
        })
    );
    return;
  }

  // Handle static assets - Cache First
  event.respondWith(
    caches.match(request).then(response => {
      if (response) {
        return response;
      }
      return fetch(request)
        .then(response => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Return offline page if available
          if (request.destination === 'document') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
