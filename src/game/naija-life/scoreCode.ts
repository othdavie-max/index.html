import type { Player } from "./types";
import { netWorthReal } from "./finance";
import { ribbonsOf } from "./ribbons";

/** A short code a friend can paste to compare lives. No server needed. */
export interface Score { n: string; w: number; a: number; r: number; g: number; alive: boolean }
const toB64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));

export function scoreOf(p: Player): Score {
  return { n: `${p.name} ${p.surname}`.slice(0, 40), w: Math.round(Math.max(p.peakWorth / Math.max(1, p.index), netWorthReal(p))), a: p.age, r: ribbonsOf(p).length, g: Number(p.flags.dynasty ?? 1), alive: p.alive };
}
export const encodeScore = (s: Score) => `NL1.${toB64(JSON.stringify(s))}`;
export function decodeScore(code: string): Score | null {
  try {
    const t = code.trim();
    if (!t.startsWith("NL1.") || t.length > 400) return null;
    const o = JSON.parse(fromB64(t.slice(4))) as Partial<Score>;
    if (typeof o.n !== "string" || typeof o.w !== "number" || typeof o.a !== "number" || !Number.isFinite(o.w) || !Number.isFinite(o.a)) return null;
    return { n: o.n.slice(0, 40), w: Math.max(0, o.w), a: Math.round(clampN(o.a, 0, 130)), r: Math.round(clampN(Number(o.r ?? 0), 0, 30)), g: Math.round(clampN(Number(o.g ?? 1), 1, 99)), alive: Boolean(o.alive) };
  } catch { return null; }
}
const clampN = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
