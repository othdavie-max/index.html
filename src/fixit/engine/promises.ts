/**
 * Campaign promises (chosen at the start) and achievements. Promises give each presidency a direction; keeping them
 * helps at the next election and breaking them hurts. Both are judged only from real outcomes.
 */
import type { FixState } from "./types";
import { clamp, debtServiceRatio, foodAffordIdx, pushNews } from "./util";

export interface PromiseDef {
  id: string;
  label: string;
  short: string;
  /** 0..1 progress from the start of the term towards the goal */
  progress: (s: FixState) => number;
  kept: (s: FixState) => boolean;
  status: (s: FixState) => string;
}
const prog = (start: number, now: number, goal: number) => (start === goal ? 1 : clamp((start - now) / (start - goal), 0, 1));
const progUp = (start: number, now: number, goal: number) => (start === goal ? 1 : clamp((now - start) / (goal - start), 0, 1));

export const PROMISES: PromiseDef[] = [
  { id: "inflation", label: "Bring inflation below 15%", short: "Inflation < 15%", progress: (s) => prog(s.baseline.inflation, s.eco.inflation, 15), kept: (s) => s.eco.inflation < 15, status: (s) => `Now ${s.eco.inflation.toFixed(1)}%` },
  { id: "naira", label: "Keep the naira stronger than ₦1,450 per dollar", short: "Naira under ₦1,450", progress: (s) => (s.eco.fx <= 1450 ? 1 : prog(s.baseline.fx + 300, s.eco.fx, 1450)), kept: (s) => s.eco.fx <= 1450, status: (s) => `Now ₦${Math.round(s.eco.fx).toLocaleString()}` },
  { id: "power", label: "Deliver 6,500 MW of electricity", short: "6,500 MW of power", progress: (s) => progUp(s.baseline.power, s.power.available, 6500), kept: (s) => s.power.available >= 6500, status: (s) => `Now ${Math.round(s.power.available).toLocaleString()} MW` },
  { id: "jobs", label: "Cut unemployment below 16%", short: "Unemployment < 16%", progress: (s) => prog(s.baseline.unemployment, s.jobs.unemployment, 16), kept: (s) => s.jobs.unemployment < 16, status: (s) => `Now ${s.jobs.unemployment.toFixed(1)}%` },
  { id: "food", label: "Make food more affordable than when you started", short: "Cheaper food", progress: (s) => progUp(80, foodAffordIdx(s), 105), kept: (s) => foodAffordIdx(s) >= 105, status: (s) => `Affordability ${foodAffordIdx(s)} (goal 105)` },
  { id: "security", label: "Bring the security risk below 45", short: "Security risk < 45", progress: (s) => prog(s.baseline.insecurity, s.sec.index, 45), kept: (s) => s.sec.index < 45, status: (s) => `Now ${Math.round(s.sec.index)}` },
  { id: "build", label: "Complete 5 major projects", short: "5 projects finished", progress: (s) => clamp(s.projects.filter((p) => p.status === "done").length / 5, 0, 1), kept: (s) => s.projects.filter((p) => p.status === "done").length >= 5, status: (s) => `${s.projects.filter((p) => p.status === "done").length} finished` },
  { id: "clean", label: "Run a clean government", short: "Clean hands", progress: (s) => (s.me.acts.includes("kickback") || s.me.evidence >= 15 ? 0 : 1), kept: (s) => !s.me.acts.includes("kickback") && s.me.evidence < 15, status: (s) => (s.me.acts.includes("kickback") ? "Broken: you took a payment" : "On track") },
  { id: "subsidy", label: "End the fuel subsidy without losing control of the streets", short: "End subsidy calmly", progress: (s) => clamp(1 - s.fuel.coverage / 0.5, 0, 1) * (riots(s) ? 0.5 : 1), kept: (s) => s.fuel.coverage < 0.05 && !riots(s), status: (s) => (s.fuel.coverage < 0.05 ? (riots(s) ? "Ended, but with riots" : "Ended") : `Still covering ${Math.round(s.fuel.coverage * 50)}% of the price`) },
  { id: "debt", label: "Keep debt payments under 35% of revenue", short: "Debt payments < 35%", progress: (s) => (debtServiceRatio(s) <= 0.35 ? 1 : prog(0.6, debtServiceRatio(s), 0.35)), kept: (s) => debtServiceRatio(s) <= 0.35, status: (s) => `Now ${Math.round(debtServiceRatio(s) * 100)}%` },
];
function riots(s: FixState) { return s.events.some((e) => e.tpl === "fuelProtest" && e.status === "expired"); }
export const PROMISE_BY_ID: Record<string, PromiseDef> = Object.fromEntries(PROMISES.map((p) => [p.id, p]));
export const DEFAULT_PROMISES = ["inflation", "power", "food"];

