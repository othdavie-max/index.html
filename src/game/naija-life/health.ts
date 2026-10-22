import { modActive } from "./news";
import { applySupport, evaluateSupport, primaryProvider } from "./family";
import { I, bump, stateOf } from "./helpers";
import { monthIndex, transact } from "./ledger";
import type { Choice, Condition, EventDef, Pending, Player } from "./types";
import { T, dual, chance, clamp, naira, randInt, uid, weightedPick } from "./util";

// ---------------------------------------------------------------------------
// Facilities
// ---------------------------------------------------------------------------
export interface Facility {
  id: "pharmacy" | "clinic" | "gov" | "teaching" | "private";
  label: string;
  /** Base cost for a severity-1 visit in base-year naira. */
  base: number;
  quality: number;
  maxSeverity: number;
  surgery: boolean;
  blurb: string;
}

export const FACILITIES: Facility[] = [
  { id: "pharmacy", get label() { return T("Pharmacy", "Chemist"); }, base: 6_000, quality: 0.35, maxSeverity: 1, surgery: false, get blurb() { return T("Quick and cheap, but only for small things.", "E quick and e cheap, but na only for small small matter."); } },
  { id: "clinic", get label() { return T("Private clinic", "Private clinic"); }, base: 40_000, quality: 0.62, maxSeverity: 2, surgery: false, get blurb() { return T("Short queue and decent care for common illnesses.", "Queue no long and dem dey treat common sickness well."); } },
  { id: "gov", get label() { return T("Government hospital", "Government hospital"); }, base: 9_000, quality: 0.55, maxSeverity: 5, surgery: true, get blurb() { return T("Cheap and open to everyone, but long queues and few supplies.", "E cheap and everybody fit enter, but queue long and drugs no plenty."); } },
  { id: "teaching", get label() { return T("Teaching hospital", "Teaching hospital"); }, base: 55_000, quality: 0.8, maxSeverity: 5, surgery: true, get blurb() { return T("Specialists and good equipment, with some waiting.", "Specialist dey and equipment good, but you go wait small."); } },
  { id: "private", get label() { return T("Private hospital", "Private hospital"); }, base: 300_000, quality: 0.9, maxSeverity: 5, surgery: true, get blurb() { return T("Fast, comfortable and expensive.", "Dem dey quick, e dey comfortable but e cost well."); } },
];
export const FACILITY_BY_ID = Object.fromEntries(FACILITIES.map((f) => [f.id, f])) as Record<Facility["id"], Facility>;

const SEV_COST = [0, 1, 2.6, 6, 16, 42];
const SEV_MORT = [0, 0, 0.004, 0.02, 0.12, 0.4];

export function coverageFor(p: Player, f: Facility): number {
  if (p.insurance.plan === "premium") return f.id === "pharmacy" ? 0.3 : 0.85;
  if (p.insurance.plan === "basic") return f.id === "gov" || f.id === "teaching" || f.id === "clinic" ? 0.6 : 0;
  return 0;
}

export function treatmentCost(p: Player, cond: Condition, f: Facility): { total: number; mine: number } {
  const total = f.base * SEV_COST[cond.severity] * (cond.needsSurgery ? 2.2 : 1) * Math.pow(p.index, 0.95);
  return { total, mine: total * (1 - coverageFor(p, f)) };
}

export function facilitiesFor(p: Player, cond: Condition): Facility[] {
  return FACILITIES.filter((f) => f.maxSeverity >= cond.severity && (!cond.needsSurgery || f.surgery) && !(f.id === "gov" && modActive(p, "strike")));
}

// ---------------------------------------------------------------------------
// Condition templates
// ---------------------------------------------------------------------------
interface Template {
  id: string;
  name: string;
  severity: number;
  cause: Condition["cause"];
  months: [number, number] | "chronic";
  bedridden: [number, number];
  surgeryChance?: number;
  meds?: number;
  minAge?: number;
  /** Relative yearly frequency for natural illness. Injuries use 0 here and are triggered by events. */
  freq: (p: Player) => number;
  intro: string;
}

