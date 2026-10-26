/**
 * National Assembly votes, the annual budget and presidential speeches.
 * The Assembly gate applies to the player's commands (performRef / UI); engine actions stay callable directly so
 * simulations and tests can bypass it.
 */
import { subRng } from "../../game/engine/rng";
import { POLICY_BY_ID } from "../data/catalogue";
import type { BudgetHead, Effects, FixState } from "./types";
import { addMod, calYear, clamp, clamp100, monthLabel, nb, pushNews, pushReport, removeMods } from "./util";
import { loyalistCount } from "./cabinet";
import { earn, governorAssembly, nudgeGroups, relate } from "./society";

// ---------------------------------------------------------------- Assembly
export const SEATS = 469; // 109 senators + 360 representatives (fictional party split)
export const BILL_DIFFICULTY: Record<string, number> = {
  "policy:taxDrive": 8, "policy:vatCut": -6, "policy:fxWindow": 5, "policy:minWage": 4, "policy:eduCut": 12, "policy:healthCut": 12, "policy:troopSurge": 2,
  "policy:civilService": 10, "policy:eProcure": 9, "policy:foodImport": 4, "policy:portReform": 6, "policy:cashTransfers": 2, "policy:tightMoney": 3,
  "fuel:remove": 15, "fuel:reduce": 8, "fuel:reform": 6,
};
export function billFor(ref: { type: string; id?: string; action?: string }): string | null {
  if (ref.type === "policy" && ref.id && BILL_DIFFICULTY[`policy:${ref.id}`] !== undefined) return `policy:${ref.id}`;
  if (ref.type === "fuel" && ref.action && BILL_DIFFICULTY[`fuel:${ref.action}`] !== undefined) return `fuel:${ref.action}`;
  return null;
}
export function billLabel(bill: string, year?: number): string {
  if (bill.startsWith("policy:")) return POLICY_BY_ID[bill.slice(7)]?.name ?? bill;
  if (bill === "fuel:remove") return "Fuel Subsidy (Removal) Bill";
  if (bill === "fuel:reduce") return "Fuel Subsidy (Reduction) Bill";
  if (bill === "fuel:reform") return "Targeted Transfers Bill";
  if (bill === "budget") return `Appropriation Bill${year ? ` ${year}` : ""}`;
  return bill;
}

export function initAssembly(s: FixState) { s.assembly = { support: 55, lobby: {}, passed: 0, defeats: 0 }; }
export function assemblyMonthly(s: FixState) {
  const target = clamp100(50 + 3 * loyalistCount(s) + governorAssembly(s) + 0.25 * (s.gov.approval - 50) - 0.1 * (s.rival.popularity - 45) - 2 * s.me.scandals);
  s.assembly.support = clamp100(s.assembly.support + 0.1 * (target - s.assembly.support));
}
function budgetDifficulty(s: FixState): number {
  const lv = pendingBudget(s) ?? s.budget.levels;
  const cuts = Object.values(lv).filter((v) => v < 0).reduce((a, v) => a - v, 0);
  const raises = Object.values(lv).filter((v) => v > 0).reduce((a, v) => a + v, 0);
  return 2 + 3 * cuts - 0.5 * raises;
}
export function billChance(s: FixState, bill: string): number {
  const diff = bill === "budget" ? budgetDifficulty(s) : BILL_DIFFICULTY[bill] ?? 0;
  const z = (s.assembly.support + (s.assembly.lobby[bill] ?? 0) - 50 - diff) / 7;
  return clamp(1 / (1 + Math.exp(-z)), 0.03, 0.97);
}
export type LobbyKind = "projects" | "favours" | "people";
export const LOBBY: Record<LobbyKind, { label: string; explain: string }> = {
  projects: { label: "Promise projects to swing districts", explain: "Costs money; governors appreciate it." },
  favours: { label: "Offer committee posts and favours", explain: "Free, but it is how corruption grows and it leaves a trail." },
  people: { label: "Go over their heads to the public", explain: "Works if you are popular; backfires if you are not." },
};
export function lobby(s: FixState, bill: string, kind: LobbyKind): { ok: boolean; message: string } {
  const key = `lobby:${bill}:${kind}:${s.month}`;
  if (s.flags[key]) return { ok: false, message: "You already tried that this month." };
  s.flags[key] = true;
  let gain = 0;
  if (kind === "projects") {
    const cost = 40 * (0.6 + 0.4 * s.eco.priceLevel / 100);
    if (cost > s.fin.treasury) return { ok: false, message: "Not enough cash for constituency projects." };
    s.fin.treasury -= cost; gain = 8;
    for (const g of s.governors) relate(s, g.zone, 1);
  } else if (kind === "favours") {
    gain = 7; s.gov.corruption = clamp100(s.gov.corruption + 0.8); s.me.evidence = clamp100(s.me.evidence + 2); earn(s, "event:investigation:obstruct");
  } else {
    gain = Math.round((s.gov.approval - 45) / 2);
  }
  s.assembly.lobby[bill] = (s.assembly.lobby[bill] ?? 0) + gain;
  return { ok: gain > 0, message: gain > 0 ? `${LOBBY[kind].label}: support for the bill rises (+${gain}).` : `Going to the public backfired: you are not popular enough (${gain}).` };
}
export interface VoteResult { ok: boolean; message: string; yes: number; no: number }
export function callVote(s: FixState, bill: string, execute: () => { ok: boolean; message: string }): VoteResult {
  const p = billChance(s, bill);
  const r = subRng(s.meta.seed, "vote", bill, s.month, s.assembly.passed + s.assembly.defeats);
  const pass = r.next() < p;
  const share = clamp(pass ? 0.505 + r.next() * (p * 0.25) : 0.495 - r.next() * ((1 - p) * 0.25), 0.2, 0.8);
  const yes = Math.round(SEATS * share), no = SEATS - yes;
  delete s.assembly.lobby[bill];
  const name = billLabel(bill, calYear(s.month));
  if (!pass) {
    s.assembly.defeats++; s.gov.trust = clamp100(s.gov.trust - 1);
    pushNews(s, { source: `vote:${bill}:${s.month}`, headline: `Assembly rejects the ${name}`, body: `${yes} for, ${no} against. A setback for the President.`, tone: "bad" });
    pushReport(s, { title: `Defeated: ${name}`, tone: "bad", lines: [`${yes} voted for, ${no} against.`, `Chance of passing was about ${Math.round(p * 100)}%. Raise your support by appointing loyalists, keeping governors happy and staying popular, or lobby before the vote.`] });
    return { ok: false, message: `The Assembly rejected it (${yes}–${no}).`, yes, no };
  }
  const res = execute();
  if (!res.ok) return { ok: false, message: res.message, yes, no };
  s.assembly.passed++;
  pushNews(s, { source: `vote:${bill}:${s.month}`, headline: `Assembly passes the ${name}`, body: `${yes} for, ${no} against.`, tone: "good" });
  return { ok: true, message: `Passed ${yes}–${no}. ${res.message}`, yes, no };
}

