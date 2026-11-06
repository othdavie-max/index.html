/**
 * Every big problem has a ladder of solutions: a few steps with a big, visible payoff at the top. The steps are the same
 * projects and policies as everywhere else; the ladder organises them by problem and celebrates what they add up to.
 */
import type { FixState } from "./types";
import { PROJECT_BY_ID } from "../data/catalogue";
import { addMod, clamp100, nb, pushNews } from "./util";
import { earnPc } from "./meta";

export interface Rung { kind: "project" | "policy"; ref: string; why: string }
export interface Milestone { id: string; label: string; test: (s: FixState) => boolean; reward: string; effects?: Record<string, number>; reserves?: number }
export interface Ladder { id: string; icon: string; title: string; blurb: string; rungs: Rung[]; milestones: Milestone[] }

const done = (s: FixState, def: string) => s.projects.some((p) => p.defId === def && p.status === "done");
const going = (s: FixState, def: string) => s.projects.some((p) => p.defId === def && (p.status === "active" || p.status === "stalled"));
const pol = (s: FixState, id: string) => !!s.policies[id]?.active;
const nonOil = (s: FixState) => { try { return Number((JSON.parse(String(s.flags.fxParts ?? "{}")) as { nonOil?: number }).nonOil ?? 0); } catch { return 0; } };
const oilExp = (s: FixState) => { try { return Number((JSON.parse(String(s.flags.fxParts ?? "{}")) as { exports?: number }).exports ?? 0); } catch { return 0; } };

/** how many people each finished project or running programme puts to work (thousands) */
const PROJECT_JOBS: Record<string, number> = { industrial: 60, garmentHub: 45, techHubs: 30, nollywoodCity: 25, tourismSites: 20, lithiumPlant: 25, riceMills: 20, foodProcessing: 25, housing: 50, refinery: 15, modularRefinery: 10, fertiliserPlant: 15, exportHub: 20, highway: 30, rail: 40, port: 25, broadband: 15, solar: 12, gasPlant: 10 };
const POLICY_JOBS: Record<string, number> = { skillsCorps: 80, publicWorks: 150, smeLoans: 120, startupAct: 40, creativeFund: 35, exportZones: 70, mineralsLicensing: 30, tourismVisa: 25 };
export function jobsCreated(s: FixState): number {
  let k = 0;
  for (const p of s.projects) if (p.status === "done") k += (PROJECT_JOBS[p.defId] ?? 0) * (p.benefitScale ?? 0.8);
  for (const id of Object.keys(POLICY_JOBS)) if (pol(s, id)) k += POLICY_JOBS[id];
  return Math.round(k) * 1000;
}