export const TEMPLATES: Record<string, Template> = {
  malaria: { id: "malaria", get name() { return T("Malaria", "Malaria"); }, severity: 1, cause: "illness", months: [1, 1], bedridden: [0, 1], meds: 8_000, freq: () => 5, get intro() { return T("Fever, cold and a pounding headache. It feels like malaria again.", "Fever, cold and headache dey pound you. E be like say malaria don come again."); } },
  typhoid: { id: "typhoid", get name() { return T("Typhoid fever", "Typhoid"); }, severity: 2, cause: "illness", months: [2, 3], bedridden: [1, 1], meds: 14_000, freq: () => 2, get intro() { return T("Stomach pain, fever and weakness for days. Could be typhoid.", "Belle dey pain you, fever dey and body don weak for days. E fit be typhoid."); } },
  flu: { id: "flu", get name() { return T("Severe flu", "Strong catarrh"); }, severity: 1, cause: "illness", months: [1, 1], bedridden: [0, 0], meds: 4_000, freq: () => 3, get intro() { return T("A heavy cold and cough that will not go away.", "Heavy catarrh and cough wey no wan leave you."); } },
  ulcer: { id: "ulcer", get name() { return T("Stomach ulcer", "Ulcer"); }, severity: 2, cause: "illness", months: [5, 8], bedridden: [0, 0], meds: 12_000, freq: (p) => 1 + p.stats.stress / 40, get intro() { return T("Burning stomach pain that gets worse when you skip meals.", "Belle dey burn you and e dey worse when you skip food."); } },
  hypertension: { id: "hypertension", get name() { return T("High blood pressure", "High blood pressure"); }, severity: 2, cause: "illness", months: "chronic", bedridden: [0, 0], meds: 16_000, minAge: 35, freq: (p) => (p.age > 35 ? 1.2 + p.stats.stress / 35 : 0), get intro() { return T("Dizzy spells and headaches. The doctor wants to check your blood pressure.", "Dizziness and headache dey worry you. Doctor wan check your blood pressure."); } },
  diabetes: { id: "diabetes", get name() { return T("Type 2 diabetes", "Sugar sickness (diabetes)"); }, severity: 3, cause: "illness", months: "chronic", bedridden: [0, 0], meds: 28_000, minAge: 40, freq: (p) => (p.age > 40 ? 0.8 + (100 - p.stats.fitness) / 80 : 0), get intro() { return T("Constant thirst and tiredness. Tests show high blood sugar.", "Thirst no dey leave you and body dey tire you. Test show say your blood sugar high."); } },
  stroke: { id: "stroke", get name() { return T("Stroke", "Stroke"); }, severity: 5, cause: "illness", months: [8, 12], bedridden: [2, 4], surgeryChance: 0.2, meds: 40_000, minAge: 50, freq: (p) => (p.age > 50 ? 0.4 + (100 - p.stats.health) / 150 : 0), get intro() { return T("You suddenly cannot feel one side of your body.", "Suddenly, you no fit feel one side of your body."); } },
  heartAttack: { id: "heartAttack", get name() { return T("Heart attack", "Heart attack"); }, severity: 5, cause: "illness", months: [6, 10], bedridden: [2, 3], surgeryChance: 0.45, meds: 35_000, minAge: 45, freq: (p) => (p.age > 45 ? 0.3 + (100 - p.stats.fitness) / 200 : 0), get intro() { return T("Crushing chest pain spreads to your arm.", "Heavy pain dey press your chest and e dey spread go your arm."); } },
  sprain: { id: "sprain", get name() { return T("Sprained ankle", "Twisted ankle"); }, severity: 1, cause: "injury", months: [1, 1], bedridden: [0, 0], meds: 3_000, freq: () => 0, get intro() { return T("You twisted your ankle badly.", "You twist your leg bad bad."); } },
  fracture: { id: "fracture", get name() { return T("Broken bone", "Broken bone"); }, severity: 3, cause: "accident", months: [3, 4], bedridden: [1, 1], surgeryChance: 0.35, meds: 10_000, freq: () => 0, get intro() { return T("A sharp crack, then pain. It looks broken.", "Something crack, then pain follow. E look like say bone don break."); } },
  roadAccident: { id: "roadAccident", get name() { return T("Road accident injuries", "Road accident injuries"); }, severity: 4, cause: "accident", months: [4, 6], bedridden: [1, 2], surgeryChance: 0.55, meds: 18_000, freq: () => 0, get intro() { return T("A speeding vehicle hit you. You are bleeding and in a lot of pain.", "Motor wey dey rush hit you. Blood dey comot and pain dey worry you well well."); } },
  gunshot: { id: "gunshot", get name() { return T("Gunshot wound", "Gunshot wound"); }, severity: 5, cause: "violence", months: [5, 8], bedridden: [2, 3], surgeryChance: 0.85, meds: 25_000, freq: () => 0, get intro() { return T("You were shot. Blood is soaking through your clothes.", "Dem shoot you. Blood don soak your cloth."); } },
  stab: { id: "stab", get name() { return T("Stab wound", "Stab wound"); }, severity: 4, cause: "violence", months: [3, 5], bedridden: [1, 2], surgeryChance: 0.6, meds: 15_000, freq: () => 0, get intro() { return T("You were stabbed. You are in terrible pain.", "Dem stab you. The pain too much."); } },
  burns: { id: "burns", get name() { return T("Serious burns", "Bad burns"); }, severity: 3, cause: "accident", months: [3, 5], bedridden: [1, 1], meds: 14_000, freq: () => 0, get intro() { return T("A generator fire left you with painful burns.", "Generator fire burn you well well and e dey pain you."); } },
  sti: { id: "sti", get name() { return T("Sexually transmitted infection", "Infection from intimacy"); }, severity: 2, cause: "illness", months: [1, 2], bedridden: [0, 0], meds: 20_000, freq: () => 0, get intro() { return T("Something is wrong and it needs medical attention.", "Something no dey right and e need doctor to look am."); } },
};

