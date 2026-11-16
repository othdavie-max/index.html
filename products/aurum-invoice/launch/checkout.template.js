/* Aurum website checkout: pick a plan, make or open your account, and pay with Paystack, all without leaving the website. */
(() => {
  "use strict";
  const SB = "__SB__", AK = "__AK__";
  const SESSION_KEY = "aurum.session";
  const $ = (q, r = document) => r.querySelector(q);
  const naira = (kobo) => "₦" + new Intl.NumberFormat("en-NG").format(Math.round((kobo || 0) / 100));
  const MSG = {
    creds: "That email or password is not right. Try again.", exists: "You already have an account with this email. Use Sign in.", code: "That code is not right, or it has expired. Tap \"Send it again\".",
    offline: "You are offline. Connect to the internet and try again.", rate: "Too many tries. Please wait a few minutes.", weak: "Use at least 8 characters for your password.",
    name: "Please type your name.", phone: "Please type a phone number we can reach you on, for example 0803 123 4567.", email: "That email doesn't look right. Check it and try again.",
    unconfirmed: "Please confirm your email first. We sent you a new code.", other: "Something went wrong. Please try again in a moment.",
    off: "Plans are not open yet.", admin_only: "Plans are not open yet.", downgrade: "To move to Starter, stop renewal in the app and choose Starter when Pro ends.", not_needed: "Your plan already includes this.", plan: "That plan is not available. Try another.",
  };
  const reason = (r) => {
    if (r.offline) return "offline";
    const c = String(r.data?.error_code || r.data?.code || "").toLowerCase(), m = String(r.data?.msg || r.data?.message || r.data?.error_description || "").toLowerCase();
    if (r.status === 429 || /rate/.test(c + m)) return "rate";
    if (c === "invalid_credentials" || /invalid login/.test(m)) return "creds";
    if (c === "email_not_confirmed" || /not confirmed/.test(m)) return "unconfirmed";
    if (/otp|token has expired|invalid.*(token|code)/.test(c + " " + m)) return "code";
    if (c === "weak_password") return "weak";
    if (c === "user_already_exists" || /already registered/.test(m)) return "exists";
    return "other";
  };
  async function auth(path, body, token, method) {
    try {
      const res = await fetch(SB + "/auth/v1/" + path, { method: method || "POST", headers: { "Content-Type": "application/json", apikey: AK, Authorization: "Bearer " + (token || AK) }, body: body ? JSON.stringify(body) : undefined });
      return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
    } catch (e) { return { ok: false, status: 0, offline: true, data: {} }; }
  }
  async function rpc(fn, body, token) {
    const res = await fetch(SB + "/rest/v1/rpc/" + fn, { method: "POST", headers: { "Content-Type": "application/json", apikey: AK, Authorization: "Bearer " + (token || AK) }, body: JSON.stringify(body || {}) });
    if (!res.ok) throw new Error("server " + res.status);
    return res.json();
  }
  const jwt = (t) => { try { return JSON.parse(atob(String(t).split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch { return {}; } };
  const readSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; } };
  function saveSession(s) {
    const c = jwt(s.access_token);
    const v = { access_token: s.access_token, refresh_token: s.refresh_token || "", expires_at: Number(s.expires_at) || c.exp || Math.floor(Date.now() / 1000) + (Number(s.expires_in) || 3600), email: String(s.user?.email || c.email || "").toLowerCase(), uid: s.user?.id || c.sub || "" };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(v)); } catch {}
    return v;
  }
  async function liveSession() {
    const s = readSession(); if (!s || !s.access_token) return null;
    if (s.expires_at - Date.now() / 1000 > 120) return s;
    if (!s.refresh_token) return null;
    const r = await auth("token?grant_type=refresh_token", { refresh_token: s.refresh_token });
    return r.ok && r.data.access_token ? saveSession(r.data) : null;
  }

  const css = `.ck{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;font-family:Manrope,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.ck[hidden]{display:none}.ck-scrim{position:absolute;inset:0;background:rgba(0,0,0,.72)}
.ck-card{position:relative;width:min(460px,100%);max-height:92vh;overflow:auto;background:#12100d;color:#f4ead2;border:1px solid rgba(217,190,132,.28);border-radius:22px 22px 0 0;padding:22px 20px calc(24px + env(safe-area-inset-bottom,0px));box-shadow:0 -30px 80px rgba(0,0,0,.6)}
@media(min-width:600px){.ck{align-items:center}.ck-card{border-radius:22px}}
.ck h3{margin:0 0 4px;font-size:22px;font-family:"Playfair Display",Georgia,serif;font-weight:600}.ck p{margin:0 0 12px;color:rgba(244,234,210,.7);font-size:14px;line-height:1.5}
.ck-x{position:absolute;right:12px;top:10px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(244,234,210,.2);background:transparent;color:#f4ead2;font-size:22px;line-height:1;cursor:pointer}
.ck-sum{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px;border-radius:14px;background:rgba(217,190,132,.08);border:1px solid rgba(217,190,132,.25);margin:12px 0}
.ck-sum b{font-size:17px}.ck-sum small{display:block;color:rgba(244,234,210,.65);font-size:12.5px}
.ck-seg{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:0 0 12px}.ck-seg button,.ck-opt{border:1px solid rgba(244,234,210,.22);background:transparent;color:#f4ead2;border-radius:12px;padding:11px 10px;font:600 14px Manrope,system-ui,sans-serif;cursor:pointer;text-align:left}
.ck-seg button[aria-pressed=true],.ck-opt[aria-pressed=true]{border-color:#d9be84;background:rgba(217,190,132,.14)}
.ck-opt{display:block;width:100%;margin:0 0 8px}.ck-opt small{display:block;font-weight:500;color:rgba(244,234,210,.65);margin-top:2px}
.ck input{width:100%;box-sizing:border-box;height:48px;border-radius:12px;border:1px solid rgba(217,190,132,.3);background:rgba(0,0,0,.35);color:#f4ead2;padding:0 14px;font-size:16px;margin:0 0 10px;outline:none}.ck input:focus{border-color:#d9be84}
.ck-go{display:block;width:100%;height:50px;border-radius:99px;border:0;background:linear-gradient(135deg,#8a6a35,#e9d39e 40%,#b8935a 60%,#f2e1b2);color:#17120a;font:700 15px Manrope,system-ui,sans-serif;cursor:pointer;margin-top:4px}.ck-go[disabled]{opacity:.6}
.ck-link{background:none;border:0;color:#d9be84;font:600 13.5px Manrope,system-ui,sans-serif;cursor:pointer;padding:8px 0;text-decoration:underline}
.ck-err{min-height:20px;color:#ffb4a8;font-size:13.5px;margin:2px 0 6px}.ck-ok{color:#8fd8b0}
.ck-fine{font-size:12px;color:rgba(244,234,210,.55);text-align:center;margin:12px 0 0}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const root = document.createElement("div"); root.className = "ck"; root.hidden = true; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true");
  root.innerHTML = '<div class="ck-scrim" data-x></div><div class="ck-card"><button class="ck-x" type="button" data-x aria-label="Close">×</button><div id="ck-body"></div></div>';
  document.body.appendChild(root);
  const body = $("#ck-body", root);

  const S = { tier: "starter", per: "year", how: "card", prices: [], mode: "off", session: null, email: "", mode2: "signup" };
  const price = (t, p) => (S.prices.find((x) => x.tier === t && x.period === p) || {}).amount_kobo;
  const busy = (btn, text) => { const o = btn.textContent; btn.disabled = true; btn.textContent = text; return () => { btn.disabled = false; btn.textContent = o; }; };
  const err = (t, ok) => { const e = $("#ck-err"); if (e) { e.textContent = t || ""; e.classList.toggle("ck-ok", !!ok); } };
  const tierName = (t) => (t === "pro" ? "Pro" : "Starter");
  const close = () => { root.hidden = true; document.documentElement.style.overflow = ""; };
  root.addEventListener("click", (e) => { if (e.target.closest("[data-x]")) close(); });

  function viewPlan() {
    const p = price(S.tier, S.per);
    body.innerHTML = '<h3>Aurum ' + tierName(S.tier) + '</h3><p>Pick how you want to pay. You can cancel any time.</p>' +
      '<div class="ck-seg" role="group" aria-label="Billing period"><button type="button" data-per="month" aria-pressed="' + (S.per === "month") + '">Monthly</button><button type="button" data-per="year" aria-pressed="' + (S.per === "year") + '">Yearly <small style="font-weight:600;color:#d9be84">2 months free</small></button></div>' +
      '<div class="ck-sum"><div><b>Aurum ' + tierName(S.tier) + '</b><small>' + (S.per === "year" ? "Yearly plan" : "Monthly plan") + '</small></div><b>' + (p ? naira(p) : "…") + '</b></div>' +
      '<button type="button" class="ck-opt" data-how="card" aria-pressed="' + (S.how === "card") + '">Card<small>Renews by itself every ' + (S.per === "year" ? "year" : "month") + '. Visa, Mastercard or Verve.</small></button>' +
      '<button type="button" class="ck-opt" data-how="transfer" aria-pressed="' + (S.how === "transfer") + '">Bank transfer or USSD<small>One payment for one ' + (S.per === "year" ? "year" : "month") + '. It does not renew by itself.</small></button>' +
      '<div class="ck-err" id="ck-err" role="alert"></div><button class="ck-go" type="button" data-next>' + (S.session ? "Pay " + (p ? naira(p) : "") + " with Paystack" : "Continue") + '</button>' +
      '<p class="ck-fine">🔒 Secured by Paystack. We never see your card details.</p>';
  }
  function viewAccount(mode, note) {
    S.mode2 = mode;
    const create = mode === "create";
    body.innerHTML = '<h3>' + (create ? "Create your account" : "Sign in") + '</h3><p>' + (create ? "Your plan is saved to your account, so it works on every phone you use." : "Welcome back. Sign in to continue to payment.") + '</p>' +
      (create ? '<input id="ck-name" autocomplete="name" placeholder="Your name"><input id="ck-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="Phone number (e.g. 0803 123 4567)">' : "") +
      '<input id="ck-email" type="email" inputmode="email" autocomplete="email" placeholder="Email address" value="' + (S.email || "") + '"><input id="ck-pw" type="password" autocomplete="' + (create ? "new-password" : "current-password") + '" placeholder="' + (create ? "Choose a password (8+ characters)" : "Password") + '">' +
      '<div class="ck-err ' + (note ? "ck-ok" : "") + '" id="ck-err" role="alert">' + (note || "") + '</div><button class="ck-go" type="button" data-acct>' + (create ? "Create account and continue" : "Sign in and continue") + '</button>' +
      '<button class="ck-link" type="button" data-swap>' + (create ? "I already have an account" : "Create a new account") + '</button><button class="ck-link" type="button" data-back style="float:right">Back</button>';
  }
  function viewCode(note) {
    body.innerHTML = '<h3>Check your email</h3><p>We sent a 6-digit code to <b>' + S.email + '</b>. Type it here to confirm your account.</p>' +
      '<input id="ck-code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="6-digit code"><div class="ck-err ' + (note ? "ck-ok" : "") + '" id="ck-err" role="alert">' + (note || "") + '</div>' +
      '<button class="ck-go" type="button" data-code>Confirm and continue</button><button class="ck-link" type="button" data-resend>Send it again</button>';
  }
  function viewPaying(t) { body.innerHTML = '<h3>' + (t || "One moment…") + '</h3><p>Taking you to Paystack to pay securely.</p>'; }

  async function pay() {
    viewPaying("Opening Paystack…");
    try {
      const s = await liveSession(); if (!s) { S.session = null; return viewAccount("signin", "Please sign in again."); }
      const o = await rpc("create_sub_order", { p_tier: S.tier, p_period: S.per, p_method: S.how }, s.access_token);
      if (!o.ok) { viewPlan(); return err(MSG[o.reason] || "Couldn't start that payment. Try again."); }
      const res = await fetch(SB + "/functions/v1/billing", { method: "POST", headers: { "Content-Type": "application/json", apikey: AK, Authorization: "Bearer " + s.access_token }, body: JSON.stringify({ action: "init", reference: o.reference }) });
      const j = await res.json().catch(() => ({}));
      if (j.ok && j.authorization_url) { try { localStorage.setItem("aurum.paying", JSON.stringify({ ref: o.reference, at: Date.now() })); } catch {} location.href = j.authorization_url; return; }
      viewPlan(); err(j.reason === "plan_not_ready" ? "Card payments are not ready yet. Try bank transfer or USSD." : "Couldn't open the payment page. Try again.");
    } catch (e) { viewPlan(); err("Connect to the internet and try again."); }
  }

  body.addEventListener("click", async (e) => {
    const t = e.target;
    const per = t.closest("[data-per]"); if (per) { S.per = per.dataset.per; return viewPlan(); }
    const how = t.closest("[data-how]"); if (how) { S.how = how.dataset.how; return viewPlan(); }
    if (t.closest("[data-next]")) return S.session ? pay() : viewAccount("create");
    if (t.closest("[data-swap]")) return viewAccount(S.mode2 === "create" ? "signin" : "create");
    if (t.closest("[data-back]")) return viewPlan();
    if (t.closest("[data-resend]")) { const r = await auth("resend", { type: "signup", email: S.email }); return err(r.ok ? "We sent a new code." : MSG[reason(r)] || MSG.other, r.ok); }
    if (t.closest("[data-code]")) {
      const code = ($("#ck-code").value || "").replace(/\D/g, ""); if (code.length < 6) return err(MSG.code);
      const done = busy(t.closest("[data-code]"), "Checking…"); const r = await auth("verify", { type: "signup", email: S.email, token: code }); done();
      if (r.ok && r.data.access_token) { S.session = saveSession(r.data); return pay(); }
      return err(MSG[reason(r)] || MSG.code);
    }
    if (t.closest("[data-acct]")) {
      const btn = t.closest("[data-acct]"), email = ($("#ck-email").value || "").trim().toLowerCase(), pw = $("#ck-pw").value || "";
      S.email = email;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err(MSG.email);
      if (S.mode2 === "create") {
        const name = ($("#ck-name").value || "").trim(), phone = ($("#ck-phone").value || "").trim(), digits = (phone.match(/[0-9]/g) || []).length;
        if (name.length < 2) return err(MSG.name); if (digits < 8 || digits > 15) return err(MSG.phone); if (pw.length < 8) return err(MSG.weak);
        const done = busy(btn, "Creating…"); const r = await auth("signup", { email, password: pw, data: { full_name: name, phone } }); done();
        if (r.ok) {
          if (r.data.access_token) { S.session = saveSession(r.data); return pay(); }
          const u = r.data.user || r.data; if (Array.isArray(u.identities) && u.identities.length === 0) return err(MSG.exists);
          return viewCode();
        }
        return err(MSG[reason(r)] || MSG.other);
      }
      if (!pw) return err(MSG.creds);
      const done = busy(btn, "Signing in…"); const r = await auth("token?grant_type=password", { email, password: pw }); done();
      if (r.ok && r.data.access_token) { S.session = saveSession(r.data); return pay(); }
      const why = reason(r);
      if (why === "unconfirmed") { await auth("resend", { type: "signup", email }); return viewCode(MSG.unconfirmed); }
      return err(MSG[why] || MSG.other);
    }
  });

  async function open(tier, per) {
    S.tier = tier === "pro" ? "pro" : "starter"; if (per) S.per = per; S.how = "card";
    root.hidden = false; document.documentElement.style.overflow = "hidden";
    body.innerHTML = '<h3>One moment…</h3><p>Getting today\'s prices.</p>';
    try { const pp = await rpc("plan_prices", {}); S.prices = pp.prices || []; S.mode = pp.mode || "off"; } catch { S.prices = []; }
    S.session = await liveSession();
    if (!S.prices.length) { body.innerHTML = '<h3>Plans are opening soon</h3><p>Please try again in a little while, or start free in the meantime.</p><a class="ck-go" style="text-align:center;line-height:50px;text-decoration:none" href="/app/">Start free</a>'; return; }
    viewPlan();
  }
  // every "Get Starter / Get Pro" link on the website opens this window instead of going to the app
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href*="app/?buy="], [data-checkout]'); if (!a) return;
    const m = (a.getAttribute("href") || "").match(/buy=(starter|pro)/), tier = a.dataset.checkout || (m && m[1]); if (!tier) return;
    e.preventDefault(); open(tier, /per=year/.test(a.getAttribute("href") || "") ? "year" : /per=month/.test(a.getAttribute("href") || "") ? "month" : null);
  });
  window.AurumCheckout = { open };
})();
