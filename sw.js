/* 書架 Service Worker
 * デプロイのたびに VERSION を index.html の bundle.js?v=N と同じ値に上げること。
 * (VERSIONが変わると新キャッシュを作成し、旧キャッシュは activate で削除される)
 */
const VERSION = "v7";
const CACHE = `shoka-${VERSION}`;

const SHELL = [
  "./",
  "./index.html",
  `./bundle.js?v=${VERSION.slice(1)}`,
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
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

  // 自オリジンのGETのみ扱う(Firebase等のAPI通信には一切触らない)
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;

  // ナビゲーション: ネット優先、オフライン時はキャッシュのindex.html
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // シェル資産: キャッシュ優先(bundleは?v=で不変扱い)
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
