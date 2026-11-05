/**
 * Doing deals with other countries: who sells to you, who buys from you, on what terms, and what it costs you if you
 * take a cut. This is what the globe draws: a ship or plane only sails where a signed agreement says it should.
 * Cancelling a deal upsets the partner; being too dependent on one supplier is a risk; cheap deals fail sometimes;
 * kickbacks pay you personally and can blow up as scandals.
 */
import type { Rng } from "../../game/engine/rng";
import type { FixState } from "./types";
import { clamp, clamp100, pushNews, addMod } from "./util";
import { payPc } from "./meta";
import { W, saveW } from "./world";
import { GOOD_BY_ID, GOODS, canExport, exportBlock, imp, importFlow, exportFlow } from "./imports";
import { CRUDE_BUYERS, MAX_CRUDE, SEED_CRUDE, TERMS, agreements, crudeBuyers, embargoed, saveAgreements, type Agreement, type Terms } from "./agreements";
import { addHeat, measuresAgainst, sizeOf } from "./feuds";
import { dealsOf } from "./trade";
import { noteStolen } from "./ledger";

/** where ships and planes leave from: the main port or airport of each country */
export const PORT: Record<string, [number, number]> = { us: [-74, 40.6], cn: [121.5, 31.2], in: [72.8, 18.9], br: [-46.3, -23.9], ru: [30.2, 59.9], ca: [-79.4, 43.6], gb: [0.4, 51.5], fr: [0.1, 49.5], de: [9.9, 53.5], jp: [139.8, 35.6], kr: [129, 35.1], au: [151.2, -33.9], sa: [39.2, 21.5], ae: [55.1, 25], tr: [28.9, 41], eg: [32.3, 31.2], za: [18.4, -33.9], ke: [39.7, -4], gh: [0, 5.6], et: [38.8, 9], id: [106.8, -6.1], mx: [-96.1, 19.2] };
export const LAGOS: [number, number] = [3.4, 6.45];
const cname = (s: FixState, id: string) => W(s).c.find((c) => c.id === id);

// ---------------------------------------------------------------- what is on the map
export interface Route { from: [number, number]; to: [number, number]; out: boolean; plane: boolean; icon: string; vol: number; label: string; who: string; state: "ok" | "blocked" }
const TP: Record<string, string> = { china: "cn", usa: "us", eu: "de", india: "in", ecowas: "gh" };
/** one route per signed deal, and nothing else: no deal, no ship */
export function tradeRoutes(s: FixState): Route[] {
  const r: Route[] = []; const a = agreements(s);
  for (const g of GOODS) {
    const ins = a.filter((x) => x.dir === "in" && x.good === g.id); if (!ins.length) continue;
    const flow = importFlow(s, g.id);
    for (const x of ins) { if (!PORT[x.with]) continue; const dead = embargoed(s, x.with); r.push({ from: PORT[x.with], to: LAGOS, out: false, plane: !!g.plane, icon: g.icon, vol: dead ? 0.3 : Math.max(0.2, flow / ins.length), label: `${g.name} in`, who: x.with, state: dead ? "blocked" : "ok" }); }
    for (const c of imp(s)[g.id].exports) if (PORT[c]) r.push({ from: LAGOS, to: PORT[c], out: true, plane: false, icon: g.icon, vol: Math.max(0.3, exportFlow(s, g.id) / Math.max(1, imp(s)[g.id].exports.length)), label: `${g.name} out`, who: c, state: embargoed(s, c) ? "blocked" : "ok" });
  }
  for (const x of a.filter((y) => y.dir === "out" && y.good === "crude")) if (PORT[x.with]) r.push({ from: LAGOS, to: PORT[x.with], out: true, plane: false, icon: "🛢️", vol: 1, label: "Crude oil out", who: x.with, state: embargoed(s, x.with) ? "blocked" : "ok" });
  for (const d of dealsOf(s)) { const to = TP[d.partner]; if (to && PORT[to]) r.push({ from: LAGOS, to: PORT[to], out: true, plane: false, icon: "📦", vol: 0.8, label: `${d.product} out`, who: to, state: d.suspended || embargoed(s, to) ? "blocked" : "ok" }); }
  return r.sort((x, y) => y.vol - x.vol).slice(0, 26);
}

