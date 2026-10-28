/**
 * "What should I do next?" — derived entirely from live state. Scores the country's problems, picks the worst, and
 * proposes 3–4 real actions (each is an actual command, with cost, trade-off and honest uncertainty).
 */
import { MEASURE_BY_ID, POLICY_BY_ID, PROJECT_BY_ID } from "../data/catalogue";
import type { FixState } from "./types";
import { openEvents } from "./events";
import { debtServiceRatio, foodAffordIdx, lever, nb, powerRatio, realWage, round } from "./util";
import { priceMult, previewFuel, recentUses } from "./actions";
import { refChips, type Chip } from "./forecast";
import { futureHint } from "./echoes";

export type ActionRef =
  | { type: "measure"; id: string }
  | { type: "policy"; id: string }
  | { type: "fuel"; action: "increase" | "reduce" | "remove" | "reform" }
  | { type: "project"; defId: string }
  | { type: "respond"; eventId: string; optionId: string }
  | { type: "bond" }
  | { type: "wait" };

export interface ChallengeAction {
  ref: ActionRef;
  label: string;
  explain: string;
  costLabel: string;
  tradeoff: string;
  uncertainty: "low" | "medium" | "high";
  /** reason it cannot be chosen right now */
  blocked?: string;
  /** effects now, as plain chips (filled in by computeChallenge) */
  chips?: Chip[];
  /** what this decision plants for later */
  later?: string | null;
}
export interface Challenge {
  id: string;
  title: string;
  subtitle: string;
  why: string[];
  severity: number;
  tone: "red" | "amber" | "blue";
  eventId?: string;
  actions: ChallengeAction[];
  others: { id: string; title: string; severity: number }[];
  /** two advisers, often disagreeing — flavour that also hints at trade-offs */
  advice?: { who: string; says: string }[];
}
const ADVICE: Record<string, { who: string; says: string }[]> = {
  food: [{ who: "Agriculture Minister", says: "Relief helps this month, but storage and farm roads stop this happening every year." }, { who: "Finance Minister", says: "Vouchers every month will sink us. Waive duties and let imports cool prices." }],
  fx: [{ who: "Central Bank Governor", says: "Selling dollars buys weeks, not months. Fix why dollars are leaving." }, { who: "Trade Minister", says: "Unify the exchange rate. Investors will not come while there are two prices." }],
  fuel: [{ who: "Finance Minister", says: "The subsidy eats a fifth of our revenue. Every month we wait costs more." }, { who: "Chief of Staff", says: "Cut it without protecting the poor and the streets will explode." }],
  inflation: [{ who: "Central Bank Governor", says: "Higher rates will tame prices, but give it months." }, { who: "Labour Minister", says: "Workers cannot wait months. Their pay is worth less every week." }],
  power: [{ who: "Power Minister", says: "Patching lines is not enough. Pay for gas and maintenance, or blackouts come back." }, { who: "Finance Minister", says: "Solar mini-grids are quicker and cheaper than another big plant." }],
  jobs: [{ who: "Youth Minister", says: "Young people need work now, not in two years." }, { who: "Industry Minister", says: "Real jobs come from factories, and factories need power and roads." }],
  security: [{ who: "National Security Adviser", says: "We need more troops in the hotspots immediately." }, { who: "Attorney General", says: "Abuses by troops create tomorrow's recruits. Keep it lawful." }],
  fiscal: [{ who: "Finance Minister", says: "Collect the taxes we are owed before borrowing more." }, { who: "Debt Office", says: "Dollar bonds are cheaper today but dangerous if the naira falls." }],
  trust: [{ who: "Chief of Staff", says: "People think we are all thieves. Publish every contract." }, { who: "Party Chairman", says: "Audits will embarrass our own people. Be careful." }],
  steady: [{ who: "Chief of Staff", says: "Calm months are rare. Start the slow projects now; they pay off before the election." }],
  event: [{ who: "Chief of Staff", says: "Answer quickly. Unanswered, this spreads." }, { who: "Attorney General", says: "Whatever we do, it must be lawful. The world is watching." }],
};

