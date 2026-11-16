// TEST TOOL, not part of the site. Stands in for the Supabase server so the sign-in screens can be tried without sending real emails.
// Scenario settings are kept in localStorage "__mockcfg" (JSON): offline, google, ua, standalone, enter, link, activate, freeUse, publish, rename, saveFails, weakPw, refreshFails.
// Test-only stand-in for the Supabase server. Loaded only when the page address has ?mock=1. Never part of the zip.
// Scenario settings live in localStorage "__mockcfg" (JSON) so they survive a reload.
(function () {
  const cfg = () => { try { return JSON.parse(localStorage.getItem("__mockcfg") || "{}"); } catch { return {}; } };
  if (cfg().ua) Object.defineProperty(navigator, "userAgent", { get: () => cfg().ua });
  if (cfg().standalone) Object.defineProperty(navigator, "standalone", { get: () => true });
  const b64 = (o) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = (email, exp) => b64({ alg: "HS256", typ: "JWT" }) + "." + b64({ sub: "user-1", email, exp: exp || Math.floor(Date.now() / 1000) + 3600 }) + ".sig";
  window.__jwt = jwt; window.__calls = [];
  const ent = (o = {}) => Object.assign({ tier: "free", label: "Free", level: "free", legacy: null, docs_limit: 5, docs_used: 0, docs_left: 5, resets_on: "2026-12-01", designs: ["royal"], openings: ["envelope", "none"], branding: "line", devices_max: 1, devices_used: 1, businesses_max: 1, catalogue_max: 10, link_days: 60, pro_pack: false, own_domain: false, status: "none", account: true }, o);
  const sig = () => ent({ tier: "starter", label: "Signature", level: "signature", legacy: "signature", docs_limit: null, docs_used: null, docs_left: null, devices_max: 2, branding: "mark" });
  const real = window.fetch.bind(window);
  window.fetch = async (url, opts = {}) => {
    url = String(url);
    if (!url.includes("supabase.co")) return real(url, opts);
    const c = cfg(), path = url.split("supabase.co")[1], body = opts.body ? JSON.parse(opts.body) : {};
    window.__calls.push({ path, body, auth: (opts.headers || {}).Authorization ? String((opts.headers || {}).Authorization).slice(0, 14) : "" });
    const J = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
    if (c.offline) throw new TypeError("Failed to fetch");
    const rpc = (n) => path.startsWith("/rest/v1/rpc/" + n);
    if (path.startsWith("/auth/v1/settings")) return J({ external: { google: !!c.google, email: true } });
    if (path.startsWith("/auth/v1/signup")) return c.signup || J({ id: "user-1", email: body.email, identities: [{ id: "1" }], confirmation_sent_at: "now" });
    if (path.startsWith("/auth/v1/verify")) return body.token === "123456" ? J({ access_token: jwt(body.email), refresh_token: "r1", expires_in: 3600, user: { id: "user-1", email: body.email } }) : J({ error_code: "otp_expired", msg: "Token has expired or is invalid" }, 403);
    if (path.startsWith("/auth/v1/token?grant_type=password")) return body.password === "correct-horse" ? J({ access_token: jwt(body.email), refresh_token: "r1", expires_in: 3600, user: { id: "user-1", email: body.email } }) : (body.email === "new@x.com" ? J({ error_code: "email_not_confirmed", msg: "Email not confirmed" }, 400) : J({ error_code: "invalid_credentials", msg: "Invalid login credentials" }, 400));
    if (path.startsWith("/auth/v1/token?grant_type=refresh_token")) return c.refreshFails ? J({ error_code: "refresh_token_not_found" }, 400) : J({ access_token: jwt("amaka@example.com"), refresh_token: "r2", expires_in: 3600, user: { id: "user-1", email: "amaka@example.com" } });
    if (path.startsWith("/auth/v1/resend") || path.startsWith("/auth/v1/recover") || path.startsWith("/auth/v1/logout")) return J({});
    if (path.startsWith("/auth/v1/user")) return c.weakPw ? J({ error_code: "weak_password", msg: "weak" }, 422) : J({ id: "user-1" });
    if (rpc("account_enter")) return J(c.enter || { ok: true, key: "AUR-TEST-0001-0001", email: "amaka@example.com", plan: "free", ref_code: null, ent: ent() });
    if (rpc("link_licence")) return J(c.link || { ok: true, key: body.p_key, email: "amaka@example.com", plan: "signature", ref_code: "REF-AAAAAA", ent: sig() });
    if (rpc("activate_license")) return J(c.activate || { ok: true, email: "x", plan: "signature", account: false, ref_code: "REF-AAAAAA", ent: ent({ tier: "starter", label: "Signature", level: "signature", legacy: "signature", docs_limit: null, docs_left: null, account: false }) });
    if (rpc("account_swap_device")) return J(c.swap || { ok: true, key: "AUR-TEST-0001-0001", email: "amaka@example.com", plan: "free", ent: ent() });
    if (rpc("account_devices")) return J({ ok: true, devices: [{ device_id: JSON.parse(localStorage.getItem("aurum.device") || '"x"'), label: "Android phone · Chrome", last_seen: new Date().toISOString() }, { device_id: "other-1", label: "iPhone · Safari", last_seen: new Date(Date.now() - 3 * 864e5).toISOString() }], ent: ent({ devices_max: 2, devices_used: 2 }), changes_left: 3 });
    if (rpc("account_remove_device")) return J({ ok: true, devices: [] });
    if (rpc("account_release_device") || rpc("request_delete")) return J({ ok: true });
    if (rpc("rename_business")) return J(c.rename || { ok: true });
    if (rpc("load_workspace")) return J({ ok: true, data: null, version: 0 });
    if (rpc("save_workspace")) return c.saveFails ? new Response("{}", { status: 500 }) : J({ ok: true, version: 1 });
    if (rpc("free_status")) return J({ ok: true, plan: "free", used: 1, limit: 5, left: 4, ent: ent({ docs_used: 1, docs_left: 4 }) });
    if (rpc("free_use")) return J(c.freeUse || { ok: true, plan: "free", used: 1, limit: 5, left: 4 });
    if (rpc("publish_invoice")) return J(c.publish || { ok: true, id: "abc123def456" });
    return J({ ok: true });
  };
})();
