const CACHE_NAME = "mypia-cache-v3";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json"
];

/* =====================================
   インストール
===================================== */

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );

  self.skipWaiting();
});

/* =====================================
   古いキャッシュを削除
===================================== */

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

/* =====================================
   最新ファイルを優先して取得
===================================== */

self.addEventListener("fetch", event => {

  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 外部サイトへの通信には介入しない
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {

        if (response.ok && response.type === "basic") {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
        }

        return response;
      })
      .catch(async () => {

        // ネット接続がない場合は保存済みデータを使用
        const cached = await caches.match(request);

        if (cached) return cached;

        // ページ表示の場合は保存済みindex.htmlを使用
        if (request.mode === "navigate") {
          const fallback = await caches.match("./index.html");

          if (fallback) return fallback;
        }

        return new Response("オフラインです", {
          status: 503,
          headers: {
            "Content-Type": "text/plain; charset=utf-8"
          }
        });
      })
  );
});