function mAct(s: FixState, id: string): ChallengeAction {
  const d = MEASURE_BY_ID[id];
  const cost = d.cost * priceMult(s);
  const cd = s.flags[`cd:measure:${id}`];
  const blocked = typeof cd === "number" && s.month < cd ? "Not available again yet" : cost > s.fin.treasury ? "Not enough cash" : id === "fxSale" && s.eco.reserves < 8 ? "Reserves too low" : undefined;
  return {
    ref: { type: "measure", id }, label: d.name, explain: recentUses(s, id) ? `${d.explain} Weaker now: used ${recentUses(s, id)}× this year.` : d.explain,
    costLabel: `${cost > 0 ? nb(cost) : "No cash"}${d.monthlyCost ? ` + ${nb(d.monthlyCost * priceMult(s))}/month for ${d.duration} months` : ""}`, tradeoff: d.tradeoff, uncertainty: d.unc, blocked,
  };
}
function pAct(s: FixState, id: string): ChallengeAction | null {
  const d = POLICY_BY_ID[id];
  if (s.policies[id]?.active) return null;
  const cost = d.setup * priceMult(s);
  return {
    ref: { type: "policy", id }, label: d.name, explain: `${d.what} ${d.short}`,
    costLabel: `${nb(cost)} setup${d.monthly ? ` + ${nb(Math.abs(d.monthly) * priceMult(s))}/month${d.monthly < 0 ? " saved" : ""}` : ""}`, tradeoff: d.risks, uncertainty: d.delay >= 8 ? "medium" : "low",
    blocked: cost > s.fin.treasury ? "Not enough cash" : undefined,
  };
}
function projAct(s: FixState, defId: string, tradeoff: string): ChallengeAction {
  const d = PROJECT_BY_ID[defId];
  const cost = d.cost * (s.eco.priceLevel / 100);
  return { ref: { type: "project", defId }, label: `Start: ${d.name}`, explain: `${d.what} Takes about ${d.months} months.`, costLabel: `About ${nb(cost)} over ${d.months} months`, tradeoff, uncertainty: d.risk > 0.5 ? "high" : "medium" };
}
function wait(why: string): ChallengeAction {
  return { ref: { type: "wait" }, label: "Hold steady", explain: why, costLabel: "No cost", tradeoff: "The problem may get worse before it gets better.", uncertainty: "medium" };
}
const compact = (a: (ChallengeAction | null)[]) => a.filter((x): x is ChallengeAction => !!x);

interface Prob { id: string; title: string; subtitle: (s: FixState) => string; sev: (s: FixState) => number; why: (s: FixState) => string[]; actions: (s: FixState) => ChallengeAction[] }

