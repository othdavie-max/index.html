export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const chance = (p: number) => Math.random() < p;
export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

let uidCounter = 0;
export const uid = () => `${Date.now().toString(36)}${(uidCounter++).toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

/** Compact naira formatting: ₦1.2M, ₦450K, ₦3.4B, ₦1.1T */
export function naira(n: number): string {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
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
  let r = Math.random() * total;
  for (const i of live) {
    r -= i.w;
    if (r <= 0) return i.item;
  }
  return live[live.length - 1].item;
}
