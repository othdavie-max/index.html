/**
 * Macro-economy and public-finance module.
 *
 * A deliberately LIGHT, understandable model — not a forecasting tool. All starting values are stylised
 * approximations chosen for gameplay and are labelled "simulated" in the UI. Documented relationships (monthly step):
 *
 *   oil price      mean-reverts to ~US$75 with noise; scripted shocks add on top.
 *   exchange rate  drifts with the inflation gap (+), falls with oil prices (-), debt-service stress (+), noise.
 *   fuel price     moves 35% of the way each month towards import-parity  (fx × oil ratio) × (1 − subsidy).
 *   inflation      persistent (88%) blend of: structural level, FX pass-through, fuel pass-through, demand gap,
 *                  power-cost pressure, deficit monetisation, shocks.
 *   GDP growth     mean-reverts to a target built from power, infrastructure, security, fiscal stimulus,
 *                  inflation drag, interest-rate drag and oil.
 *   unemployment   Okun-style: falls when growth beats potential, rises when it lags.
 *   revenue        oil revenue ∝ oil price × FX; non-oil ∝ price level and business activity.
 *   debt           grows by the deficit; interest rate rises with inflation and debt/GDP.
 *   satisfaction   mean-reverts to a weighted index of purchasing power, inflation, jobs, power, security, services.
 *
 * Nothing here touches personal money. Government funds and personal finances are separate accounts.
 */
import type { Economy, EconKey, Indicators, Shock, BudgetLine } from "./types";
import { BUDGET_LINES } from "./types";
import type { Rng } from "./rng";
import { clamp, clamp100 } from "./rng";

export const FUEL_LITRES_PER_YEAR = 17.5e9;
export const DEFAULT_ALLOCATIONS: Record<BudgetLine, number> = {
  infrastructure: 0.17, health: 0.08, education: 0.11, security: 0.18, power: 0.08, welfare: 0.07, agriculture: 0.06, admin: 0.25,
};

export function initialEconomy(avgPower: number): Economy {
  const e: Economy = {
    cpi: 100, inflation: 21, fxRate: 1500, oilPrice: 74, fuelPrice: 925, fuelSubsidy: 0, gdpGrowth: 3.1, unemployment: 5.2,
    businessActivity: 48, wageIndex: 100, purchasingPower: 100, electricity: avgPower,
    revenueAnnualBn: 30000, spendingAnnualBn: 36000, debtBn: 80000, debtServiceShare: 0, interestRate: 14, satisfaction: 44,
    allocations: { ...DEFAULT_ALLOCATIONS }, shocks: [], treasuryBn: 0,
  };
  e.debtServiceShare = (e.debtBn * e.interestRate) / 100 / e.revenueAnnualBn * 100;
  return e;
}

export interface EconomyContext {
  avg: Indicators; // population-weighted state averages
  /** 0..1 how efficiently government spending converts into growth (competence, leakage) */
  efficiency: number;
  /** fraction of revenue by which the government plans to overspend (deficit target) */
  deficitTarget: number;
}

export function importParityFuelPrice(e: Pick<Economy, "fxRate" | "oilPrice">): number {
  return 0.55 * e.fxRate * (e.oilPrice / 75) * 1.12;
}
export function subsidyCostAnnualBn(e: Economy): number {
  return (e.fuelSubsidy * importParityFuelPrice(e) * FUEL_LITRES_PER_YEAR) / 1e9;
}
export function gdpNominalBn(e: Economy): number {
  return e.revenueAnnualBn / 0.1;
}
export function debtToGdp(e: Economy): number {
  return e.debtBn / gdpNominalBn(e);
}

/** apply and decay shocks; returns per-key accumulated effect for this month */
function collectShocks(shocks: Shock[]): Record<EconKey, { pct: number; abs: number }> {
  const out = {} as Record<EconKey, { pct: number; abs: number }>;
  const keys: EconKey[] = ["oilPrice", "fxRate", "fuelPrice", "inflation", "gdpGrowth", "unemployment", "businessActivity", "electricity", "revenue"];
  for (const k of keys) out[k] = { pct: 0, abs: 0 };
  for (const s of shocks) {
    if (s.remaining <= 0) continue;
    const per = s.amount / s.months;
    if (s.mode === "pct") out[s.key].pct += per;
    else out[s.key].abs += per;
  }
  return out;
}

