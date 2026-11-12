// Aurum: starts a FREE plan sign-up. Checks the email, saves a pending sign-up, and emails a confirmation link.
// The link opens the app, which then collects the free key. Nothing is shown to the browser except ok / reason.
//
// Secrets (Supabase, Edge Functions, Secrets):
//   BREVO_API_KEY      free Brevo account API key (https://app.brevo.com, SMTP & API, API keys)
//   MAIL_FROM          a sender address you have verified in Brevo, e.g. hello@yourdomain.com or your Gmail
//   IP_SALT            any long random text (so the stored network fingerprint cannot be reversed)
//   SITE_URL           optional, defaults to the live site

const SB = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE = (Deno.env.get("SITE_URL") || "https://auruminvoicestudio.netlify.app").replace(/\/$/, "");
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const out = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

async function sha256(t: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return out({ ok: false, reason: "method" }, 405);
  let b: { email?: string; device?: string; website?: string } = {};
  try { b = await req.json(); } catch (_) { return out({ ok: false, reason: "bad" }, 400); }
  if (b.website) return out({ ok: true }); // hidden field: bots fill it, people do not

  const brevo = Deno.env.get("BREVO_API_KEY"), from = Deno.env.get("MAIL_FROM");
  if (!brevo || !from) return out({ ok: false, reason: "not_configured" });

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const ipHash = await sha256(ip + "|" + (Deno.env.get("IP_SALT") || "aurum"));

  const r = await fetch(`${SB}/rest/v1/rpc/create_free_signup`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_email: String(b.email || ""), p_device: String(b.device || ""), p_ip_hash: ipHash }),
  });
  const j = await r.json().catch(() => ({ ok: false, reason: "error" }));
  if (!j.ok) return out({ ok: false, reason: j.reason || "error" });

  const link = `${SITE}/app/?free=${j.token}`;
  const html = `<div style="font-family:Georgia,serif;max-width:480px;margin:auto;padding:24px;color:#1a1a1a">
<h2 style="color:#8a6b2a;margin:0 0 12px">Aurum Invoice Studio</h2>
<p>Tap the button to confirm your email and open your free Aurum.</p>
<p style="margin:24px 0"><a href="${link}" style="background:#8a6b2a;color:#fff;padding:14px 22px;border-radius:8px;text-decoration:none;font-family:Arial,sans-serif">Confirm and open Aurum</a></p>
<p style="font-size:13px;color:#555">Free plan: 3 documents a month. The link works for 48 hours. If you did not ask for this, ignore this email.</p>
<p style="font-size:12px;color:#888">${link}</p></div>`;
  const m = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": brevo, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { name: "Aurum Invoice Studio", email: from }, to: [{ email: j.email }], subject: "Confirm your free Aurum", htmlContent: html }),
  });
  if (!m.ok) return out({ ok: false, reason: "mail_failed" });
  return out({ ok: true });
});