const AGE_ILLNESS = ["malaria", "typhoid", "flu", "ulcer", "hypertension", "diabetes", "stroke", "heartAttack"];

export function hasCondition(p: Player, template: string) {
  return p.conditions.some((c) => c.template === template);
}

export function incomeFactor(p: Player): number {
  if (p.conditions.some((c) => c.bedridden > 0)) return 0.25;
  if (p.conditions.some((c) => c.severity >= 3 && c.monthsLeft > 0)) return 0.75;
  return 1;
}

/** Adds a condition and returns what needs to happen next. */
export function developCondition(p: Player, templateId: string, opts: { delay?: number } = {}): { lines: string[]; pending: Pending[] } {
  const t = TEMPLATES[templateId];
  const lines: string[] = [];
  const pending: Pending[] = [];
  if (!t) return { lines, pending };
  if (p.conditions.some((c) => c.template === t.id && t.months !== "chronic")) return { lines, pending };
  if (p.conditions.some((c) => c.template === t.id)) return { lines, pending };
  const months = t.months === "chronic" ? -1 : randInt(t.months[0], t.months[1]);
  const cond: Condition = {
    id: uid(), template: t.id, name: t.name, severity: t.severity, cause: t.cause, sinceAge: p.age, sinceMonth: p.month, monthsLeft: months, treated: false,
    needsSurgery: chance(t.surgeryChance ?? 0), bedridden: randInt(t.bedridden[0], t.bedridden[1]), medMonthly: t.meds ?? 0, followUpIn: null, delay: opts.delay ?? 0,
  };
  p.conditions.push(cond);
  bump(p, "health", -3 * t.severity);
  bump(p, "stress", 2 * t.severity);
  const month = randInt(1, 12);
  if (p.age < 18) {
    lines.push(autoCareForChild(p, cond));
    return { lines, pending };
  }
  if (t.severity >= 4) pending.push({ kind: "event", id: "emergency_response", data: { condId: cond.id, month } });
  else if (t.severity >= 2) pending.push({ kind: "event", id: "medical_care", data: { condId: cond.id, month } });
  else lines.push(autoCareMinor(p, cond));
  return { lines, pending };
}

