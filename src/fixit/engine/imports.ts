/**
 * What Nigeria buys and what it could make. Nigeria starts as an importer: ships and planes bring rice, wheat, cars,
 * phones, medicine and machines. You set a policy per product (open, tariff, ban), build factories to make it at home,
 * and once home production is strong, countries come looking to buy it. Figures are simulated and simplified.
 */
import type { Rng } from "../../game/engine/rng";
import type { Effects, FixState } from "./types";
import { addMod, clamp, clamp100, jflag, powerRatio, pushNews, removeMods } from "./util";
import { payPc } from "./meta";
import { W, saveW } from "./world";
import { coverage, crudeExtra, embargoed, priceMult } from "./agreements";

export type Policy = "open" | "tariff" | "ban";
export interface ImportGood {
  id: string; name: string; icon: string; bill: number; suppliers: string[]; buyers: string[]; local0: number; food?: boolean; plane?: boolean;
  /** projects that raise home production, and by how much each */
  projects?: Record<string, number>; heavy?: boolean; fixed?: boolean; blurb: string;
}
export const GOODS: ImportGood[] = [
  { id: "fuel", name: "Petrol and diesel", icon: "⛽", bill: 6, suppliers: ["ae", "sa", "gb", "fr"], buyers: ["gh", "ke", "et", "za"], local0: 0, fixed: true, blurb: "Made at home only when the refineries run. Managed under Economy → Fuel." },
  { id: "rice", name: "Rice", icon: "🍚", bill: 1.6, suppliers: ["in", "br"], buyers: ["gh", "ke", "et", "ae", "sa"], local0: 0.55, food: true, projects: { riceMills: 0.12, foodProcessing: 0.06, exportHub: 0.05 }, blurb: "Half the rice on Nigerian tables is grown at home; the rest comes by sea." },
  { id: "wheat", name: "Wheat and flour", icon: "🌾", bill: 2.2, suppliers: ["us", "ca", "ru"], buyers: ["gh", "et"], local0: 0.05, food: true, projects: { irrigation: 0.05 }, blurb: "Bread and noodles run on imported wheat. Growing it needs northern irrigation." },
  { id: "sugar", name: "Sugar", icon: "🍬", bill: 0.9, suppliers: ["br", "in"], buyers: ["gh", "ke"], local0: 0.1, food: true, projects: { foodProcessing: 0.05 }, blurb: "Almost all of it is imported raw and refined in Lagos." },
  { id: "fertiliser", name: "Fertiliser", icon: "🧪", bill: 0.6, suppliers: ["ru", "sa"], buyers: ["gh", "ke", "et", "br", "in"], local0: 0.3, projects: { fertiliserPlant: 0.25 }, blurb: "Nigeria has the gas to make it. The plants are the missing piece." },
  { id: "medicine", name: "Medicines", icon: "💊", bill: 1.2, suppliers: ["in", "cn", "gb"], buyers: ["gh", "ke", "et", "eg"], local0: 0.25, blurb: "Most pills and vaccines come from India and China." },
  { id: "textiles", name: "Clothes and textiles", icon: "👕", bill: 0.8, suppliers: ["cn", "in", "tr"], buyers: ["gh", "us", "gb", "fr", "za"], local0: 0.15, projects: { garmentHub: 0.15 }, blurb: "Aba makes great clothes; most still arrive in containers from Asia." },
  { id: "steel", name: "Steel and cement inputs", icon: "🏗️", bill: 1.3, suppliers: ["cn", "tr"], buyers: ["gh", "ke", "et"], local0: 0.1, heavy: true, blurb: "Ajaokuta never quite worked. Every rod for every building is a cost in dollars." },
  { id: "phones", name: "Phones and electronics", icon: "📱", bill: 1.5, suppliers: ["cn", "kr", "in"], buyers: ["gh", "ke", "eg", "za"], local0: 0.02, plane: true, projects: { techHubs: 0.06 }, heavy: true, blurb: "Every phone in every pocket was made abroad." },
  { id: "cars", name: "Cars and trucks", icon: "🚗", bill: 1.8, suppliers: ["jp", "cn", "kr", "de"], buyers: ["gh", "ke", "et", "eg"], local0: 0.05, heavy: true, blurb: "Mostly second-hand imports. A few assembly plants run at a fraction of capacity." },
  { id: "machinery", name: "Machines and equipment", icon: "⚙️", bill: 3.5, suppliers: ["cn", "de", "us"], buyers: ["gh", "ke", "et"], local0: 0.05, heavy: true, plane: true, blurb: "Generators, pumps, factory lines. The biggest bill of all after fuel." },
];
export const GOOD_BY_ID = Object.fromEntries(GOODS.map((g) => [g.id, g])) as Record<string, ImportGood>;
export interface GoodState { policy: Policy; factory: number; building?: number; exports: string[] }
export const imp = (s: FixState): Record<string, GoodState> => {
  const st = jflag<Record<string, GoodState>>(s, "imports", {});
  for (const g of GOODS) st[g.id] ??= { policy: "open", factory: 0, exports: [] };
  return st;
};
const saveImp = (s: FixState, st: Record<string, GoodState>) => { s.flags.imports = JSON.stringify(st); };
const doneN = (s: FixState, id: string) => s.projects.filter((p) => p.defId === id && p.status === "done").length;

