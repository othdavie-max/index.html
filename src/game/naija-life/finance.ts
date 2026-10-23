import { HOME_TIERS, PAY_SCALE, SCHOOL_FEES, STATE_BY_ID, payMult, type SchoolType } from "./data";
import { nyscAllowance } from "./nysc";
import { capacityOf, primaryProvider } from "./family";
import { jobDef, stateOf } from "./helpers";
import { coverShortfall, monthIndex, transact } from "./ledger";
import { adjustCredit, processLoansMonth, totalDebt } from "./loans";
import { businessMonth, saleMonth } from "./business";
import { inv2Month, totalInv2 } from "./invest2";
import { growthMonth, skillPayBonus } from "./life";
import { healthMonth, incomeFactor } from "./health";
import { spouseMonth } from "./relationships";
import { SOCIAL_JOBS, socialMonth } from "./social";
import { marketMonth, yearlyUpkeep } from "./lifestyle";
import { ownsPersonalCar, vehicleMonth } from "./vehicles";
import type { Pending, Player } from "./types";
import { costMultiplier, payMultiplier } from "./news";
import { locationOf } from "./locations";
import { degreeBonus } from "./education";
import { MAJOR_BY_ID, UNI_BY_ID } from "./universities";
import { T, chance, clamp, naira, rand } from "./util";

export interface MonthCtx {
  lines: string[];
  pending: Pending[];
  /** Nominal annual pay for the current job, decided at the start of the year. */
  yearPay: number;
  /** Monthly pay scaling for this year's volatility, only used for hustles. */
  rate: number;
}

const pe = (id: string, month: number, extra: Record<string, string | number | boolean> = {}): Pending => ({ kind: "event", id, data: { month, ...extra } });

export const netWorthReal = (p: Player) => {
  const houses = p.houses.reduce((s, h) => s + h.value, 0);
  const hold = p.holdings.reduce((s, h) => s + h.value, 0);
  return (p.money + houses + hold + totalInv2(p) - totalDebt(p)) / p.index;
};

/** Monthly living cost bands. Costs rise with the price index and with how well you live. */
export function monthlyLiving(p: Player) {
  const st = stateOf(p);
  const kids = 1 + 0.2 * Math.min(p.kids.length, 4);
  const lifestyle = clamp(1 + Math.max(0, netWorthReal(p)) / 45_000_000 * 0.6, 1, 2.2);
  const withFamily = p.housing.type === "family";
  const base = (420_000 * st.cost * costMultiplier(p) * Math.pow(p.index, 0.95) * kids * lifestyle) / 12 * (withFamily ? 0.45 : 1);
  return {
    food: base * 0.42,
    transport: base * 0.17,
    utilities: base * 0.15,
    airtime: p.possessions.phone ? base * 0.08 : 0,
    personal: base * 0.18,
  };
}

export function schoolFeeFor(p: Player): number {
  if (!p.school) return 0;
  const st = p.school.stage;
  let fee: number;
  if (st === "tertiary") {
    if (p.school.type === "polytechnic") fee = 140_000;
    else if (p.school.type === "vocational") fee = 250_000;
    else if (p.school.type === "postgrad") fee = p.flags.postgradTrack === "phd" ? 450_000 : 700_000;
    else if (p.campus && !p.campus.graduated) { const u = UNI_BY_ID[p.campus.uni]; const mj = MAJOR_BY_ID[p.campus.major]; fee = u && mj ? u.fee * mj.fee * (1 - p.campus.aid) : SCHOOL_FEES.tertiary.public; return fee * Math.pow(p.index, 0.92) * (p.flags.scholarship ? 0.7 : 1); }
    else fee = SCHOOL_FEES.tertiary[(p.flags.schoolType as SchoolType) ?? "public"];
  } else fee = SCHOOL_FEES[st][(p.flags.schoolType as SchoolType) ?? "public"] * (st === "secondary" && p.flags.boarding ? 1.6 : 1);
  return fee * Math.pow(p.index, 0.92) * (p.flags.scholarship ? 0.3 : 1);
}