export const LADDERS: Ladder[] = [
  {
    id: "food", icon: "🌾", title: "Feed Nigeria, then feed the world", blurb: "Seeds and fertiliser, water, storage, mills, then a hub that ships to the world.",
    rungs: [
      { kind: "policy", ref: "farmInputs", why: "Cheaper seed and fertiliser for farmers" }, { kind: "project", ref: "irrigation", why: "Dry-season harvests" }, { kind: "project", ref: "storage", why: "Stop food rotting" },
      { kind: "project", ref: "farmRoads", why: "Get food to market" }, { kind: "project", ref: "riceMills", why: "Turn paddy into packaged rice" }, { kind: "project", ref: "fertiliserPlant", why: "Make fertiliser at home" }, { kind: "project", ref: "exportHub", why: "Ship it abroad" },
    ],
    milestones: [
      { id: "riceself", label: "Nigeria is self-sufficient in rice", test: (s) => pol(s, "farmInputs") && done(s, "irrigation") && done(s, "storage") && (done(s, "riceMills") || done(s, "foodProcessing")), reward: "Rice prices fall for good and the farmers are proud.", effects: { foodPrice: -2.2, foodSupply: 2.5 } },
      { id: "riceexport", label: "Nigeria exports rice", test: (s) => !!s.flags["lad:riceself"] && done(s, "exportHub"), reward: "Dollars start coming in from food exports.", effects: { exports: 0.12, fxSupply: 0.6 }, reserves: 0.12 },
    ],
  },
  {
    id: "jobs", icon: "👷", title: "Jobs for the young", blurb: "Skills, small business, factories, tech, film, mining and tourism, each with a real head-count.",
    rungs: [
      { kind: "policy", ref: "skillsCorps", why: "Training and apprenticeships" }, { kind: "policy", ref: "startupAct", why: "Room for startups" }, { kind: "policy", ref: "smeLoans", why: "Credit for small firms" }, { kind: "project", ref: "industrial", why: "A factory park" },
      { kind: "project", ref: "garmentHub", why: "Textile and garment jobs" }, { kind: "project", ref: "techHubs", why: "Tech clusters" }, { kind: "project", ref: "nollywoodCity", why: "Film and music" }, { kind: "policy", ref: "mineralsLicensing", why: "Mining licences" }, { kind: "project", ref: "lithiumPlant", why: "Process ore at home" }, { kind: "project", ref: "tourismSites", why: "Tourism" },
    ],
    milestones: [
      { id: "jobs100", label: "100,000 jobs created", test: (s) => jobsCreated(s) >= 100000, reward: "Young people notice.", effects: { happiness: 0.4 } },
      { id: "jobs500", label: "500,000 jobs created", test: (s) => jobsCreated(s) >= 500000, reward: "A real dent in joblessness. Graduates start staying.", effects: { happiness: 0.8, sme: 1 } },
      { id: "jobs1m", label: "One million jobs created", test: (s) => jobsCreated(s) >= 1000000, reward: "The promise every president makes, and this one kept it.", effects: { happiness: 1.2, trust: 1.5 } },
    ],
  },
  {
    id: "power", icon: "💡", title: "Light up Nigeria", blurb: "Gas for the plants, a grid that holds, and solar where the grid does not reach.",
    rungs: [
      { kind: "policy", ref: "gasFlares", why: "Gas for power plants" }, { kind: "policy", ref: "powerPay", why: "Pay the power-sector debts" }, { kind: "project", ref: "gasPlant", why: "More megawatts" }, { kind: "project", ref: "transmission", why: "A grid that holds" },
      { kind: "policy", ref: "gridMaint", why: "Maintenance, not collapse" }, { kind: "project", ref: "solar", why: "Mini-grids for the far places" }, { kind: "project", ref: "dams", why: "Hydro and flood defence" },
    ],
    milestones: [
      { id: "light6k", label: "6,000 MW delivered", test: (s) => s.power.available >= 6000, reward: "Generators are going quiet.", effects: { happiness: 0.5 } },
      { id: "lagos24", label: "24-hour light in Lagos", test: (s) => (s.regions["NG-LA"]?.power ?? 100) <= 22, reward: "Lagos has not seen the lights go out in weeks.", effects: { investor: 2, sme: 1.5 } },
      { id: "light10k", label: "10,000 MW delivered", test: (s) => s.power.available >= 10000, reward: "The factories are running on grid power.", effects: { manuf: 2, investor: 2 } },
    ],
  },
  {
    id: "fuel", icon: "⛽", title: "Fix fuel for good", blurb: "Make it at home, run on gas, and stop the theft.",
    rungs: [
      { kind: "project", ref: "refinery", why: "Restore a big refinery" }, { kind: "project", ref: "modularRefinery", why: "Fast, small refineries" }, { kind: "policy", ref: "oilTheftTaskForce", why: "Stop the stealing" },
      { kind: "policy", ref: "cngConversion", why: "Run vehicles on gas" }, { kind: "project", ref: "cngStations", why: "Gas stations" },
    ],
    milestones: [
      { id: "fuelhome", label: "Nigeria refines most of its own petrol", test: (s) => s.fuel.importShare <= 0.45, reward: "Imports fall, and so does the fuel bill.", effects: { transport: -1.5, fxSupply: 0.4 } },
      { id: "noqueues", label: "The end of fuel queues", test: (s) => s.month > 12 && s.oil.scarcity <= 20, reward: "Nigerians have forgotten what a fuel queue looks like.", effects: { happiness: 1 } },
    ],
  },
  {
    id: "money", icon: "🚢", title: "Earn dollars", blurb: "Trade deals, licences and factories that sell abroad.",
    rungs: [
      { kind: "policy", ref: "exportZones", why: "Export zones" }, { kind: "policy", ref: "ecowasTrade", why: "Open West African trade" }, { kind: "policy", ref: "tourismVisa", why: "Visitors bring dollars" },
      { kind: "policy", ref: "diasporaBonds", why: "Dollars from abroad" }, { kind: "project", ref: "port", why: "Faster ports" },
    ],
    milestones: [
      { id: "exports2x", label: "Non-oil exports double", test: (s) => nonOil(s) >= 1.1, reward: "Nigeria sells a lot more than oil now.", effects: { investor: 2, fxSupply: 0.4 } },
      { id: "exportshalf", label: "Non-oil exports reach half of oil", test: (s) => oilExp(s) > 0 && nonOil(s) >= 0.5 * oilExp(s), reward: "A historic shift: the economy no longer lives on crude.", effects: { investor: 3, fxSupply: 0.6 } },
      { id: "reserves50", label: "Reserves above $50bn", test: (s) => s.eco.reserves >= 50, reward: "The naira has a real defence at last.", effects: { investor: 2 } },
    ],
  },
];
export const LADDER_BY_ID = Object.fromEntries(LADDERS.map((l) => [l.id, l])) as Record<string, Ladder>;

export type RungState = "done" | "building" | "open" | "locked";
export function rungState(s: FixState, r: Rung): { state: RungState; note?: string } {
  if (r.kind === "policy") return { state: pol(s, r.ref) ? "done" : "open" };
  if (done(s, r.ref)) return { state: "done" };
  if (going(s, r.ref)) return { state: "building" };
  const d = PROJECT_BY_ID[r.ref];
  const lock = d?.unlock?.(s); if (lock) return { state: "locked", note: lock };
  return { state: "open" };
}
export const ladderProgress = (s: FixState, l: Ladder) => l.rungs.filter((r) => rungState(s, r).state === "done").length / l.rungs.length;

export function laddersMonthly(s: FixState) {
  for (const l of LADDERS) {
    for (const m of l.milestones) {
      const key = `lad:${m.id}`;
      if (s.flags[key] === undefined && s.month > 1 && m.test(s)) {
        s.flags[key] = s.month;
        if (m.effects) addMod(s, `ladder:${m.id}`, m.label, m.effects as never, { duration: null, ramp: 3 });
        earnPc(s, 6); s.gov.trust = clamp100(s.gov.trust + 1.5); s.gov.approval = clamp100(s.gov.approval + 1.5);
        pushNews(s, { source: `ladder:${m.id}`, headline: m.label, body: m.reward, tone: "good" });
      }
      if (m.reserves && s.flags[key] !== undefined) s.eco.reserves += m.reserves;
    }
  }
}
void nb;
