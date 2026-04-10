const CACHE_NAME = 'motorated-v3';
const RUNTIME_CACHE = 'motorated-runtime-v3';

const PRECACHE_ASSETS = [
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Delete ALL old caches including v1, v2 — fixes stale CSS/JS bug
        return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName));
      })
      .then((cachesToDelete) => {
        return Promise.all(cachesToDelete.map((cacheToDelete) => {
          console.log('Deleting old cache:', cacheToDelete);
          return caches.delete(cacheToDelete);
        }));
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip Supabase API requests (always fetch fresh)
  if (event.request.url.includes('supabase.co')) return;

  // CRITICAL: NEVER cache HTML — it references hashed assets that change on every deploy.
  // Caching HTML causes the browser to load old asset hashes that no longer exist on the server.
  const isHTML = event.request.mode === 'navigate'
    || event.request.destination === 'document'
    || url.pathname === '/'
    || url.pathname.endsWith('.html');

  if (isHTML) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For hashed assets (CSS/JS/images): cache-first since hash guarantees uniqueness
  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) => {
      return cache.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      });
    })
  );
});

self.addEventListener('push', (event) => {
  console.log('Push notification received', event);

  if (!event.data) {
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'MotoRate',
      body: event.data.text()
    };
  }

  const options = {
    body: data.body || data.message || 'New notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: data.data || { url: data.url || '/' },
    actions: data.actions || [],
    tag: data.tag || 'motorated-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'MotoRate', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed', event);
});