const PROBLEMS: Prob[] = [
  {
    id: "food", title: "FOOD PRICES ARE RISING",
    subtitle: (s) => `Food prices are up ${round(s.eco.foodInflation)}% over a year. Families can afford ${foodAffordIdx(s)}% as much food as when you started.`,
    sev: (s) => Math.max(0, (s.eco.foodInflation - 22) / 18) + Math.max(0, (100 - foodAffordIdx(s)) / 50),
    why: (s) => s.why.food ?? [],
    actions: (s) => compact([mAct(s, "grainReserve"), mAct(s, "foodVouchers"), pAct(s, "foodImport") ?? pAct(s, "farmInputs"), projAct(s, "storage", "Slow: it takes over a year to build and cannot help this season.")]).slice(0, 4),
  },
  {
    id: "fx", title: "THE NAIRA IS UNDER PRESSURE",
    subtitle: (s) => `The naira is at ₦${Math.round(s.eco.fx).toLocaleString()} per dollar and reserves are $${round(s.eco.reserves, 1)}bn. A falling naira makes fuel, food and machinery dearer.`,
    sev: (s) => Math.max(0, ((s.flags.fxDrift as number) ?? 0) - 0.5) / 1.2 + Math.max(0, (s.eco.fx / s.baseline.fx - 1.08) * 3) + (s.eco.reserves < 15 ? 0.6 : 0),
    why: (s) => s.why.fx ?? [],
    actions: (s) => compact([mAct(s, "fxSale"), pAct(s, "fxWindow"), pAct(s, "tightMoney"), mAct(s, "investorRoadshow")]).slice(0, 4),
  },
  {
    id: "fuel", title: "THE FUEL SUBSIDY IS DRAINING THE BUDGET",
    subtitle: (s) => `The subsidy costs ${nb(s.fuel.costMonthly)} a month, ${Math.round((s.fuel.costMonthly / Math.max(1, s.fin.revenue)) * 100)}% of all revenue. Cutting it saves money but raises prices.`,
    sev: (s) => (s.fuel.coverage < 0.05 ? 0 : (s.fuel.costMonthly / Math.max(1, s.fin.revenue) - 0.12) * 4),
    why: (s) => s.why.fuel ?? [],
    actions: (s) => {
      const out: ChallengeAction[] = [];
      for (const a of ["reduce", "reform", "remove"] as const) {
        const pv = previewFuel(s, a);
        out.push({
          ref: { type: "fuel", action: a }, label: a === "reduce" ? "Halve the subsidy" : a === "reform" ? "Reform: targeted cash transfers" : "Remove the subsidy",
          explain: `Pumps move toward ₦${Math.round(pv.pumpTarget)} (${pv.changePct >= 0 ? "+" : ""}${round(pv.changePct)}%). Saves about ${nb(pv.saving)} a month.`,
          costLabel: pv.setup ? `${nb(pv.setup)} setup` : "No cash", tradeoff: `Protest risk: ${pv.risk}. ${a === "reform" ? "Works only if payments reach people." : "Transport and food prices follow fuel."}`, uncertainty: pv.risk === "high" ? "high" : "medium",
          blocked: pv.setup > s.fin.treasury ? "Not enough cash" : undefined,
        });
      }
      out.push(projAct(s, "refinery", "Slow and costly; delays and overruns are common."));
      return out;
    },
  },
  {
    id: "inflation", title: "PRICES ARE RISING FASTER THAN WAGES",
    subtitle: (s) => `Inflation is ${round(s.eco.inflation, 1)}% and real incomes are ${round(realWage(s))}% of what they were. Households are feeling it.`,
    sev: (s) => Math.max(0, (s.eco.inflation - 18) / 20) + Math.max(0, (100 - realWage(s)) / 40),
    why: (s) => s.why.inflation ?? [],
    actions: (s) => compact([pAct(s, "tightMoney"), pAct(s, "cashTransfers"), mAct(s, "wageDeal"), pAct(s, "fxWindow")]).slice(0, 4),
  },
  {
    id: "power", title: "BLACKOUTS ARE HURTING BUSINESS",
    subtitle: (s) => `Only ${Math.round(s.power.available).toLocaleString()} MW reaches users against demand of ${Math.round(s.power.demand).toLocaleString()} MW (${Math.round(powerRatio(s) * 100)}%).`,
    sev: (s) => Math.max(0, (0.3 - powerRatio(s)) / 0.12),
    why: (s) => [`Grid strength ${Math.round(s.power.grid + lever(s, "grid"))}/100, gas supply ${Math.round(s.power.gas + lever(s, "gas"))}/100, maintenance ${Math.round(s.infra.maint + lever(s, "maint"))}/100`, "Generating capacity is not the only problem: much of it cannot reach users."],
    actions: (s) => compact([mAct(s, "overtimeGrid"), pAct(s, "gridMaint"), pAct(s, "powerPay") ?? pAct(s, "gasFlares"), projAct(s, "solar", "Small plants; they will not fix the national grid.")]).slice(0, 4),
  },
  {
    id: "jobs", title: "TOO MANY YOUNG PEOPLE HAVE NO WORK",
    subtitle: (s) => `Unemployment is ${round(s.jobs.unemployment, 1)}% and youth unemployment ${round(s.jobs.youth, 1)}%.`,
    sev: (s) => Math.max(0, (s.jobs.youth - 36) / 12),
    why: (s) => [`Growth is ${round(s.eco.growth, 1)}%`, `Small business health ${Math.round(s.jobs.sme + lever(s, "sme"))}/100, factories ${Math.round(s.jobs.manuf + lever(s, "manuf"))}/100`, "Jobs come from growth, power, roads and skills, not from announcements."],
    actions: (s) => compact([mAct(s, "jobsBlitz"), pAct(s, "skillsCorps"), pAct(s, "smeLoans"), projAct(s, "industrial", "Factories need power and roads to hire.")]).slice(0, 4),
  },
  {
    id: "security", title: "INSECURITY IS SPREADING",
    subtitle: (s) => `Security index ${round(s.sec.index)} (higher is worse) with ${Math.round(s.sec.displaced).toLocaleString()}k people displaced. Farmers are abandoning land.`,
    sev: (s) => Math.max(0, (s.sec.index - 55) / 12),
    why: (s) => [`Banditry ${Math.round(s.sec.banditry)}, terrorism ${Math.round(s.sec.terror)}, communal conflict ${Math.round(s.sec.communal)}`, `Forces capacity ${Math.round(s.sec.forces + lever(s, "forces"))}/100; human-rights record ${Math.round(s.sec.humanRights)}/100`],
    actions: (s) => compact([mAct(s, "securityPush"), pAct(s, "communityPolicing"), pAct(s, "troopSurge"), projAct(s, "securityInfra", "Takes over a year.")]).slice(0, 4),
  },
  {
    id: "fiscal", title: "DEBT PAYMENTS ARE CROWDING OUT SPENDING",
    subtitle: (s) => `${Math.round(debtServiceRatio(s) * 100)}% of revenue goes on interest. The monthly deficit is ${nb(s.fin.deficit)}.`,
    sev: (s) => Math.max(0, (debtServiceRatio(s) - 0.42) / 0.2) + (s.fin.waysAndMeans > 0 ? 0.8 : 0) + (s.fin.treasury < 200 ? 0.3 : 0),
    why: (s) => s.why.fiscal ?? [],
    actions: (s) => compact([pAct(s, "taxDrive"), s.fuel.coverage > 0.05 ? ({ ref: { type: "fuel", action: "reduce" }, label: "Halve the fuel subsidy", explain: `Saves about ${nb(previewFuel(s, "reduce").saving)} a month.`, costLabel: "No cash", tradeoff: `Raises fuel and food prices; protest risk ${previewFuel(s, "reduce").risk}.`, uncertainty: "medium" } as ChallengeAction) : null, { ref: { type: "bond" }, label: "Issue $1bn of dollar bonds", explain: "Raises cash and reserves now.", costLabel: "$1bn, repaid in dollars", tradeoff: "A weaker naira makes repayment costlier.", uncertainty: "medium", blocked: s.fin.creditRating < 25 ? "Investors will not lend" : undefined } as ChallengeAction, pAct(s, "eProcure")]).slice(0, 4),
  },
  {
    id: "trust", title: "PEOPLE DO NOT TRUST THE GOVERNMENT",
    subtitle: (s) => `Trust is ${Math.round(s.gov.trust)} out of 100 and approval ${Math.round(s.gov.approval)}%.`,
    sev: (s) => Math.max(0, (38 - s.gov.trust) / 14) + Math.max(0, (40 - s.gov.approval) / 30),
    why: (s) => s.why.happiness ?? [],
    actions: (s) => compact([pAct(s, "eProcure"), mAct(s, "auditSweep"), mAct(s, "dialogue"), pAct(s, "civilService")]).slice(0, 4),
  },
];