/** Small illnesses are sorted at a pharmacy or clinic without a fuss. */
function autoCareMinor(p: Player, cond: Condition): string {
  const f = p.money >= FACILITY_BY_ID.pharmacy.base * 4 * p.index ? FACILITY_BY_ID.pharmacy : FACILITY_BY_ID.gov;
  const mode: PayMode = treatmentCost(p, cond, f).mine <= p.money ? "cash" : "plan";
  const pay = payForTreatment(p, cond, f, mode);
  const r = pay.ok ? applyTreatment(p, cond, f) : T("You could not afford treatment and just waited it out.", "You no get money for treatment so you just wait make am pass.");
  return T(`You came down with ${cond.name.toLowerCase()}. ${r}${pay.note}`, `You catch ${cond.name.toLowerCase()}. ${r}${pay.note}`);
}

/** Parents decide where a child is treated, based on what the family can afford. */
function autoCareForChild(p: Player, cond: Condition): string {
  const prov = primaryProvider(p);
  const wealth = p.fam.income / Math.max(1, Math.pow(p.index, 0.01));
  let fac: Facility;
  if (cond.severity >= 4 || cond.needsSurgery) fac = wealth > 40e6 ? FACILITY_BY_ID.private : wealth > 8e6 ? FACILITY_BY_ID.teaching : FACILITY_BY_ID.gov;
  else if (cond.severity >= 3) fac = wealth > 30e6 ? FACILITY_BY_ID.private : FACILITY_BY_ID.gov;
  else if (cond.severity === 2) fac = wealth > 20e6 ? FACILITY_BY_ID.clinic : wealth > 3e6 ? FACILITY_BY_ID.clinic : FACILITY_BY_ID.gov;
  else fac = wealth > 3e6 ? FACILITY_BY_ID.clinic : FACILITY_BY_ID.pharmacy;
  const { total } = treatmentCost(p, cond, fac);
  transact(p, { amount: 0, memo: true, reason: (() => { const who = prov ? prov.name.split(" ")[0] : T("Your family", "Your people"); return T(`${who} paid ${naira(total)} for your treatment at a ${fac.label.toLowerCase()} (${cond.name})`, `${who} pay ${naira(total)} for your treatment for ${fac.label.toLowerCase()} (${cond.name})`); })(), category: "health" });
  if (prov) prov.gaveThisYear += total / p.index;
  const r = applyTreatment(p, cond, fac);
  return T(`You fell sick with ${cond.name.toLowerCase()}. ${r}`, `You fall sick with ${cond.name.toLowerCase()}. ${r}`);
}

/** Core outcome of getting treated. Cost handling is done by the caller. */
export function applyTreatment(p: Player, cond: Condition, f: Facility): string {
  cond.treated = true;
  const q = f.quality;
  const base = TEMPLATES[cond.template]?.months;
  const baseMonths = base === "chronic" || base === undefined ? 3 : Math.round((base[0] + base[1]) / 2);
  if (cond.monthsLeft > 0) cond.monthsLeft = Math.max(1, Math.round(baseMonths * (1.25 - q * 0.6)));
  // Waits at government hospitals make recovery slower, especially for surgery.
  if (f.id === "gov" && cond.needsSurgery) cond.monthsLeft += 2;
  cond.followUpIn = cond.severity >= 3 ? 2 : null;
  const sev = cond.severity;
  let mort = SEV_MORT[sev] * (1.35 - q) * (1 + cond.delay * 0.45);
  if (p.age > 60) mort *= 1.5;
  if (p.stats.health < 30) mort *= 1.4;
  if (f.id === "gov" && sev >= 4) mort *= 1.15;
  if (chance(clamp(mort, 0, 0.9))) {
    p.alive = false;
    p.cause = T(`${cond.name} (complications)`, `${cond.name} (complication)`);
    return T(`Despite the doctors' efforts at the ${f.label.toLowerCase()}, you did not survive.`, `Even though doctors try for ${f.label.toLowerCase()}, you no survive.`);
  }
  if (cond.needsSurgery) {
    cond.needsSurgery = false;
    bump(p, "health", -4);
    return T(`You went into surgery at the ${f.label.toLowerCase()} and it went well. Recovery will take ${cond.monthsLeft} months.`, `Dem operate you for ${f.label.toLowerCase()} and e go well. You go need ${cond.monthsLeft} months to recover.`);
  }
  return sev <= 1 ? T(`The ${f.label.toLowerCase()} gave you drugs and advice. You should be fine soon.`, `Dem give you drugs and advice for ${f.label.toLowerCase()}. You go soon dey fine.`) : T(`Treated at the ${f.label.toLowerCase()}. Expect about ${cond.monthsLeft} months to recover.`, `Dem treat you for ${f.label.toLowerCase()}. Expect about ${cond.monthsLeft} months before you recover.`);
}

