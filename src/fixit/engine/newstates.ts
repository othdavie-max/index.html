/**
 * New states. Regions petition for their own state. Creating one pleases its people and creates a governor's mansion
 * to pay for. It also invites the next petition. (Event-only: the map itself does not change.)
 */
import type { Rng } from "../../game/engine/rng";
import type { FixState } from "./types";
import { addMod, clamp100, pushNews } from "./util";
import { createEvent } from "./spawn";

const REGIONS = [
  { name: "Kainji State", from: "Niger and Kebbi", stateId: "NG-NI", zone: "NC" },
  { name: "Ogoja State", from: "Cross River", stateId: "NG-CR", zone: "SS" },
  { name: "Gurara State", from: "Kaduna", stateId: "NG-KD", zone: "NW" },
  { name: "Anioma State", from: "Delta", stateId: "NG-DE", zone: "SS" },
  { name: "Katagum State", from: "Bauchi", stateId: "NG-BA", zone: "NE" },
];
export const statesCreated = (s: FixState) => Number(s.flags.newStates ?? 0);
export const statesCost = (s: FixState) => statesCreated(s) * 14;
const pick = (s: FixState) => REGIONS[Number(s.flags.petitionIdx ?? 0) % REGIONS.length];

export function newStatesMonthly(s: FixState, rng: Rng) {
  const open = s.events.some((e) => e.tpl === "statePetition" && e.status === "open");
  const last = Number(s.flags.lastPetition ?? -99);
  const n = Number(s.flags.petitions ?? 0);
  if (!open && s.month >= 10 && n < REGIONS.length && s.month - last >= (s.flags.followPetition ? 8 : 26) && rng.chance(s.flags.followPetition ? 0.25 : 0.07)) {
    s.flags.lastPetition = s.month; s.flags.petitions = n + 1; s.flags.petitionIdx = (n + Number(s.meta.seed)) % REGIONS.length; delete s.flags.followPetition;
    createEvent(s, "statePetition", pick(s).stateId);
  }
}
const create = (s: FixState) => {
  const r = pick(s);
  s.flags.newStates = statesCreated(s) + 1;
  addMod(s, `newstate:${s.flags.newStates}`, `${r.name}: a new governor, assembly and civil service`, { revenue: -14, corruption: 0.4 }, { duration: null, ramp: 1 });
  const reg = s.regions[r.stateId]; if (reg) { reg.unrest = clamp100(reg.unrest - 12); reg.jobless = clamp100(reg.jobless - 3); }
  for (const g of s.governors) if (g.zone === r.zone) g.relation = clamp100(g.relation + 10);
  for (const b of s.backers) b.mood = clamp100(b.mood + 3);
  s.assembly.support = clamp100(s.assembly.support + 2);
  s.flags.followPetition = 1;
  pushNews(s, { source: `newstate:${s.month}`, headline: `${r.name} created: Nigeria now has ${37 + statesCreated(s)} states and the FCT`, body: `The people of ${r.name} danced in the streets. The federation account has another governor to pay.`, tone: "good" });
};
export const STATE_TEMPLATES = [
  {
    id: "statePetition", kind: "story" as const, urgency: 3,
    title: (s: FixState) => `Petition: ${pick(s).from} wants its own state, ${pick(s).name}`,
    cause: (s: FixState) => { const r = pick(s); return `Chiefs, youth leaders and lawmakers from the ${r.from} area have delivered a petition for ${r.name}. They say they are marginalised in their current state. Creating one means a new governor, a new assembly and a new civil service on the federal payroll, about ₦14bn a month, and every other region will want the same.${statesCreated(s) ? ` You have already created ${statesCreated(s)}.` : ""}`; },
    options: [
      { id: "create", label: "Back it and push it through the Assembly", explain: "Needs a two-thirds vote, so it takes effort.", cost: 20, tradeoff: "A running cost, more patronage, and the next petition.", unc: "high" as const, chance: (s: FixState) => Math.min(0.9, Math.max(0.1, 0.25 + s.assembly.support / 160 + (s.backers.reduce((a, b) => a + b.mood, 0) / s.backers.length) / 400)), win: { run: (s: FixState) => { create(s); return "The bill passed. The new state will be inaugurated next month."; } }, lose: { assembly: -2, run: () => "The bill failed to reach two-thirds. The region says you did not try hard enough." }, winText: "", loseText: "" },
      { id: "study", label: "Set up a committee to study it", explain: "Politely delay.", cost: 0, tradeoff: "Committees are remembered.", unc: "low" as const, chance: () => 1, win: { run: (s: FixState) => { const r = pick(s); for (const g of s.governors) if (g.zone === r.zone) g.relation = clamp100(g.relation - 2); return "A committee of 40 people was named. It will report in three years."; } }, lose: {}, winText: "", loseText: "" },
      { id: "reject", label: "Reject it: 'we cannot afford more governors'", explain: "Save money and avoid a dangerous precedent.", cost: 0, tradeoff: "The region will be angry.", unc: "medium" as const, chance: () => 0.9, win: { trust: 1, run: (s: FixState) => { const r = pick(s); const reg = s.regions[r.stateId]; if (reg) reg.unrest = clamp100(reg.unrest + 6); for (const g of s.governors) if (g.zone === r.zone) g.relation = clamp100(g.relation - 6); return "Voters elsewhere applauded the discipline. In the region, banners went up."; } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: { trust: -1 }, expireText: () => "The petition was left unanswered.",
  },
];
void pushNews;
