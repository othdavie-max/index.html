/** Starting scenarios and difficulty. Each scenario is a different, internally consistent starting state. */
import type { Difficulty, FixState, Portrait } from "./types";
import { clamp100 } from "./util";

export interface Scenario { id: string; name: string; blurb: string; apply: (s: FixState) => void }
export const SCENARIOS: Scenario[] = [
  { id: "standard", name: "The inherited mess", blurb: "Rising prices, a weak naira, a costly fuel subsidy and blackouts. The classic challenge.", apply: () => undefined },
  {
    id: "debt", name: "Debt crisis", blurb: "The treasury is almost empty and lenders are nervous. Every naira of interest hurts.",
    apply: (s) => { s.fin.domesticDebt = 72000; s.fin.treasury = 450; s.fin.creditRating = 28; s.fin.domRate = 21; s.eco.investor = 33; s.eco.reserves = 24; },
  },
  {
    id: "boom", name: "Oil boom", blurb: "Oil prices are high and money is flowing, but so is corruption. Will you save or spend?",
    apply: (s) => { s.eco.oilPrice = 104; s.eco.oilTrend = 2; s.eco.reserves = 52; s.fin.treasury = 3600; s.eco.fx = 1320; s.eco.inflation = 19; s.gov.corruption = 74; s.gov.procurement = 32; },
  },
  {
    id: "unrest", name: "After a disputed election", blurb: "Half the country says you stole the vote. Trust is low, the streets are restless and your rival is strong.",
    apply: (s) => { s.gov.trust = 24; s.gov.approval = 40; s.gov.happiness = 42; s.rival.popularity = 62; for (const r of Object.values(s.regions)) r.unrest = clamp100(r.unrest + 22); s.sec.communal = 60; },
  },
  {
    id: "calm", name: "Calm but poor", blurb: "Prices are stable, but there are no jobs and little electricity. Can you create growth?",
    apply: (s) => { s.eco.inflation = 13; s.eco.foodInflation = 15; s.eco.fx = 1380; s.jobs.unemployment = 25; s.jobs.youth = 43; s.power.grid = 30; s.power.gas = 35; s.eco.growth = 1.2; s.eco.emaDrift = 0.15; },
  },
];
export const SCENARIO_BY_ID = Object.fromEntries(SCENARIOS.map((x) => [x.id, x])) as Record<string, Scenario>;

export const DIFFICULTY: Record<Difficulty, { label: string; blurb: string; cash: number; events: number; vote: number }> = {
  easy: { label: "Easy", blurb: "More money, fewer crises, kinder voters.", cash: 1.6, events: 0.7, vote: 2.5 },
  normal: { label: "Normal", blurb: "The intended challenge.", cash: 1, events: 1, vote: 0 },
  hard: { label: "Hard", blurb: "Less money, more crises, tougher voters.", cash: 0.6, events: 1.3, vote: -2.5 },
};

export interface SetupOptions { scenario?: string; difficulty?: Difficulty; portrait?: Portrait; president?: string }
export function applySetup(s: FixState, o: SetupOptions) {
  const sc = SCENARIO_BY_ID[o.scenario ?? "standard"] ?? SCENARIOS[0];
  s.meta.scenario = sc.id;
  s.meta.difficulty = o.difficulty ?? "normal";
  s.meta.hard = s.meta.difficulty === "hard";
  if (o.portrait) s.meta.portrait = o.portrait;
  if (o.president?.trim()) s.meta.president = o.president.trim().slice(0, 40);
  sc.apply(s);
  s.fin.treasury *= DIFFICULTY[s.meta.difficulty].cash;
}
export const eventRate = (s: FixState) => DIFFICULTY[s.meta.difficulty ?? "normal"]?.events ?? 1;
export const voteBonus = (s: FixState) => DIFFICULTY[s.meta.difficulty ?? "normal"]?.vote ?? 0;