export function setPromises(s: FixState, ids: string[]) {
  const ok = [...new Set(ids)].filter((x) => PROMISE_BY_ID[x]).slice(0, 3);
  s.promises = ok.length ? ok : DEFAULT_PROMISES.slice();
}
export function promiseScore(s: FixState): { kept: number; total: number } {
  const total = s.promises.length;
  return { kept: s.promises.filter((id) => PROMISE_BY_ID[id]?.kept(s)).length, total };
}
/** each promise kept adds to re-election odds, each broken one subtracts */
export function promiseElectionBonus(s: FixState): number {
  const { kept, total } = promiseScore(s);
  return 0.05 * kept - 0.04 * (total - kept);
}

// ---------------------------------------------------------------- achievements
interface AchDef { id: string; label: string; test: (s: FixState) => boolean }
const ACH: AchDef[] = [
  { id: "firstProject", label: "Ribbon cutter: first project completed", test: (s) => s.projects.some((p) => p.status === "done") },
  { id: "infl20", label: "Price tamer: inflation below 20%", test: (s) => s.eco.inflation < 20 },
  { id: "infl10", label: "Steady prices: inflation below 10%", test: (s) => s.eco.inflation < 10 },
  { id: "naira1400", label: "Strong naira: under ₦1,400 per dollar", test: (s) => s.eco.fx < 1400 },
  { id: "power6k", label: "Lights on: 6,000 MW delivered", test: (s) => s.power.available >= 6000 },
  { id: "jobs15", label: "Job creator: unemployment below 15%", test: (s) => s.jobs.unemployment < 15 },
  { id: "peace", label: "Peacemaker: 5 situations resolved successfully", test: (s) => s.reports.filter((r) => r.tone === "good" && r.lines[1]?.startsWith("It worked")).length >= 5 },
  { id: "cleanHands", label: "Clean hands: refused a bribe", test: (s) => s.events.some((e) => e.tpl === "kickback" && (e.chosen === "refuse" || e.chosen === "report")) },
  { id: "subsidyEnd", label: "Brave reformer: fuel subsidy ended", test: (s) => s.fuel.coverage < 0.05 },
  { id: "happy60", label: "Loved: public happiness above 60", test: (s) => s.gov.happiness >= 60 },
  { id: "year1", label: "Survivor: one year in office", test: (s) => s.month >= 12 },
  { id: "builder5", label: "Builder: five projects completed", test: (s) => s.projects.filter((p) => p.status === "done").length >= 5 },
];
export function checkAchievements(s: FixState): string[] {
  const got: string[] = [];
  for (const a of ACH) {
    if (s.achievements.some((x) => x.id === a.id)) continue;
    if (a.test(s)) { s.achievements.push({ id: a.id, label: a.label, month: s.month }); got.push(a.label); pushNews(s, { source: `ach:${a.id}`, headline: `Milestone: ${a.label}`, body: "", tone: "good" }); }
  }
  return got;
}

/** a mid-term report card on promises */
export function midtermCheck(s: FixState) {
  if (s.month - s.termStart !== 24 || !s.promises.length) return;
  const { kept, total } = promiseScore(s);
  pushNews(s, { source: `midterm:${s.term}`, headline: `Halfway report card: ${kept} of ${total} promises on target`, body: s.promises.map((id) => `${PROMISE_BY_ID[id].short}: ${PROMISE_BY_ID[id].status(s)}`).join(" · "), tone: kept >= 2 ? "good" : kept === 1 ? "neutral" : "bad" });
}
