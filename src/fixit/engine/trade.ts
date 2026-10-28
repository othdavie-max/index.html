/**
 * Foreign affairs is where you sell and buy. Your ladders (food, minerals, textiles, film, tech) give you things to sell,
 * and every partner wants something back. Also: state visits, and arms deals with strings.
 */
import type { Effects, FixState } from "./types";
import { addMod, clamp100, nb, pushNews, removeMods } from "./util";
import { payPc } from "./meta";
import { createEvent } from "./spawn";

const done = (s: FixState, def: string) => s.projects.filter((p) => p.defId === def && p.status === "done").length;
export interface Product { id: string; name: string; icon: string; cap: (s: FixState) => number; blurb: string; effects: Effects }
export const PRODUCTS: Product[] = [
  { id: "crude", name: "Crude oil and gas", icon: "🛢️", cap: () => 1, blurb: "What we already sell. A long-term contract steadies the price.", effects: { fxSupply: 0.35, revenue: 25 } },
  { id: "rice", name: "Rice and farm goods", icon: "🌾", cap: (s) => Math.min(1, done(s, "exportHub") * 0.7 + (done(s, "riceMills") + done(s, "foodProcessing")) * 0.2), blurb: "Needs mills, and an export hub for the best price.", effects: { exports: 0.1, fxSupply: 0.3 } },
  { id: "textiles", name: "Garments and textiles", icon: "👕", cap: (s) => Math.min(1, done(s, "garmentHub") * 0.5), blurb: "Needs garment hubs.", effects: { exports: 0.09, manuf: 1, jobs: -0.2 } },
  { id: "minerals", name: "Lithium and minerals", icon: "⛏️", cap: (s) => Math.min(1, done(s, "lithiumPlant") * 0.7), blurb: "Needs a processing plant.", effects: { exports: 0.15, investor: 1.5 } },
  { id: "creative", name: "Film and music", icon: "🎬", cap: (s) => Math.min(1, done(s, "nollywoodCity") * 0.8), blurb: "Needs the film and music city.", effects: { exports: 0.05, happiness: 0.4 } },
  { id: "tech", name: "Tech services", icon: "💻", cap: (s) => Math.min(1, done(s, "techHubs") * 0.4 + done(s, "broadband") * 0.3), blurb: "Needs tech hubs and broadband.", effects: { exports: 0.07, sme: 1, skills: 0.5 } },
];
export const PRODUCT_BY_ID = Object.fromEntries(PRODUCTS.map((p) => [p.id, p])) as Record<string, Product>;
export interface TPartner { id: string; name: string; icon: string; strings: string; warm: (s: FixState) => number }
export const TRADE_PARTNERS: TPartner[] = [
  { id: "china", name: "China", icon: "🇨🇳", strings: "Takes your oil and wants loyalty and port access.", warm: (s) => s.foreign.rel.china },
  { id: "usa", name: "United States", icon: "🇺🇸", strings: "Deals are suspended if you rule badly: executions, a stolen election or a weak democracy.", warm: (s) => s.foreign.rel.usa },
  { id: "eu", name: "European Union", icon: "🇪🇺", strings: "Demands standards and a clean human-rights record.", warm: (s) => (s.foreign.rel.usa + s.foreign.rel.imf) / 2 },
  { id: "india", name: "India", icon: "🇮🇳", strings: "No lectures, but a very hard bargain.", warm: (s) => 54 - 0.1 * Math.max(0, s.rule.intlPressure - 40) },
  { id: "ecowas", name: "West African neighbours", icon: "🌍", strings: "Free trade, if you are seen to respect the rules.", warm: (s) => s.foreign.rel.ecowas },
];
export const TP_BY_ID = Object.fromEntries(TRADE_PARTNERS.map((p) => [p.id, p])) as Record<string, TPartner>;
export interface Deal { id: string; partner: string; product: string; since: number; suspended?: boolean }
export const dealsOf = (s: FixState): Deal[] => { try { return JSON.parse(String(s.flags.tradeDeals ?? "[]")) as Deal[]; } catch { return []; } };
const saveDeals = (s: FixState, d: Deal[]) => { s.flags.tradeDeals = JSON.stringify(d); };
export const MAX_DEALS = 6;

