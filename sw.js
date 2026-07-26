// オフライン対応 (キャッシュ優先・ネット到達時に裏で更新) — 外部への通信は一切なし
const C = "xymbolon-v10";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(C).then((c) => c.addAll(["./", "./index.html", "./manifest.webmanifest", "./icon-180.png"])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  // 現行以外のキャッシュ箱を全削除 — これを怠ると caches.match が古い箱から
  // 昔のページを掴んで「更新したのに巻き戻る」(v0.9 で実際に踏んだバグ)
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== C).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.open(C).then((c) => c.match(e.request).then((hit) => {   // 探すのも現行の箱だけ
      // ページ本体は HTTP キャッシュを飛ばして取りに行く (Pages の max-age で裏更新が遅れないように)
      const req = e.request.mode === "navigate" ? new Request(e.request, { cache: "no-cache" }) : e.request;
      const net = fetch(req).then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const cp = res.clone();
          c.put(e.request, cp);
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    }))
  );
});
