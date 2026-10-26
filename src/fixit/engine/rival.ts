/**
 * The opposition leader, the campaign and the election. The vote is counted state by state: you need more than half
 * the national vote AND at least 25% in two-thirds of the states (24 of 37), as in Nigeria's rules for president.
 * Party and candidate names are fictional.
 */
import type { Rng } from "../../game/engine/rng";
import { subRng } from "../../game/engine/rng";
import { STATES, STATE_BY_ID } from "../../game/data/states";
import type { ElectionResult, FixState } from "./types";
import { TERM_MONTHS } from "./types";
import { clamp, clamp100, nb, pushNews, pushReport } from "./util";
import { stateLayerValue } from "./views";
import { promiseScore } from "./promises";
import { heavyweightZones, loyalistCount } from "./cabinet";
import { voteBonus } from "./setup";

export const YOUR_PARTY = { name: "National Progress Party", abbr: "NPP" };
const RIVAL_NAMES = ["Chief Babatunde Adeleke-Ross", "Alhaji Umaru Kwankwaso-Bida", "Dr Chinedu Okonkwo-Hart", "Senator Ebiye Tonye-Briggs", "Mrs Aisha Garba-Lamido", "Prof Remi Akinwale"];
export const RIVAL_PARTY = { name: "People's Renewal Alliance", abbr: "PRA" };

export function initRival(s: FixState) {
  const rng = subRng(s.meta.seed, "rival");
  s.rival = { name: rng.pick(RIVAL_NAMES), party: RIVAL_PARTY.abbr, zone: rng.pick(["NC", "NE", "NW", "SE", "SS", "SW"]), popularity: 45 };
  s.campaign = { rallies: {}, debateShift: 0, mobilise: 0, attacks: 0, actionsThisMonth: 0, month: -1 };
  s.election = null;
}

export const campaignOpen = (s: FixState) => s.term === 1 && s.month >= s.termStart + TERM_MONTHS - 6 && s.month < s.termStart + TERM_MONTHS;
export const monthsToElection = (s: FixState) => s.termStart + TERM_MONTHS - s.month;

// ---------------------------------------------------------------- vote model
function nationalBase(s: FixState): number {
  const { kept, total } = promiseScore(s);
  return 50 + 0.33 * (s.gov.approval - 50) + 0.08 * (s.gov.trust - 40) + 1.6 * kept - (monthsToElection(s) <= 12 ? 1.3 * (total - kept) : 0)
    - 0.06 * (s.rival.popularity - 45) + 0.7 * loyalistCount(s) - 3 + s.campaign.debateShift + s.campaign.mobilise + voteBonus(s) - (s.me.scandals > 1 ? 2.5 : 0);
}
export function stateShare(s: FixState, id: string, noise = 0): number {
  const st = STATE_BY_ID[id];
  const done = s.projects.filter((p) => p.status === "done" && p.stateId === id).length;
  const hw = heavyweightZones(s).filter((z) => z === st.zone).length;
  const gov = s.governors?.find((g) => g.zone === st.zone);
  const govFx = gov ? (gov.relation - 50) / 12 + (gov.party === "NPP" ? 1 : -1) : 0;
  return clamp(nationalBase(s) + 0.15 * (45 - stateLayerValue(s, id, "overview")) + (s.campaign.rallies[st.zone] ?? 0) + 3 * hw + govFx + 1.5 * Math.min(3, done) - (st.zone === s.rival.zone ? 6 : 0) + noise, 5, 95);
}
export function projectVote(s: FixState, rng?: Rng): Omit<ElectionResult, "month" | "chance"> {
  const shock = rng ? rng.normal(0, 2.5) : 0;
  const states: Record<string, number> = {};
  let num = 0, den = 0, over25 = 0;
  for (const st of STATES) {
    const v = stateShare(s, st.id, shock + (rng ? rng.normal(0, 3) : 0));
    states[st.id] = Math.round(v * 10) / 10;
    num += v * st.pop2006m; den += st.pop2006m;
    if (v >= 25) over25++;
  }
  const national = Math.round((num / den) * 10) / 10;
  const spread = over25 >= 24;
  const won = national > 50 && spread;
  return { national, states, statesOver25: over25, won, runoff: national > 50 && !spread };
}
/** chance of winning if the vote were held today (expected share with ~3.5 points of uncertainty) */
export function winChance(s: FixState): number {
  const v = projectVote(s);
  const z = (v.national - 50) / 3;
  return clamp(phi(z) * (v.statesOver25 >= 24 ? 1 : 0.6), 0.02, 0.98);
}
function phi(z: number) { return 1 / (1 + Math.exp(-1.702 * z)); }