// ---------------------------------------------------------------- rules for signing
export const suppliersOf = (id: string) => GOOD_BY_ID[id]?.suppliers ?? [];
export function importBlock(s: FixState, good: string, country: string): string | null {
  const g = GOOD_BY_ID[good]; const c = cname(s, country); if (!g || !c) return "Unknown deal.";
  if (!g.suppliers.includes(country)) return `${c.name} does not sell this.`;
  if (agreements(s).some((a) => a.dir === "in" && a.good === good && a.with === country)) return "You already buy this from them.";
  if (embargoed(s, country)) return `${c.name} has frozen trade with you.`;
  if (c.rel < 35) return `${c.name} will not do business with you: relations are only ${Math.round(c.rel)}.`;
  if (agreements(s).filter((a) => a.dir === "in" && a.good === good).length >= 4) return "You already have four suppliers.";
  return null;
}
export const cutFor = (good: string) => Math.round(60 + (GOOD_BY_ID[good]?.bill ?? 1) * 40);
export function signImport(s: FixState, good: string, country: string, terms: Terms, takeCut: boolean): { ok: boolean; message: string } {
  const b = importBlock(s, good, country); if (b) return { ok: false, message: b };
  const e = payPc(s, 2, "sign an import deal"); if (e) return { ok: false, message: e };
  const w = W(s); const c = w.c.find((x) => x.id === country)!; const g = GOOD_BY_ID[good];
  const cut = takeCut ? cutFor(good) : 0;
  const l = agreements(s); l.push({ id: `in:${good}:${country}`, dir: "in", good, with: country, since: s.month, terms, cut }); saveAgreements(s, l);
  c.rel = clamp100(c.rel + (terms === "premium" ? 5 : 3)); addHeat(s, country, -5); saveW(s, w);
  let extra = "";
  if (cut) { s.me.wealth += cut; s.me.evidence = clamp(s.me.evidence + 7, 0, 100); noteStolen(s, cut / 1000); s.me.acts = [...s.me.acts, "kickback"].slice(-30); extra = ` A quiet ₦${cut}m reaches your private account.`; }
  pushNews(s, { source: `dealin:${good}:${country}:${s.month}`, headline: `Nigeria agrees to buy ${g.name.toLowerCase()} from ${c.name}`, body: `${TERMS[terms].label}.`, tone: "neutral" });
  return { ok: true, message: `${c.flag} ${c.name} will now supply ${g.name.toLowerCase()} (${TERMS[terms].label.toLowerCase()}).${extra}` };
}
export function cancelAgreement(s: FixState, id: string): { ok: boolean; message: string } {
  const l = agreements(s); const a = l.find((x) => x.id === id); if (!a) return { ok: false, message: "No such deal." };
  const w = W(s); const c = w.c.find((x) => x.id === a.with); const g = a.good === "crude" ? { name: "crude oil", bill: 4 } : GOOD_BY_ID[a.good];
  saveAgreements(s, l.filter((x) => x.id !== id));
  let msg = `You end the ${g.name.toLowerCase()} deal with ${c?.name ?? a.with}.`;
  if (c) {
    const dependent = a.dir === "in" ? agreements(s).filter((x) => x.dir === "in" && x.good === a.good && x.id !== id).length === 0 : crudeBuyers(s).length <= 1 && a.good === "crude";
    c.rel = clamp100(c.rel - (dependent ? 6 : 4)); saveW(s, w);
    addHeat(s, c.id, 7 * (0.6 + sizeOf(c)), `Nigeria cancelled its ${g.name.toLowerCase()} deal`);
    msg += ` ${c.name} is not pleased.`;
  }
  if (a.dir === "in" && agreements(s).filter((x) => x.dir === "in" && x.good === a.good).length === 0) msg += ` With no supplier left, shortages will start unless Nigeria makes enough itself.`;
  return { ok: true, message: msg };
}
export function crudeBlock(s: FixState, country: string): string | null {
  const c = cname(s, country); if (!c) return "Unknown country.";
  if (!CRUDE_BUYERS.includes(country)) return `${c.name} is not a buyer of Nigerian crude.`;
  if (crudeBuyers(s).some((a) => a.with === country)) return "Already buying your crude.";
  if (crudeBuyers(s).length >= MAX_CRUDE) return `You can have at most ${MAX_CRUDE} crude customers.`;
  if (embargoed(s, country)) return `${c.name} has frozen trade with you.`;
  if (c.rel < 40) return `${c.name} is not friendly enough (${Math.round(c.rel)}).`;
  return null;
}
export function signCrude(s: FixState, country: string, terms: Terms, takeCut: boolean): { ok: boolean; message: string } {
  const b = crudeBlock(s, country); if (b) return { ok: false, message: b };
  const e = payPc(s, 2, "sign a crude oil contract"); if (e) return { ok: false, message: e };
  const w = W(s); const c = w.c.find((x) => x.id === country)!; const cut = takeCut ? 220 : 0;
  const l = agreements(s); l.push({ id: `out:crude:${country}`, dir: "out", good: "crude", with: country, since: s.month, terms, cut }); saveAgreements(s, l);
  c.rel = clamp100(c.rel + 6); addHeat(s, country, -6); saveW(s, w);
  let extra = "";
  if (cut) { s.me.wealth += cut; s.me.evidence = clamp(s.me.evidence + 8, 0, 100); noteStolen(s, cut / 1000); s.me.acts = [...s.me.acts, "kickback"].slice(-30); extra = ` A quiet ₦${cut}m reaches your private account.`; }
  pushNews(s, { source: `crude:${country}:${s.month}`, headline: `${c.name} signs to buy Nigerian crude`, body: "Tankers are being chartered from the Niger Delta.", tone: "good" });
  return { ok: true, message: `${c.flag} ${c.name} will buy Nigerian crude.${extra}` };
}
export function cancelGoodExport(s: FixState, good: string, country: string): { ok: boolean; message: string } {
  const st = imp(s); if (!st[good]?.exports.includes(country)) return { ok: false, message: "No such deal." };
  st[good].exports = st[good].exports.filter((c) => c !== country); s.flags.imports = JSON.stringify(st);
  const w = W(s); const c = w.c.find((x) => x.id === country); if (c) { c.rel = clamp100(c.rel - 5); saveW(s, w); addHeat(s, c.id, 6 * (0.6 + sizeOf(c)), `Nigeria stopped selling them ${GOOD_BY_ID[good].name.toLowerCase()}`); }
  return { ok: true, message: `You stop selling ${GOOD_BY_ID[good].name.toLowerCase()} to ${c?.name ?? country}.` };
}
export { canExport, exportBlock };

