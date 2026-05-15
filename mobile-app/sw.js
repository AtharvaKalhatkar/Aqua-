const CACHE_NAME = 'aqua-v21';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/supabase-config.js',
  './js/dashboard.js',
  './js/deliveries.js',
  './js/customers.js',
  './js/bills.js',
  './js/reports.js',
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