export function allowanceMonthly(p: Player): number {
  const n = primaryProvider(p);
  if (!n || p.age < 6 || p.fam.cutOff.includes("allowance")) return 0;
  const income = p.fam.income * Math.pow(p.index, 0.9);
  const ageMult = p.age < 12 ? 0.6 : p.age < 18 ? 1 : p.school ? 1.8 : 0.8;
  const amt = (income / 12) * 0.011 * (n.generosity / 50) * ageMult;
  return Math.min(amt, 300_000 * p.index);
}

/** Age at which parents stop regular pocket money. */
export function allowanceCutoffAge(p: Player): number {
  const n = primaryProvider(p);
  const gen = n?.generosity ?? p.fam.generosity;
  const strict = n?.strictness ?? p.fam.strictness;
  return clamp(Math.round(20 + gen / 18 - strict / 30), 18, 29);
}

function payRent(p: Player, ctx: MonthCtx) {
  const h = p.housing;
  if (h.type !== "rented" && h.type !== "hostel") return;
  const now = monthIndex(p);
  if (now < h.paidUntil) return;
  const full = h.annualRent;
  const label = h.type === "hostel" ? T("Hostel fee", "Hostel fee") : T("Rent", "Rent");
  // Parents can cover a student's hostel fee if they support you.
  if (h.type === "hostel" && p.age < 25 && !p.fam.cutOff.includes("rent")) {
    const n = primaryProvider(p);
    if (n && capacityOf(p, n) > full * 0.5 && chance(0.85)) {
      h.paidUntil = now + 12;
      transact(p, { amount: 0, memo: true, reason: T(`${n.name.split(" ")[0]} paid your ${label.toLowerCase()} (${naira(full)})`, `${n.name.split(" ")[0]} pay your ${label.toLowerCase()} (${naira(full)})`), category: "rent" });
      return;
    }
  }
  if (p.money >= full) {
    transact(p, { amount: -full, reason: T(`${label}: ${HOME_TIERS.find((t) => t.id === h.landlord)?.label ?? "accommodation"} for a year`, `${label}: ${HOME_TIERS.find((t) => t.id === h.landlord)?.label ?? "accommodation"} for one year`), category: "rent", recurring: "rent" });
    h.paidUntil = now + 12;
    h.arrears = 0;
  } else if (p.money >= full * 0.3) {
    const quarter = Math.round(full / 4);
    transact(p, { amount: -quarter, reason: T(`${label} (landlord accepted a quarter payment)`, `${label} (landlord gree collect quarter payment)`), category: "rent", recurring: "rent" });
    h.paidUntil = now + 3;
    adjustCredit(p, -1);
  } else {
    h.arrears += 1;
    if (h.arrears === 1) ctx.lines.push(T("Rent is due and you cannot pay it. The landlord is already asking questions.", "Rent don due and you no fit pay. Landlord don start to ask question."));
    if (h.arrears >= 3) ctx.pending.push(pe("eviction_notice", p.month));
  }
}

/** Inside, there is no pay or living cost, but the outside world keeps moving. */
function prisonMonth(p: Player, ctx: MonthCtx) {
  for (const h of p.houses) {
    if (h.use === "rent" && chance(0.9)) {
      const rent = monthlyRent(p, h);
      transact(p, { amount: rent, reason: T(`Rent from your ${h.kind} in ${STATE_BY_ID[h.state].name}`, `Rent from your ${h.kind} for ${STATE_BY_ID[h.state].name}`), category: "business", recurring: h.id });
    }
  }
  payRent(p, ctx);
  for (const s of p.subs) transact(p, { amount: -s.monthly * Math.pow(p.index, 0.9), reason: s.label, category: s.category, recurring: s.id });
  marketMonth(p, ctx.lines);
  businessMonth(p, ctx.lines);
  saleMonth(p, ctx.lines);
  vehicleMonth(p, ctx.lines);
  inv2Month(p, ctx.lines);
  healthMonth(p, ctx.lines, ctx.pending);
  processLoansMonth(p, ctx.lines, ctx.pending);
  const gap = coverShortfall(p, T("Cash ran short while you were locked up: borrowed to cover bills", "Cash short as you dey inside: you borrow to cover bills"));
  if (gap > 0) { p.stats.stress = clamp(p.stats.stress + 3); adjustCredit(p, -1); }
}

