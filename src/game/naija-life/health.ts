import { applySupport, evaluateSupport, primaryProvider } from "./family";
import { I, bump, stateOf } from "./helpers";
import { monthIndex, transact } from "./ledger";
import type { Choice, Condition, EventDef, Pending, Player } from "./types";
import { chance, clamp, naira, randInt, uid, weightedPick } from "./util";

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
  { id: "pharmacy", label: "Pharmacy", base: 6_000, quality: 0.35, maxSeverity: 1, surgery: false, blurb: "Quick and cheap, but only for small things." },
  { id: "clinic", label: "Private clinic", base: 40_000, quality: 0.62, maxSeverity: 2, surgery: false, blurb: "Short queue and decent care for common illnesses." },
  { id: "gov", label: "Government hospital", base: 9_000, quality: 0.55, maxSeverity: 5, surgery: true, blurb: "Cheap and open to everyone, but long queues and few supplies." },
  { id: "teaching", label: "Teaching hospital", base: 55_000, quality: 0.8, maxSeverity: 5, surgery: true, blurb: "Specialists and good equipment, with some waiting." },
  { id: "private", label: "Private hospital", base: 300_000, quality: 0.9, maxSeverity: 5, surgery: true, blurb: "Fast, comfortable and expensive." },
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
  return FACILITIES.filter((f) => f.maxSeverity >= cond.severity && (!cond.needsSurgery || f.surgery));
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
  malaria: { id: "malaria", name: "Malaria", severity: 1, cause: "illness", months: [1, 1], bedridden: [0, 1], meds: 8_000, freq: () => 5, intro: "Fever, cold and a pounding headache. It feels like malaria again." },
  typhoid: { id: "typhoid", name: "Typhoid fever", severity: 2, cause: "illness", months: [2, 3], bedridden: [1, 1], meds: 14_000, freq: () => 2, intro: "Stomach pain, fever and weakness for days. Could be typhoid." },
  flu: { id: "flu", name: "Severe flu", severity: 1, cause: "illness", months: [1, 1], bedridden: [0, 0], meds: 4_000, freq: () => 3, intro: "A heavy cold and cough that will not go away." },
  ulcer: { id: "ulcer", name: "Stomach ulcer", severity: 2, cause: "illness", months: [5, 8], bedridden: [0, 0], meds: 12_000, freq: (p) => 1 + p.stats.stress / 40, intro: "Burning stomach pain that gets worse when you skip meals." },
  hypertension: { id: "hypertension", name: "High blood pressure", severity: 2, cause: "illness", months: "chronic", bedridden: [0, 0], meds: 16_000, minAge: 35, freq: (p) => (p.age > 35 ? 1.2 + p.stats.stress / 35 : 0), intro: "Dizzy spells and headaches. The doctor wants to check your blood pressure." },
  diabetes: { id: "diabetes", name: "Type 2 diabetes", severity: 3, cause: "illness", months: "chronic", bedridden: [0, 0], meds: 28_000, minAge: 40, freq: (p) => (p.age > 40 ? 0.8 + (100 - p.stats.fitness) / 80 : 0), intro: "Constant thirst and tiredness. Tests show high blood sugar." },
  stroke: { id: "stroke", name: "Stroke", severity: 5, cause: "illness", months: [8, 12], bedridden: [2, 4], surgeryChance: 0.2, meds: 40_000, minAge: 50, freq: (p) => (p.age > 50 ? 0.4 + (100 - p.stats.health) / 150 : 0), intro: "You suddenly cannot feel one side of your body." },
  heartAttack: { id: "heartAttack", name: "Heart attack", severity: 5, cause: "illness", months: [6, 10], bedridden: [2, 3], surgeryChance: 0.45, meds: 35_000, minAge: 45, freq: (p) => (p.age > 45 ? 0.3 + (100 - p.stats.fitness) / 200 : 0), intro: "Crushing chest pain spreads to your arm." },
  sprain: { id: "sprain", name: "Sprained ankle", severity: 1, cause: "injury", months: [1, 1], bedridden: [0, 0], meds: 3_000, freq: () => 0, intro: "You twisted your ankle badly." },
  fracture: { id: "fracture", name: "Broken bone", severity: 3, cause: "accident", months: [3, 4], bedridden: [1, 1], surgeryChance: 0.35, meds: 10_000, freq: () => 0, intro: "A sharp crack, then pain. It looks broken." },
  roadAccident: { id: "roadAccident", name: "Road accident injuries", severity: 4, cause: "accident", months: [4, 6], bedridden: [1, 2], surgeryChance: 0.55, meds: 18_000, freq: () => 0, intro: "A speeding vehicle hit you. You are bleeding and in a lot of pain." },
  gunshot: { id: "gunshot", name: "Gunshot wound", severity: 5, cause: "violence", months: [5, 8], bedridden: [2, 3], surgeryChance: 0.85, meds: 25_000, freq: () => 0, intro: "You were shot. Blood is soaking through your clothes." },
  stab: { id: "stab", name: "Stab wound", severity: 4, cause: "violence", months: [3, 5], bedridden: [1, 2], surgeryChance: 0.6, meds: 15_000, freq: () => 0, intro: "You were stabbed. You are in terrible pain." },
  burns: { id: "burns", name: "Serious burns", severity: 3, cause: "accident", months: [3, 5], bedridden: [1, 1], meds: 14_000, freq: () => 0, intro: "A generator fire left you with painful burns." },
  sti: { id: "sti", name: "Sexually transmitted infection", severity: 2, cause: "illness", months: [1, 2], bedridden: [0, 0], meds: 20_000, freq: () => 0, intro: "Something is wrong and it needs medical attention." },
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
  const r = pay.ok ? applyTreatment(p, cond, f) : "You could not afford treatment and just waited it out.";
  return `You came down with ${cond.name.toLowerCase()}. ${r}${pay.note}`;
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
  transact(p, { amount: 0, memo: true, reason: `${prov ? prov.name.split(" ")[0] : "Your family"} paid ${naira(total)} for your treatment at a ${fac.label.toLowerCase()} (${cond.name})`, category: "health" });
  if (prov) prov.gaveThisYear += total / p.index;
  const r = applyTreatment(p, cond, fac);
  return `You fell sick with ${cond.name.toLowerCase()}. ${r}`;
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
    p.cause = `${cond.name} (complications)`;
    return `Despite the doctors' efforts at the ${f.label.toLowerCase()}, you did not survive.`;
  }
  if (cond.needsSurgery) {
    cond.needsSurgery = false;
    bump(p, "health", -4);
    return `You went into surgery at the ${f.label.toLowerCase()} and it went well. Recovery will take ${cond.monthsLeft} months.`;
  }
  return sev <= 1 ? `The ${f.label.toLowerCase()} gave you drugs and advice. You should be fine soon.` : `Treated at the ${f.label.toLowerCase()}. Expect about ${cond.monthsLeft} months to recover.`;
}