export function problemList(s: FixState): { id: string; title: string; severity: number }[] {
  return PROBLEMS.map((p) => ({ id: p.id, title: p.title, severity: Math.max(0, round(p.sev(s), 2)) })).sort((a, b) => b.severity - a.severity);
}

export function computeChallenge(s: FixState): Challenge {
  const ch = rawChallenge(s);
  ch.actions = ch.actions.map((a) => decorate(s, a));
  ch.advice = ADVICE[ch.id.startsWith("event:") ? "event" : ch.id];
  return ch;
}
export function decorate(s: FixState, a: ChallengeAction): ChallengeAction {
  const r = a.ref;
  let c: Chip[] = refChips(r as { type: string; id?: string; defId?: string });
  let tpl: string | undefined;
  if (r.type === "respond") tpl = s.events.find((e) => e.id === r.eventId)?.tpl;
  if (r.type === "fuel") c = r.action === "increase" ? [{ label: "Petrol price", up: false, good: true }, { label: "Budget", up: false, good: false }] : [{ label: "Petrol price", up: true, good: false }, { label: "Budget", up: true, good: true }, ...(r.action === "reform" ? [{ label: "Help for the poor", up: true, good: true }] : [{ label: "Protest risk", up: true, good: false }])];
  if (r.type === "bond") c = [{ label: "Cash now", up: true, good: true }, { label: "Dollar debt", up: true, good: false }];
  const later = futureHint({ type: r.type, id: "id" in r ? r.id : undefined, action: r.type === "fuel" ? r.action : undefined, eventTpl: tpl, optionId: r.type === "respond" ? r.optionId : undefined });
  return { ...a, chips: c, later };
}
function rawChallenge(s: FixState): Challenge {
  // an urgent situation on the ground always comes first
  const ev = openEvents(s).find((e) => e.kind !== "opportunity" && e.kind !== "scandal" && e.deadline - s.month <= 2 && (e.scale >= 2));
  const others = problemList(s).filter((p) => p.severity > 0.25).slice(0, 4);
  if (ev) {
    return {
      id: `event:${ev.id}`, title: ev.title.toUpperCase(), subtitle: ev.cause, why: [`Answer by ${ev.deadline - s.month <= 0 ? "now" : "the end of next month"}, or it escalates.`], severity: 1 + ev.scale / 5, tone: "red", eventId: ev.id,
      actions: ev.options.map((o) => ({ ref: { type: "respond", eventId: ev.id, optionId: o.id } as ActionRef, label: o.label, explain: o.explain, costLabel: o.cost > 0 ? nb(o.cost * priceMult(s)) : "No cash", tradeoff: o.tradeoff, uncertainty: o.uncertainty, blocked: o.cost * priceMult(s) > s.fin.treasury ? "Not enough cash" : undefined })),
      others,
    };
  }
  const best = PROBLEMS.map((p) => ({ p, v: p.sev(s) })).sort((a, b) => b.v - a.v)[0];
  if (best.v < 0.25) {
    // nothing is on fire: nudge towards the weakest long-term driver
    const acts = compact([projAct(s, "storage", "Pays off in a year or more."), projAct(s, "transmission", "Expensive; needs capable delivery."), pAct(s, "eProcure"), pAct(s, "taxDrive")]).slice(0, 4);
    return { id: "steady", title: "A STEADY MOMENT: BUILD FOR THE FUTURE", subtitle: "No single crisis stands out. Use the calm to fix the foundations: power, food storage, honest contracting and revenue.", why: [], severity: 0, tone: "blue", actions: acts, others };
  }
  const p = best.p;
  const actions = p.actions(s);
  if (best.v < 0.9) actions.push(wait("Not an emergency yet. Watch the numbers next month."));
  return { id: p.id, title: p.title, subtitle: p.subtitle(s), why: p.why(s), severity: best.v, tone: best.v >= 1.2 ? "red" : "amber", actions: actions.slice(0, 4), others: others.filter((o) => o.id !== p.id) };
}