function monthTick(p: Player, ctx: MonthCtx) {
  const st = stateOf(p);
  const now = monthIndex(p);
  const adult = p.age >= 18;
  let incomeThisMonth = 0;

  if (p.prison > 0) { prisonMonth(p, ctx); return; }

  // --- Income ---
  if (p.age >= 16 && p.job && ctx.yearPay > 0) {
    const j = jobDef(p);
    const noise = j && j.selfEmployed ? rand(0.7, 1.3) : j && j.group === "creative" ? rand(0.5, 1.5) : 1;
    const amt = (ctx.yearPay / 12) * noise * incomeFactor(p);
    transact(p, { amount: amt, reason: j?.selfEmployed ? T(`Business income: ${j.title}`, `Business income: ${j.title}`) : T(`Salary: ${j?.title ?? "work"}`, `Salary: ${j?.title ?? "work"}`), category: j?.selfEmployed ? "business" : "salary", recurring: "income" });
    incomeThisMonth += amt;
  }
  const corp = nyscAllowance(p);
  if (corp > 0) {
    transact(p, { amount: corp, reason: T("NYSC allowance", "NYSC allowance"), category: "salary", recurring: "income" });
    incomeThisMonth += corp;
  }
  for (const h of p.houses) {
    if (h.use === "rent" && chance(0.9)) {
      const rent = monthlyRent(p, h);
      transact(p, { amount: rent, reason: T(`Rent from your ${h.kind} in ${STATE_BY_ID[h.state].name}`, `Rent from your ${h.kind} for ${STATE_BY_ID[h.state].name}`), category: "business", recurring: h.id });
      incomeThisMonth += rent;
    }
  }
  if (!p.job && !p.school && adult && !(p.politics && p.politics.office >= 0)) {
    const odd = (220_000 * (0.6 + st.opp / 10) * Math.pow(p.index, 0.92) * rand(0.6, 1.2)) / 12;
    transact(p, { amount: odd, reason: T("Odd jobs and small hustles", "Odd jobs and small small hustle"), category: "salary", recurring: "informal" });
    incomeThisMonth += odd;
  }
  const allow = allowanceMonthly(p);
  if (allow > 0) {
    const n = primaryProvider(p);
    transact(p, { amount: allow, reason: T(`Pocket money from ${n?.name.split(" ")[0] ?? "family"}`, `Pocket money from ${n?.name.split(" ")[0] ?? "family"}`), category: "allowance", recurring: "allowance" });
    if (n) n.gaveThisYear += allow / p.index;
  }
  if (p.money > 0) {
    const interest = (p.money * 0.04) / 12;
    transact(p, { amount: interest, reason: T("Bank interest", "Bank interest"), category: "interest", recurring: "interest" });
  }

  // --- Expenses ---
  if (p.age >= 18 || p.possessions.phone) {
    const l = monthlyLiving(p);
    const scale = adult ? 1 : 0.25; // teenagers spend less; family covers the rest
    if (adult) {
      transact(p, { amount: -l.food, reason: T("Food and groceries", "Chop and foodstuff"), category: "food", recurring: "living" });
      transact(p, { amount: -(ownsPersonalCar(p) ? l.transport * 0.25 : l.transport), reason: ownsPersonalCar(p) ? T("Transport (occasional fares and parking)", "Transport (sometimes fare and parking)") : T("Transport fares", "Transport fare"), category: "transport", recurring: "living" });
      transact(p, { amount: -l.utilities, reason: p.flags.solar ? T("Electricity and water (solar helps)", "Light and water (solar dey help)") : T("Electricity, fuel and water", "Light, fuel and water"), category: "utilities", recurring: "living" });
      if (l.airtime) transact(p, { amount: -l.airtime, reason: T("Airtime and data", "Airtime and data"), category: "airtime", recurring: "living" });
      transact(p, { amount: -l.personal, reason: T("Personal spending", "Personal spending"), category: "personal", recurring: "living" });
      spouseMonth(p, l.food + l.transport + l.utilities + l.airtime + l.personal);
    } else if (p.possessions.phone && p.age >= 12) {
      transact(p, { amount: -Math.min(l.airtime * scale + 500 * p.index, Math.max(0, p.money)), reason: T("Airtime and data", "Airtime and data"), category: "airtime", recurring: "living" });
    }
  }
  if (adult && p.fam.expectContribution && p.housing.type === "family" && incomeThisMonth > 0 && p.age < 40) {
    const give = incomeThisMonth * 0.1;
    transact(p, { amount: -give, reason: T("Contribution to household expenses", "Contribution to house expenses"), category: "family", recurring: "family" });
  }
  // Teenagers and young children spend most of their pocket money on snacks and airtime.
  if (!adult && p.money > 0 && allow > 0) {
    transact(p, { amount: -Math.min(p.money, allow * 0.7), reason: T("Snacks, airtime and small things", "Snacks, airtime and small small things"), category: "personal", recurring: "teen-spending" });
  }
  // Annual / termly bills
  if (p.month === 1 || p.month === 5 || p.month === 9) {
    const fee = schoolFeeFor(p) / 3;
    if (fee > 0) {
      const payer = primaryProvider(p);
      const parentsPay = p.campus?.payer === "self" ? false : p.age < 18 || (p.age < 25 && !p.fam.cutOff.includes("schoolFees"));
      if (parentsPay && payer) {
        transact(p, { amount: 0, memo: true, reason: T(`${payer.name.split(" ")[0]} paid ${naira(fee)} of your school fees this term`, `${payer.name.split(" ")[0]} pay ${naira(fee)} of your school fees this term`), category: "education" });
      } else {
        transact(p, { amount: -fee, reason: T("School fees for this term", "School fees for this term"), category: "education", recurring: "school" });
      }
    }
  }
  payRent(p, ctx);
  for (const s of p.subs) {
    transact(p, { amount: -s.monthly * Math.pow(p.index, 0.9), reason: s.label, category: s.category, recurring: s.id });
  }
  const upkeep = yearlyUpkeep(p) / 12;
  if (upkeep > 0) transact(p, { amount: -upkeep, reason: T("Upkeep on your luxuries", "Upkeep for your luxury things"), category: "personal", recurring: "luxury-upkeep" });

  growthMonth(p);
  marketMonth(p, ctx.lines);
  socialMonth(p, ctx.lines);
  businessMonth(p, ctx.lines);
  saleMonth(p, ctx.lines);
  vehicleMonth(p, ctx.lines);
  healthMonth(p, ctx.lines, ctx.pending);
  processLoansMonth(p, ctx.lines, ctx.pending);
  void now;
  const gap = coverShortfall(p, T("Cash ran short: borrowed to cover bills", "Cash short: you borrow to cover bills"));
  if (gap > 0) {
    p.stats.stress = clamp(p.stats.stress + 3);
    adjustCredit(p, -1);
  }
}