export type PayMode = "cash" | "plan" | "family";

export function payForTreatment(p: Player, cond: Condition, f: Facility, mode: PayMode): { ok: boolean; note: string } {
  const { mine } = treatmentCost(p, cond, f);
  const label = `${cond.name}: ${f.label}`;
  if (mode === "cash") {
    if (p.money < mine) return { ok: false, note: `You need ${naira(mine)} in cash.` };
    transact(p, { amount: -mine, reason: label, category: "health" });
    return { ok: true, note: "" };
  }
  if (mode === "plan") {
    // The hospital agrees a payment plan: a recorded loan, repaid monthly.
    const months = 6;
    p.loans.push({
      id: uid(), direction: "owed", lenderType: "other", lenderName: f.label, principal: mine, balance: mine, apr: 0.12, fee: 0, termMonths: months, monthly: Math.round((mine * 1.04) / months),
      startAge: p.age, startMonth: p.month, informal: false, missed: 0, status: "active", lastCharged: monthIndex(p), note: `Payment plan for ${cond.name}`,
    });
    transact(p, { amount: 0, memo: true, reason: `${f.label} treated ${cond.name}: ${naira(mine)} on a payment plan`, category: "health" });
    return { ok: true, note: " The hospital put the bill on a six-month payment plan." };
  }
  const prov = primaryProvider(p);
  if (!prov) return { ok: false, note: "There is nobody to ask." };
  const reply = evaluateSupport(p, prov, "medical", mine);
  if (reply.type === "full" || reply.type === "askPurpose") {
    applySupport(p, prov, "medical", { ...reply, type: "full" });
    transact(p, { amount: -mine, reason: label, category: "health" });
    return { ok: true, note: ` ${prov.name.split(" ")[0]} covered the bill.` };
  }
  if (reply.type === "partial" || reply.type === "conditional") {
    applySupport(p, prov, "medical", reply);
    if (p.money >= mine) { transact(p, { amount: -mine, reason: label, category: "health" }); return { ok: true, note: ` ${prov.name.split(" ")[0]} could only help partly, but it was enough.` }; }
    return { ok: false, note: " Family sent part of the money, but it was not enough." };
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
  if (plan === "none") return "You cancelled your health insurance.";
  p.subs.push({ id: "hmo", label: `Health insurance (${plan})`, monthly: PLAN_PRICE[plan], category: "health", since: monthIndex(p) });
  return `You enrolled in the ${plan} health insurance plan.`;
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
        if (p.money >= cost * 0.5 || p.age >= 18) transact(p, { amount: -cost, reason: `Medication for ${c.name.toLowerCase()}`, category: "health", recurring: c.id });
      }
    }
    if (c.monthsLeft < 0) {
      if (!c.treated) bump(p, "health", -0.25);
      continue;
    }
    c.monthsLeft -= 1;
    if (!c.treated && c.severity >= 2 && chance(0.04)) {
      c.severity = Math.min(5, c.severity + 1);
      lines.push(`Your ${c.name.toLowerCase()} got worse because it was not treated.`);
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
      lines.push(`You recovered from ${c.name.toLowerCase()}.`);
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
    const wait = f.id === "gov" ? "long queue" : f.id === "teaching" ? "some waiting" : "seen quickly";
    const canPay = p.money >= mine;
    const doTreat = (q: Player, mode: "cash" | "plan" | "family"): string => {
      const cc = q.conditions.find((x) => x.id === c.id);
      if (!cc) return "Nothing to treat.";
      const pay = payForTreatment(q, cc, f, mode);
      if (!pay.ok) return pay.note;
      const out = applyTreatment(q, cc, f);
      return `${delayText}${out}${pay.note}`;
    };
    choices.push({
      label: `${f.label}${cov > 0 ? ` (insurance covers ${Math.round(cov * 100)}%)` : ""}`,
      sub: `${naira(mine)} · ${wait}`,
      disabled: canPay ? false : undefined,
      run: (q) => doTreat(q, canPay ? "cash" : "plan"),
    });
    if (!canPay && f.id !== "pharmacy") {
      choices[choices.length - 1] = { label: `${f.label}: put the bill on a payment plan`, sub: `${naira(mine)} over six months`, run: (q) => doTreat(q, "plan") };
      choices.push({ label: `${f.label}: ask family to pay`, sub: naira(mine), run: (q) => {
        const cc = q.conditions.find((x) => x.id === c.id);
        if (!cc) return "Nothing to treat.";
        const pay = payForTreatment(q, cc, f, "family");
        if (!pay.ok) return `${pay.note} You decide to use the payment plan instead.${(() => { const p2 = payForTreatment(q, cc, f, "plan"); return p2.note; })()} ${applyTreatment(q, cc, f)}`;
        return `${delayText}${applyTreatment(q, cc, f)}${pay.note}`;
      } });
    }
  }
  if (c.severity <= 2) {
    choices.push({ label: "Prayer and herbal mixture", run: (q) => { const cc = q.conditions.find((x) => x.id === c.id); if (!cc) return ""; if (chance(0.4)) { cc.monthsLeft = Math.max(1, Math.floor(cc.monthsLeft / 2)); return "The herbs and the prayers seem to help. It could have been the malaria wearing off."; } cc.severity = Math.min(5, cc.severity + 1); bump(q, "health", -4); return "It got worse. You should have gone to a hospital."; } });
  }
  choices.push({ label: "Ignore it and carry on", run: (q) => { bump(q, "stress", 4); return c.severity >= 3 ? "This is dangerous. Your condition may worsen." : "You push through. Maybe it passes by itself."; } });
  return choices;
}

