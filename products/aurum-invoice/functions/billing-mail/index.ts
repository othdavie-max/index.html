// Aurum: sends the emails waiting in the mail_queue table (plan ending, could not renew, plan ended; plan/07, part J).
// The database's daily job calls this. It needs a mail service (set-up job 1 in plan/07, part L).
//
// Secrets (Supabase, Edge Functions, Secrets):
//   BREVO_API_KEY         the API key of your free Brevo account (or change the one fetch below for another mail service)
//   MAIL_FROM_EMAIL       the sending address on your domain, for example hello@auruminvoice.com.ng
//   MAIL_FROM_NAME        optional, defaults to "Aurum Invoice Studio"
//   BILLING_MAIL_SECRET   a long random text, the same one the database holds (app_config key billing_mail_secret)
//
// verify_jwt must be OFF (the database calls it with the shared secret in the x-mail-secret header, not a sign-in).
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function rpc(fn: string, args: Record<string, unknown>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`rpc ${fn} failed ${r.status}`);
  try { return text ? JSON.parse(text) : null; } catch (_) { return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, reason: "method" }, 405);
  const secret = Deno.env.get("BILLING_MAIL_SECRET");
  if (!secret || req.headers.get("x-mail-secret") !== secret) return json({ ok: false, reason: "forbidden" }, 403);
  const key = Deno.env.get("BREVO_API_KEY"), from = Deno.env.get("MAIL_FROM_EMAIL");
  if (!key || !from) return json({ ok: false, reason: "not_configured" });       // nothing is taken from the queue until mail is set up
  const rows: { id: number; to_email: string; subject: string; body: string }[] = (await rpc("mail_take", { p_limit: 20 })) || [];
  let sent = 0, failed = 0;
  for (const m of rows) {
    try {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender: { name: Deno.env.get("MAIL_FROM_NAME") || "Aurum Invoice Studio", email: from }, to: [{ email: m.to_email }], subject: m.subject, textContent: m.body }),
      });
      if (r.ok) { await rpc("mail_done", { p_id: m.id }); sent++; }
      else { await rpc("mail_done", { p_id: m.id, p_error: `mail service answered ${r.status}` }); failed++; }
    } catch (e) { await rpc("mail_done", { p_id: m.id, p_error: String((e as Error).message || e).slice(0, 200) }); failed++; }
  }
  return json({ ok: true, sent, failed });
});
