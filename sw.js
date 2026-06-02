const CACHE_NAME = 'aqua-v50';
const ASSETS = [
  './',
  './index.html',
  './css/style.css?v=50',
  './js/app.js?v=50',
  './js/supabase-config.js?v=50',
  './js/dashboard.js?v=50',
  './js/deliveries.js?v=50',
  './js/customers.js?v=50',
  './js/bills.js?v=50',
  './js/reports.js?v=50',
  './js/vendor/lucide.min.js',
  './js/vendor/supabase.min.js',
  './icons/logo.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('supabase.co') || e.request.url.includes('googleapis.com')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request, { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
