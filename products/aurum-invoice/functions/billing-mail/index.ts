// Aurum: sends the emails waiting in the mail_queue table (plan notices and client reminders).
// The database's daily job calls this. It sends through a Gmail account (an app password), over SMTP.
//
// Secrets (Supabase, Edge Functions, Secrets):
//   GMAIL_USER            the Gmail address that owns the app password
//   GMAIL_APP_PASSWORD    the 16-letter Google app password
//   MAIL_FROM_NAME        optional, defaults to "Aurum Invoice Studio"
//   BILLING_MAIL_SECRET   a long random text, the same one the database holds (app_config key billing_mail_secret)
//
// verify_jwt must be OFF (the database calls it with the shared secret in the x-mail-secret header, not a sign-in).
import nodemailer from "npm:nodemailer@6.9.16";
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
  const user = Deno.env.get("GMAIL_USER"), pass = Deno.env.get("GMAIL_APP_PASSWORD");
  if (!user || !pass) return json({ ok: false, reason: "not_configured" });       // nothing is taken from the queue until mail is set up
  const transport = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
  const rows: { id: number; to_email: string; subject: string; body: string; from_name?: string | null; reply_to?: string | null }[] = (await rpc("mail_take", { p_limit: 20 })) || [];
  let sent = 0, failed = 0;
  const clean = (s: string) => s.replace(/[
"<>]/g, " ").trim().slice(0, 80);
  for (const m of rows) {
    try {
      const name = m.from_name ? clean(m.from_name) : (Deno.env.get("MAIL_FROM_NAME") || "Aurum Invoice Studio");
      await transport.sendMail({ from: `"${name}" <${user}>`, to: m.to_email, subject: m.subject, text: m.body, ...(m.reply_to ? { replyTo: m.reply_to } : {}) });
      await rpc("mail_done", { p_id: m.id }); sent++;
    } catch (e) { await rpc("mail_done", { p_id: m.id, p_error: String((e as Error).message || e).slice(0, 200) }); failed++; }
  }
  return json({ ok: true, sent, failed });
});
