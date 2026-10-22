import { monthIndex } from "./ledger";
import { activeOwed } from "./loans";
import { schoolFeeFor } from "./finance";
import type { Player } from "./types";
import { T, naira } from "./util";

export interface Upcoming {
  label: string;
  /** Months from now; 0 means this month. */
  inMonths: number;
  amount: number;
}

/** Everything the game will charge you soon, in order. */
export function upcomingPayments(p: Player): Upcoming[] {
  const out: Upcoming[] = [];
  const now = monthIndex(p);
  const h = p.housing;
  if ((h.type === "rented" || h.type === "hostel") && h.annualRent > 0) out.push({ label: h.type === "hostel" ? T("Hostel fee", "Hostel fee") : T("Rent", "Rent"), inMonths: Math.max(0, h.paidUntil - now), amount: h.annualRent });
  for (const l of activeOwed(p)) {
    if (l.informal) { if (l.dueIndex !== undefined) out.push({ label: T(`Repay ${l.lenderName}`, `Pay ${l.lenderName}`), inMonths: Math.max(0, l.dueIndex - now), amount: l.balance }); }
    else out.push({ label: `${l.lenderName}${l.houseId ? T(" (mortgage)", " (mortgage)") : ""}`, inMonths: 1, amount: l.monthly });
  }
  for (const s of p.subs) out.push({ label: s.label, inMonths: 1, amount: s.monthly * Math.pow(p.index, 0.9) });
  const fee = schoolFeeFor(p) / 3;
  if (fee > 0) {
    const next = [1, 5, 9].map((m) => (m - p.month + 12) % 12).sort((a, b) => a - b)[0];
    out.push({ label: T("School fees (per term)", "School fees (every term)"), inMonths: next, amount: fee });
  }
  for (const v of p.vehicles) if (v.insuredUntil && v.insuredUntil <= now + 2) out.push({ label: T(`Insurance for your ${v.name} expires`, `${v.name} insurance go finish`), inMonths: Math.max(0, v.insuredUntil - now), amount: v.value * 0.04 });
  return out.sort((a, b) => a.inMonths - b.inMonths);
}

export interface MonthRow {
  key: number;
  age: number;
  month: number;
  income: number;
  expense: number;
  cats: { category: string; amount: number }[];
}

/** Monthly totals from the recorded transactions (loans received are not income). */
export function monthlySummary(p: Player): MonthRow[] {
  const map = new Map<number, MonthRow>();
  for (const t of p.ledger) {
    const key = t.age * 12 + t.month;
    let r = map.get(key);
    if (!r) { r = { key, age: t.age, month: t.month, income: 0, expense: 0, cats: [] }; map.set(key, r); }
    if (t.category === "loan" && t.amount > 0) continue;
    if (t.amount > 0) r.income += t.amount; else r.expense -= t.amount;
    const c = r.cats.find((x) => x.category === t.category);
    if (c) c.amount += t.amount; else r.cats.push({ category: t.category, amount: t.amount });
  }
  return [...map.values()].sort((a, b) => b.key - a.key).slice(0, 18);
}

export interface Notice {
  level: "red" | "gold" | "green";
  text: string;
}

export function notificationsFor(p: Player): Notice[] {
  const out: Notice[] = [];
  const now = monthIndex(p);
  if (p.prison > 0) out.push({ level: "red", text: T(`You are in prison: ${p.prison} year${p.prison === 1 ? "" : "s"} left.`, `You dey prison: ${p.prison} year${p.prison === 1 ? "" : "s"} remain.`) });
  if (p.housing.arrears > 0) out.push({ level: "red", text: T("You are behind on rent. Eviction is possible.", "You don owe rent. Dem fit throw you out.") });
  for (const l of activeOwed(p)) {
    if (l.missed > 0) out.push({ level: "red", text: T(`${l.lenderName}: ${l.missed} missed payment(s).`, `${l.lenderName}: you miss ${l.missed} payment.`) });
    else if (l.informal && l.dueIndex !== undefined && l.dueIndex - now <= 2) out.push({ level: "gold", text: T(`${l.lenderName} will want ${naira(l.balance)} soon.`, `${l.lenderName} go soon need ${naira(l.balance)}.`) });
  }
  for (const c of p.conditions) if (!c.treated) out.push({ level: c.severity >= 3 ? "red" : "gold", text: T(`Untreated: ${c.name}.`, `No treatment yet: ${c.name}.`) });
  if (p.age >= 18 && p.insurance.plan === "none" && p.stats.health < 55) out.push({ level: "gold", text: T("Your health is slipping and you have no insurance.", "Your health dey drop and you no get insurance.") });
  for (const v of p.vehicles) if (v.insuredUntil <= now && v.insuredUntil > 0) out.push({ level: "gold", text: T(`Your ${v.name} is uninsured.`, `${v.name} no get insurance.`) });
  if (p.money < 0) out.push({ level: "red", text: T("You are overdrawn.", "Your account don dry.") });
  if (p.age >= 18 && p.money > 0 && p.money < 30_000 * p.index) out.push({ level: "gold", text: T("Cash is very low.", "Cash don low well well.") });
  if (p.crime.cases.some((c) => c.stage !== "closed")) out.push({ level: "red", text: T("You have an open court case.", "You get court case wey never finish.") });
  if (p.flags.fugitive) out.push({ level: "red", text: T("You are wanted by the police.", "Police dey find you.") });
  for (const n of (p.world?.news ?? []).filter((x) => x.age >= p.age - 1)) out.push({ level: "gold", text: p.lang === "en" ? n.en : n.pcm });
  return out;
}
