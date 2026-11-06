/**
 * Sector dashboards: agriculture, oil and gas, technology and manufacturing. Each has three programmes you can switch
 * on. They cost money every month and their effect depends on how honest and capable the government is.
 */
import type { Effects, FixState } from "./types";
import { addMod, clamp, removeMods } from "./util";

export interface Programme { id: string; name: string; blurb: string; cost: number; effects: Effects }
export interface Sector { id: string; icon: string; name: string; programmes: Programme[] }
export const SECTORS: Sector[] = [
  { id: "agri", icon: "🌾", name: "Agriculture", programmes: [
    { id: "fert", name: "Fertiliser subsidy", blurb: "Cheaper fertiliser for farmers. A favourite target of middlemen.", cost: 25, effects: { inputs: 10, foodSupply: 1 } },
    { id: "extension", name: "Seeds and extension workers", blurb: "Better seed and trained advisers in every local government.", cost: 12, effects: { inputs: 4, postHarvest: 2 } },
    { id: "credit", name: "Farm credit scheme", blurb: "Low-interest loans for small farmers.", cost: 18, effects: { sme: 1, foodSupply: 0.8 } },
  ] },
  { id: "oil", icon: "🛢️", name: "Oil & gas", programmes: [
    { id: "guards", name: "Pipeline guards and tracking", blurb: "Patrols, drones and community deals along the main pipelines.", cost: 15, effects: { oilTheft: -5, crude: 30 } },
    { id: "gas", name: "Gas-to-power pipeline", blurb: "Carry gas to the power stations that are starved of it.", cost: 35, effects: { gas: 4, power: 100 } },
    { id: "local", name: "Local refining incentives", blurb: "Tax breaks and guaranteed crude for refiners who keep running.", cost: 20, effects: { refinery: 25, maint: 2 } },
  ] },
  { id: "tech", icon: "💻", name: "Technology", programmes: [
    { id: "visa", name: "Startup visa and tax holiday", blurb: "Bring talent and keep it.", cost: 10, effects: { investor: 2, jobs: 0.4, exports: 0.1 } },
    { id: "bootcamp", name: "Coding bootcamps", blurb: "Skills for hundreds of thousands of young people.", cost: 15, effects: { skills: 2, jobs: 0.5 } },
    { id: "fibre", name: "Fibre rollout", blurb: "Cheaper and faster internet nationwide.", cost: 30, effects: { sme: 1.5, investor: 1 } },
  ] },
  { id: "manuf", icon: "🏭", name: "Manufacturing", programmes: [
    { id: "power", name: "Factory power guarantee", blurb: "Dedicated power lines for industrial clusters.", cost: 30, effects: { manuf: 3, maint: 1 } },
    { id: "epz", name: "Export processing zones", blurb: "Duty-free zones where factories can export.", cost: 22, effects: { manuf: 2, exports: 0.4 } },
    { id: "local", name: "'Buy Nigerian' rule", blurb: "Government buys local first. Helps factories, raises some prices.", cost: 5, effects: { manuf: 2, foodPrice: 1 } },
  ] },
];
const key = (sec: string, p: string) => `prog:${sec}:${p}`;
export const programmeOn = (s: FixState, sec: string, p: string) => !!s.flags[key(sec, p)];
/** how well it will work: corruption and weak capacity leak the benefit away */
export const leakage = (s: FixState) => clamp(1 - 0.0035 * s.gov.corruption - 0.002 * Math.max(0, 50 - s.gov.capacity), 0.45, 1);
export function toggleProgramme(s: FixState, sec: string, pid: string): { ok: boolean; message: string } {
  const S = SECTORS.find((x) => x.id === sec), P = S?.programmes.find((x) => x.id === pid);
  if (!S || !P) return { ok: false, message: "Unknown programme." };
  const src = `sector:${sec}:${pid}`;
  if (programmeOn(s, sec, pid)) { delete s.flags[key(sec, pid)]; removeMods(s, src); return { ok: true, message: `${P.name} switched off.` }; }
  if (P.cost * 3 > s.fin.treasury) return { ok: false, message: `You need at least three months of its cost (${Math.round(P.cost * 3)}bn) in the treasury.` };
  s.flags[key(sec, pid)] = s.month + 1;
  addMod(s, src, P.name, P.effects, { duration: null, ramp: 5, scale: leakage(s) });
  const m = s.modifiers[s.modifiers.length - 1]; if (m && m.source === src) m.monthly = P.cost;
  return { ok: true, message: `${P.name} is running. It costs about ₦${P.cost}bn a month and takes months to build up.${leakage(s) < 0.8 ? " Corruption and weak capacity will leak part of the benefit." : ""}` };
}
export function sectorStats(s: FixState, id: string): { label: string; value: string; good: boolean }[] {
  if (id === "agri") return [{ label: "Food supply vs demand", value: `${Math.round((s.agri.supply / s.agri.demand) * 100)}%`, good: s.agri.supply >= s.agri.demand * 0.98 }, { label: "Harvest lost to waste", value: `${Math.round(s.agri.loss)}%`, good: s.agri.loss < 22 }, { label: "Food inflation", value: `${Math.round(s.eco.foodInflation)}%`, good: s.eco.foodInflation < 20 }];
  if (id === "oil") return [{ label: "Crude output", value: `${Math.round(s.oil.production)}k b/d`, good: s.oil.production > 1350 }, { label: "Oil theft", value: `${Math.round(s.oil.theft)}%`, good: s.oil.theft < 14 }, { label: "Refinery uptime", value: `${Math.round(s.oil.uptime)}%`, good: s.oil.uptime >= 65 }];
  if (id === "tech") return [{ label: "Youth unemployment", value: `${Math.round(s.jobs.youth)}%`, good: s.jobs.youth < 28 }, { label: "Investor confidence", value: `${Math.round(s.eco.investor)}`, good: s.eco.investor >= 50 }, { label: "Open investor projects", value: `${(s.deals ?? []).filter((d) => d.status === "open").length}`, good: (s.deals ?? []).some((d) => d.status === "open") }];
  return [{ label: "Manufacturing strength", value: `${Math.round(s.jobs.manuf)}`, good: s.jobs.manuf >= 36 }, { label: "Non-oil exports", value: `${Math.round(s.jobs.exports * 100) / 100}`, good: s.jobs.exports > 2.4 }, { label: "Electricity delivered", value: `${Math.round(s.power.available).toLocaleString()} MW`, good: s.power.available > 5200 }];
}
