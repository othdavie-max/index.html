/** Term end: re-election, early removal, legacy report and a title earned from real outcomes (not from labels the player picked). */
import { TERM_MONTHS, MAX_TERMS, type FixState, type Snap, type TermResult } from "./types";
import { round, snap } from "./util";
import { PROMISE_BY_ID, promiseScore } from "./promises";
import { electionReport, runElection, winChance } from "./rival";

export interface LegacyRow { label: string; start: string; end: string; delta: string; better: boolean | null }
export interface Legacy {
  title: string;
  titleWhy: string;
  rows: LegacyRow[];
  achievements: string[];
  failures: string[];
  crises: string[];
  causes: string[];
  result: TermResult["result"];
  months: number;
}

export function reelectionChance(s: FixState): number {
  return winChance(s);
}

/** Called after every processed month. */
export function evaluateTermEnd(s: FixState) {
  if (s.ended || s.done) return;
  // early loss: sustained collapse of support ends the presidency
  const low = (s.flags.lowApproval as number | undefined) ?? 0;
  s.flags.lowApproval = s.gov.approval < 15 ? low + 1 : 0;
  if ((s.flags.lowApproval as number) >= 5) {
    finishTerm(s, "removed", "Your support collapsed. After months of crisis, parliament voted to remove you from office.");
    return;
  }
  if (s.month - s.termStart >= TERM_MONTHS) {
    if (s.term >= MAX_TERMS) { finishTerm(s, "completed", "You completed your final term. The constitution allows no more."); return; }
    const r = runElection(s);
    electionReport(s, r);
    if (r.won) finishTerm(s, "won", `You won re-election with ${r.national}% of the vote${r.runoff ? " after a run-off" : ""} (about ${Math.round(r.chance * 100)}% chance going in). A second and final term begins.`);
    else finishTerm(s, "lost", `Voters turned you out: ${r.national}% of the vote, and at least 25% in ${r.statesOver25} of 37 states${r.national > 50 ? " (the run-off went to your rival)" : ""}. You had about a ${Math.round(r.chance * 100)}% chance.`);
  }
}

function finishTerm(s: FixState, result: TermResult["result"], text: string) {
  const end = snap(s);
  const lg = buildLegacy(s, s.baseline, end, result);
  s.terms.push({ term: s.term, result, start: s.baseline, end, title: lg.title, months: s.month - s.termStart });
  s.ended = { kind: result === "removed" ? "removed" : "term", text };
  s.done = result !== "won";
}

/** After a won election the player confirms and the second term begins from the current state. */
export function continueNextTerm(s: FixState): boolean {
  if (!s.ended || s.done || s.ended.kind !== "term") return false;
  s.term += 1;
  s.termStart = s.month;
  s.baseline = snap(s);
  s.ended = null;
  s.flags.lowApproval = 0;
  return true;
}

const pct = (a: number, b: number) => (a === 0 ? 0 : ((b - a) / a) * 100);
const sign = (n: number, d = 1) => `${n >= 0 ? "+" : "−"}${Math.abs(round(n, d))}`;