export function runElection(s: FixState): ElectionResult {
  const chance = winChance(s);
  const rng = subRng(s.meta.seed, "election", s.term);
  const v = projectVote(s, rng);
  let won = v.won;
  if (v.runoff) won = rng.chance(0.55); // second round between the top two
  const res: ElectionResult = { ...v, won, month: s.month, chance };
  s.election = res;
  return res;
}

// ---------------------------------------------------------------- campaign actions
export interface CampResult { ok: boolean; message: string }
function campaignSlot(s: FixState): string | null {
  if (!campaignOpen(s)) return "The campaign opens six months before election day.";
  if (s.campaign.month !== s.month) { s.campaign.month = s.month; s.campaign.actionsThisMonth = 0; }
  if (s.campaign.actionsThisMonth >= 2) return "You can only do two campaign activities a month.";
  return null;
}
const mult = (s: FixState) => 0.6 + 0.4 * (s.eco.priceLevel / 100);
export function rally(s: FixState, zone: string): CampResult {
  const err = campaignSlot(s); if (err) return { ok: false, message: err };
  const cost = 25 * mult(s);
  if (cost > s.fin.treasury) return { ok: false, message: "Not enough party and state funds." };
  s.fin.treasury -= cost;
  const before = s.campaign.rallies[zone] ?? 0;
  const gain = Math.max(0.6, 3 - before * 0.6);
  s.campaign.rallies[zone] = before + gain;
  s.campaign.actionsThisMonth++;
  pushNews(s, { source: `rally:${zone}:${s.month}`, headline: `Huge crowds at presidential rally in the ${ZONE_NAME[zone]}`, body: `Support in the zone rises about ${gain.toFixed(1)} points.`, tone: "good" });
  return { ok: true, message: `Rally in the ${ZONE_NAME[zone]}: +${gain.toFixed(1)} points there${before > 0 ? " (smaller gain: you have been there before)" : ""}.` };
}
export function mobilise(s: FixState): CampResult {
  const err = campaignSlot(s); if (err) return { ok: false, message: err };
  const cost = 60 * mult(s);
  if (s.campaign.mobilise >= 3) return { ok: false, message: "Your ground game is already at full strength." };
  if (cost > s.fin.treasury) return { ok: false, message: "Not enough funds." };
  s.fin.treasury -= cost; s.campaign.mobilise += 1; s.campaign.actionsThisMonth++;
  return { ok: true, message: "Door-to-door volunteers deployed nationwide: +1 point everywhere." };
}
export function attackAd(s: FixState): CampResult {
  const err = campaignSlot(s); if (err) return { ok: false, message: err };
  const cost = 20 * mult(s);
  if (cost > s.fin.treasury) return { ok: false, message: "Not enough funds." };
  s.fin.treasury -= cost; s.campaign.actionsThisMonth++; s.campaign.attacks++;
  const backfire = subRng(s.meta.seed, "attack", s.month, s.campaign.attacks).chance(0.25 + 0.1 * s.campaign.attacks);
  if (backfire) { s.gov.trust = clamp100(s.gov.trust - 2.5); s.rival.popularity = clamp100(s.rival.popularity + 2); return { ok: false, message: "The attack ad backfired: voters saw it as dirty politics." }; }
  s.rival.popularity = clamp100(s.rival.popularity - 4); s.gov.trust = clamp100(s.gov.trust - 0.8);
  return { ok: true, message: `The ad dented ${s.rival.name}'s popularity, at a small cost to your own image.` };
}
export const ZONE_NAME: Record<string, string> = { NC: "North Central", NE: "North East", NW: "North West", SE: "South East", SS: "South South", SW: "South West" };

