/**
 * Trade agreements: the real, signed deals that decide which ships and planes sail to and from Nigeria.
 * An import agreement means a country sells you a product; an export agreement means it buys yours. Each has terms
 * (fair, cheap but risky, premium and reliable) and may carry a quiet kickback. Nothing here knows about the economy;
 * imports.ts reads coverage and price from this file, and feuds.ts can freeze deals (embargo). Starting deals mirror
 * today's Nigeria: it already buys fuel, rice and wheat abroad and already sells crude oil.
 */
import type { FixState } from "./types";
import { jflag } from "./util";

export type Terms = "fair" | "cheap" | "premium";
export interface Agreement {
  id: string; dir: "in" | "out"; good: string; with: string; since: number; terms: Terms;
  /** a kickback taken when signing, in ₦ million (0 = clean) */
  cut: number;
}
export const TERMS: Record<Terms, { label: string; icon: string; price: number; risk: number; blurb: string }> = {
  fair: { label: "Fair terms", icon: "🤝", price: 1, risk: 0.006, blurb: "Market price and normal reliability." },
  cheap: { label: "Cheap but risky", icon: "💸", price: 0.82, risk: 0.045, blurb: "A cut-price deal. Some batches arrive late, damaged or fake." },
  premium: { label: "Premium and reliable", icon: "🏅", price: 1.12, risk: 0, blurb: "Costs more, never lets you down, and the partner is slower to turn on you." },
};
/** today's suppliers (the first two suppliers of each product) */
export const SEED_IN: Record<string, string[]> = { fuel: ["ae", "sa"], rice: ["in", "br"], wheat: ["us", "ca"], sugar: ["br", "in"], fertiliser: ["ru", "sa"], medicine: ["in", "cn"], textiles: ["cn", "in"], steel: ["cn", "tr"], phones: ["cn", "kr"], cars: ["jp", "cn"], machinery: ["cn", "de"] };
/** who buys Nigerian crude today */
export const SEED_CRUDE = ["in", "fr"];
/** countries that could buy Nigerian crude if you sign with them */
export const CRUDE_BUYERS = ["in", "fr", "cn", "gb", "de", "us", "br", "jp", "kr", "za", "id", "tr", "ae", "sa", "mx", "ca"];
export const MAX_CRUDE = 5;

const KEY = "agreements";
export function agreements(s: FixState): Agreement[] {
  const l = jflag<Agreement[] | null>(s, KEY, null);
  if (l) return l;
  const seed: Agreement[] = [];
  for (const [good, cs] of Object.entries(SEED_IN)) for (const c of cs) seed.push({ id: `in:${good}:${c}`, dir: "in", good, with: c, since: 0, terms: "fair", cut: 0 });
  for (const c of SEED_CRUDE) seed.push({ id: `out:crude:${c}`, dir: "out", good: "crude", with: c, since: 0, terms: "fair", cut: 0 });
  saveAgreements(s, seed);
  return seed;
}
export const saveAgreements = (s: FixState, l: Agreement[]) => { s.flags[KEY] = JSON.stringify(l); };

// ---- embargo: a country that has turned on you can freeze everything between you until a month
export const embargoes = (s: FixState): Record<string, number> => jflag<Record<string, number>>(s, "embargo", {});
export const embargoed = (s: FixState, country: string) => (embargoes(s)[country] ?? -1) > s.month;
export const setEmbargo = (s: FixState, country: string, until: number) => { const e = embargoes(s); e[country] = until; s.flags.embargo = JSON.stringify(e); };

export const activeIn = (s: FixState, good: string) => agreements(s).filter((a) => a.dir === "in" && a.good === good && !embargoed(s, a.with));
export const activeOut = (s: FixState, good: string) => agreements(s).filter((a) => a.dir === "out" && a.good === good && !embargoed(s, a.with));
/** share of what you need that your suppliers can deliver: two or more suppliers cover it, one is a squeeze, none means shortages */
export function coverage(s: FixState, good: string): number { const n = activeIn(s, good).length; return n >= 2 ? 1 : n === 1 ? 0.85 : 0; }
/** what you pay compared with the fair price: cheap deals save money, premium ones cost more, and kickbacks make you overpay */
export function priceMult(s: FixState, good: string): number {
  const a = activeIn(s, good); if (!a.length) return 1;
  return a.reduce((t, x) => t + TERMS[x.terms].price * (x.cut > 0 ? 1.06 : 1), 0) / a.length;
}
export const crudeBuyers = (s: FixState) => activeOut(s, "crude");
/** crude deals beyond (or short of) the two you start with, which is what moves the economy */
export const crudeExtra = (s: FixState) => crudeBuyers(s).length - SEED_CRUDE.length;
