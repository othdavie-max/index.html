/* Offline support. The whole game is one file, so after the first visit it never needs data again. */
const CACHE = "fixit-76aa25d206";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./config.js", "./apple-touch-icon.png", "./icon-maskable-512.png", "./icon-192.png", "./icon-512.png", "./privacy.html"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return; // stats and anything else go straight to the network
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; }).catch(() => hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error()));
    return hit || net;
  }));
});