export type PayMode = "cash" | "plan" | "family";

export function payForTreatment(p: Player, cond: Condition, f: Facility, mode: PayMode): { ok: boolean; note: string } {
  const { mine } = treatmentCost(p, cond, f);
  const label = `${cond.name}: ${f.label}`;
  if (mode === "cash") {
    if (p.money < mine) return { ok: false, note: T(`You need ${naira(mine)} in cash.`, `You need ${naira(mine)} cash.`) };
    transact(p, { amount: -mine, reason: label, category: "health" });
    return { ok: true, note: "" };
  }
  if (mode === "plan") {
    // The hospital agrees a payment plan: a recorded loan, repaid monthly.
    const months = 6;
    p.loans.push({
      id: uid(), direction: "owed", lenderType: "other", lenderName: f.label, principal: mine, balance: mine, apr: 0.12, fee: 0, termMonths: months, monthly: Math.round((mine * 1.04) / months),
      startAge: p.age, startMonth: p.month, informal: false, missed: 0, status: "active", lastCharged: monthIndex(p), note: T(`Payment plan for ${cond.name}`, `Payment plan for ${cond.name}`),
    });
    transact(p, { amount: 0, memo: true, reason: T(`${f.label} treated ${cond.name}: ${naira(mine)} on a payment plan`, `${f.label} treat ${cond.name}: ${naira(mine)} on payment plan`), category: "health" });
    return { ok: true, note: T(" The hospital put the bill on a six-month payment plan.", " The hospital spread the bill for six months.") };
  }
  const prov = primaryProvider(p);
  if (!prov) return { ok: false, note: T("There is nobody to ask.", "Nobody dey to ask.") };
  const reply = evaluateSupport(p, prov, "medical", mine);
  if (reply.type === "full" || reply.type === "askPurpose") {
    applySupport(p, prov, "medical", { ...reply, type: "full" });
    transact(p, { amount: -mine, reason: label, category: "health" });
    return { ok: true, note: T(` ${prov.name.split(" ")[0]} covered the bill.`, ` ${prov.name.split(" ")[0]} pay the bill.`) };
  }
  if (reply.type === "partial" || reply.type === "conditional") {
    applySupport(p, prov, "medical", reply);
    if (p.money >= mine) { transact(p, { amount: -mine, reason: label, category: "health" }); return { ok: true, note: T(` ${prov.name.split(" ")[0]} could only help partly, but it was enough.`, ` ${prov.name.split(" ")[0]} fit help small only, but e reach.`) }; }
    return { ok: false, note: T(" Family sent part of the money, but it was not enough.", " Family send part of the money, but e no reach.") };
  }
  return { ok: false, note: ` ${reply.text}` };
}

// ---------------------------------------------------------------------------
// Insurance
// ---------------------------------------------------------------------------
const PLAN_PRICE: Record<"basic" | "premium", number> = { basic: 7_000, premium: 32_000 };

