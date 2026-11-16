// Aurum: starts and checks subscription payments for a signed-in person (plan/07, part G3, G4 and H5).
//
// The platform's sign-in check is ON for this function (verify_jwt = true): the caller must be signed in.
// Actions (POST, JSON):
//   { action: "init",         reference, channel? }  -> { ok, authorization_url }   start paying an order made by create_sub_order
//   { action: "verify",       reference }            -> { ok, status, tier, paid_until }   after coming back from Paystack
//   { action: "stop_renewal" }                       -> { ok }                      switch the card subscription off (plan stays to its date)
//   { action: "manage_link" }                        -> { ok, link }                Paystack's own page to change the card
//   { action: "setup_plans", mode }                  -> { ok, codes }               OWNER ONLY: create the four Paystack plans for 'test' or 'live'
//
// The price always comes from the database. Paystack is always asked before anything is counted.
//
// Secrets: PAYSTACK_LIVE_SECRET_KEY, PAYSTACK_TEST_SECRET_KEY, and SITE_URL (where Paystack sends people back to)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE = (Deno.env.get("SITE_URL") || "https://auruminvoice.com.ng").replace(/\/$/, "");
type Mode = "live" | "test";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const secretFor = (mode: Mode) => Deno.env.get(mode === "live" ? "PAYSTACK_LIVE_SECRET_KEY" : "PAYSTACK_TEST_SECRET_KEY") || "";
const validRef = (r: string) => /^AUS-[A-Z0-9]{20}$/.test(r);

async function rpc(fn: string, args: Record<string, unknown>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`rpc ${fn} failed ${r.status}: ${text.slice(0, 200)}`);
  try { return text ? JSON.parse(text) : null; } catch (_) { return null; }
}
const log = (kind: string, reference: string | null, detail: unknown) => rpc("log_billing", { p_kind: kind, p_reference: reference, p_detail: detail ?? null }).catch(() => {});

async function paystack(mode: Mode, method: string, path: string, body?: unknown) {
  const secret = secretFor(mode);
  if (!secret) return { ok: false, data: null as any, message: "not_configured" };
  const r = await fetch("https://api.paystack.co" + path, {
    method, headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => null);
  return { ok: r.ok && j?.status === true, data: j?.data ?? null, message: j?.message as string | undefined };
}

// The platform has already checked the sign-in; here we only read who it is.
function userFromJwt(auth: string | null): { id: string; email: string } | null {
  try {
    const t = String(auth || "").replace(/^Bearer\s+/i, "");
    const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!p.sub || (p.exp && p.exp < Date.now() / 1000)) return null;
    return { id: String(p.sub), email: String(p.email || "") };
  } catch (_) { return null; }
}
async function currentMode(): Promise<Mode> { const p = await rpc("plan_prices", {}); return p?.mode === "live" ? "live" : "test"; }

async function initPayment(uid: string, reference: string, channel?: string) {
  if (!validRef(reference)) return { ok: false, reason: "unknown" };
  const order = await rpc("sub_order_for_verify", { p_reference: reference });
  if (!order?.ok || order.user_id !== uid) { await log("init_refused", reference, { user: uid }); return { ok: false, reason: "unknown" }; }
  if (order.status === "paid") return { ok: false, reason: "already_paid" };
  if (!secretFor(order.mode)) return { ok: false, reason: "not_configured" };
  const base = { email: order.email, amount: order.amount_kobo, currency: "NGN", reference, callback_url: `${SITE}/app/?paid=${reference}`,
    metadata: { tier: order.tier, period: order.period, method: order.method, custom_fields: [{ display_name: "Plan", variable_name: "plan", value: `${order.tier} ${order.period}` }] } };
  let body: Record<string, unknown>;
  if (order.method === "card") {
    if (!order.plan_code) return { ok: false, reason: "plan_not_ready" };
    body = { ...base, plan: order.plan_code, channels: ["card"] };       // a plan makes Paystack charge the card again each period
  } else {
    body = { ...base, channels: ["bank_transfer", "ussd", "bank"] };      // one payment for one period
  }
  const r = await paystack(order.mode, "POST", "/transaction/initialize", body);
  if (!r.ok || !r.data?.authorization_url) { await log("init_failed", reference, { message: r.message || null }); return { ok: false, reason: "init_failed" }; }
  return { ok: true, authorization_url: r.data.authorization_url };
}