// ---------------------------------------------------------------- the month
export function dealsMonthly(s: FixState, rng: Rng) {
  const l = agreements(s); let changed = false;
  // cheap deals sometimes fail
  for (const a of l.filter((x) => x.dir === "in")) {
    const risk = TERMS[a.terms].risk * (1 + (embargoed(s, a.with) ? 0 : 0)); if (!rng.chance(risk)) continue;
    const g = GOOD_BY_ID[a.good]; const c = cname(s, a.with); if (!g || !c) continue;
    addMod(s, `batch:${a.id}:${s.month}`, `Bad batch of ${g.name.toLowerCase()} from ${c.name}`, { inflation: 0.5, foodPrice: g.food ? 2.5 : 0 }, { duration: 4, ramp: 1 });
    s.gov.trust = clamp(s.gov.trust - 0.6, 0, 100);
    pushNews(s, { source: `batch:${a.id}:${s.month}`, headline: `Shipment of ${g.name.toLowerCase()} from ${c.name} arrives late and short`, body: a.cut > 0 ? "Papers show the supplier was chosen in a quiet meeting. Reporters start asking who signed." : "The cheap contract is showing its price.", tone: "bad" });
    if (a.cut > 0) s.me.evidence = clamp(s.me.evidence + 3, 0, 100);
  }
  // kickbacks leak
  for (const a of l.filter((x) => x.cut > 0)) {
    const p = 0.008 + s.me.evidence / 4000 + (s.gov.transparency > 55 ? 0.006 : 0);
    if (!rng.chance(p)) continue;
    const c = cname(s, a.with); const g = a.good === "crude" ? { name: "crude oil" } : GOOD_BY_ID[a.good];
    s.me.scandals += 1; s.me.evidence = clamp(s.me.evidence + 6, 0, 100); s.gov.trust = clamp(s.gov.trust - 3, 0, 100); s.rule.streetAnger = clamp100(s.rule.streetAnger + 3);
    a.cut = 0; changed = true;
    pushNews(s, { source: `cutleak:${a.id}:${s.month}`, headline: `Leaked: a ₦-million "commission" on the ${String(g.name).toLowerCase()} deal with ${c?.name ?? a.with}`, body: "A whistleblower has handed bank records to journalists. The anti-corruption agency says it is watching.", tone: "bad" });
  }
  if (changed) saveAgreements(s, l);
  // a hostile supplier can pull out on its own
  for (const a of l.filter((x) => x.dir === "in" && x.terms !== "premium")) { const c = cname(s, a.with); if (c && c.rel < 22 && rng.chance(0.08) && measuresAgainst(s, c.id).length === 0) addHeat(s, c.id, 4); }
}
