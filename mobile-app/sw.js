const CACHE_NAME = 'aqua-v54-killcache';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(names => Promise.all(names.map(name => caches.delete(name))))
      .then(() => self.clients.claim())
  );
  console.log('SW cache cleared globally.');
});

self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request));
});
