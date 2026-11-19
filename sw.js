const CACHE_NAME = 'myrepa-offline-v1';

const BASE = new URL('./', self.registration.scope);

const APP_FILES = [
  BASE.href,
  new URL('index.html', BASE).href
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(APP_FILES);

      try {
        await cache.add(new URL('myrepaicon.png', BASE).href);
      } catch (e) {
        // アイコンが取得できなくてもアプリは保存する
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache =>
            cache.put(request, copy)
          );
        }
        return response;
      }).catch(async () => {
        return await caches.match(request) ||
          await caches.match(BASE.href) ||
          await caches.match(new URL('index.html', BASE).href);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache =>
            cache.put(request, copy)
          );
        }
        return response;
      });
    })
  );
});
