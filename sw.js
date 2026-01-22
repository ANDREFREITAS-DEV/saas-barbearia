const CACHE_NAME = 'barber-saas-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/tokens.css',
  '/css/base.css',
  '/css/theme.css',
  '/css/app.css',
  '/core/main.js',
  '/core/ui.js',
  '/core/storage.js',
  '/modules/supabaseClient.js',
  '/modules/tenants.js',
  '/modules/services.js',
  '/modules/schedule.js',
  '/modules/customers.js',
  '/modules/auth.js'
];

// Install: Cache assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: Limpar caches antigos
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

// Fetch: Network First para API (Supabase), Cache First para Assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Se for chamada para o Supabase, deixa o browser/lib lidar (ou Network First customizado)
  // Mas como a lib do Supabase usa fetch, se cairmos offline, ela falha. 
  // O app trata isso no código JS verificando navigator.onLine.
  if (url.hostname.includes('supabase.co')) {
     return; // Bypass SW logic for API, let JS handle it or basic browser caching
  }

  // Stale-while-revalidate para arquivos locais
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});