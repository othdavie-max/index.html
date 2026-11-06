/** Deterministic grouping of LGAs into legislative constituencies (recursive coordinate bisection). */
export interface GeoItem { id: string; x: number; y: number; w: number }

/**
 * Split `items` into `k` compact groups with roughly equal total weight. Requires items.length >= k.
 * Pure and deterministic: same input → same groups.
 */
export function partition<T extends GeoItem>(items: T[], k: number): T[][] {
  if (k <= 1) return [items];
  if (items.length <= k) return items.map((i) => [i]).concat(Array.from({ length: k - items.length }, () => []));
  const kl = Math.floor(k / 2), kr = k - kl;
  const xs = items.map((i) => i.x), ys = items.map((i) => i.y);
  const spread = (a: number[]) => Math.max(...a) - Math.min(...a);
  const byX = spread(xs) >= spread(ys);
  const sorted = [...items].sort((a, b) => (byX ? a.x - b.x || a.id.localeCompare(b.id) : a.y - b.y || a.id.localeCompare(b.id)));
  const total = sorted.reduce((t, i) => t + i.w, 0);
  const goal = (total * kl) / k;
  let acc = 0, cut = 0;
  for (let i = 0; i < sorted.length; i++) {
    acc += sorted[i].w;
    cut = i + 1;
    if (acc >= goal) break;
  }
  cut = Math.max(kl, Math.min(sorted.length - kr, cut));
  return [...partition(sorted.slice(0, cut), kl), ...partition(sorted.slice(cut), kr)];
}

/** Largest-remainder apportionment with a minimum of 1 each. */
export function apportion(weights: number[], seats: number): number[] {
  const n = weights.length;
  const out = new Array(n).fill(1);
  let left = seats - n;
  if (left <= 0) return out;
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const quota = weights.map((w) => (w / total) * left);
  const base = quota.map((q) => Math.floor(q));
  base.forEach((b, i) => (out[i] += b));
  left -= base.reduce((a, b) => a + b, 0);
  const order = quota.map((q, i) => ({ i, r: q - Math.floor(q) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (let j = 0; j < left; j++) out[order[j % n].i]++;
  return out;
}

export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
