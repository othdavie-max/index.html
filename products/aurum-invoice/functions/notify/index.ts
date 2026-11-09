// Aurum: sends a phone alert to every device a Prestige business has switched alerts on for.
// Called only by the database (view_invoice, claim_paid) with a shared secret, never by browsers.
//
// Secrets (Supabase, Edge Functions, Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT   identify Aurum to the phone makers' push services
//   NOTIFY_SECRET                                        shared with the database

import webpush from "npm:web-push@3.6.7";

const SB = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const hdr = { apikey: KEY, Authorization: `Bearer ${KEY}` };

webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")!, Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  if (req.headers.get("x-notify-secret") !== Deno.env.get("NOTIFY_SECRET")) return new Response("forbidden", { status: 403 });
  let m: { licence_key?: string; title?: string; body?: string; url?: string; tag?: string } = {};
  try { m = await req.json(); } catch (_) { return new Response("bad", { status: 400 }); }
  if (!m.licence_key) return new Response("bad", { status: 400 });

  const r = await fetch(`${SB}/rest/v1/push_subs?licence_key=eq.${encodeURIComponent(m.licence_key)}&select=id,endpoint,p256dh,auth`, { headers: hdr });
  const subs: { id: number; endpoint: string; p256dh: string; auth: string }[] = await r.json().catch(() => []);
  const payload = JSON.stringify({ title: String(m.title || "Aurum").slice(0, 80), body: String(m.body || "").slice(0, 160), url: m.url || "/app/", tag: m.tag || "aurum" });

  let sent = 0, gone = 0, failed = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24, urgency: "high" });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) { gone++; await fetch(`${SB}/rest/v1/push_subs?id=eq.${s.id}`, { method: "DELETE", headers: hdr }); } else failed++;
    }
  }));
  return new Response(JSON.stringify({ ok: true, devices: subs.length, sent, gone, failed }), { headers: { "Content-Type": "application/json" } });
});
