/* 書架 Service Worker
 * デプロイのたびに VERSION を index.html の bundle.js?v=N と同じ値に上げること。
 */
const VERSION = "v26";
const CACHE = `shoka-${VERSION}`;

// 事前取得は最小限にする。
// bundle.js を事前取得すると、サーバー上のbundle.jsがまだ古い時点で
// Service Workerが入れ替わった場合に、古い中身を新しいURLで
// キャッシュに焼き付けてしまい、以後ずっと古い画面が出続ける。
// そのため bundle.js やフォントは「実際に読み込めた時に保存する」方式にする。
const SHELL = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // 自オリジンのGETのみ扱う(Firebase等の通信には一切触らない)
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;

  // 画面遷移: ネット優先。オフラインのときだけキャッシュのindex.htmlを返す
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("./index.html")));
    return;
  }

  // その他の資産(bundle.js・フォント・アイコン):
  // キャッシュにあれば即返し、無ければ取得して保存する。
  // bundle.js は ?v=N が変わると別URLになるため、更新時は必ず取り直される。
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      });
    })
  );
});
