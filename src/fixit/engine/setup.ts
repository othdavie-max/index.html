/**
 * Every presidency starts differently. Instead of fixed scenarios, each new game rolls a random mix of national
 * issues (seeded, so "replay this world" gives the same mix) plus small random variation in the starting numbers.
 * All values are simulated, for a fictional Nigeria.
 */
import type { Rng } from "../../game/engine/rng";
import { subRng } from "../../game/engine/rng";
import type { Difficulty, FixState, Portrait } from "./types";
import { clamp, clamp100 } from "./util";

export interface Issue {
  id: string;
  name: string;
  /** the briefing line shown when you take office */
  brief: string;
  good?: boolean;
  /** issues that make no sense together */
  clash?: string[];
  weight: number;
  /** k = intensity 0.7..1.3 */
  apply: (s: FixState, k: number) => void;
}

const regionBump = (s: FixState, ids: string[], key: "insecurity" | "food" | "jobless" | "power" | "flood" | "unrest", by: number) => {
  for (const id of ids) { const r = s.regions[id]; if (!r) continue; if (key === "unrest") r.unrest = clamp100(r.unrest + by); else { r[key] = clamp100(r[key] + by); r.off[key] = clamp100(r.off[key] + by); } }
};

export const ISSUES: Issue[] = [
  { id: "naira", name: "Naira in free fall", brief: "The naira has lost ground for months and dollar reserves are thin.", weight: 3, clash: ["investors"], apply: (s, k) => { s.eco.fx *= 1 + 0.18 * k; s.eco.reserves -= 9 * k; s.eco.emaDrift += 0.4 * k; s.eco.investor -= 4 * k; } },
  { id: "debt", name: "Debt squeeze", brief: "Interest payments swallow most of revenue and the treasury is nearly empty.", weight: 3, clash: ["windfall"], apply: (s, k) => { s.fin.domesticDebt += 22000 * k; s.fin.treasury *= 1 - 0.6 * k; s.fin.creditRating -= 14 * k; s.fin.domRate += 5 * k; } },
  { id: "food", name: "Food price crisis", brief: "Poor rains and high costs have sent food prices soaring; markets are tense.", weight: 3, clash: ["harvest"], apply: (s, k) => { s.eco.foodInflation += 9 * k; s.agri.storage = Math.max(5, s.agri.storage - 4 * k); s.flags.weatherYear = 0; s.agri.weather = -0.7; for (const r of Object.values(s.regions)) r.food = clamp100(r.food + 6 * k); } },
  { id: "fuel", name: "Fuel queues and a costly subsidy", brief: "Refineries are barely working, petrol queues stretch for miles and the subsidy bill keeps growing.", weight: 3, apply: (s, k) => { s.fuel.coverage = clamp(s.fuel.coverage + 0.15 * k, 0, 1); s.oil.refinery = Math.max(20, s.oil.refinery - 25 * k); } },
  { id: "power", name: "Grid on the brink", brief: "The national grid keeps collapsing and gas suppliers are owed money.", weight: 3, apply: (s, k) => { s.power.grid -= 10 * k; s.power.gas -= 10 * k; s.infra.maint -= 6 * k; for (const r of Object.values(s.regions)) r.power = clamp100(r.power + 6 * k); } },
  { id: "banditry", name: "Banditry in the North West", brief: "Armed gangs are kidnapping and raiding villages across the North West; farmers are fleeing.", weight: 3, apply: (s, k) => { s.sec.banditry += 12 * k; regionBump(s, ["NG-ZA", "NG-KT", "NG-SO", "NG-KD", "NG-NI", "NG-KE"], "insecurity", 10 * k); } },
  { id: "insurgency", name: "Insurgency in the North East", brief: "Insurgents have stepped up attacks in the North East; hundreds of thousands are displaced.", weight: 2, apply: (s, k) => { s.sec.terror += 12 * k; s.sec.displaced += 600 * k; regionBump(s, ["NG-BO", "NG-YO", "NG-AD"], "insecurity", 10 * k); } },
  { id: "communal", name: "Farmer-herder clashes", brief: "Clashes over land and water are spreading across the Middle Belt.", weight: 2, apply: (s, k) => { s.sec.communal += 12 * k; regionBump(s, ["NG-BE", "NG-PL", "NG-NA", "NG-TA", "NG-KO"], "insecurity", 9 * k); } },
  { id: "youth", name: "Restless, jobless youth", brief: "Youth unemployment is at a record high and graduates are organising online.", weight: 3, apply: (s, k) => { s.jobs.unemployment += 3 * k; s.jobs.youth += 6 * k; for (const r of Object.values(s.regions)) r.jobless = clamp100(r.jobless + 5 * k); } },
  { id: "strike", name: "Unions threatening a strike", brief: "Salaries have not kept up with prices and workers are owed arrears. The unions are counting down.", weight: 2, apply: (s, k) => { s.eco.wageIdx *= 1 - 0.08 * k; s.fin.arrears += 400 * k; s.groupMood.workers -= 10 * k; } },
  { id: "theft", name: "Oil theft wave", brief: "Pipelines in the Niger Delta are being tapped on an industrial scale; output is falling.", weight: 2, apply: (s, k) => { s.oil.theft += 8 * k; regionBump(s, ["NG-RI", "NG-BY", "NG-DE"], "insecurity", 6 * k); } },
  { id: "floods", name: "A dangerous rainy season ahead", brief: "Forecasters warn the rivers could burst their banks this year.", weight: 2, apply: (s) => { s.flags.weatherYear = 0; s.agri.weather = 0.85; regionBump(s, ["NG-KO", "NG-BY", "NG-AN", "NG-NI", "NG-JI", "NG-DE"], "flood", 10); } },
  { id: "disputed", name: "A disputed election", brief: "Your rival says the election was stolen. Trust is low and the streets are restless.", weight: 2, apply: (s, k) => { s.gov.trust -= 8 * k; s.gov.approval -= 4 * k; s.rival.popularity += 8 * k; for (const r of Object.values(s.regions)) r.unrest = clamp100(r.unrest + 15 * k); } },
  { id: "corruption", name: "A looted treasury", brief: "Auditors say billions went missing under the last government; contracts are riddled with fraud.", weight: 2, apply: (s, k) => { s.gov.corruption += 7 * k; s.gov.procurement -= 7 * k; s.fin.treasury *= 1 - 0.25 * k; } },
  // good news, at most one per game
  { id: "windfall", name: "Oil price windfall", brief: "World oil prices are high, so money is flowing in. Will you save it or spend it?", good: true, weight: 1, clash: ["debt"], apply: (s, k) => { s.eco.oilPrice += 22 * k; s.eco.reserves += 8 * k; s.fin.treasury += 1200 * k; s.gov.corruption += 3 * k; } },
  { id: "harvest", name: "A bumper harvest", brief: "Good rains have filled the barns; food prices are easing for now.", good: true, weight: 1, clash: ["food"], apply: (s, k) => { s.flags.weatherYear = 0; s.agri.weather = 0.6; s.eco.foodInflation -= 6 * k; } },
  { id: "investors", name: "Investors are watching", brief: "Foreign investors are curious about Nigeria again. A good first year could unlock billions.", good: true, weight: 1, clash: ["naira"], apply: (s, k) => { s.eco.investor += 8 * k; s.fin.creditRating += 6 * k; } },
  { id: "goodwill", name: "A honeymoon", brief: "Many voters are hopeful about your presidency; you have some goodwill to spend.", good: true, weight: 1, clash: ["disputed"], apply: (s, k) => { s.gov.trust += 8 * k; s.gov.approval += 5 * k; } },
];
export const ISSUE_BY_ID = Object.fromEntries(ISSUES.map((x) => [x.id, x])) as Record<string, Issue>;

