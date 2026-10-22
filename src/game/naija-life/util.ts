/** Seedable random source so tests and bug reports can be reproduced. */
let source: () => number = Math.random;
export function setSeed(seed: number | null) {
  if (seed === null) {
    source = Math.random;
    return;
  }
  let a = seed >>> 0;
  source = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rng = () => source();

export const rand = (a: number, b: number) => a + rng() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const chance = (p: number) => rng() < p;
export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
export const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

let uidCounter = 0;
export const uid = () => `${(uidCounter++).toString(36)}${Math.floor(rng() * 1e6).toString(36)}`;

/**
 * All amounts are shown in "today's naira": the engine works in nominal money that
 * inflates every year, and the display divides by the current price index so a
 * side gig always looks like a side gig. Inflation shows up as your cash buying less.
 */
let deflator = 1;
export function setDeflator(index: number) {
  deflator = Math.max(1, index);
}

/** Compact naira formatting: ₦1.2M, ₦450K, ₦3.4B, ₦1.1T */
export function naira(n: number): string {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n) / deflator;
  if (a >= 1e12) return `${sign}₦${(a / 1e12).toFixed(a >= 1e13 ? 0 : 1)}T`;
  if (a >= 1e9) return `${sign}₦${(a / 1e9).toFixed(a >= 1e10 ? 0 : 1)}B`;
  if (a >= 1e6) return `${sign}₦${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1e3) return `${sign}₦${Math.round(a / 1e3)}K`;
  return `${sign}₦${Math.round(a)}`;
}

/** Pick one item by weight; entries with weight <= 0 are never chosen. */
export function weightedPick<T>(items: { item: T; w: number }[]): T | null {
  const live = items.filter((i) => i.w > 0);
  const total = live.reduce((s, i) => s + i.w, 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const i of live) {
    r -= i.w;
    if (r <= 0) return i.item;
  }
  return live[live.length - 1].item;
}