// ---------------------------------------------------------------- budget
export const BUDGET_HEADS: { id: BudgetHead; label: string; cost: number; per: Effects; blurb: string }[] = [
  { id: "education", label: "Education", cost: 25, per: { education: 3, skills: 1 }, blurb: "Teachers and classrooms. Cuts erode skills for years." },
  { id: "health", label: "Health", cost: 25, per: { health: 3, happiness: 0.3 }, blurb: "Clinics, drugs and nurses." },
  { id: "security", label: "Security", cost: 30, per: { forces: 3, security: 1.5 }, blurb: "Troops, police and equipment." },
  { id: "infrastructure", label: "Roads & maintenance", cost: 30, per: { maint: 3, roads: 1 }, blurb: "Keeps roads, bridges and the grid in repair." },
  { id: "social", label: "Social support", cost: 25, per: { welfare: 3, happiness: 0.5 }, blurb: "Help for the poorest households." },
];
export const LEVEL_LABEL: Record<number, string> = { [-2]: "Deep cut", [-1]: "Cut", 0: "Keep", 1: "Raise", 2: "Big raise" };
export function initBudget(s: FixState) { s.budget = { levels: { education: 0, health: 0, security: 0, infrastructure: 0, social: 0 }, passedYear: calYear(s.month) }; }
export function pendingBudget(s: FixState): Record<BudgetHead, number> | null {
  const p = s.flags.pendingBudget;
  return typeof p === "string" ? (JSON.parse(p) as Record<BudgetHead, number>) : null;
}
export function setPendingBudget(s: FixState, lv: Record<BudgetHead, number>) { s.flags.pendingBudget = JSON.stringify(lv); }
export function budgetEffects(lv: Record<BudgetHead, number>): { effects: Effects; monthly: number } {
  const e: Effects = {}; let monthly = 0;
  for (const h of BUDGET_HEADS) {
    const n = lv[h.id] ?? 0;
    monthly += n * h.cost;
    for (const [k, v] of Object.entries(h.per)) e[k as keyof Effects] = (e[k as keyof Effects] ?? 0) + (v as number) * n;
  }
  return { effects: e, monthly };
}
export function passBudget(s: FixState, lv: Record<BudgetHead, number>): { ok: boolean; message: string } {
  const old = s.budget.levels;
  for (const h of BUDGET_HEADS) {
    const d = (lv[h.id] ?? 0) - (old[h.id] ?? 0);
    if (d > 0) nudgeGroups(s, `budget:${h.id}+`, d);
    if (d < 0) nudgeGroups(s, `budget:${h.id}-`, -d);
  }
  s.budget.levels = { ...lv };
  s.budget.passedYear = calYear(s.month);
  delete s.flags.pendingBudget;
  removeMods(s, "budget");
  const { effects, monthly } = budgetEffects(lv);
  addMod(s, "budget", `Budget ${calYear(s.month)}`, effects, { duration: null, ramp: 4 });
  const m = s.modifiers.find((x) => x.source === "budget");
  if (m) m.monthly = monthly;
  const lines = BUDGET_HEADS.map((h) => `${h.label}: ${LEVEL_LABEL[lv[h.id] ?? 0]}`);
  lines.push(monthly >= 0 ? `Extra spending: about ${nb(monthly)} a month.` : `Savings: about ${nb(-monthly)} a month.`);
  pushReport(s, { title: `Budget ${calYear(s.month)} in force`, tone: "neutral", lines });
  return { ok: true, message: `The ${calYear(s.month)} budget is in force from ${monthLabel(s.month)}.` };
}
export const budgetDue = (s: FixState) => s.budget.passedYear < calYear(s.month);

