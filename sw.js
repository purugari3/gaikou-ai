/* ============================================================
   GAIKOU AI DIAGNOSIS — Service Worker
   静的アセットをキャッシュし、オフラインでもTOP/診断画面を表示できるようにします。
   API通信（/.netlify/functions/*）はキャッシュ対象外です。
   ============================================================ */
const CACHE_NAME = 'gaikou-ai-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/db.js',
  '/js/app.js',
  '/js/admin.js',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API・外部リクエストはキャッシュしない（常にネットワーク）
  if (url.pathname.startsWith('/.netlify/functions/') || url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res.ok && event.request.method === 'GET') {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