async function verifyOrder(uid: string, reference: string) {
  if (!validRef(reference)) return { ok: false, reason: "unknown" };
  const order = await rpc("sub_order_for_verify", { p_reference: reference });
  if (!order?.ok || order.user_id !== uid) return { ok: false, reason: "unknown" };
  if (order.status === "paid") return { ok: true, status: "paid", already: true };   // the app then reads the plan with my_billing
  const v = await paystack(order.mode, "GET", `/transaction/verify/${encodeURIComponent(reference)}`);
  const d = v.data;
  if (!v.ok || !d || d.status !== "success") return { ok: false, reason: "pending" };
  if (d.reference !== reference || d.currency !== "NGN") { await log("verify_mismatch", reference, { reference: d.reference, currency: d.currency }); return { ok: false, reason: "mismatch" }; }
  const res = await rpc("apply_payment", { p_reference: reference, p_paid_kobo: d.amount, p_channel: d.channel ?? null, p_source: "order" });
  if (res?.ok && !res.already && order.method === "card" && d.customer?.customer_code) {
    await rpc("save_subscription", { p_licence_key: order.licence_key, p_customer_code: d.customer.customer_code, p_subscription_code: null, p_email_token: null,
      p_plan_code: d.plan?.plan_code || order.plan_code || null, p_tier: order.tier, p_period: order.period });
  }
  return res?.ok ? { ok: true, status: "paid", tier: res.tier, period: res.period, paid_until: res.paid_until, bonus_days: res.bonus_days } : { ok: false, reason: res?.reason || "failed" };
}

async function stopRenewal(uid: string) {
  const key = await rpc("licence_of_user", { p_user: uid });
  const sub = key ? await rpc("subscription_of", { p_key: key }) : null;
  if (!sub?.code || !sub?.token) return { ok: false, reason: "none" };
  const r = await paystack(await currentMode(), "POST", "/subscription/disable", { code: sub.code, token: sub.token });
  if (!r.ok) { await log("stop_renewal_failed", sub.code, { message: r.message || null }); return { ok: false, reason: "failed" }; }
  await rpc("mark_subscription", { p_subscription_code: sub.code, p_status: "not_renewing" });
  await log("stop_renewal", sub.code, { user: uid });
  return { ok: true };
}

async function manageLink(uid: string) {
  const key = await rpc("licence_of_user", { p_user: uid });
  const sub = key ? await rpc("subscription_of", { p_key: key }) : null;
  if (!sub?.code) return { ok: false, reason: "none" };
  const r = await paystack(await currentMode(), "GET", `/subscription/${encodeURIComponent(sub.code)}/manage/link`);
  return r.ok && r.data?.link ? { ok: true, link: r.data.link } : { ok: false, reason: "failed" };
}

// Owner only: make the four Paystack plans (one per tier and period) and remember their codes.
async function setupPlans(uid: string, mode: string) {
  if (!(await rpc("is_admin_user", { p_user: uid }))) { await log("setup_plans_refused", null, { user: uid }); return { ok: false, reason: "forbidden" }; }
  if (mode !== "live" && mode !== "test") return { ok: false, reason: "mode" };
  const rows = await rpc("price_codes", { p_mode: mode });
  const codes: Record<string, string> = {};
  for (const r of rows || []) {
    const name = `Aurum ${r.tier === "pro" ? "Pro" : "Starter"} ${r.period === "year" ? "Yearly" : "Monthly"}`;
    if (r.code) { codes[`${r.tier}_${r.period}`] = r.code; continue; }
    const made = await paystack(mode as Mode, "POST", "/plan", { name, amount: r.amount_kobo, interval: r.period === "year" ? "annually" : "monthly", currency: "NGN", description: name });
    if (!made.ok || !made.data?.plan_code) { await log("setup_plans_failed", name, { message: made.message || null }); return { ok: false, reason: "failed", name }; }
    await rpc("set_price_code", { p_mode: mode, p_tier: r.tier, p_period: r.period, p_code: made.data.plan_code });
    codes[`${r.tier}_${r.period}`] = made.data.plan_code;
  }
  return { ok: true, codes };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, reason: "method" }, 405);
  const user = userFromJwt(req.headers.get("authorization"));
  if (!user) return json({ ok: false, reason: "auth" }, 401);
  let body: any = {};
  try { body = await req.json(); } catch (_) { return json({ ok: false, reason: "bad_request" }, 400); }
  try {
    switch (body.action) {
      case "init": return json(await initPayment(user.id, String(body.reference || ""), body.channel));
      case "verify": return json(await verifyOrder(user.id, String(body.reference || "")));
      case "stop_renewal": return json(await stopRenewal(user.id));
      case "manage_link": return json(await manageLink(user.id));
      case "setup_plans": return json(await setupPlans(user.id, String(body.mode || "")));
      default: return json({ ok: false, reason: "bad_request" }, 400);
    }
  } catch (e) {
    await log("billing_error", null, { action: body.action || null, message: String((e as Error).message || e).slice(0, 300) });
    return json({ ok: false, reason: "error" }, 500);
  }
});