export function dealBlock(s: FixState, partner: string, product: string): string | null {
  const p = TP_BY_ID[partner], pr = PRODUCT_BY_ID[product];
  if (!p || !pr) return "Unknown deal.";
  if (dealsOf(s).some((d) => d.partner === partner && d.product === product)) return "You already have this deal.";
  if (dealsOf(s).filter((d) => !d.suspended).length >= MAX_DEALS) return `You can run at most ${MAX_DEALS} trade deals.`;
  if (pr.cap(s) <= 0) return pr.blurb;
  if (p.warm(s) < 40) return `${p.name} is not warm enough to sign: relations are ${Math.round(p.warm(s))}.`;
  return null;
}
export function signDeal(s: FixState, partner: string, product: string): { ok: boolean; message: string } {
  const block = dealBlock(s, partner, product); if (block) return { ok: false, message: block };
  const pcE = payPc(s, 6, "sign a trade deal"); if (pcE) return { ok: false, message: pcE };
  const p = TP_BY_ID[partner], pr = PRODUCT_BY_ID[product], cap = pr.cap(s);
  const eff: Effects = {}; for (const [k, v] of Object.entries(pr.effects)) eff[k as keyof Effects] = (v as number) * cap * (0.7 + 0.5 * p.warm(s) / 100);
  addMod(s, `trade:${partner}:${product}`, `${pr.name} to ${p.name}`, eff, { duration: null, ramp: 4 });
  const d = dealsOf(s); d.push({ id: `${partner}:${product}`, partner, product, since: s.month }); saveDeals(s, d);
  if (partner === "china") { s.foreign.rel.china = clamp100(s.foreign.rel.china + 4); s.foreign.rel.usa = clamp100(s.foreign.rel.usa - 2); s.fin.foreignDebt += 0.4; }
  if (partner === "usa") s.foreign.rel.usa = clamp100(s.foreign.rel.usa + 3);
  if (partner === "ecowas") s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas + 3);
  pushNews(s, { source: `trade:${s.month}:${partner}`, headline: `Nigeria signs ${pr.name.toLowerCase()} deal with ${p.name}`, body: p.strings, tone: "good" });
  return { ok: true, message: `Deal signed: ${pr.name} to ${p.name}. Their warmth and your capacity set how much it brings.` };
}
export function tradeMonthly(s: FixState) {
  const d = dealsOf(s); let changed = false;
  for (const x of d) {
    const p = TP_BY_ID[x.partner]; if (!p) continue;
    const breach = (x.partner === "usa" && (s.rule.executions > 0 || s.rule.democracy < 45 || s.rule.stolenElection)) || (x.partner === "eu" && (s.rule.democracy < 50 || s.sec.humanRights < 30)) || (x.partner === "ecowas" && s.flags.illegitimate !== undefined);
    if (breach && !x.suspended) { x.suspended = true; removeMods(s, `trade:${x.partner}:${x.product}`); changed = true; pushNews(s, { source: `tradesus:${s.month}:${x.partner}`, headline: `${p.name} suspends its ${PRODUCT_BY_ID[x.product].name.toLowerCase()} deal with Nigeria`, body: "Officials cite how the country is being governed.", tone: "bad" }); }
    if (!breach && x.suspended && p.warm(s) > 55) { x.suspended = false; changed = true; const pr = PRODUCT_BY_ID[x.product]; const eff: Effects = {}; for (const [k, v] of Object.entries(pr.effects)) eff[k as keyof Effects] = (v as number) * pr.cap(s) * 0.8; addMod(s, `trade:${x.partner}:${x.product}`, `${pr.name} to ${p.name}`, eff, { duration: null, ramp: 4 }); }
    if (!x.suspended) { if (x.partner === "china") s.foreign.rel.china = clamp100(s.foreign.rel.china + 0.03); }
  }
  if (changed) saveDeals(s, d);
}