const HOUSE_RENT: Record<string, number> = { bungalow: 1_100_000, duplex: 3_500_000, flats: 9_000_000, apartment: 2_200_000, mansion: 18_000_000, plaza: 40_000_000, land: 0 };

/** Monthly rent a rented-out property earns. Located properties follow the neighbourhood. */
export function monthlyRent(p: Player, h: import("./types").House): number {
  if (h.project) return 0;
  const loc = locationOf(h.loc);
  if (loc) return (h.value * loc.yield * rand(0.82, 1.04)) / 12;
  return (HOUSE_RENT[h.kind] * STATE_BY_ID[h.state].cost * Math.pow(p.index, 0.9)) / 12;
}

/** Runs all 12 months of the year. */
export function runMonths(p: Player, ctx: MonthCtx) {
  for (let m = 1; m <= 12; m++) {
    p.month = m;
    monthTick(p, ctx);
  }
  p.month = 12;
}

/** Annual pay for the current job in nominal naira (before monthly noise). */
export function annualPay(p: Player): number {
  const j = jobDef(p);
  if (!p.job || !j) return 0;
  const st = stateOf(p);
  if (SOCIAL_JOBS.includes(j.id)) return 0;
  const rung = j.ladder[Math.min(p.job.rank, j.ladder.length - 1)];
  const volatility = j.group === "formal" ? rand(0.92, 1.08) : rand(0.8, 1.2);
  const pay = rung.pay * PAY_SCALE[j.group] * payMult(j, st) * Math.pow(p.index, j.group === "formal" ? 0.86 : 0.92) * volatility;
  const skilled = pay * (1 + skillPayBonus(p, j.id)) * payMultiplier(p) * degreeBonus(p);
  return p.flags.investorShare ? skilled * 0.88 : skilled;
}