// ---------------------------------------------------------------- speeches
export type Tone = "honest" | "hopeful" | "tough" | "blame";
export const SPEECH_TONES: { id: Tone; label: string; blurb: string }[] = [
  { id: "honest", label: "Honest: hard truths", blurb: "Admit what is wrong and what it will take. Works best when you are trusted or after bad news." },
  { id: "hopeful", label: "Hopeful: better days ahead", blurb: "Inspiring if things really are improving, empty spin if they are not." },
  { id: "tough", label: "Tough: law and order", blurb: "Strong in a security crisis; alarming to young people otherwise." },
  { id: "blame", label: "Blame the last government", blurb: "Works early in your term. Later it sounds like excuses." },
];
export const speechReady = (s: FixState) => s.month - s.speech.last >= 3;
export function setMoment(s: FixState, moment: string) { s.speech.moment = moment; }
export function giveSpeech(s: FixState, tone: Tone): { ok: boolean; message: string } {
  if (!speechReady(s)) return { ok: false, message: `Your next address can be in ${monthLabel(s.speech.last + 3)}; too many speeches lose their power.` };
  const h = s.history, a = h[Math.max(0, h.length - 4)], b = h[h.length - 1];
  const improving = b.inflation < a.inflation - 0.3 || b.happiness > a.happiness + 1;
  const crisis = s.sec.index > 58 || s.speech.moment === "security";
  const bad = !!s.speech.moment && s.speech.moment !== "good";
  let trust = 0, hap = 0, text = "";
  if (tone === "honest") { trust = s.gov.trust >= 35 || bad ? 2.5 : 1; hap = -0.5; text = "Your frankness was respected, even if the message was hard to hear."; }
  if (tone === "hopeful") { if (improving) { trust = 1; hap = 2; text = "People could see the improvements you described. The mood lifted."; } else { trust = -2; text = "With prices still rising, the upbeat speech was mocked as spin."; } }
  if (tone === "tough") { earn(s, "speech:tough"); if (crisis) { trust = 1.5; text = "In a time of insecurity, the firm tone reassured many."; s.groupMood.military += 5; s.groupMood.faith -= 2; } else { trust = -0.5; text = "The hard-line tone worried young people and rights groups."; s.groupMood.youth -= 3; } }
  if (tone === "blame") { if (s.month - s.termStart < 12) { trust = 1; s.rival.popularity = clamp100(s.rival.popularity - 1); text = "Voters still remember the last government's failures; the message landed."; } else { trust = -3; text = "Years into your term, blaming your predecessor sounded like excuses."; } }
  if (tone === "honest") earn(s, "speech:honest");
  if (tone === "hopeful") earn(s, "speech:hopeful");
  s.gov.trust = clamp100(s.gov.trust + trust);
  if (hap) addMod(s, `speech:${s.month}`, "Presidential address", { happiness: hap }, { duration: 2 });
  s.speech.last = s.month;
  s.speech.moment = null;
  pushNews(s, { source: `speech:${s.month}`, headline: `President addresses the nation (${SPEECH_TONES.find((t) => t.id === tone)!.label.split(":")[0].toLowerCase()} tone)`, body: text, tone: trust >= 0 ? "good" : "bad" });
  pushReport(s, { title: "National address", tone: trust >= 0 ? "good" : "bad", lines: [text, `Trust ${trust >= 0 ? "+" : ""}${trust}.`] });
  return { ok: trust >= 0, message: text };
}
export function initSpeech(s: FixState) { s.speech = { last: -9, moment: null }; }
