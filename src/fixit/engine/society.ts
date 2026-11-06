/**
 * Society: seven groups who each judge you by different things, the reputation your choices earn, and the six zone
 * governors. All names are fictional.
 */
import type { Rng } from "../../game/engine/rng";
import { subRng } from "../../game/engine/rng";
import { STATE_BY_ID } from "../../game/data/states";
import type { FixState, Governor, GroupId, Trait } from "./types";
import { addMod, clamp, clamp100, foodAffordIdx, lever, powerRatio, pushNews, realWage, removeMods } from "./util";

// ---------------------------------------------------------------- groups
export const GROUPS: { id: GroupId; label: string; icon: string; cares: string }[] = [
  { id: "traders", label: "Market traders", icon: "🛒", cares: "food and fuel prices, the naira" },
  { id: "farmers", label: "Farmers", icon: "🌾", cares: "safety on farms, inputs, competition from imports" },
  { id: "youth", label: "Students & youth", icon: "🎓", cares: "jobs, schools, the internet and electricity" },
  { id: "workers", label: "Workers & civil servants", icon: "🧰", cares: "wages keeping up with prices, being paid on time" },
  { id: "business", label: "Business owners", icon: "🏭", cares: "power, interest rates, taxes, a stable naira" },
  { id: "military", label: "The military", icon: "🎖️", cares: "pay, equipment, being backed in operations" },
  { id: "faith", label: "Religious leaders", icon: "🕊️", cares: "peace, honesty in government, help for the poor" },
];
export const GROUP_BY_ID = Object.fromEntries(GROUPS.map((g) => [g.id, g])) as Record<GroupId, (typeof GROUPS)[number]>;
const ZERO = (): Record<GroupId, number> => ({ traders: 0, farmers: 0, youth: 0, workers: 0, business: 0, military: 0, faith: 0 });

/** who is pleased or angered by each decision (keys: policy:x, fuel:x, measure:x, budget:head+/-, event:tpl:opt) */
export const GROUP_IMPACT: Record<string, Partial<Record<GroupId, number>>> = {
  "policy:taxDrive": { business: -6, traders: -5, workers: 1 }, "policy:vatCut": { traders: 6, farmers: 4 }, "policy:fxWindow": { business: 6, traders: -3 },
  "policy:tightMoney": { business: -7, workers: -2, traders: 2 }, "policy:gasFlares": { business: 3 }, "policy:pipelineGuard": { military: -2 },
  "policy:farmInputs": { farmers: 10 }, "policy:foodImport": { farmers: -12, traders: 8 }, "policy:powerPay": { business: 6 }, "policy:gridMaint": { business: 3 },
  "policy:roadMaint": { traders: 2, business: 2 }, "policy:portReform": { business: 5, traders: 3, workers: -3 }, "policy:exportZones": { business: 8 },
  "policy:smeLoans": { business: 6, traders: 5, youth: 3 }, "policy:skillsCorps": { youth: 10 }, "policy:publicWorks": { youth: 5, workers: 4 },
  "policy:troopSurge": { military: 10, faith: -2 }, "policy:communityPolicing": { faith: 5, farmers: 4 }, "policy:eduBudget": { youth: 8, workers: 2 },
  "policy:eduCut": { youth: -12, workers: -5 }, "policy:healthBudget": { workers: 4, faith: 4 }, "policy:healthCut": { workers: -6, faith: -6 },
  "policy:cashTransfers": { faith: 8, workers: 2, business: -2 }, "policy:minWage": { workers: 12, business: -10 }, "policy:eProcure": { business: 4, faith: 4 },
  "policy:civilService": { workers: -8, business: 3 },
  "fuel:increase": { traders: 5, workers: 4, business: -2 }, "fuel:reduce": { traders: -6, workers: -5, business: 2 }, "fuel:remove": { traders: -12, workers: -10, youth: -5, business: 3 },
  "fuel:reform": { traders: -5, workers: -4, faith: 4, business: 2 },
  "measure:grainReserve": { traders: 4, farmers: -3 }, "measure:foodVouchers": { faith: 4 }, "measure:importCurb": { traders: -8, business: -4, farmers: 4 },
  "measure:wageDeal": { workers: 10, business: -3 }, "measure:jobsBlitz": { youth: 7 }, "measure:securityPush": { military: 5, farmers: 3 }, "measure:dialogue": { faith: 4 },
  "measure:auditSweep": { faith: 5, business: 2 }, "measure:dieselRelief": { business: 6 }, "measure:fuelTransferWave": { workers: 4, traders: 3 },
  "budget:education+": { youth: 4 }, "budget:education-": { youth: -6, workers: -2 }, "budget:health+": { workers: 2, faith: 3 }, "budget:health-": { faith: -4, workers: -3 },
  "budget:security+": { military: 6 }, "budget:security-": { military: -9 }, "budget:infrastructure+": { business: 3, traders: 2 }, "budget:infrastructure-": { business: -3 },
  "budget:social+": { faith: 4, workers: 2 }, "budget:social-": { faith: -5, workers: -3 },
};
export function nudgeGroups(s: FixState, key: string, scale = 1) {
  const g = GROUP_IMPACT[key];
  if (!g) return;
  for (const [k, v] of Object.entries(g)) s.groupMood[k as GroupId] = clamp(s.groupMood[k as GroupId] + (v as number) * scale, -40, 40);
}

