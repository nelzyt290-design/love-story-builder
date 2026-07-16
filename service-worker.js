// Love Story Builder - Service Worker
// Handles offline support, caching, and PWA functionality

const CACHE_NAME = 'love-story-builder-v1';
const RUNTIME_CACHE = 'love-story-runtime-v1';
const ASSET_CACHE = 'love-story-assets-v1';

// Files to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/admin.html',
  '/preview.html',
  '/settings.html',
  '/gallery.html',
  '/timeline.html',
  '/css/reset.css',
  '/css/variables.css',
  '/css/style.css',
  '/css/loading.css',
  '/css/animations.css',
  '/css/gallery.css',
  '/css/player.css',
  '/css/timeline.css',
  '/css/modal.css',
  '/css/admin.css',
  '/css/components.css',
  '/css/responsive.css',
  '/js/app.js',
  '/js/storage.js',
  '/js/utils.js'
];

// Install event - precache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.log('Precache failed:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE && 
              cacheName !== ASSET_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(cached => {
            return cached || new Response('Offline', { status: 503 });
          });
        })
    );
  }
  // Handle asset requests (images, fonts, audio, video)
  else if (request.destination === 'image' || 
           request.destination === 'font' || 
           request.destination === 'audio' || 
           request.destination === 'video') {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const cache = caches.open(ASSET_CACHE);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        }).catch(() => {
          // Return placeholder for failed images
          if (request.destination === 'image') {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#f0f" width="100" height="100"/></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
          throw new Error('Failed to fetch');
        });
      })
    );
  }
  // Handle document and stylesheet requests
  else if (request.destination === 'document' || request.destination === 'style') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(cached => {
            return cached || caches.match('/index.html');
          });
        })
    );
  }
  // Handle script requests
  else if (request.destination === 'script') {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        }).catch(() => {
          console.warn('Script fetch failed:', request.url);
          return new Response('', { status: 404 });
        });
      })
    );
  }
  // Default strategy for other requests
  else {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(cacheNames => {
      Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    });
  }
});

// Background sync for data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-story-data') {
    event.waitUntil(
      // Sync story data when connection is restored
      Promise.resolve()
    );
  }
});

// Push notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'New update available',
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/badge.png',
    tag: 'love-story-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('Love Story Builder', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Focus existing window if available
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].url === '/' && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      // Open new window if not found
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});