/** share of the product Nigeria makes itself, 0..1 */
export function localShare(s: FixState, id: string): number {
  const g = GOOD_BY_ID[id]; if (!g) return 0;
  if (g.id === "fuel") return clamp(1 - (s.fuel.importShare ?? 1), 0, 1);
  const st = imp(s)[id];
  let v = g.local0 + st.factory * 0.16;
  for (const [p, k] of Object.entries(g.projects ?? {})) v += doneN(s, p) * k;
  if (g.heavy) v *= clamp(0.5 + powerRatio(s), 0.6, 1.2); // factories need light
  return clamp(v, 0, 0.97);
}
const POLICY_FLOW: Record<Policy, number> = { open: 1, tariff: 0.78, ban: 0.3 };
/** yearly dollars still flowing out for this product */
export const importFlow = (s: FixState, id: string) => { const g = GOOD_BY_ID[id]; return g.bill * (1 - localShare(s, id)) * POLICY_FLOW[g.fixed ? "open" : imp(s)[id].policy] * coverage(s, id) * priceMult(s, id); };
export const exportFlow = (s: FixState, id: string) => imp(s)[id].exports.filter((c) => !embargoed(s, c)).length * GOOD_BY_ID[id].bill * 0.25;
export const totalImports = (s: FixState) => GOODS.reduce((a, g) => a + importFlow(s, g.id), 0);
export const totalExports = (s: FixState) => GOODS.reduce((a, g) => a + exportFlow(s, g.id), 0);
const BASE = GOODS.reduce((a, g) => a + g.bill * (1 - g.local0), 0);

// ------------------------------------------------------------------ actions
export function setPolicy(s: FixState, id: string, p: Policy): { ok: boolean; message: string } {
  const g = GOOD_BY_ID[id]; if (!g || g.fixed) return { ok: false, message: "That is managed elsewhere." };
  const st = imp(s); if (st[id].policy === p) return { ok: false, message: "Already set." };
  if (p === "ban") { const e = payPc(s, 3, "ban an import"); if (e) return { ok: false, message: e }; }
  st[id].policy = p; saveImp(s, st);
  const local = localShare(s, id);
  if (p === "ban") pushNews(s, { source: `ban:${id}:${s.month}`, headline: `Government bans imported ${g.name.toLowerCase()}`, body: local < 0.6 ? "Local producers cheer. Shoppers fear shortages, and smugglers are already at the border." : "Local factories can now meet most of the demand.", tone: local < 0.6 ? "bad" : "good" });
  return { ok: true, message: p === "open" ? `${g.name}: imports open again.` : p === "tariff" ? `${g.name}: a tariff now protects local makers and earns revenue.` : local < 0.6 ? `${g.name} banned. Home production is only ${Math.round(local * 100)}%: expect higher prices and smuggling.` : `${g.name} banned. Home production can cover it.` };
}
export const factoryCost = (s: FixState, id: string) => Math.round((50 + 35 * imp(s)[id].factory) * (GOOD_BY_ID[id].heavy ? 1.6 : 1) * (0.6 + 0.4 * s.eco.priceLevel / 100));
export function factoryBlock(s: FixState, id: string): string | null {
  const g = GOOD_BY_ID[id]; const st = imp(s)[id];
  if (g.fixed) return "Build or fix refineries under Economy → Fuel.";
  if (st.building !== undefined) return `Under construction, ready in ${Math.max(0, st.building - s.month)} months.`;
  if (st.factory >= 5) return "Fully built out.";
  if (g.heavy && powerRatio(s) < 0.3) return "Heavy industry needs more electricity first.";
  if (factoryCost(s, id) > s.fin.treasury) return "Not enough cash.";
  return null;
}
export function buildFactory(s: FixState, id: string): { ok: boolean; message: string } {
  const b = factoryBlock(s, id); if (b) return { ok: false, message: b };
  const st = imp(s); s.fin.treasury -= factoryCost(s, id); st[id].building = s.month + (GOOD_BY_ID[id].heavy ? 10 : 7); saveImp(s, st);
  return { ok: true, message: `Work begins on new ${GOOD_BY_ID[id].name.toLowerCase()} capacity. Ready in about ${GOOD_BY_ID[id].heavy ? 10 : 7} months.` };
}
export const canExport = (s: FixState, id: string) => localShare(s, id) >= 0.8;
export function exportBlock(s: FixState, id: string, to: string): string | null {
  if (!canExport(s, id)) return "Make at least 80% of it at home first.";
  if (imp(s)[id].exports.includes(to)) return "Already selling to them.";
  const c = W(s).c.find((x) => x.id === to); if (!c) return "Unknown country.";
  if (c.rel < 42) return `${c.name} is not friendly enough.`;
  return null;
}
export function signExport(s: FixState, id: string, to: string): { ok: boolean; message: string } {
  const b = exportBlock(s, id, to); if (b) return { ok: false, message: b };
  const st = imp(s); st[id].exports.push(to); saveImp(s, st);
  const w = W(s); const c = w.c.find((x) => x.id === to)!; c.rel = clamp100(c.rel + 4); saveW(s, w);
  pushNews(s, { source: `exp:${id}:${to}`, headline: `Made in Nigeria: ${GOOD_BY_ID[id].name.toLowerCase()} now sold to ${c.name}`, body: "The first containers leave Lagos for a new market.", tone: "good" });
  return { ok: true, message: `${c.flag} ${c.name} will buy Nigerian ${GOOD_BY_ID[id].name.toLowerCase()}.` };
}