export function initSociety(s: FixState) {
  s.groupMood = ZERO();
  s.groups = ZERO();
  s.reputation = { reformer: 0, populist: 0, strongman: 0, clean: 0, builder: 0, borrower: 0 };
  initGovernors(s);
  computeGroups(s);
}

export function computeGroups(s: FixState) {
  const e = s.eco;
  const h = s.gov.happiness - 50;
  const f: Record<GroupId, number> = {
    traders: -0.5 * (e.foodInflation - 25) - 0.3 * (e.inflation - 20) - 0.015 * (s.fuel.pump - 750) - 6 * Math.max(0, (s.flags.lastFxDrift as number) ?? 0) + 0.2 * (foodAffordIdx(s) - 100),
    farmers: -0.4 * (s.sec.index - 55) + 0.25 * (s.agri.inputs + lever(s, "inputs") - 30) + 0.15 * (s.agri.storage + lever(s, "storage") - 12),
    youth: -0.6 * (s.jobs.youth - 33) + 0.2 * (s.soc.education + lever(s, "education") - 42) + 0.3 * (powerRatio(s) * 100 - 25),
    workers: 0.45 * (realWage(s) - 100) - (s.fin.arrears > 200 ? 6 : 0) - 0.2 * (e.inflation - 20),
    business: 0.4 * (powerRatio(s) * 100 - 25) + 0.3 * (e.investor - 42) - 0.3 * (s.fin.domRate - 15) - 3 * Math.abs(((s.flags.lastFxDrift as number) ?? 0) - 0.4),
    military: 0.4 * (s.sec.forces + lever(s, "forces") - 45) + 0.15 * (s.sec.index - 55),
    faith: -0.25 * (s.sec.index - 55) - 0.2 * (s.gov.corruption + lever(s, "corruption") - 65) + 0.25 * (s.soc.welfare + lever(s, "welfare") - 30) - 4 * s.me.scandals,
  };
  for (const g of GROUPS) s.groups[g.id] = Math.round(clamp100(50 + f[g.id] + s.groupMood[g.id] + 0.3 * h));
}

