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
