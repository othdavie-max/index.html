// Aurum: receives Paystack's messages about subscription payments (plan/07, part G3 and H5).
//
// Paystack calls this on its own, so the platform's sign-in check MUST be OFF for this function (verify_jwt = false).
// Supabase switches that check back ON every time a function is deployed: deploy with verify_jwt false and check it after.
//
// Nobody is trusted. A message is only believed if its signature matches our Paystack secret key. Even then, a payment
// is only counted after we ask Paystack ourselves (status success, naira, right reference), and the amount that counts
// is the one Paystack reports, checked by the database against the price. A repeat of the same message changes nothing.
//
// Secrets (Supabase, Edge Functions, Secrets): PAYSTACK_LIVE_SECRET_KEY, PAYSTACK_TEST_SECRET_KEY
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
type Mode = "live" | "test";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
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

async function hmacSha512Hex(secret: string, text: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// The plan code Paystack sends tells us which plan and period a card renewal is for.
async function planFromCode(mode: Mode, code: string | null | undefined) {
  if (!code) return null;
  const list = await rpc("price_codes", { p_mode: mode });
  return (list || []).find((x: any) => x.code === code) || null;
}

// A payment made through an order we created: ask Paystack, then let the database add the time.
async function verifyAndApplyOrder(reference: string, eventMode?: Mode) {
  if (!validRef(reference)) return { ok: false, reason: "unknown" };
  const order = await rpc("sub_order_for_verify", { p_reference: reference });
  if (!order?.ok) return { ok: false, reason: "unknown" };
  if (eventMode && eventMode !== order.mode) { await log("mode_mismatch", reference, { event: eventMode, order: order.mode }); return { ok: false, reason: "mode_mismatch" }; }
  if (order.status === "paid") return { ok: true, status: "paid", already: true };
  const v = await paystack(order.mode, "GET", `/transaction/verify/${encodeURIComponent(reference)}`);
  const d = v.data;
  if (!v.ok || !d || d.status !== "success") return { ok: false, reason: "pending" };
  if (d.reference !== reference || d.currency !== "NGN") { await log("verify_mismatch", reference, { reference: d.reference, currency: d.currency }); return { ok: false, reason: "mismatch" }; }
  const res = await rpc("apply_payment", { p_reference: reference, p_paid_kobo: d.amount, p_channel: d.channel ?? null, p_source: "order" });
  if (res?.ok && !res.already && order.method === "card" && d.customer?.customer_code) {
    // remember who the card customer is, so later automatic charges can be matched to this account
    await rpc("save_subscription", { p_licence_key: order.licence_key, p_customer_code: d.customer.customer_code, p_subscription_code: null, p_email_token: null,
      p_plan_code: d.plan?.plan_code || order.plan_code || null, p_tier: order.tier, p_period: order.period });
  }
  return res?.ok ? { ok: true, status: "paid", tier: res.tier, period: res.period, paid_until: res.paid_until, already: !!res.already } : { ok: false, reason: res?.reason || "failed" };
}

// An automatic card charge months later: found by the Paystack customer, checked with Paystack, then added.
async function onRenewal(d: any, mode: Mode) {
  const ref = String(d.reference || "");
  const plan = await planFromCode(mode, d.plan?.plan_code);
  if (!plan) { await log("charge_not_ours", ref, { plan: d.plan?.plan_code || null }); return; }
  let key: string | null = null;
  const found = d.customer?.customer_code ? await rpc("licence_for_customer", { p_customer: d.customer.customer_code }) : null;
  key = found?.licence_key || null;
  if (!key && d.customer?.email) key = await rpc("licence_for_email", { p_email: d.customer.email });
  if (!key) { await log("renewal_unknown_customer", ref, { customer: d.customer?.customer_code || null }); return; }
  const v = await paystack(mode, "GET", `/transaction/verify/${encodeURIComponent(ref)}`);
  const t = v.data;
  if (!v.ok || !t || t.status !== "success" || t.reference !== ref || t.currency !== "NGN") { await log("renewal_not_verified", ref, { status: t?.status || null }); return; }
  await rpc("apply_payment", { p_reference: ref, p_paid_kobo: t.amount, p_channel: t.channel ?? null, p_source: "renewal", p_licence_key: key, p_tier: plan.tier, p_period: plan.period, p_mode: mode });
}

async function onSubscriptionCreate(d: any, mode: Mode) {
  const plan = await planFromCode(mode, d.plan?.plan_code);
  const cust = d.customer?.customer_code || null;
  let key: string | null = null;
  const found = cust ? await rpc("licence_for_customer", { p_customer: cust }) : null;
  key = found?.licence_key || null;
  if (!key && d.customer?.email) key = await rpc("licence_for_email", { p_email: d.customer.email });
  if (!key) { await log("subscription_unknown_customer", d.subscription_code || null, { customer: cust }); return; }
  // a new card subscription replaces the old one (for example monthly to yearly, or Starter to Pro): switch the old one off so nobody is charged twice
  const old = await rpc("subscription_of", { p_key: key });
  if (old?.code && old.code !== d.subscription_code && old.token && old.status !== "off") {
    const off = await paystack(mode, "POST", "/subscription/disable", { code: old.code, token: old.token });
    await log(off.ok ? "old_subscription_disabled" : "old_subscription_disable_failed", old.code, { by: d.subscription_code });
  }
  await rpc("save_subscription", { p_licence_key: key, p_customer_code: cust, p_subscription_code: d.subscription_code || null, p_email_token: d.email_token || null,
    p_plan_code: d.plan?.plan_code || null, p_tier: plan?.tier || null, p_period: plan?.period || null, p_next: d.next_payment_date || null });
}

async function handle(event: any, mode: Mode) {
  const ev = String(event?.event || ""), d = event?.data || {};
  await log("webhook:" + ev, d.reference || d.subscription_code || d.transaction_reference || null, { mode, domain: d.domain || null, status: d.status || null });
  if (ev === "charge.success") {
    const ref = String(d.reference || "");
    if (validRef(ref)) await verifyAndApplyOrder(ref, mode); else await onRenewal(d, mode);
  } else if (ev === "subscription.create") {
    await onSubscriptionCreate(d, mode);
  } else if (ev === "invoice.payment_failed") {
    const code = d.subscription?.subscription_code || d.subscription_code;
    if (code) await rpc("mark_subscription", { p_subscription_code: code, p_status: "attention" });
  } else if (ev === "subscription.not_renew") {
    if (d.subscription_code) await rpc("mark_subscription", { p_subscription_code: d.subscription_code, p_status: "not_renewing" });
  } else if (ev === "subscription.disable") {
    if (d.subscription_code) await rpc("mark_subscription", { p_subscription_code: d.subscription_code, p_status: "off" });
  } else if (ev === "refund.processed") {
    const ref = d.transaction_reference || d.transaction?.reference;
    if (ref) await rpc("apply_refund", { p_reference: String(ref) });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, reason: "method" }, 405);
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  if (!signature) return json({ ok: false, reason: "signature" }, 401);
  let mode: Mode | null = null;
  for (const m of ["live", "test"] as Mode[]) {
    const secret = secretFor(m);
    if (secret && (await hmacSha512Hex(secret, raw)) === signature) { mode = m; break; }
  }
  if (!mode) { await log("webhook_bad_signature", null, null); return json({ ok: false, reason: "signature" }, 401); }
  try { await handle(JSON.parse(raw), mode); }
  catch (e) { await log("webhook_error", null, { message: String((e as Error).message || e).slice(0, 300) }); }
  // always answer 200 once the signature is right, so Paystack does not retry forever
  return json({ ok: true });
});