/** monthly: decay of moods, group pressure turned into effects */
export function societyMonthly(s: FixState, rng: Rng) {
  for (const g of GROUPS) s.groupMood[g.id] *= 0.96;
  for (const t of Object.keys(s.reputation) as Trait[]) s.reputation[t] *= 0.985;
  computeGroups(s);
  const G = s.groups;
  const fx: Record<string, number> = {};
  if (G.business < 30) fx.investor = -3;
  if (G.farmers < 30) fx.inputs = -3;
  if (G.faith < 30) fx.trust = -1.5;
  if (G.military < 25) fx.security = -2;
  if (G.business > 70) fx.investor = (fx.investor ?? 0) + 2;
  removeMods(s, "groups");
  if (Object.keys(fx).length) addMod(s, "groups", "Pressure from groups in society", fx, { duration: null });
  applyReputation(s);
  governorsMonthly(s, rng);
}
/** multiplier on protest/strike odds from angry groups */
export function groupPressure(s: FixState, g: GroupId): number { return s.groups[g] < 25 ? 1.5 : s.groups[g] < 35 ? 1.2 : 1; }

// ---------------------------------------------------------------- reputation
export const TRAITS: Record<Trait, { label: string; title: string; effect: string }> = {
  reformer: { label: "Reformer", title: "The Reformer", effect: "Investors give you the benefit of the doubt (+investor confidence)." },
  populist: { label: "Populist", title: "The Populist", effect: "Crowds love you, markets less so (+happiness, −investor confidence)." },
  strongman: { label: "Strongman", title: "The Strongman", effect: "Security operations work better, but rights groups and partners are wary." },
  clean: { label: "Mr/Madam Clean", title: "The Clean One", effect: "People believe you (+trust)." },
  builder: { label: "Builder", title: "The Builder", effect: "Contractors take you seriously (projects move faster)." },
  borrower: { label: "Big Borrower", title: "The Borrower", effect: "Lenders are getting nervous (−credit rating)." },
};
export const REP_IMPACT: Record<string, Partial<Record<Trait, number>>> = {
  "policy:eProcure": { reformer: 6, clean: 5 }, "policy:civilService": { reformer: 6 }, "policy:taxDrive": { reformer: 5 }, "policy:fxWindow": { reformer: 7 }, "policy:portReform": { reformer: 4 },
  "policy:troopSurge": { strongman: 8 }, "policy:minWage": { populist: 6 }, "policy:publicWorks": { populist: 5 }, "policy:vatCut": { populist: 4 }, "policy:cashTransfers": { populist: 3 },
  "fuel:remove": { reformer: 8 }, "fuel:reform": { reformer: 7 }, "fuel:increase": { populist: 7 },
  "measure:foodVouchers": { populist: 3 }, "measure:jobsBlitz": { populist: 3 }, "measure:wageDeal": { populist: 4 }, "measure:securityPush": { strongman: 4 }, "measure:auditSweep": { clean: 5 },
  "measure:importCurb": { populist: 2 }, "project": { builder: 4 }, "borrow": { borrower: 5 },
  "event:kickback:refuse": { clean: 4 }, "event:kickback:report": { clean: 9 }, "event:kickback:accept": { clean: -18 }, "event:investigation:cooperate": { clean: 3 }, "event:investigation:obstruct": { strongman: 4, clean: -8 },
  "event:labourStrike:court": { strongman: 4 }, "event:banditry:surge": { strongman: 3 }, "event:fuelProtest:partial": { populist: 5 }, "event:ministerScandal:sack": { clean: 4 }, "event:ministerScandal:defend": { clean: -6 },
  "speech:tough": { strongman: 3 }, "speech:honest": { clean: 2 }, "speech:hopeful": { populist: 2 },
};
export function earn(s: FixState, key: string) {
  const r = REP_IMPACT[key];
  if (!r) return;
  for (const [k, v] of Object.entries(r)) s.reputation[k as Trait] = clamp(s.reputation[k as Trait] + (v as number), -30, 60);
}
export function dominantTrait(s: FixState): Trait | null {
  const [t, v] = (Object.entries(s.reputation) as [Trait, number][]).sort((a, b) => b[1] - a[1])[0];
  return v >= 12 ? t : null;
}
function applyReputation(s: FixState) {
  const t = dominantTrait(s);
  removeMods(s, "reputation");
  if (!t) return;
  const fx: Record<Trait, Record<string, number>> = {
    reformer: { investor: 3 }, populist: { happiness: 1.5, investor: -2 }, strongman: { security: 2, trust: -0.5 }, clean: { trust: 2 }, builder: { capacity: 3 }, borrower: { investor: -2 },
  };
  addMod(s, "reputation", `Reputation: ${TRAITS[t].label}`, fx[t], { duration: null });
  if (t === "borrower") s.fin.creditRating = clamp100(s.fin.creditRating - 0.05);
  if (t === "strongman") s.sec.humanRights = clamp100(s.sec.humanRights - 0.05);
}

