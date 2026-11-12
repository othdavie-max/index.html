/* Aurum SEO pages: anonymous visit counting (shows in your owner dashboard) and the Meta Pixel.
   No personal data is collected. Same method as the sales page. */
(function () {
  var API = "https://ymmxhjfcfaawrebxoxbu.supabase.co";
  var AK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbXhoamZjZmFhd3JlYnhveGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyMDE3NjcsImV4cCI6MjEwOTc3Nzc2N30.03NhALj3puOulUJTDiKBhnctwM9iLzMoiH_flKwHDyM";
  var PIXEL = "2107350816551303";
  function store(s) { return function (k, v) { try { if (v === undefined) return s.getItem(k); s.setItem(k, v); } catch (e) { return null; } }; }
  var ss = store(window.sessionStorage), ls = store(window.localStorage);
  var sid = ss("aurumSid");
  if (!sid) { sid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36); ss("aurumSid", sid); }
  var q = new URLSearchParams(location.search), host = "";
  try { if (document.referrer) { var u = new URL(document.referrer); if (u.hostname !== location.hostname) host = u.hostname.replace(/^(www|m|l|lm|web)\./, ""); } } catch (e) {}
  var guess = (q.get("utm_source") || q.get("src") || "").toLowerCase() ||
    (/google/.test(host) ? "google" : /bing|duckduckgo|yahoo|yandex/.test(host) ? "search" : /instagram/.test(host) ? "instagram" : /facebook|fb\.com/.test(host) ? "facebook" : /tiktok/.test(host) ? "tiktok" : /(^|\.)t\.co$|twitter|x\.com/.test(host) ? "x" : /whatsapp|wa\.me/.test(host) ? "whatsapp" : host);
  if (guess && (q.get("utm_source") || !ls("aurumSrc"))) ls("aurumSrc", guess);   // carries over to the sales page
  var src = ls("aurumSrc") || "direct", cmp = ls("aurumCmp") || "";
  var ua = navigator.userAgent, device = /iphone|ipad|ipod/i.test(ua) ? "iphone" : /android/i.test(ua) ? "android" : "computer";
  var page = ("seo/" + location.pathname.replace(/^\/|\/$/g, "").replace(/^guides\//, "g/")).slice(0, 40);
  function track(type, meta) {
    try { fetch(API + "/rest/v1/rpc/track", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", apikey: AK, Authorization: "Bearer " + AK },
      body: JSON.stringify({ p_session: sid, p_type: type, p_page: page, p_source: src, p_campaign: cmp, p_referrer: host, p_device: device, p_meta: meta || null }) }).catch(function () {}); } catch (e) {}
  }
  track("view");
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-cta]"); if (!a) return;
    var k = a.getAttribute("data-cta");
    track(k === "demo" ? "click_demo" : k === "wa" ? "whatsapp_click" : "click_buy", { from: page, where: a.getAttribute("data-where") || "" });
    try { if (window.fbq) fbq("track", "ViewContent", { content_name: document.title }); } catch (err) {}
  }, true);
  // Meta Pixel: lets you show your ad to people who read a guide and did not buy yet.
  !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", PIXEL); fbq("track", "PageView");
})();