/** Advance the macro economy by one month. Mutates `e`. */
export function stepEconomy(e: Economy, ctx: EconomyContext, rng: Rng): void {
  const sh = collectShocks(e.shocks);
  const prevFx = e.fxRate, prevFuel = e.fuelPrice;

  // oil
  e.oilPrice = clamp(e.oilPrice + 0.08 * (75 - e.oilPrice) + rng.normal(0, 2.2), 25, 150);
  e.oilPrice = clamp(e.oilPrice * (1 + sh.oilPrice.pct / 100) + sh.oilPrice.abs, 25, 150);

  // exchange rate (% monthly change)
  const fxPct =
    0.05 * (e.inflation - 3) - 0.03 * (e.oilPrice - 75) + 0.02 * (e.debtServiceShare - 55) + rng.normal(0, 0.55) + sh.fxRate.pct;
  e.fxRate = clamp(e.fxRate * (1 + fxPct / 100), 300, 9000);

  // fuel price
  const parity = importParityFuelPrice(e);
  const target = parity * (1 - e.fuelSubsidy);
  e.fuelPrice = e.fuelPrice + 0.35 * (target - e.fuelPrice);
  e.fuelPrice = Math.max(100, e.fuelPrice * (1 + sh.fuelPrice.pct / 100));

  const fxChange = (e.fxRate / prevFx - 1) * 100;
  const fuelChange = (e.fuelPrice / prevFuel - 1) * 100;

  // inflation
  const deficitRatio = Math.max(0, (e.spendingAnnualBn - e.revenueAnnualBn) / e.revenueAnnualBn);
  const target_inflation =
    11 + 12 * fxChange * 0.45 + 12 * fuelChange * 0.15 + 0.9 * (e.gdpGrowth - 3) + 0.06 * (60 - e.electricity) + 4 * Math.max(0, deficitRatio - 0.1) + sh.inflation.abs;
  e.inflation = clamp(0.88 * e.inflation + 0.12 * target_inflation, 1, 80);
  e.cpi *= 1 + e.inflation / 1200;

  // growth
  const stimulus = clamp(deficitRatio, 0, 0.4) * ctx.efficiency;
  const growthTarget =
    3 + 0.04 * (ctx.avg.power - 40) + 0.03 * (ctx.avg.infrastructure - 45) + 0.02 * (ctx.avg.security - 50) + 1.5 * stimulus
    - 0.06 * Math.max(0, e.inflation - 15) - 0.25 * Math.max(0, e.interestRate - 16) * 0.2 + 0.02 * (e.oilPrice - 75) + sh.gdpGrowth.abs;
  e.gdpGrowth = clamp(e.gdpGrowth + 0.15 * (growthTarget - e.gdpGrowth) + rng.normal(0, 0.12), -8, 12);

  // jobs & business
  e.unemployment = clamp(e.unemployment - 0.06 * (e.gdpGrowth - 3) + 0.02 * (5.2 - e.unemployment) + sh.unemployment.abs, 2, 40);
  const bTarget = 50 + 2.2 * (e.gdpGrowth - 3) - 0.4 * Math.max(0, e.inflation - 15) - 0.12 * (60 - e.electricity) + sh.businessActivity.abs;
  e.businessActivity = clamp100(e.businessActivity + 0.2 * (bTarget - e.businessActivity));

  // power (national reliability is derived from states in the world step; shocks nudge it)
  e.electricity = clamp100(e.electricity + sh.electricity.abs);

  // wages & purchasing power
  e.wageIndex *= 1 + (0.6 * e.inflation + 0.8 * Math.max(0, e.gdpGrowth - 2)) / 1200;
  e.purchasingPower = (e.wageIndex / e.cpi) * 100;

  // public finance
  const oilRev = 9000 * (e.oilPrice / 75) * (e.fxRate / 1500) * (1 + sh.revenue.pct / 100);
  const nonOil = 21000 * Math.pow(e.cpi / 100, 0.9) * (1 + 0.012 * (e.businessActivity - 48));
  e.revenueAnnualBn = Math.max(5000, oilRev + nonOil);
  const debtService = (e.debtBn * e.interestRate) / 100;
  e.spendingAnnualBn = e.revenueAnnualBn * (1 + clamp(ctx.deficitTarget, -0.1, 0.5));
  e.debtBn += Math.max(-e.debtBn * 0.01, (e.spendingAnnualBn - e.revenueAnnualBn) / 12);
  e.debtServiceShare = (debtService / e.revenueAnnualBn) * 100;
  e.interestRate = clamp(12 + 0.15 * Math.max(0, e.inflation - 10) + 0.08 * Math.max(0, debtToGdp(e) * 100 - 40), 8, 35);

  // satisfaction
  const avgServices = (ctx.avg.health + ctx.avg.education) / 2;
  const sTarget =
    62 - 0.9 * Math.max(0, e.inflation - 8) - 1.2 * Math.max(0, e.unemployment - 5) + 0.15 * (e.purchasingPower - 100)
    + 0.12 * (ctx.avg.power - 40) + 0.1 * (ctx.avg.security - 45) + 0.08 * (avgServices - 45);
  e.satisfaction = clamp(e.satisfaction + 0.12 * (clamp(sTarget, 5, 95) - e.satisfaction), 5, 95);

  // decay shocks
  for (const s of e.shocks) s.remaining -= 1;
  e.shocks = e.shocks.filter((s) => s.remaining > 0);
}

export function addShock(e: Economy, s: Omit<Shock, "remaining">): void {
  if (e.shocks.some((x) => x.id === s.id)) return; // never double-apply an event's shock
  e.shocks.push({ ...s, remaining: s.months });
}

/** Share of the programme budget after debt service and subsidy, and validity of allocation shares. */
export function normaliseAllocations(a: Record<BudgetLine, number>): Record<BudgetLine, number> {
  const total = BUDGET_LINES.reduce((t, k) => t + Math.max(0, a[k] ?? 0), 0) || 1;
  const out = {} as Record<BudgetLine, number>;
  for (const k of BUDGET_LINES) out[k] = Math.max(0, a[k] ?? 0) / total;
  return out;
}

/** Programme spending available after debt service and the fuel subsidy (₦ billion / yr). */
export function programmeBudgetBn(e: Economy): number {
  const debtService = (e.debtBn * e.interestRate) / 100;
  return Math.max(0, e.spendingAnnualBn - debtService - subsidyCostAnnualBn(e));
}
