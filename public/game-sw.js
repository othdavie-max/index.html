/* Offline support for "Nigeria: The Road to Presidency".
 * Caches the game page, its static assets and the boundary data after the first visit so the game keeps working
 * without a connection. Only same-origin GET requests are handled; nothing is ever sent to third parties. */
const CACHE = "nrtp-v1";
const PRECACHE = ["/game", "/game/geo.json"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => undefined));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("nrtp-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isStatic = url.pathname.startsWith("/_next/static/");
  const isGame = url.pathname === "/game" || url.pathname.startsWith("/game/") || url.pathname === "/game-sw.js";
  if (!isStatic && !isGame && req.mode !== "navigate") return;
  if (req.mode === "navigate" && !isGame) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: false });
      const network = fetch(req)
        .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => undefined);
      // hashed build assets never change: cache first. Everything else: stale-while-revalidate.
      if (cached && isStatic) return cached;
      return cached ?? (await network) ?? (req.mode === "navigate" ? await cache.match("/game") : undefined) ?? Response.error();
    }),
  );
});

// The first page load happens before this worker controls the page, so the page tells us which same-origin
// assets it already used and we cache them too — then the whole game works offline after one visit.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "cache-urls" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      for (const u of data.urls) {
        try {
          const url = new URL(u, self.location.origin);
          if (url.origin !== self.location.origin) continue;
          if (!(url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/game"))) continue;
          if (await cache.match(url.href)) continue;
          const res = await fetch(url.href);
          if (res.ok) await cache.put(url.href, res);
        } catch { /* ignore individual failures */ }
      }
    }),
  );
});
