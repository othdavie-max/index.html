import { I, bump } from "./helpers";
import { transact } from "./ledger";
import type { Player } from "./types";
import { T, clamp, naira } from "./util";

export interface DailyPick { id: string; emoji: string; en: string; pcm: string; effect: [string, string] }
export const DAILY: DailyPick[] = [
  { id: "suya", emoji: "🍢", en: "Buy suya for the street", pcm: "Buy suya for the street", effect: ["Happiness up, a little cash out", "Happiness up, small cash out"] },
  { id: "call", emoji: "📞", en: "Call your mother", pcm: "Call your mama", effect: ["Family happier", "Family go happy"] },
  { id: "jog", emoji: "🏃🏾", en: "Early morning jog", pcm: "Early morning jog", effect: ["Fitter, calmer", "Fit pass, calm pass"] },
  { id: "read", emoji: "📚", en: "Read a chapter", pcm: "Read one chapter", effect: ["A little smarter", "Small smarter"] },
  { id: "hustle", emoji: "🛵", en: "Hustle for an hour", pcm: "Hustle for one hour", effect: ["A little cash, a little tired", "Small cash, small tired"] },
  { id: "pray", emoji: "🙏", en: "Pray or meditate", pcm: "Pray or meditate", effect: ["Less stress", "Less stress"] },
  { id: "visit", emoji: "🏘️", en: "Visit a neighbour", pcm: "Visit neighbour", effect: ["More connections", "More connections"] },
  { id: "kind", emoji: "🤲🏾", en: "Do a kind thing", pcm: "Do kind thing", effect: ["Reputation up", "Reputation up"] },
  { id: "rest", emoji: "😴", en: "Take a proper rest day", pcm: "Rest properly", effect: ["Health and mood up", "Health and mood up"] },
];
const hash = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
/** Three picks that are the same for everyone on a given day. */
export function dailyFor(day: string): DailyPick[] {
  const pool = [...DAILY];
  const out: DailyPick[] = [];
  let h = hash(day);
  while (out.length < 3) { const i = h % pool.length; out.push(pool.splice(i, 1)[0]); h = hash(`${day}${out.length}`); }
  return out;
}
export const dailyClaimed = (p: Player, day: string) => p.flags.dailyDay === day;

export function applyDaily(p: Player, id: string, day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  if (dailyClaimed(p, day)) return T("You already took today's pick. Come back tomorrow.", "You don take today pick. Come back tomorrow.");
  if (!dailyFor(day).some((d) => d.id === id)) return "";
  p.flags.dailyDay = day;
  p.flags.dailyStreak = Number(p.flags.dailyLast === dayBefore(day) ? p.flags.dailyStreak ?? 0 : 0) + 1;
  p.flags.dailyLast = day;
  switch (id) {
    case "suya": { const c = Math.round(I(p, 3_000)); if (p.money >= c) transact(p, { amount: -c, reason: T("Suya for the street", "Suya for street"), category: "personal" }); bump(p, "happiness", 3); bump(p, "reputation", 1); break; }
    case "call": p.family.happy = clamp(p.family.happy + 4); bump(p, "happiness", 1); break;
    case "jog": bump(p, "fitness", 2); bump(p, "stress", -2); break;
    case "read": bump(p, "smarts", 1); break;
    case "hustle": transact(p, { amount: Math.round(I(p, 8_000)), reason: T("An hour's hustle", "One hour hustle"), category: "salary" }); bump(p, "stress", 1); break;
    case "pray": bump(p, "stress", -4); break;
    case "visit": bump(p, "connections", 1); break;
    case "kind": bump(p, "reputation", 1); bump(p, "happiness", 2); break;
    default: bump(p, "health", 2); bump(p, "happiness", 2);
  }
  const streak = Number(p.flags.dailyStreak);
  let extra = "";
  if (streak > 0 && streak % 7 === 0) { const b = Math.round(I(p, 50_000)); transact(p, { amount: b, reason: T("Seven-day streak bonus", "Seven-day streak bonus"), category: "event" }); extra = T(` Seven days in a row: bonus ${naira(b)}!`, ` Seven days straight: bonus ${naira(b)}!`); }
  return T(`Done. Day ${streak} of your streak.${extra}`, `E don do. Day ${streak} of your streak.${extra}`);
}
function dayBefore(day: string): string { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }
