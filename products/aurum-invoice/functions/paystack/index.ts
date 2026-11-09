// Aurum: confirms Paystack payments and hands out licence keys.
//
// Two callers:
//   1. The buyer's browser right after paying:  POST { action: "verify", reference }
//   2. Paystack itself (webhook):               POST with an x-paystack-signature header
//
// Neither caller is trusted. Every payment is re-checked directly with Paystack using
// your secret key, and the amount is compared with the price stored in the database.
//
// Secrets (Supabase, Edge Functions, Secrets):
//   PAYSTACK_LIVE_SECRET_KEY   sk_live_...
//   PAYSTACK_TEST_SECRET_KEY   sk_test_...

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function rpc(fn: string, args: Record<string, unknown>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  return await r.json();
}

const secretFor = (mode: string) => Deno.env.get(mode === "live" ? "PAYSTACK_LIVE_SECRET_KEY" : "PAYSTACK_TEST_SECRET_KEY") || "";

async function hmacSha512Hex(secret: string, text: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Ask Paystack whether this reference was really paid, then let the database issue the key.
async function verifyAndFulfil(reference: string) {
  if (!/^AUR-[A-Z0-9]{20}$/.test(reference)) return { ok: false, reason: "unknown" };
  const order = await rpc("order_for_verify", { p_reference: reference });
  if (!order?.ok) return { ok: false, reason: "unknown" };
  if (order.status === "paid") return await rpc("fulfil_order", { p_reference: reference, p_paid_kobo: order.amount_kobo, p_channel: null });

  const secret = secretFor(order.mode);
  if (!secret) return { ok: false, reason: "not_configured" };

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const data = await res.json().catch(() => null);
  const d = data?.data;
  if (!res.ok || !data?.status || !d) return { ok: false, reason: "pending" };
  if (d.status !== "success") return { ok: false, reason: "pending" };
  if (d.reference !== reference || d.currency !== "NGN") return { ok: false, reason: "mismatch" };
  return await rpc("fulfil_order", { p_reference: reference, p_paid_kobo: d.amount, p_channel: d.channel ?? null });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, reason: "method" }, 405);

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  // Paystack webhook
  if (signature) {
    let valid = false;
    for (const mode of ["live", "test"]) {
      const secret = secretFor(mode);
      if (secret && (await hmacSha512Hex(secret, raw)) === signature) { valid = true; break; }
    }
    if (!valid) return json({ ok: false, reason: "signature" }, 401);
    try {
      const event = JSON.parse(raw);
      if (event?.event === "charge.success" && event?.data?.reference) await verifyAndFulfil(String(event.data.reference));
    } catch (_) { /* always answer 200 so Paystack does not retry forever */ }
    return json({ ok: true });
  }

  // Buyer's browser
  let body: { action?: string; reference?: string } = {};
  try { body = JSON.parse(raw); } catch (_) { return json({ ok: false, reason: "bad_request" }, 400); }
  if (body.action !== "verify" || !body.reference) return json({ ok: false, reason: "bad_request" }, 400);
  const out = await verifyAndFulfil(String(body.reference));
  return json(out.ok ? { ok: true, key: out.key, plan: out.plan, test: out.test } : { ok: false, reason: out.reason });
});