export const HEALTH_EVENTS: EventDef[] = [
  {
    id: "medical_care",
    title: "You are unwell",
    weight: () => 0,
    valid: (p) => p.conditions.length > 0,
    text: (p, d) => {
      const c = cond(p, d.condId);
      return c ? `${TEMPLATES[c.template]?.intro ?? "You are not feeling well."} (${c.name}, severity ${c.severity}/5.) Where will you go for treatment?` : "You feel better.";
    },
    choices: (p, d) => {
      const c = cond(p, d.condId);
      if (!c) return [{ label: "OK", run: () => "You feel better." }];
      return careChoices(p, c);
    },
  },
  {
    id: "emergency_response",
    title: "Medical emergency!",
    weight: () => 0,
    valid: (p) => p.conditions.length > 0,
    text: (p, d) => {
      const c = cond(p, d.condId);
      return c ? `${TEMPLATES[c.template]?.intro ?? "Something terrible has happened."} Every minute counts. How do you get help?` : "Help arrived.";
    },
    choices: (p, d) => {
      const c = cond(p, d.condId);
      const st = stateOf(p);
      const ambulanceOk = st.opp >= 7 ? 0.7 : st.opp >= 5 ? 0.45 : 0.2;
      const friend = Object.values(p.npcs).find((n) => n.alive && n.role === "friend" && n.closeness > 50);
      if (!c) return [{ label: "OK", run: () => "" }];
      const after = (q: Player, delay: number, text: string) => {
        const cc = q.conditions.find((x) => x.id === c.id);
        if (!cc) return text;
        cc.delay = delay;
        return { text, spawn: [{ kind: "event" as const, id: "medical_care", data: { condId: cc.id, month: Number(d.month ?? 12), delayNote: delay } }] };
      };
      return [
        { label: "Call an ambulance", sub: naira(I(p, 25_000)), run: (q) => { transact(q, { amount: -I(q, 25_000), reason: "Ambulance call-out", category: "emergency" }); return chance(ambulanceOk) ? after(q, 0, "The ambulance arrives within twenty minutes and rushes you in.") : after(q, 2, "The ambulance never comes. A bystander finally flags down a taxi."); } },
        { label: "Flag a taxi or okada", sub: naira(I(p, 5_000)), run: (q) => { transact(q, { amount: -I(q, 5_000), reason: "Emergency ride to hospital", category: "emergency" }); return after(q, 1, "A driver rushes you through traffic, honking all the way."); } },
        { label: friend ? `Call ${friend.name.split(" ")[0]}` : "Call a friend", disabled: friend ? false : "No close friend nearby", run: (q) => after(q, chance(0.6) ? 0 : 1, `${friend?.name.split(" ")[0] ?? "A friend"} drives like a madman and gets you to hospital.`) },
        { label: "Wait for neighbours to help", run: (q) => after(q, 2, "Neighbours gather, someone finds a vehicle, and precious time is lost.") },
      ];
    },
  },
  {
    id: "follow_up",
    title: "Follow-up appointment",
    weight: () => 0,
    valid: (p) => p.conditions.length > 0,
    text: (p, d) => `The doctor asked you to come back for a check-up on your ${cond(p, d.condId)?.name.toLowerCase() ?? "condition"}.`,
    choices: (p, d) => {
      const c = cond(p, d.condId);
      const cost = I(p, 25_000);
      return [
        { label: "Attend the check-up", sub: naira(cost), disabled: p.money < cost ? "Not enough cash" : false, run: (q) => { transact(q, { amount: -cost, reason: `Follow-up appointment for ${c?.name.toLowerCase() ?? "treatment"}`, category: "health" }); const cc = q.conditions.find((x) => x.id === c?.id); if (cc) cc.monthsLeft = Math.max(1, cc.monthsLeft - 1); bump(q, "health", 2); return "The doctor is pleased with your progress."; } },
        { label: "Skip it, you feel fine", run: (q) => { const cc = q.conditions.find((x) => x.id === c?.id); if (cc && chance(0.25)) { cc.monthsLeft += 2; return "You skipped the check-up and a relapse sets you back two months."; } return "You get away with it this time."; } },
      ];
    },
  },
];
