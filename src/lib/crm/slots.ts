import { CRM_TIMEZONE, dayBounds } from "./lead-utils";

export type Availability = { days: number[]; start: string; end: string; slot_minutes: number };
export const DEFAULT_AVAILABILITY: Availability = { days: [1, 2, 3, 4, 5], start: "10:00", end: "18:00", slot_minutes: 30 };

const DAY = 86_400_000;
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

export function parseAvailability(v: unknown): Availability {
  const a = v as Partial<Availability> | null;
  if (!a || !Array.isArray(a.days) || typeof a.start !== "string" || typeof a.end !== "string" || !(Number(a.slot_minutes) >= 10)) return DEFAULT_AVAILABILITY;
  return { days: a.days.map(Number), start: a.start, end: a.end, slot_minutes: Number(a.slot_minutes) };
}

/**
 * Open meeting slots for the next `days` calendar days (in `tz`), excluding slots
 * already booked and anything sooner than `leadMinutes` from now. Returns ISO instants.
 */
export function generateSlots(av: Availability, booked: Iterable<string | Date>, now = new Date(), days = 7, tz = CRM_TIMEZONE, leadMinutes = 30): string[] {
  const taken = new Set([...booked].map((b) => new Date(b).getTime()));
  const earliest = now.getTime() + leadMinutes * 60_000;
  const out: string[] = [];
  for (let i = 0; i < days; i++) {
    const { start } = dayBounds(new Date(now.getTime() + i * DAY), tz);
    const weekday = new Date(start.getTime() + 12 * 3_600_000).toLocaleDateString("en-US", { timeZone: tz, weekday: "short" });
    const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
    if (!av.days.includes(dow)) continue;
    for (let m = toMin(av.start); m + av.slot_minutes <= toMin(av.end); m += av.slot_minutes) {
      const t = start.getTime() + m * 60_000;
      if (t >= earliest && !taken.has(t)) out.push(new Date(t).toISOString());
    }
  }
  return out;
}

export type SlotGroup = { label: string; slots: { iso: string; time: string }[] };

/** Group slot instants by calendar day (in `tz`) for the picker. */
export function groupSlots(slots: string[], tz = CRM_TIMEZONE): SlotGroup[] {
  const groups: SlotGroup[] = [];
  for (const iso of slots) {
    const label = new Date(iso).toLocaleDateString("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short" });
    const time = new Date(iso).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
    let g = groups.find((x) => x.label === label);
    if (!g) groups.push((g = { label, slots: [] }));
    g.slots.push({ iso, time });
  }
  return groups;
}