function pickIssues(rng: Rng): string[] {
  const bad = ISSUES.filter((i) => !i.good), good = ISSUES.filter((i) => i.good);
  const n = rng.chance(0.45) ? 4 : 3;
  const out: string[] = [];
  const ok = (i: Issue) => !out.includes(i.id) && !out.some((o) => ISSUE_BY_ID[o].clash?.includes(i.id) || i.clash?.includes(o));
  while (out.length < n) { const c = bad.filter(ok); if (!c.length) break; out.push(rng.weighted(c, (i) => i.weight).id); }
  if (rng.chance(0.6)) { const c = good.filter(ok); if (c.length) out.push(rng.pick(c).id); }
  return out;
}

/** small, believable variation so even similar mixes play differently */
function jitter(s: FixState, rng: Rng) {
  s.eco.fx = Math.round(s.eco.fx * rng.range(0.92, 1.08));
  s.eco.inflation += rng.range(-3, 3);
  s.eco.foodInflation += rng.range(-3, 3);
  s.eco.oilPrice += rng.range(-8, 8);
  s.eco.reserves += rng.range(-4, 4);
  s.jobs.unemployment += rng.range(-1.5, 1.5);
  s.gov.approval += rng.range(-4, 4);
  s.gov.trust += rng.range(-4, 4);
  s.fin.treasury *= rng.range(0.85, 1.15);
}

