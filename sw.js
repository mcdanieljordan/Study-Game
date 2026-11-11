// Offline support: the app shell and content are cached so it works without Wi-Fi once opened.
// Strategy: network-first (so new content from the repo shows up), fall back to cache offline.
const V = 'sq2-v1';
const SHELL = ['./', 'index.html', 'css/app.css', 'vendor/confetti.js', 'vendor/three.module.min.js', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { const copy = res.clone(); caches.open(V).then(c => c.put(r, copy)); return res; }).catch(() => caches.match(r).then(m => m || caches.match('index.html'))));
});
