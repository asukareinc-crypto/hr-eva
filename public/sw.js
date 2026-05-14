// Minimal service worker for installability + offline shell
// v4: API/動的リクエストは一切キャッシュしない。静的アセットのみキャッシュ。
const CACHE = "hr-eva-v4";
const SHELL = ["/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// キャッシュ対象は同一オリジンの静的アセットのみ。
// API・認証・ページ HTML は常にネットワークから取得する（古い CSRF
// トークンやセッションをキャッシュして認証が壊れるのを防ぐ）。
function isCacheableAsset(url) {
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname === "/manifest.json"
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // API・認証はサービスワーカーで一切触らない（ブラウザ標準の挙動に任せる）
  if (url.pathname.startsWith("/api/")) return;

  // ナビゲーション（ページHTML）はネットワーク優先・キャッシュフォールバックなし
  if (req.mode === "navigate") return;

  // 静的アセットのみ cache-first
  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
      )
    );
  }
  // それ以外は respondWith しない＝ブラウザ標準のネットワーク取得
});