function tidy(s: FixState) {
  s.eco.reserves = Math.max(8, s.eco.reserves);
  s.eco.inflation = clamp(s.eco.inflation, 6, 45);
  s.eco.foodInflation = clamp(s.eco.foodInflation, 5, 55);
  s.eco.investor = clamp100(s.eco.investor); s.fin.creditRating = clamp(s.fin.creditRating, 12, 80);
  s.fin.treasury = Math.max(200, s.fin.treasury);
  s.gov.trust = clamp(s.gov.trust, 12, 80); s.gov.approval = clamp(s.gov.approval, 25, 75); s.rival.popularity = clamp100(s.rival.popularity);
  s.gov.corruption = clamp100(s.gov.corruption); s.gov.procurement = clamp100(s.gov.procurement);
  s.power.grid = clamp100(s.power.grid); s.power.gas = clamp100(s.power.gas); s.infra.maint = clamp100(s.infra.maint);
  for (const k of ["banditry", "terror", "communal"] as const) s.sec[k] = clamp100(s.sec[k]);
  s.sec.index = 0.4 * s.sec.banditry + 0.35 * s.sec.terror + 0.25 * s.sec.communal;
  s.jobs.youth = clamp(s.jobs.youth, 10, 70); s.oil.theft = clamp(s.oil.theft, 3, 45);
}

export const DIFFICULTY: Record<Difficulty, { label: string; blurb: string; cash: number; events: number; vote: number }> = {
  easy: { label: "Easy", blurb: "More money, fewer crises, kinder voters.", cash: 1.6, events: 0.7, vote: 2.5 },
  normal: { label: "Normal", blurb: "The intended challenge.", cash: 1, events: 1, vote: 0 },
  hard: { label: "Hard", blurb: "Less money, more crises, tougher voters.", cash: 0.6, events: 1.3, vote: -2.5 },
};

export interface SetupOptions { difficulty?: Difficulty; portrait?: Portrait; president?: string; /** force a particular mix (tests) */ issues?: string[] }
export function applySetup(s: FixState, o: SetupOptions) {
  const rng = subRng(s.meta.seed, "issues");
  const ids = (o.issues ?? pickIssues(rng)).filter((x) => ISSUE_BY_ID[x]);
  s.meta.scenario = ids.join(",");
  s.meta.difficulty = o.difficulty ?? "normal";
  s.meta.hard = s.meta.difficulty === "hard";
  if (o.portrait) s.meta.portrait = o.portrait;
  if (o.president?.trim()) s.meta.president = o.president.trim().slice(0, 40);
  jitter(s, rng);
  for (const id of ids) ISSUE_BY_ID[id].apply(s, rng.range(0.7, 1.3));
  s.fin.treasury *= DIFFICULTY[s.meta.difficulty].cash;
  tidy(s);
}
export const issuesOf = (s: { meta: { scenario: string } }) => (s.meta.scenario || "").split(",").filter((x) => ISSUE_BY_ID[x]).map((x) => ISSUE_BY_ID[x]);
export const issuesLabel = (scenario: string) => scenario.split(",").filter((x) => ISSUE_BY_ID[x]).map((x) => ISSUE_BY_ID[x].name).join(" · ") || "The inherited mess";
export const eventRate = (s: FixState) => DIFFICULTY[s.meta.difficulty ?? "normal"]?.events ?? 1;
export const voteBonus = (s: FixState) => DIFFICULTY[s.meta.difficulty ?? "normal"]?.vote ?? 0;
