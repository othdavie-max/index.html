// Aurum offline support: the app opens and works without data;
// licence checks, links and payments always go to the live server.
const CACHE = "aurum-v6";
const SHELL = ["./", "./index.html", "./policies.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never cache the licence/link server or payment scripts.
  if (/\.(mp4|webm)$/.test(url.pathname)) return;
  if (url.hostname.endsWith("supabase.co") || url.hostname.endsWith("paystack.co")) return;

  // The app itself: open the saved copy at once (fast, works offline), and fetch the newest copy in the
  // background. If it changed, tell the open page so it can refresh itself.
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE); const hit = await cache.match("./index.html");
      const fresh = fetch(req).then(async (res) => {
        if (res.ok) { const copy = res.clone(); const old = hit ? await hit.clone().text() : null; const neu = await res.clone().text(); await cache.put("./index.html", copy);
          if (old !== null && old !== neu) { const cs = await self.clients.matchAll({ type: "window" }); cs.forEach((c) => c.postMessage("aurum-updated")); } }
        return res;
      }).catch(() => null);
      if (hit) { e.waitUntil(fresh); return hit; }
      return (await fresh) || (await cache.match("./index.html")) || Response.error();
    })());
    return;
  }

  // Fonts, libraries and icons: use the saved copy instantly, refresh it in the background.
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => { if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
        .catch(() => hit);
      return hit || net;
    })
  );
});

// Phone alerts (Prestige): a client opened an invoice, said they paid, and so on.
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) {}
  e.waitUntil(self.registration.showNotification(d.title || "Aurum", { body: d.body || "", icon: "./icons/icon-192.png", badge: "./icons/favicon-64.png", tag: d.tag || "aurum", data: { url: d.url || "./" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => { for (const c of list) { if ("focus" in c) return c.focus(); } return self.clients.openWindow(url); }));
});
