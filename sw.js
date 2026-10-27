/* SimpAset — service worker (offline-first untuk file inti) */
const CACHE = 'simpaset-v1';
const ASSETS = [
  './', './index.html', './manifest.json',
  './src/styles.css', './src/app.js', './src/config.js',
  './vendor/chart.umd.min.js', './vendor/jspdf.umd.min.js',
  './vendor/jspdf.plugin.autotable.min.js', './vendor/xlsx.full.min.js',
  './vendor/html2canvas.min.js',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.url.includes('/api/files/')) return;
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
