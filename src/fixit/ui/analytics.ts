/**
 * Anonymous play counts. No names, no cookies, no accounts. Sent only when a stats site is configured, the player is online
 * and has not asked their browser not to track. Everything is a no-op otherwise (including on the offline install).
 */
type GCOpts = { path: string; title: string; event: true };
const once = new Set<string>();
export function track(name: string, onlyOnce = false) {
  try {
    if (typeof window === "undefined") return;
    if (onlyOnce) { if (once.has(name)) return; once.add(name); }
    const w = window as unknown as { goatcounter?: { count: (o: GCOpts) => void }; __gcq?: GCOpts[] | null };
    const o: GCOpts = { path: name, title: name, event: true };
    if (w.goatcounter?.count) w.goatcounter.count(o); else if (Array.isArray(w.__gcq)) w.__gcq.push(o);
  } catch { /* stats must never break the game */ }
}