// ---------------------------------------------------------------- the debate (one per campaign)
export const DEBATE_QUESTIONS = [
  { id: "prices", q: "“Families can't afford food. What have you done about prices?”" },
  { id: "jobs", q: "“Young people have no jobs. Why should they vote for you?”" },
  { id: "honesty", q: "“Your government is accused of corruption. Can Nigerians trust you?”" },
];
export const DEBATE_ANSWERS = [
  { id: "record", label: "Defend your record with numbers", blurb: "Strong if your record is good; weak if not." },
  { id: "promise", label: "Promise bold relief", blurb: "Popular now; voters may doubt you if trust is low." },
  { id: "attack", label: "Turn it on your rival", blurb: "Can land a blow or look evasive." },
] as const;
export function answerDebate(s: FixState, qid: string, aid: string): CampResult {
  if (!campaignOpen(s)) return { ok: false, message: "The debate happens during the campaign." };
  const key = `debate:${qid}`;
  if (s.flags[key]) return { ok: false, message: "You already answered that question." };
  const rng = subRng(s.meta.seed, "debate", qid, aid);
  const record = qid === "prices" ? (s.baseline.inflation - s.eco.inflation) / 3 + (s.baseline.foodAfford < 100 ? 0 : 0) : qid === "jobs" ? (s.baseline.unemployment - s.jobs.unemployment) : (40 - s.me.evidence) / 15;
  let shift = 0;
  if (aid === "record") shift = clamp(record * 0.6, -2, 2.5) + rng.normal(0, 0.4);
  if (aid === "promise") shift = clamp(0.8 + (s.gov.trust - 40) / 25, -1.5, 2) + rng.normal(0, 0.6);
  if (aid === "attack") shift = (rng.chance(0.5) ? 1.6 : -1.2) + (s.rival.popularity > 55 ? 0.5 : 0);
  shift = Math.round(shift * 10) / 10;
  s.flags[key] = aid;
  s.campaign.debateShift += shift;
  const verdict = shift >= 1 ? "Commentators say you won that exchange." : shift > 0 ? "A narrow edge to you on that one." : shift > -1 ? "That answer fell flat." : "Your rival clearly won that exchange.";
  if (DEBATE_QUESTIONS.every((q) => s.flags[`debate:${q.id}`])) pushNews(s, { source: `debate:${s.term}`, headline: s.campaign.debateShift >= 1 ? "Polls: the President won the debate" : s.campaign.debateShift <= -1 ? `Polls: ${s.rival.name} won the debate` : "Debate ends in a draw, say viewers", body: `Net effect on the vote: ${s.campaign.debateShift >= 0 ? "+" : ""}${s.campaign.debateShift.toFixed(1)} points.`, tone: s.campaign.debateShift >= 0 ? "good" : "bad" });
  return { ok: shift > 0, message: `${verdict} (${shift >= 0 ? "+" : ""}${shift} points)` };
}

// ---------------------------------------------------------------- monthly rival behaviour
export function rivalMonthly(s: FixState, rng: Rng) {
  const target = clamp100(100 - s.gov.approval * 0.95 + 4 * s.me.scandals - 2 * loyalistCount(s) + (s.campaign.attacks ? 0 : 0));
  s.rival.popularity = clamp100(s.rival.popularity + 0.15 * (target - s.rival.popularity) + rng.normal(0, 0.6));
  if (s.history.length < 2) return;
  const a = s.history[Math.max(0, s.history.length - 4)], b = s.history[s.history.length - 1];
  const R = s.rival.name;
  const lines: [number, string][] = [];
  if (b.fuel > a.fuel * 1.08) lines.push([3, `“Petrol at ₦${b.fuel} a litre! This government has declared war on the ordinary Nigerian,” says ${R}.`]);
  if (b.inflation > a.inflation + 1) lines.push([2.5, `“Prices up ${b.inflation}% a year and the President is asleep,” ${R} tells supporters.`]);
  if (b.fx > a.fx * 1.05) lines.push([2, `“The naira has collapsed to ₦${b.fx.toLocaleString()}. A disgrace,” says ${R}.`]);
  if (b.unemployment > a.unemployment + 0.4) lines.push([2, `“Our youth roam the streets while the government makes speeches,” says ${R}.`]);
  if (s.events.some((e) => e.status === "expired" && e.deadline === s.month - 1 && e.kind !== "opportunity")) lines.push([3, `“Where was the President when people needed help?” asks ${R}.`]);
  if (s.me.scandals > 0 && s.month % 6 === 0) lines.push([2.5, `“Every week a new scandal. Nigerians deserve clean leadership,” says ${R}.`]);
  if (b.inflation < a.inflation - 2) lines.push([1, `${R} admits prices are easing but says “ordinary people have not felt it yet”.`]);
  if (s.projects.some((p) => p.status === "done" && p.done === s.month - 1)) lines.push([1.2, `“Ribbon-cutting will not feed families,” ${R} says of the new project.`]);
  if (!lines.length) return;
  const [w, text] = lines.sort((x, y) => y[0] - x[0])[0];
  if (w < 2 && rng.chance(0.6)) return;
  if (s.month % 2 === 1 && w < 2.5) return;
  pushNews(s, { source: `rival:${s.month}`, headline: `${RIVAL_PARTY.abbr} leader attacks government`, body: text, tone: "bad" });
  s.flags.rivalQuote = text;
}

export function electionReport(s: FixState, r: ElectionResult) {
  const lost = STATES.filter((x) => r.states[x.id] < 50).length;
  pushReport(s, { title: r.won ? "Election won" : "Election lost", tone: r.won ? "good" : "bad", lines: [`National vote: ${r.national}% for you (${YOUR_PARTY.abbr}).`, `At least 25% in ${r.statesOver25} of 37 states (24 needed).`, `${s.rival.name} (${RIVAL_PARTY.abbr}) carried ${lost} states.`, r.runoff ? "No one met the spread rule, so a run-off decided it." : ""].filter(Boolean) });
}
export { nb };
