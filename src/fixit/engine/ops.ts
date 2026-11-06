/** Military operations in named theatres: pick the strategy, the money and the commander, and watch the map. */
import { subRng, type Rng } from "../../game/engine/rng";
import type { FixState } from "./types";
import { addMod, clamp, clamp100, nb, pushNews, removeMods } from "./util";
import { payPc } from "./meta";
import { noteStolen } from "./ledger";

export const THEATRES = [
  { id: "ne", name: "North-East insurgency", icon: "🏜️", metric: "terror" as const, states: ["NG-BO", "NG-YO", "NG-AD"], blurb: "Insurgents, displaced families, the oldest war." },
  { id: "nw", name: "North-West banditry", icon: "🌾", metric: "banditry" as const, states: ["NG-ZA", "NG-KT", "NG-SO", "NG-KD"], blurb: "Armed gangs, kidnappings and abandoned farms." },
  { id: "delta", name: "Niger Delta oil theft", icon: "🛢️", metric: "oilTheft" as const, states: ["NG-RI", "NG-BY", "NG-DE"], blurb: "Illegal refineries, tapped pipelines and creek gunboats." },
] as const;
export const STRATEGIES = [
  { id: "offensive", name: "Offensive", rate: 1.0, harm: 0.35, blurb: "Fast results, and civilians pay for it." },
  { id: "hearts", name: "Hearts and minds", rate: 0.6, harm: -0.12, blurb: "Slower, but the locals start to trust you." },
  { id: "defensive", name: "Defensive", rate: 0.35, harm: 0, blurb: "Hold the line. Low cost, low drama, slow progress." },
] as const;
export interface Commander { id: string; name: string; skill: number; loyalty: number; integrity: number }
export interface Op { theatre: string; strategy: (typeof STRATEGIES)[number]["id"]; funding: 1 | 2 | 3; commander: Commander; since: number; progress: number }
const NAMES = ["Maj-Gen. Abubakar Idris", "Maj-Gen. Chidi Okoro", "Brig-Gen. Funmi Adeyemi", "Maj-Gen. Sani Lawal", "Brig-Gen. Emeka Nwosu", "Maj-Gen. Tunde Bello", "Brig-Gen. Hauwa Garba", "Maj-Gen. Obi Eze", "Maj-Gen. Musa Danjuma"];
export const opsOf = (s: FixState): Op[] => { try { return JSON.parse(String(s.flags.ops ?? "[]")) as Op[]; } catch { return []; } };
const save = (s: FixState, o: Op[]) => { s.flags.ops = JSON.stringify(o); };
export function commanders(s: FixState, theatre: string): Commander[] {
  const r = subRng(s.meta.seed, "cmdr", theatre, Math.floor(s.month / 12));
  return [0, 1, 2].map((i) => ({ id: `${theatre}:${i}:${Math.floor(s.month / 12)}`, name: NAMES[(r.int(0, NAMES.length - 1) + i * 3) % NAMES.length], skill: r.int(i === 0 ? 62 : 35, i === 0 ? 88 : 80), loyalty: r.int(30, 90), integrity: r.int(i === 2 ? 15 : 35, i === 2 ? 55 : 92) }));
}
export const monthlyCost = (funding: number) => 25 * funding;
export function launchOp(s: FixState, theatre: string, strategy: string, funding: 1 | 2 | 3, commanderId: string): { ok: boolean; message: string } {
  const t = THEATRES.find((x) => x.id === theatre), st = STRATEGIES.find((x) => x.id === strategy), cm = commanders(s, theatre).find((c) => c.id === commanderId);
  if (!t || !st || !cm) return { ok: false, message: "Choose a strategy and a commander." };
  const ops = opsOf(s);
  if (ops.some((o) => o.theatre === theatre)) return { ok: false, message: "An operation is already running there." };
  if (ops.length >= 2) return { ok: false, message: "The army can only run two operations at once." };
  const cost = 40 * (0.6 + 0.4 * s.eco.priceLevel / 100); if (cost > s.fin.treasury) return { ok: false, message: `You need ${nb(cost)} to launch.` };
  const pcE = payPc(s, 6, "launch an operation"); if (pcE) return { ok: false, message: pcE };
  s.fin.treasury -= cost;
  ops.push({ theatre, strategy: st.id, funding, commander: cm, since: s.month, progress: 0 }); save(s, ops);
  pushNews(s, { source: `opstart:${theatre}:${s.month}`, headline: `Operation launched: ${t.name}`, body: `${cm.name} takes command. Strategy: ${st.name.toLowerCase()}.`, tone: "neutral" });
  return { ok: true, message: `${cm.name} is in command in the ${t.name.toLowerCase()}.` };
}
export function endOp(s: FixState, theatre: string): { ok: boolean; message: string } {
  const ops = opsOf(s); if (!ops.some((o) => o.theatre === theatre)) return { ok: false, message: "Nothing is running there." };
  save(s, ops.filter((o) => o.theatre !== theatre)); removeMods(s, `op:${theatre}`);
  return { ok: true, message: "The operation was wound down. The gains hold for a while, then fade." };
}
export function opsMonthly(s: FixState, rng: Rng) {
  const ops = opsOf(s); if (!ops.length) return;
  for (const o of ops) {
    const t = THEATRES.find((x) => x.id === o.theatre)!, st = STRATEGIES.find((x) => x.id === o.strategy)!;
    const strength = s.mil.strength / 100;
    const power = (0.35 + 0.65 * strength) * (0.55 + o.funding * 0.25) * (0.45 + o.commander.skill / 100) * st.rate;
    o.progress += power;
    removeMods(s, `op:${o.theatre}`);
    const eff = t.metric === "oilTheft" ? { oilTheft: -4.5 * power, security: 0.6 * power } : { security: 4 * power, forces: 1 * power };
    addMod(s, `op:${o.theatre}`, `${t.name} operation`, eff as never, { duration: null, ramp: 1 });
    const m = s.modifiers[s.modifiers.length - 1]; if (m && m.source === `op:${o.theatre}`) m.monthly = monthlyCost(o.funding);
    if (t.metric === "terror") s.sec.terror = clamp100(s.sec.terror - 0.5 * power); else if (t.metric === "banditry") s.sec.banditry = clamp100(s.sec.banditry - 0.5 * power); else s.oil.theft = Math.max(3, s.oil.theft - 0.25 * power);
    for (const id of t.states) { const r = s.regions[id]; if (r && st.id === "hearts") r.unrest = clamp100(r.unrest - 0.4); if (r && st.id === "offensive") r.insecurity = clamp100(r.insecurity - 0.3 * power); }
    if (st.harm > 0) { s.sec.humanRights = clamp100(s.sec.humanRights - st.harm * (1.1 - o.commander.integrity / 160)); if (rng.chance(0.045)) { s.rule.intlPressure = clamp100(s.rule.intlPressure + 3); s.gov.trust = clamp100(s.gov.trust - 1); pushNews(s, { source: `opharm:${o.theatre}:${s.month}`, headline: `Civilians killed in the ${t.name.toLowerCase()}: rights groups demand answers`, body: `Commander ${o.commander.name} says the report is exaggerated.`, tone: "bad" }); } }
    else if (st.harm < 0) s.sec.humanRights = clamp100(s.sec.humanRights + 0.12);
    if (o.commander.integrity < 40 && rng.chance(0.3)) { const x = Math.round(monthlyCost(o.funding) * 0.35); noteStolen(s, x); if (rng.chance(0.05)) pushNews(s, { source: `opgraft:${o.theatre}:${s.month}`, headline: `Soldiers in the ${t.name.toLowerCase()} say rations and fuel never arrive`, body: "The money seems to stop at headquarters.", tone: "bad" }); }
    if (o.commander.loyalty < 30 && o.commander.skill > 55 && s.month - o.since > 8 && rng.chance(0.012)) { s.rule.coupRisk = clamp100(s.rule.coupRisk + 5); pushNews(s, { source: `opglory:${o.theatre}:${s.month}`, headline: `${o.commander.name}'s popularity grows with every victory`, body: "Officers in Abuja are starting to say he is too popular.", tone: "bad" }); }
    if (!(o.progress < 14) && !s.flags[`opwin:${o.theatre}:${o.since}`]) { s.flags[`opwin:${o.theatre}:${o.since}`] = 1; pushNews(s, { source: `opwin:${o.theatre}:${s.month}`, headline: `Breakthrough in the ${t.name.toLowerCase()}`, body: `${o.commander.name} reports key strongholds taken. Villagers are returning.`, tone: "good" }); s.gov.trust = clamp100(s.gov.trust + 1.5); }
  }
  save(s, ops);
}
void clamp;