export function buildLegacy(s: FixState, a: Snap, b: Snap, result: TermResult["result"]): Legacy {
  const done = s.projects.filter((p) => p.status === "done" && p.done !== undefined && p.done >= s.termStart);
  const rows: LegacyRow[] = [
    { label: "Naira per US dollar", start: `₦${a.fx.toLocaleString()}`, end: `₦${b.fx.toLocaleString()}`, delta: `${sign(pct(a.fx, b.fx))}%`, better: b.fx < a.fx },
    { label: "Inflation", start: `${a.inflation}%`, end: `${b.inflation}%`, delta: `${sign(b.inflation - a.inflation)} pts`, better: b.inflation < a.inflation },
    { label: "Unemployment", start: `${a.unemployment}%`, end: `${b.unemployment}%`, delta: `${sign(b.unemployment - a.unemployment)} pts`, better: b.unemployment < a.unemployment },
    { label: "Food affordability (start = 100)", start: `${a.foodAfford}`, end: `${b.foodAfford}`, delta: sign(b.foodAfford - a.foodAfford), better: b.foodAfford > a.foodAfford },
    { label: "Petrol price", start: `₦${a.fuel}`, end: `₦${b.fuel}`, delta: `${sign(pct(a.fuel, b.fuel))}%`, better: b.fuel < a.fuel },
    { label: "Electricity delivered (MW)", start: a.power.toLocaleString(), end: b.power.toLocaleString(), delta: sign(b.power - a.power, 0), better: b.power > a.power },
    { label: "Government debt (% of economy)", start: `${a.debtGdp}%`, end: `${b.debtGdp}%`, delta: `${sign(b.debtGdp - a.debtGdp)} pts`, better: b.debtGdp < a.debtGdp },
    { label: "Debt payments (% of revenue)", start: `${a.dsr}%`, end: `${b.dsr}%`, delta: `${sign(b.dsr - a.dsr)} pts`, better: b.dsr < a.dsr },
    { label: "Dollar reserves ($bn)", start: `${a.reserves}`, end: `${b.reserves}`, delta: sign(b.reserves - a.reserves), better: b.reserves > a.reserves },
    { label: "Infrastructure score", start: `${a.infra}`, end: `${b.infra}`, delta: sign(b.infra - a.infra), better: b.infra > a.infra },
    { label: "Security index (lower is better)", start: `${a.insecurity}`, end: `${b.insecurity}`, delta: sign(b.insecurity - a.insecurity), better: b.insecurity < a.insecurity },
    { label: "Public happiness", start: `${a.happiness}`, end: `${b.happiness}`, delta: sign(b.happiness - a.happiness), better: b.happiness > a.happiness },
    { label: "Real incomes (start = 100)", start: `${a.realIncome}`, end: `${b.realIncome}`, delta: sign(b.realIncome - a.realIncome), better: b.realIncome > a.realIncome },
    { label: "Projects completed", start: "0", end: `${done.length}`, delta: `+${done.length}`, better: done.length > 0 ? true : null },
    ...(s.promises.length ? [{ label: "Campaign promises kept", start: `${s.promises.length} made`, end: `${promiseScore(s).kept} kept`, delta: `${promiseScore(s).kept}/${s.promises.length}`, better: promiseScore(s).kept * 2 >= s.promises.length } as LegacyRow] : []),
    { label: "Your personal wealth (₦m)", start: `${Math.round(a.personalWealth)}`, end: `${Math.round(b.personalWealth)}`, delta: sign(b.personalWealth - a.personalWealth, 0), better: null },
  ];

  const ach: string[] = [], fail: string[] = [], crises: string[] = [], causes: string[] = [];
  if (b.fx <= a.fx * 0.97) ach.push(`The naira strengthened from ₦${a.fx} to ₦${b.fx}.`); else if (b.fx >= a.fx * 1.4) fail.push(`The naira weakened ${Math.round(pct(a.fx, b.fx))}% to ₦${b.fx}.`);
  if (b.inflation <= a.inflation - 6) ach.push(`Inflation fell from ${a.inflation}% to ${b.inflation}%.`); else if (b.inflation >= a.inflation + 5) fail.push(`Inflation rose to ${b.inflation}%.`);
  if (b.unemployment <= a.unemployment - 2) ach.push(`Unemployment fell ${round(a.unemployment - b.unemployment, 1)} points.`); else if (b.unemployment >= a.unemployment + 2) fail.push("Unemployment rose.");
  if (b.power >= a.power + 800) ach.push(`Electricity delivered rose by ${(b.power - a.power).toLocaleString()} MW.`); else if (b.power <= a.power - 300) fail.push("Electricity supply got worse.");
  if (done.length >= 4) ach.push(`${done.length} projects were completed.`); else if (s.projects.filter((p) => p.status === "stalled").length > 1) fail.push("Several projects stalled and were left unfinished.");
  if (b.debtGdp >= a.debtGdp + 10) fail.push(`Debt rose to ${b.debtGdp}% of the economy.`); else if (b.debtGdp <= a.debtGdp - 4) ach.push("Debt shrank as a share of the economy.");
  if (b.foodAfford >= a.foodAfford + 5) ach.push("Food became more affordable."); else if (b.foodAfford <= a.foodAfford - 12) fail.push("Food became much less affordable for ordinary families.");
  if (b.insecurity <= a.insecurity - 5) ach.push("Insecurity eased."); else if (b.insecurity >= a.insecurity + 5) fail.push("Insecurity got worse.");
  for (const e of s.events) if (e.born >= s.termStart && (e.status === "expired" || (e.status === "resolved" && e.outcome))) {
    if (e.kind === "opportunity" || e.kind === "scandal") continue;
    crises.push(`${e.title} (${e.status === "expired" ? "unanswered" : "answered"})`);
  }
  for (const id of s.promises) { const d = PROMISE_BY_ID[id]; if (!d) continue; if (d.kept(s)) ach.unshift(`Promise kept: ${d.label}.`); else fail.unshift(`Promise broken: ${d.label} (${d.status(s)}).`); }
  for (const e of s.echoes) if (e.status === "done" && e.causeMonth >= s.termStart && e.outcome && e.outTone === "bad") causes.push(`Earlier decision came back: ${e.outcome}`);
  if (s.me.scandals > 0) crises.push(`${s.me.scandals} corruption scandal${s.me.scandals > 1 ? "s" : ""} surfaced`);
  const dsrWorse = b.dsr > a.dsr + 5;
  if (dsrWorse) causes.push("Debt payments crowded out spending on services and projects.");
  if (b.fx > a.fx * 1.2) causes.push("A weak naira raised the price of imported fuel, food and machinery.");
  if (b.insecurity > a.insecurity + 3) causes.push("Insecurity disrupted farming and investment.");
  if (b.power < a.power + 300) causes.push("Unreliable electricity held back factories and small businesses.");
  if (b.foodInflation > a.foodInflation + 4) causes.push("Food supply did not keep up: storage, roads and insecurity limited what reached markets.");
  if (b.inflation < a.inflation - 4) causes.push("A steadier currency and better supply brought prices down.");
  if (done.length >= 3) causes.push("Projects that finished started adding to growth and cutting costs.");
  if (s.projects.some((p) => p.leaked > p.cost * 0.12)) causes.push("Corruption and weak procurement drained money from projects.");

  const { title, why } = pickTitle(s, a, b, done.length);
  return { title, titleWhy: why, rows, achievements: ach.slice(0, 8), failures: fail.slice(0, 8), crises: crises.slice(0, 8), causes: causes.slice(0, 7), result, months: s.month - s.termStart };
}

