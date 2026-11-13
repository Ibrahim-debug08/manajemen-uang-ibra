/* Service worker sederhana untuk membuat aplikasi bisa dipasang & dibuka offline. */
const CACHE_NAME = 'uang-ibra-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './assets/app.css',
  './assets/app.js',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/vendor/lucide.min.js',
  './assets/vendor/chart.umd.min.js',
  './assets/fonts/plus-jakarta-sans-400.woff2',
  './assets/fonts/plus-jakarta-sans-500.woff2',
  './assets/fonts/plus-jakarta-sans-600.woff2',
  './assets/fonts/plus-jakarta-sans-700.woff2',
  './assets/fonts/plus-jakarta-sans-800.woff2',
  './assets/fonts/jetbrains-mono-500.woff2',
  './assets/fonts/jetbrains-mono-600.woff2',
  './assets/fonts/jetbrains-mono-700.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }))
  );
});