export function setInsurance(p: Player, plan: "none" | "basic" | "premium"): string {
  p.subs = p.subs.filter((s) => s.id !== "hmo");
  p.insurance.plan = plan;
  if (plan === "none") return T("You cancelled your health insurance.", "You cancel your health insurance.");
  p.subs.push({ id: "hmo", label: T(`Health insurance (${plan})`, `Health insurance (${plan})`), monthly: PLAN_PRICE[plan], category: "health", since: monthIndex(p) });
  return T(`You enrolled in the ${plan} health insurance plan.`, `You join the ${plan} health insurance plan.`);
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------
export function healthMonth(p: Player, lines: string[], pending: Pending[]) {
  const done: string[] = [];
  for (const c of p.conditions) {
    if (c.bedridden > 0) c.bedridden -= 1;
    if (c.medMonthly > 0 && (c.treated || c.monthsLeft < 0)) {
      const cost = c.medMonthly * Math.pow(p.index, 0.95);
      if (p.age >= 18 || p.money >= cost) {
        if (p.money >= cost * 0.5 || p.age >= 18) transact(p, { amount: -cost, reason: T(`Medication for ${c.name.toLowerCase()}`, `Drugs for ${c.name.toLowerCase()}`), category: "health", recurring: c.id });
      }
    }
    if (c.monthsLeft < 0) {
      if (!c.treated) bump(p, "health", -0.25);
      continue;
    }
    c.monthsLeft -= 1;
    if (!c.treated && c.severity >= 2 && chance(0.04)) {
      c.severity = Math.min(5, c.severity + 1);
      lines.push(T(`Your ${c.name.toLowerCase()} got worse because it was not treated.`, `Your ${c.name.toLowerCase()} don worse because nobody treat am.`));
    }
    if (c.followUpIn !== null) {
      c.followUpIn -= 1;
      if (c.followUpIn <= 0 && c.monthsLeft > 0) {
        c.followUpIn = null;
        pending.push({ kind: "event", id: "follow_up", data: { condId: c.id, month: p.month } });
      }
    }
    if (c.monthsLeft <= 0) done.push(c.id);
  }
  for (const id of done) {
    const c = p.conditions.find((x) => x.id === id);
    if (c) {
      lines.push(T(`You recovered from ${c.name.toLowerCase()}.`, `You don recover from ${c.name.toLowerCase()}.`));
      bump(p, "health", 3 + c.severity * 2);
    }
  }
  p.conditions = p.conditions.filter((c) => !done.includes(c.id));
}

export function yearlyHealth(p: Player, lines: string[], pending: Pending[]) {
  const checkup = p.flags.checkupAge === p.age || p.flags.checkupAge === p.age - 1;
  const base = 0.12 + (100 - p.stats.health) / 450 + (p.age > 55 ? 0.1 : 0) - p.stats.fitness / 700 + (p.age < 12 ? 0.08 : 0);
  if (chance(clamp(base * (checkup ? 0.7 : 1), 0.03, 0.6))) {
    const options = AGE_ILLNESS.map((id) => TEMPLATES[id]).filter((t) => (!t.minAge || p.age >= t.minAge) && !hasCondition(p, t.id));
    const t = weightedPick(options.map((o) => ({ item: o, w: o.freq(p) })));
    if (t) {
      const r = developCondition(p, t.id);
      lines.push(...r.lines);
      pending.push(...r.pending);
    }
  }
  // Travel and the roads
  if (p.traveled && chance(0.025)) {
    const r = developCondition(p, chance(0.5) ? "roadAccident" : "fracture", { delay: 1 });
    lines.push(...r.lines);
    pending.push(...r.pending);
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
const cond = (p: Player, id: unknown) => p.conditions.find((c) => c.id === id);

function careChoices(p: Player, c: Condition, delayText = ""): Choice[] {
  const choices: Choice[] = [];
  const fac = facilitiesFor(p, c);
  for (const f of fac) {
    const { mine } = treatmentCost(p, c, f);
    const cov = coverageFor(p, f);
    const wait = f.id === "gov" ? T("long queue", "long queue") : f.id === "teaching" ? T("some waiting", "small waiting") : T("seen quickly", "dem go see you quick");
    const canPay = p.money >= mine;
    const doTreat = (q: Player, mode: "cash" | "plan" | "family"): string => {
      const cc = q.conditions.find((x) => x.id === c.id);
      if (!cc) return T("Nothing to treat.", "Nothing dey to treat.");
      const pay = payForTreatment(q, cc, f, mode);
      if (!pay.ok) return pay.note;
      const out = applyTreatment(q, cc, f);
      return `${delayText}${out}${pay.note}`;
    };
    choices.push({
      label: `${f.label}${cov > 0 ? T(` (insurance covers ${Math.round(cov * 100)}%)`, ` (insurance cover ${Math.round(cov * 100)}%)`) : ""}`,
      sub: `${naira(mine)} · ${wait}`,
      disabled: canPay ? false : undefined,
      run: (q) => doTreat(q, canPay ? "cash" : "plan"),
    });
    if (!canPay && f.id !== "pharmacy") {
      choices[choices.length - 1] = { label: T(`${f.label}: put the bill on a payment plan`, `${f.label}: put the bill on payment plan`), sub: T(`${naira(mine)} over six months`, `${naira(mine)} for six months`), run: (q) => doTreat(q, "plan") };
      choices.push({ label: T(`${f.label}: ask family to pay`, `${f.label}: ask family make dem pay`), sub: naira(mine), run: (q) => {
        const cc = q.conditions.find((x) => x.id === c.id);
        if (!cc) return T("Nothing to treat.", "Nothing dey to treat.");
        const pay = payForTreatment(q, cc, f, "family");
        if (!pay.ok) { const planNote = payForTreatment(q, cc, f, "plan").note; const treated = applyTreatment(q, cc, f); return T(`${pay.note} You decide to use the payment plan instead.${planNote} ${treated}`, `${pay.note} You decide to use the payment plan instead.${planNote} ${treated}`); }
        return `${delayText}${applyTreatment(q, cc, f)}${pay.note}`;
      } });
    }
  }
  if (c.severity <= 2) {
    choices.push({ label: T("Prayer and herbal mixture", "Prayer and agbo"), run: (q) => { const cc = q.conditions.find((x) => x.id === c.id); if (!cc) return ""; if (chance(0.4)) { cc.monthsLeft = Math.max(1, Math.floor(cc.monthsLeft / 2)); return T("The herbs and the prayers seem to help. It could have been the malaria wearing off.", "The agbo and prayer don help small. E fit be say the malaria just dey go by itself."); } cc.severity = Math.min(5, cc.severity + 1); bump(q, "health", -4); return T("It got worse. You should have gone to a hospital.", "E don worse. You for don go hospital."); } });
  }
  choices.push({ label: T("Ignore it and carry on", "Ignore am and continue"), run: (q) => { bump(q, "stress", 4); return c.severity >= 3 ? T("This is dangerous. Your condition may worsen.", "This one dey dangerous. Your condition fit worse.") : T("You push through. Maybe it passes by itself.", "You just dey push. Maybe e go pass by itself."); } });
  return choices;
}

export const HEALTH_EVENTS: EventDef[] = [
  {
    id: "medical_care",
    title: dual("You are unwell", "You no dey well"),
    weight: () => 0,
    valid: (p) => p.conditions.length > 0,
    text: (p, d) => {
      const c = cond(p, d.condId);
      return c ? T(`${TEMPLATES[c.template]?.intro ?? "You are not feeling well."} (${c.name}, severity ${c.severity}/5.) Where will you go for treatment?`, `${TEMPLATES[c.template]?.intro ?? "Body no dey fine."} (${c.name}, severity ${c.severity}/5.) Where you wan go for treatment?`) : T("You feel better.", "Body don dey fine.");
    },
    choices: (p, d) => {
      const c = cond(p, d.condId);
      if (!c) return [{ label: T("OK", "OK"), run: () => T("You feel better.", "Body don dey fine.") }];
      return careChoices(p, c);
    },
  },
  {
    id: "emergency_response",
    title: dual("Medical emergency!", "Emergency for hospital!"),
    weight: () => 0,
    valid: (p) => p.conditions.length > 0,
    text: (p, d) => {
      const c = cond(p, d.condId);
      return c ? T(`${TEMPLATES[c.template]?.intro ?? "Something terrible has happened."} Every minute counts. How do you get help?`, `${TEMPLATES[c.template]?.intro ?? "Something terrible don happen."} Every minute dey count. How you go take get help?`) : T("Help arrived.", "Help don reach.");
    },
    choices: (p, d) => {
      const c = cond(p, d.condId);
      const st = stateOf(p);
      const ambulanceOk = st.opp >= 7 ? 0.7 : st.opp >= 5 ? 0.45 : 0.2;
      const friend = Object.values(p.npcs).find((n) => n.alive && n.role === "friend" && n.closeness > 50);
      if (!c) return [{ label: T("OK", "OK"), run: () => "" }];
      const after = (q: Player, delay: number, text: string) => {
        const cc = q.conditions.find((x) => x.id === c.id);
        if (!cc) return text;
        cc.delay = delay;
        return { text, spawn: [{ kind: "event" as const, id: "medical_care", data: { condId: cc.id, month: Number(d.month ?? 12), delayNote: delay } }] };
      };
      return [
        { label: T("Call an ambulance", "Call ambulance"), sub: naira(I(p, 25_000)), run: (q) => { transact(q, { amount: -I(q, 25_000), reason: T("Ambulance call-out", "Ambulance call-out"), category: "emergency" }); return chance(ambulanceOk) ? after(q, 0, T("The ambulance arrives within twenty minutes and rushes you in.", "Ambulance reach inside twenty minutes and rush you enter hospital.")) : after(q, 2, T("The ambulance never comes. A bystander finally flags down a taxi.", "Ambulance no come at all. Person wey dey stand near finally stop taxi for you.")); } },
        { label: T("Flag a taxi or okada", "Stop taxi or okada"), sub: naira(I(p, 5_000)), run: (q) => { transact(q, { amount: -I(q, 5_000), reason: T("Emergency ride to hospital", "Emergency ride go hospital"), category: "emergency" }); return after(q, 1, T("A driver rushes you through traffic, honking all the way.", "Driver rush you pass go-slow, dey horn all the way.")); } },
        { label: friend ? T(`Call ${friend.name.split(" ")[0]}`, `Call ${friend.name.split(" ")[0]}`) : T("Call a friend", "Call one friend"), disabled: friend ? false : T("No close friend nearby", "No close friend dey near you"), run: (q) => after(q, chance(0.6) ? 0 : 1, T(`${friend?.name.split(" ")[0] ?? "A friend"} drives like a madman and gets you to hospital.`, `${friend?.name.split(" ")[0] ?? "One friend"} drive like mad person and carry you reach hospital.`)) },
        { label: T("Wait for neighbours to help", "Wait make neighbours help"), run: (q) => after(q, 2, T("Neighbours gather, someone finds a vehicle, and precious time is lost.", "Neighbours gather, person find motor, and plenty time waste.")) },
      ];
    },
  },
  {
    id: "follow_up",
    title: dual("Follow-up appointment", "Hospital follow-up"),
    weight: () => 0,
    valid: (p) => p.conditions.length > 0,
    text: (p, d) => T(`The doctor asked you to come back for a check-up on your ${cond(p, d.condId)?.name.toLowerCase() ?? "condition"}.`, `Doctor tell you make you come back for check-up on your ${cond(p, d.condId)?.name.toLowerCase() ?? "condition"}.`),
    choices: (p, d) => {
      const c = cond(p, d.condId);
      const cost = I(p, 25_000);
      return [
        { label: T("Attend the check-up", "Go for the check-up"), sub: naira(cost), disabled: p.money < cost ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -cost, reason: T(`Follow-up appointment for ${c?.name.toLowerCase() ?? "treatment"}`, `Follow-up appointment for ${c?.name.toLowerCase() ?? "treatment"}`), category: "health" }); const cc = q.conditions.find((x) => x.id === c?.id); if (cc) cc.monthsLeft = Math.max(1, cc.monthsLeft - 1); bump(q, "health", 2); return T("The doctor is pleased with your progress.", "Doctor happy with how you dey improve."); } },
        { label: T("Skip it, you feel fine", "Skip am, body dey fine"), run: (q) => { const cc = q.conditions.find((x) => x.id === c?.id); if (cc && chance(0.25)) { cc.monthsLeft += 2; return T("You skipped the check-up and a relapse sets you back two months.", "You skip the check-up and sickness return, e set you back two months."); } return T("You get away with it this time.", "You escape am this time."); } },
      ];
    },
  },
];