function pickTitle(s: FixState, a: Snap, b: Snap, done: number): { title: string; why: string } {
  const wealthGain = b.personalWealth - a.personalWealth;
  const kicks = s.me.acts.filter((x) => x === "kickback").length;
  const tried = Object.values(s.policies).filter((p) => p.active).length + s.projects.length;
  const score: Record<string, number> = {
    "Self-Enriching President": (wealthGain > 400 ? 2 : 0) + (kicks >= 2 ? 2 : 0) + (wealthGain > 1200 ? 2 : 0) + (b.happiness < 55 ? 1 : 0),
    "Nation Builder": (done >= 6 ? 3 : done >= 4 ? 2 : 0) + (b.infra - a.infra >= 6 ? 2 : 0) + (b.power - a.power >= 1000 ? 2 : 0),
    "Economic Reformer": (a.inflation - b.inflation >= 8 ? 3 : 0) + (b.fx <= a.fx * 1.15 ? 2 : 0) + (b.dsr <= a.dsr ? 1 : 0) + (b.reserves > a.reserves ? 1 : 0),
    "People's President": (b.happiness >= 62 ? 3 : 0) + (b.realIncome >= a.realIncome ? 2 : 0) + (b.unemployment < a.unemployment ? 1 : 0),
    "Borrower": (b.debtGdp - a.debtGdp >= 12 ? 3 : 0) + (b.dsr - a.dsr >= 10 ? 2 : 0),
    "Failed Reformer": (tried >= 6 && b.approval < 42 ? 3 : 0) + (b.inflation > a.inflation ? 1 : 0) + (b.fx > a.fx * 1.3 ? 1 : 0),
  };
  if (wealthGain > 300 && kicks >= 1) score["Self-Enriching President"] += 2;
  // each title needs its defining result, not just incidental points
  if (a.inflation - b.inflation < 5) score["Economic Reformer"] = 0;
  if (done < 3) score["Nation Builder"] = 0;
  if (b.happiness < 56) score["People's President"] = 0;
  if (wealthGain < 300 && kicks < 2) score["Self-Enriching President"] = 0;
  const ranked = Object.entries(score).sort((x, y) => y[1] - x[1]);
  if (ranked[0][1] < 3) return { title: tried < 4 ? "Caretaker President" : "Failed Reformer", why: tried < 4 ? "You made few changes, and little changed." : "You tried many things, but results fell short." };
  const t = ranked[0][0];
  const why: Record<string, string> = {
    "Self-Enriching President": `Your personal wealth rose by ₦${Math.round(wealthGain).toLocaleString()}m, with ${kicks} improper payment${kicks === 1 ? "" : "s"} on the record.`,
    "Nation Builder": `${done} projects were completed and the country's infrastructure and power improved.`,
    "Economic Reformer": `Inflation fell ${round(a.inflation - b.inflation)} points while the naira held.`,
    "People's President": "Ordinary people ended the term feeling better off.",
    "Borrower": `Debt grew by ${round(b.debtGdp - a.debtGdp)} points of national income.`,
    "Failed Reformer": "You acted often, but approval and prices did not improve.",
  };
  return { title: t, why: why[t] };
}