// ---------------------------------------------------------------- governors
const GOV_NAMES = ["Gov. Babajide Okunade", "Gov. Ahmed Shettima-Lawan", "Gov. Ugochukwu Mbah", "Gov. Douye Diri-Ekiye", "Gov. Simon Lalong-Dakum", "Gov. Inuwa Yahaya-Gombi", "Gov. Folasade Adeleke", "Gov. Nkechi Obiano", "Gov. Umar Namadi-Sule"];
export function initGovernors(s: FixState) {
  const rng = subRng(s.meta.seed, "governors");
  const names = rng.shuffle([...GOV_NAMES]);
  s.governors = ["NC", "NE", "NW", "SE", "SS", "SW"].map((zone, i) => ({
    zone, name: names[i], party: zone === s.rival.zone || (i % 3 === 2 && zone !== s.rival.zone && rng.chance(0.4)) ? "PRA" : "NPP",
    relation: Math.round(zone === s.rival.zone ? 35 : 50 + rng.range(-8, 10)), ambition: Math.round(rng.range(20, 90)),
  }));
}
export const governorOf = (s: FixState, stateId: string): Governor | undefined => s.governors.find((g) => g.zone === STATE_BY_ID[stateId]?.zone);
export function relate(s: FixState, stateIdOrZone: string, d: number) {
  const zone = STATE_BY_ID[stateIdOrZone]?.zone ?? stateIdOrZone;
  const g = s.governors.find((x) => x.zone === zone);
  if (g) g.relation = clamp100(g.relation + d);
}
/** project speed modifier from the zone governor's cooperation (0.85..1.15) */
export function governorSpeed(s: FixState, stateId: string): number { const g = governorOf(s, stateId); return g ? 0.85 + 0.003 * g.relation : 1; }
export function governorAssembly(s: FixState): number { return s.governors.reduce((a, g) => a + (g.relation - 50) / 12 + (g.party === "NPP" ? 1.5 : -1.5), 0); }

function governorsMonthly(s: FixState, rng: Rng) {
  const count: Record<string, number> = {};
  for (const p of s.projects) if (p.status !== "cancelled") { const z = STATE_BY_ID[p.stateId]?.zone; if (z) count[z] = (count[z] ?? 0) + 1; }
  const max = Math.max(0, ...Object.values(count));
  for (const g of s.governors) {
    g.relation = clamp100(g.relation + 0.04 * (50 + 0.3 * (s.gov.approval - 50) - g.relation) + (s.month > 18 && max >= 2 && !count[g.zone] ? -0.6 : 0) + rng.normal(0, 0.5));
    if (g.party === "NPP" && g.relation < 18 && g.ambition > 50 && rng.chance(0.25)) {
      g.party = "PRA"; s.assembly.support = clamp100(s.assembly.support - 5);
      pushNews(s, { source: `defect:${g.zone}:${s.month}`, headline: `${g.name} defects to the opposition`, body: "The governor says the federal government has ignored the zone. Lawmakers from the zone may follow.", tone: "bad" });
    } else if (g.party === "PRA" && g.relation > 78 && rng.chance(0.2)) {
      g.party = "NPP"; s.assembly.support = clamp100(s.assembly.support + 5);
      pushNews(s, { source: `defect:${g.zone}:${s.month}`, headline: `${g.name} crosses over to your party`, body: "Impressed by federal attention to the zone, the governor joins the ruling party.", tone: "good" });
    }
  }
}
export { lever };
