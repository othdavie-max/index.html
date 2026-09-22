import { Resend } from "resend";
import { siteSettings } from "@/data/site-settings";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? "Baseline Educational Services <notifications@baselineeducationalservices.com>";
const TEAM_EMAIL = process.env.TEAM_NOTIFICATION_EMAIL ?? siteSettings.email;

/** No-ops (and logs) when RESEND_API_KEY is unset, so forms still work locally without email configured. */
export async function sendEmail(opts: { to: string | string[]; subject: string; html: string }) {
  if (!resend) {
    console.info("[email:skip] RESEND_API_KEY not set — would have sent:", opts.subject, "to", opts.to);
    return { skipped: true };
  }
  return resend.emails.send({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html });
}

export function notifyTeam(subject: string, html: string) {
  return sendEmail({ to: TEAM_EMAIL, subject: `[Baseline] ${subject}`, html });
}

export function wrapEmail(title: string, bodyHtml: string) {
  return `
  <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; color: #2A1810;">
    <div style="background:#2A1810; padding: 24px; border-radius: 12px 12px 0 0;">
      <span style="color:#fff; font-size:20px; font-weight:700;">Baseline<span style="color:#C4A57B;">.</span></span>
    </div>
    <div style="border: 1px solid #EDE4DD; border-top: none; padding: 24px; border-radius: 0 0 12px 12px; background:#FAF6F1;">
      <h2 style="color:#2A1810; margin-top:0;">${title}</h2>
      ${bodyHtml}
    </div>
    <p style="color:#7A6F68; font-size:12px; margin-top: 16px; text-align:center;">
      ${siteSettings.companyName} · ${siteSettings.address}
    </p>
  </div>`;
}