// ---------------------------------------------------------------- state visits
export const visitCooldown = (s: FixState, partner: string) => { const l = Number(s.flags[`visit:${partner}`] ?? -99); return Math.max(0, 12 - (s.month - l)); };
export function startVisit(s: FixState, partner: string): { ok: boolean; message: string } {
  const p = TP_BY_ID[partner]; if (!p) return { ok: false, message: "Unknown partner." };
  if (visitCooldown(s, partner) > 0) return { ok: false, message: `You visited recently. Try again in ${visitCooldown(s, partner)} months.` };
  if (s.events.some((e) => e.tpl === "stateVisit" && e.status === "open")) return { ok: false, message: "Finish the current visit first." };
  const pcE = payPc(s, 5, "go on a state visit"); if (pcE) return { ok: false, message: pcE };
  s.flags[`visit:${partner}`] = s.month; s.flags.visitPartner = partner;
  createEvent(s, "stateVisit", "NG-FC");
  return { ok: true, message: `You land in ${p.name}. The delegation waits on your decision.` };
}
const vp = (s: FixState) => TP_BY_ID[String(s.flags.visitPartner ?? "china")] ?? TRADE_PARTNERS[0];
const opt = (id: string, label: string, explain: string, tradeoff: string, win: object, lose: object, chance: (s: FixState) => number) => ({ id, label, explain, cost: 0, tradeoff, unc: "medium" as const, chance, win, lose, winText: "", loseText: "" });
export const TRADE_TEMPLATES = [
  {
    id: "stateVisit", kind: "opportunity" as const, urgency: 3,
    title: (s: FixState) => `State visit to ${vp(s).name}`,
    cause: (s: FixState) => `The red carpet is out and the cameras are rolling. ${vp(s).name} (relations ${Math.round(vp(s).warm(s))}) is ready to hear what you want. ${vp(s).strings}`,
    options: [
      opt("invest", "Ask for investment", "Big companies, big promises.", "Promises are not cheques.", { mods: { investor: 3 }, dur: 12, run: (s: FixState) => { const p = vp(s); return `${p.name} announced a package of investment. Whether it arrives is another matter.`; } }, { run: (s: FixState) => `${vp(s).name} nodded, smiled, and said it would 'study the proposal'.` }, (s) => 0.35 + 0.5 * vp(s).warm(s) / 100),
      opt("debt", "Ask for debt relief or a cheap loan", "Lower the interest bill.", "Gratitude has a price.", { run: (s: FixState) => { s.fin.foreignDebt = Math.max(0, s.fin.foreignDebt - 1.2); s.fin.creditRating = clamp100(s.fin.creditRating + 1); return `${vp(s).name} agreed to restructure part of the debt on kinder terms.`; } }, { run: () => "The talks stalled over conditions you would not accept." }, (s) => 0.25 + 0.55 * vp(s).warm(s) / 100),
      opt("security", "Sign a security and defence pact", "Training, intelligence and kit.", "A new patron has opinions.", { run: (s: FixState) => { s.mil.strength = clamp100(s.mil.strength + 4); s.sec.index = Math.max(0, s.sec.index - 1.5); s.foreign.rel[vp(s).id === "china" ? "china" : vp(s).id === "usa" ? "usa" : "ecowas"] = clamp100(s.foreign.rel[vp(s).id === "china" ? "china" : vp(s).id === "usa" ? "usa" : "ecowas"] + 5); return `A defence pact was signed. Officers from ${vp(s).name} arrive next month.`; } }, { run: () => "Defence talks collapsed on the question of who controls what." }, (s) => 0.3 + 0.5 * vp(s).warm(s) / 100),
      opt("smile", "Smile for the cameras and build trust", "No asks, just warmth.", "Nothing concrete comes of it.", { run: (s: FixState) => { const k = vp(s).id; if (k === "china" || k === "usa" || k === "ecowas") s.foreign.rel[k] = clamp100(s.foreign.rel[k] + 8); s.gov.trust = clamp100(s.gov.trust + 1); return `The visit was a hit at home and abroad. ${vp(s).name} remembers who was gracious.`; } }, {}, () => 1),
    ],
    expire: { run: (s: FixState) => `You flew home without making any ask of ${vp(s).name}.` }, expireText: () => "You left without asking for anything.",
  },
];

// ---------------------------------------------------------------- arms deals
export const SUPPLIERS = [
  { id: "china", name: "China", cost: 110, strength: 7, blurb: "Cheap and quick, with few questions. They also gain a foothold.", need: (s: FixState) => (s.foreign.rel.china >= 35 ? null : "China is not warm enough.") },
  { id: "usa", name: "United States", cost: 190, strength: 10, blurb: "The best kit, with strings: clean human rights and a working democracy.", need: (s: FixState) => (s.foreign.rel.usa >= 50 && s.rule.democracy >= 45 && s.rule.executions === 0 ? null : "Washington will not sell to a government with this record.") },
  { id: "gulf", name: "Gulf states and Turkey", cost: 130, strength: 8, blurb: "Drones and armoured cars, no lectures, but they want a favour later.", need: () => null },
] as const;
export function armsDeal(s: FixState, id: string): { ok: boolean; message: string } {
  const d = SUPPLIERS.find((x) => x.id === id); if (!d) return { ok: false, message: "Unknown supplier." };
  const block = d.need(s); if (block) return { ok: false, message: block };
  if (typeof s.flags[`arms:${id}`] === "number" && s.month - Number(s.flags[`arms:${id}`]) < 10) return { ok: false, message: "You bought from them recently." };
  const cost = d.cost * (0.6 + 0.4 * s.eco.priceLevel / 100); if (cost > s.fin.treasury) return { ok: false, message: `You need ${nb(cost)}.` };
  const pcE = payPc(s, 6, "buy arms"); if (pcE) return { ok: false, message: pcE };
  s.fin.treasury -= cost; s.flags[`arms:${id}`] = s.month;
  s.mil.strength = clamp100(s.mil.strength + d.strength); s.eco.reserves = Math.max(0, s.eco.reserves - 0.6);
  if (id === "china") { s.foreign.rel.china = clamp100(s.foreign.rel.china + 3); s.foreign.rel.usa = clamp100(s.foreign.rel.usa - 3); }
  if (id === "usa") s.foreign.rel.usa = clamp100(s.foreign.rel.usa + 3);
  if (id === "gulf") s.flags.gulfFavour = s.month + 12;
  return { ok: true, message: `Delivery agreed: strength +${d.strength}.${id === "china" ? " Beijing now has a foothold at the port." : id === "gulf" ? " They will ask for a favour within a year." : " Washington is pleased."}` };
}
