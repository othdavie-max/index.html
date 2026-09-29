import { STALE_LEAD_DAYS } from "./constants";
import type { CrmLead } from "./types";

const DAY = 86_400_000;
const TERMINAL = ["Won", "Lost", "Nurture"];

/** Red flag: an open lead with no contact for `days` days (measured from creation if never contacted). */
export function isStale(lead: Pick<CrmLead, "stage" | "last_contacted_at" | "created_at">, days = STALE_LEAD_DAYS, now = Date.now()) {
  if (TERMINAL.includes(lead.stage)) return false;
  const last = new Date(lead.last_contacted_at ?? lead.created_at).getTime();
  return now - last >= days * DAY;
}

/** wa.me wants digits only. */
export const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

export const CRM_TIMEZONE = process.env.CRM_TIMEZONE ?? "Asia/Dubai";

/** [start, end) of the current calendar day in `tz`, as instants. */
export function dayBounds(now = new Date(), tz = CRM_TIMEZONE): { start: Date; end: Date } {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const offsetMs = Date.parse(now.toLocaleString("en-US", { timeZone: tz }) + " UTC") - Date.parse(now.toLocaleString("en-US", { timeZone: "UTC" }) + " UTC");
  const start = new Date(Date.parse(`${ymd}T00:00:00Z`) - offsetMs);
  return { start, end: new Date(start.getTime() + DAY) };
}

/** "3h 12m" / "2d 4h" style duration for the speed-to-lead timer. */
export function formatWait(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60_000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
