/* Offline support and fast start. Everything is saved on first visit; after that the game opens from the phone, never waiting for the network. */
const CACHE = "fixit-__VERSION__";
const ASSETS = __ASSETS__;
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./config.js", "./apple-touch-icon.png", "./icon-maskable-512.png", "./icon-192.png", "./icon-512.png", "./privacy.html", ...ASSETS];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return; // stats and anything else go straight to the network
  // the game page: open the saved copy at once, and refresh it quietly in the background for next time
  if (req.mode === "navigate") {
    e.respondWith(caches.match("./index.html").then((hit) => {
      const net = fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("./index.html", copy)); } return res; }).catch(() => hit || Response.error());
      return hit || net;
    }));
    return;
  }
  // files (the app is split into a few): saved copy first, network only if it is missing
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; }).catch(() => Response.error())));
});