// ------------------------------------------------------------------ the month
export function importsMonthly(s: FixState, rng: Rng) {
  const st = imp(s);
  for (const g of GOODS) {
    const x = st[g.id];
    if (x.building !== undefined && s.month >= x.building) {
      delete x.building; x.factory++;
      pushNews(s, { source: `fac:${g.id}:${x.factory}`, headline: `New ${g.name.toLowerCase()} capacity opens`, body: `Nigeria now makes about ${Math.round(Math.min(0.97, localShare(s, g.id) + 0.16) * 100)}% of its own ${g.name.toLowerCase()}.`, tone: "good" });
    }
  }
  saveImp(s, st);
  // milestones
  for (const g of GOODS) { const l = localShare(s, g.id); for (const m of [0.5, 0.8]) if (l >= m && !s.flags[`imp:${g.id}:${m}`] && l > g.local0 + 0.05) { s.flags[`imp:${g.id}:${m}`] = s.month; pushNews(s, { source: `impm:${g.id}:${m}`, headline: m >= 0.8 ? `Nigeria makes almost all its own ${g.name.toLowerCase()}, and can now export` : `Nigeria now makes half of its own ${g.name.toLowerCase()}`, body: m >= 0.8 ? "Buyers from abroad are already calling. See Economy → Trade & world." : "The import bill is shrinking.", tone: "good" }); } }
  // effects, rebuilt every month
  removeMods(s, "imports");
  const bill = totalImports(s), ex = totalExports(s);
  let tariffRev = 0, shortage = 0, foodShort = 0, smuggle = 0, factories = 0;
  for (const g of GOODS) {
    const x = st[g.id]; const l = localShare(s, g.id); factories += x.factory;
    // suppliers lost or cancelled: what home production cannot cover becomes a shortage
    const gap = (1 - coverage(s, g.id)) * (1 - l);
    if (gap > 0.02) { if (g.fixed) s.oil.scarcity = clamp100(s.oil.scarcity + gap * 6); else { shortage += gap * (g.bill / 2); if (g.food) foodShort += gap; smuggle += gap * 0.3; } }
    if (g.fixed) continue;
    if (x.policy === "tariff") { tariffRev += g.bill * (1 - l) * 0.78 * 0.18; shortage += Math.max(0, 0.6 - l) * 0.3 * (g.bill / 2); }
    if (x.policy === "ban") { const gap = Math.max(0, 0.75 - l); shortage += gap * (g.bill / 2); smuggle += gap; if (g.food) foodShort += gap; }
  }
  const e: Effects = {
    fxDemand: (bill - BASE) / 6 - ex / 5,
    revenue: tariffRev * 10,
    inflation: shortage * 0.25,
    foodPrice: foodShort * 4,
    corruption: smuggle * 0.5,
    jobs: -0.22 * factories,
    manuf: 0.5 * factories,
    exports: ex * 0.03,
    fxSupply: ex * 0.06 + 0.35 * crudeExtra(s),
  };
  if (crudeExtra(s) !== 0) e.revenue = (e.revenue ?? 0) + 25 * crudeExtra(s);
  addMod(s, "imports", "Trade and home production", e, { duration: null, ramp: 1 });
  if (foodShort > 0.25 && rng.chance(0.1)) { for (const r of Object.values(s.regions)) r.food = clamp100(r.food + 1); }
  if (smuggle > 0.6) s.rule.streetAnger = clamp100(s.rule.streetAnger + 0.2);
}
export const nbUsd = (bn: number) => `$${bn >= 10 ? bn.toFixed(0) : bn.toFixed(1)}bn`;
