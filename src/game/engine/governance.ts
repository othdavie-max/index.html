/**
 * Government and public finance below the macro level: state/LGA indicator dynamics, budgets, projects,
 * appointments and legislative support. Government money (treasuries) is entirely separate from personal funds.
 *
 * The player only controls the jurisdiction of the office they hold (LGA chairman → their LGA's budget; governor →
 * their state; president → federal programmes). Everything else is run by AI officials using the same formulas.
 */
import type { GameState, BudgetLine, PolicyProject, Indicator, Indicators } from "./types";
import { BUDGET_LINES, INDICATORS } from "./types";
import { POLICY_BY_ID, VERTICAL_SHARING, type Funding } from "../data/policies";
import { DEFAULT_ALLOCATIONS, normaliseAllocations, programmeBudgetBn, subsidyCostAnnualBn } from "./economy";
import { subRng, clamp, clamp100, hashString } from "./rng";
import { pushNews, notify, careerLog } from "./news";
import { holderOf, playerSeat, priceLevel, partyDefOf } from "./queries";
import { newId, once } from "./ids";
import { applyIndicator } from "./events";
import { stateName, lgaName } from "./admin";
import { calendarMonth } from "./calendar";
import { adjustRelation } from "./relationships";
import { startScheme } from "./corruption";
import { weightedAverageIndicators } from "./world";

export type Result = { ok: boolean; message: string };
const fail = (message: string): Result => ({ ok: false, message });
const good = (message: string): Result => ({ ok: true, message });

export interface ExecInfo { level: "local" | "state" | "federal"; scopeId: string; label: string; office: "lg_chair" | "governor" | "president" }
export function execInfo(state: GameState): ExecInfo | null {
  const seat = playerSeat(state);
  if (!seat) return null;
  if (seat.office === "lg_chair") return { level: "local", scopeId: seat.lgaIds[0], label: lgaName(seat.lgaIds[0]), office: "lg_chair" };
  if (seat.office === "governor") return { level: "state", scopeId: seat.stateId!, label: stateName(seat.stateId!), office: "governor" };
  if (seat.office === "president") return { level: "federal", scopeId: "NG", label: "Nigeria", office: "president" };
  return null;
}

const LINE_TARGET: Record<BudgetLine, { ind: Indicator; w: number }[]> = {
  infrastructure: [{ ind: "infrastructure", w: 1 }],
  health: [{ ind: "health", w: 1 }],
  education: [{ ind: "education", w: 1 }],
  security: [{ ind: "security", w: 1 }],
  power: [{ ind: "power", w: 1 }],
  welfare: [{ ind: "economy", w: 0.5 }],
  agriculture: [{ ind: "economy", w: 0.6 }],
  admin: [],
};

export function jurisdictionBudget(state: GameState, info: ExecInfo): { treasuryM: number; revenueMonthlyM: number; allocations: Record<BudgetLine, number>; pop: number } {
  const alloc = state.government.allocations ?? DEFAULT_ALLOCATIONS;
  if (info.level === "federal") {
    const prog = programmeBudgetBn(state.economy);
    return { treasuryM: state.economy.treasuryBn * 1000, revenueMonthlyM: (prog * 1000) / 12, allocations: normaliseAllocations(alloc), pop: Object.values(state.states).reduce((t, s) => t + s.pop, 0) };
  }
  if (info.level === "state") {
    const st = state.states[info.scopeId];
    return { treasuryM: st.treasuryM, revenueMonthlyM: st.revenueMonthlyM, allocations: normaliseAllocations(alloc), pop: st.pop };
  }
  return { treasuryM: state.government.localTreasuryM, revenueMonthlyM: localRevenueM(state, info.scopeId), allocations: normaliseAllocations(alloc), pop: state.lgas[info.scopeId].pop };
}

export function localRevenueM(state: GameState, lgaId: string): number {
  const totalPop = Object.values(state.states).reduce((t, s) => t + s.pop, 0);
  const nationalMonthlyM = (state.economy.revenueAnnualBn * 1000) / 12;
  return Math.round(nationalMonthlyM * VERTICAL_SHARING.local * 0.45 * (state.lgas[lgaId].pop / totalPop) * 1.15);
}

export function efficiency(state: GameState): number {
  const ap = state.government.appointees;
  if (!ap.length) return 0.58;
  const comp = ap.reduce((t, a) => t + a.competence, 0) / ap.length;
  return clamp(0.4 + comp / 200, 0.4, 0.95);
}

/** offsets that make LGAs differ from their state, deterministic and stable over time */
function lgaOffset(id: string, ind: string): number {
  return ((hashString(`${id}|${ind}`) % 1000) / 1000 - 0.5) * 14;
}

/** per-capita reference spending for a line (so that default allocations leave indicators broadly stable) */
function spendingDelta(revenueMonthlyM: number, pop: number, alloc: Record<BudgetLine, number>, refPerCapita: number, eff: number): Partial<Indicators> {
  const out: Partial<Indicators> = {};
  const perCap = revenueMonthlyM / Math.max(1, pop);
  for (const line of BUDGET_LINES) {
    const rel = (perCap * alloc[line]) / Math.max(1e-9, refPerCapita * DEFAULT_ALLOCATIONS[line]);
    const d = clamp(0.2 * (rel * eff / 0.58 - 1), -0.45, 0.6);
    for (const t of LINE_TARGET[line]) out[t.ind] = (out[t.ind] ?? 0) + d * t.w;
  }
  return out;
}

export function processGovernance(state: GameState): void {
  if (!once(state, "governance")) return;
  const m = state.clock.monthIndex;
  const rng = subRng(state.meta.seed, "governance", m);
  const eco = state.economy;
  const exec = execInfo(state);
  const natAvg = weightedAverageIndicators(state);
  const totalPop = Object.values(state.states).reduce((t, s) => t + s.pop, 0);

  // keep state revenue tracking the national revenue level
  const lastRev = (state.flags["lastRevAnnualBn"] as number | undefined) ?? eco.revenueAnnualBn;
  const revScale = eco.revenueAnnualBn / lastRev;
  state.flags["lastRevAnnualBn"] = eco.revenueAnnualBn;

  // reference per-capita state revenue (average)
  const refState = Object.values(state.states).reduce((t, s) => t + s.revenueMonthlyM, 0) / totalPop;
  // national/federal programme spending effect (spread over all states)
  const fedAlloc = exec?.level === "federal" ? normaliseAllocations(state.government.allocations ?? DEFAULT_ALLOCATIONS) : normaliseAllocations(eco.allocations);
  const fedEff = exec?.level === "federal" ? efficiency(state) * (1 - leakShare(state)) : 0.55;
  const fedProgM = (programmeBudgetBn(eco) * 1000) / 12;
  const fedDelta = spendingDelta(fedProgM, totalPop, fedAlloc, fedProgM / totalPop, fedEff);

  for (const s of Object.values(state.states)) {
    s.revenueMonthlyM = Math.round(s.revenueMonthlyM * revScale);
    const isPlayerState = exec?.level === "state" && exec.scopeId === s.id;
    const gov = holderOf(state, s.governorSeatId);
    const comp = isPlayerState ? efficiency(state) * (1 - leakShare(state)) / 0.58 * 0.58 : 0.4 + (gov?.attrs.competence ?? 50) / 200 * (1 - (100 - (gov?.attrs.integrity ?? 50)) / 100 * 0.25);
    const alloc = isPlayerState ? normaliseAllocations(state.government.allocations ?? DEFAULT_ALLOCATIONS) : s.allocations;
    const d = spendingDelta(s.revenueMonthlyM, s.pop, alloc, refState, comp);
    const natEcoPush = 0.03 * (eco.gdpGrowth - 3) + 0.02 * (eco.businessActivity - 50) / 10 - 0.02 * (eco.inflation - 20) / 10;
    for (const k of INDICATORS) {
      let delta = (d[k] ?? 0) + (fedDelta[k] ?? 0) * 0.6 - 0.025 + rng.normal(0, 0.12);
      if (k === "economy") delta += natEcoPush;
      if (k === "security") delta -= (s.incidents / 100) * 0.12 - 0.02;
      if (k === "power") delta += 0.002 * (55 - s.indicators.power) * 0.0;
      s.indicators[k] = clamp(s.indicators[k] + delta, 3, 97);
    }
    s.incidents = clamp100(s.incidents * 0.96 + (50 - s.indicators.security) * 0.05);
    const avg = INDICATORS.reduce((t, k) => t + s.indicators[k], 0) / INDICATORS.length;
    const target = 18 + 0.5 * avg + 0.2 * (eco.satisfaction - 50);
    s.satisfaction = clamp(s.satisfaction + 0.08 * (target - s.satisfaction), 5, 95);
    // treasury: AI states roughly balance; the player's state is handled below
    if (!isPlayerState) {
      s.treasuryM = clamp(s.treasuryM + s.revenueMonthlyM * rng.range(-0.04, 0.05), -s.revenueMonthlyM * 4, s.revenueMonthlyM * 8);
    }
    // annual AI adaptation: move 8% of allocation towards the weakest line
    if (!isPlayerState && calendarMonth(state) === 1) adaptAllocations(s.allocations, s.indicators, rng.next());
  }
  // AI president adapts federal allocations once a year
  if (exec?.level !== "federal" && calendarMonth(state) === 1) {
    adaptAllocations(eco.allocations, natAvg, rng.next());
  }

  // LGAs follow their state with stable local offsets (and recover from local shocks)
  for (const l of Object.values(state.lgas)) {
    const sid = l.id.split("-").slice(0, 2).join("-");
    const st = state.states[sid];
    for (const k of INDICATORS) {
      const target = st.indicators[k] + lgaOffset(l.id, k) + (k === "economy" || k === "infrastructure" || k === "power" ? (l.urban - 0.4) * 10 : 0);
      l.indicators[k] = clamp(l.indicators[k] + 0.07 * (target - l.indicators[k]), 3, 97);
    }
    l.salience.economy = clamp(1 - l.indicators.economy / 100, 0, 1);
    l.salience.infrastructure = clamp(1 - l.indicators.infrastructure / 100, 0, 1);
    l.salience.security = clamp(1 - l.indicators.security / 100, 0, 1);
    l.salience.health = clamp(1 - l.indicators.health / 100, 0, 1);
    l.salience.education = clamp(1 - l.indicators.education / 100, 0, 1);
    l.salience.power = clamp(1 - l.indicators.power / 100, 0, 1);
  }

  // national electricity is the population-weighted state average
  eco.electricity = clamp100(weightedAverageIndicators(state).power);

  if (exec) processPlayerExecutive(state, exec, rng);
  else if (state.player.politics.seatId) processLegislator(state);
  else {
    state.government.approval = clamp(state.government.approval * 0.98 + 50 * 0.02, 0, 100);
  }
}

function adaptAllocations(alloc: Record<BudgetLine, number>, ind: Indicators, r: number) {
  const lines: [BudgetLine, number][] = [["infrastructure", ind.infrastructure], ["health", ind.health], ["education", ind.education], ["security", ind.security], ["power", ind.power]];
  lines.sort((a, b) => a[1] - b[1]);
  const worst = lines[0][0];
  const best = lines[lines.length - 1][0];
  const shift = 0.015 + r * 0.01;
  alloc[worst] += shift;
  alloc[best] = Math.max(0.03, alloc[best] - shift);
}

function leakShare(state: GameState): number {
  const open = state.government.projects.filter((p) => p.status === "active");
  const leak = open.reduce((t, p) => t + p.corruptionLeak, 0);
  const total = open.reduce((t, p) => t + p.costTotal, 0) || 1;
  return clamp(leak / total, 0, 0.5);
}

// ------------------------------------------------------------------ player's executive office
function processPlayerExecutive(state: GameState, info: ExecInfo, rng: ReturnType<typeof subRng>): void {
  const gov = state.government;
  const m = state.clock.monthIndex;
  const bud = jurisdictionBudget(state, info);
  const alloc = bud.allocations;
  const eff = efficiency(state) * (1 - leakShare(state));
  // revenue arrives; recurrent + programme spending leaves
  const inflow = bud.revenueMonthlyM;
  const spend = inflow * 0.97; // normal operations spend nearly all inflows
  addTreasury(state, info, inflow - spend);
  // local effects of the allocation on the home jurisdiction
  if (info.level === "local") {
    const l = state.lgas[info.scopeId];
    const ref = localRevenueM(state, info.scopeId) / l.pop;
    const d = spendingDelta(inflow, l.pop, alloc, ref, eff);
    for (const k of INDICATORS) l.indicators[k] = clamp(l.indicators[k] + (d[k] ?? 0) * 0.8, 3, 97);
    // local services are what voters judge: also push the state's satisfaction slightly
  }
  // projects
  for (const p of gov.projects) if (p.status === "active") stepProject(state, p, info, rng);
  // maintenance on finished projects
  for (const p of gov.projects) {
    if (p.status !== "complete") continue;
    const maint = p.maintenancePerMonth * priceLevel(state) * 0;
    void maint;
    if (p.maintenancePerMonth > 0) {
      const t = bud.treasuryM;
      if (t < 0) {
        // unpaid maintenance: the benefit erodes
        for (const k of INDICATORS) {
          const a = p.applied[k] ?? 0;
          if (a > 0) { const loss = a * 0.01; p.applied[k] = a - loss; scopeIndicator(state, info, p, k, -loss); }
        }
      } else addTreasury(state, info, -p.maintenancePerMonth);
    }
  }
  // legislative support
  const base = legislativeBase(state, info);
  gov.legislativeSupport = clamp100(gov.legislativeSupport * 0.85 + base * 0.15);
  // approval follows jurisdiction satisfaction and public trust
  const sat = info.level === "federal" ? state.economy.satisfaction : info.level === "state" ? state.states[info.scopeId].satisfaction : state.states[info.scopeId.split("-").slice(0, 2).join("-")].satisfaction * 0.5 + avgLgaSat(state, info.scopeId) * 0.5;
  const target = sat + (state.player.integrity.publicTrust - 60) * 0.1;
  gov.approval = clamp100(gov.approval + 0.1 * (target - gov.approval));
  // time in office builds name recognition
  const p = state.player;
  p.fame.national = clamp100(p.fame.national + (info.level === "federal" ? 0.8 : info.level === "state" ? 0.35 : 0.05));
  if (info.level !== "federal") {
    const sid = info.level === "state" ? info.scopeId : info.scopeId.split("-").slice(0, 2).join("-");
    p.fame.states[sid] = clamp100((p.fame.states[sid] ?? 0) + (info.level === "state" ? 0.5 : 0.1));
    if (info.level === "local") p.fame.lgas[info.scopeId] = clamp100((p.fame.lgas[info.scopeId] ?? 0) + 0.5);
  }
  p.politics.capital = clamp100(p.politics.capital + 0.2);
  void m;
}

function avgLgaSat(state: GameState, lgaId: string): number {
  const l = state.lgas[lgaId];
  return 20 + 0.6 * (INDICATORS.reduce((t, k) => t + l.indicators[k], 0) / INDICATORS.length) + 0.1 * (state.economy.satisfaction - 50);
}

function addTreasury(state: GameState, info: ExecInfo, deltaM: number) {
  if (info.level === "federal") state.economy.treasuryBn += deltaM / 1000;
  else if (info.level === "state") state.states[info.scopeId].treasuryM += deltaM;
  else state.government.localTreasuryM += deltaM;
}

function legislativeBase(state: GameState, info: ExecInfo): number {
  const party = state.player.politics.membership?.partyId;
  if (info.level === "local") {
    const sid = info.scopeId.split("-").slice(0, 2).join("-");
    const gov = state.seats[`gov:${sid}`];
    return 55 + (gov?.partyId === party ? 10 : -6);
  }
  const ids = info.level === "state" ? state.states[info.scopeId].assemblySeatIds : [...Object.values(state.seats).filter((s) => s.office === "reps" || s.office === "senate").map((s) => s.id)];
  let mine = 0, total = 0;
  for (const id of ids) {
    const s = state.seats[id];
    total++;
    if (s.partyId === party) mine++;
    else if (s.holderId && state.player.relationships[s.holderId] && state.player.relationships[s.holderId].affinity > 25) mine += 0.5;
  }
  return clamp100(20 + 80 * (mine / Math.max(1, total)) * 1.05);
}

function processLegislator(state: GameState): void {
  const seat = playerSeat(state)!;
  const gov = state.government;
  const party = state.player.politics.membership?.partyId;
  const sid = seat.stateId;
  // approval of a legislator is about their constituency's conditions and visible service
  const lgas = seat.lgaIds;
  const sat = lgas.length ? lgas.reduce((t, l) => t + avgLgaSat(state, l), 0) / lgas.length : state.economy.satisfaction;
  const bonus = (state.player.commitments.constituencyWork ? 4 : 0);
  gov.approval = clamp100(gov.approval + 0.08 * (sat + bonus + (state.player.integrity.publicTrust - 60) * 0.1 - gov.approval));
  const inPower = sid && state.seats[`gov:${sid}`]?.partyId === party;
  gov.legislativeSupport = clamp100(gov.legislativeSupport * 0.9 + (inPower ? 62 : 45) * 0.1);
  state.player.fame.lgas[lgas[0]] = clamp100((state.player.fame.lgas[lgas[0]] ?? 0) + 0.25);
  state.player.politics.capital = clamp100(state.player.politics.capital + 0.12);
}

// ------------------------------------------------------------------ projects
function scopeIndicator(state: GameState, info: ExecInfo, p: PolicyProject, k: Indicator, delta: number) {
  if (info.level === "local") applyIndicator(state, k, delta, { lgaId: info.scopeId });
  else if (info.level === "state") applyIndicator(state, k, delta, { stateId: info.scopeId });
  else applyIndicator(state, k, delta * 0.8, null);
  void p;
}

function stepProject(state: GameState, p: PolicyProject, info: ExecInfo, rng: ReturnType<typeof subRng>): void {
  const def = POLICY_BY_ID[p.defId];
  const support = state.government.legislativeSupport;
  // delays: uncertainty grows when legislative support or the treasury is weak
  const bud = jurisdictionBudget(state, info);
  const monthlyCost = p.costTotal / p.durationMonths;
  const speed = p.funding === "donor" ? 0.7 : 1;
  const cashNeeded = p.funding === "budget" ? monthlyCost : p.funding === "partnership" ? monthlyCost * 0.5 : p.funding === "borrowing" ? 0 : 0;
  let delayed = false;
  if (cashNeeded > 0 && bud.treasuryM < cashNeeded) { delayed = true; }
  if (rng.chance(def.delayRisk * (1 + (50 - support) / 100) * (state.economy.inflation > 25 ? 1.3 : 1))) delayed = true;
  if (delayed) {
    p.delays += 1;
    p.costTotal *= 1.01;
    return;
  }
  if (cashNeeded > 0) addTreasury(state, info, -cashNeeded);
  if (p.funding === "borrowing") {
    state.government.borrowedM += monthlyCost;
    if (info.level === "federal") state.economy.debtBn += monthlyCost / 1000;
    else if (info.level === "state") state.states[info.scopeId].debtM += monthlyCost;
  }
  p.spent += monthlyCost * speed;
  const dp = (1 / p.durationMonths) * speed;
  p.progress = Math.min(1, p.progress + dp);
  // benefits arrive in proportion to progress, reduced by deliberate leakage
  const leakFactor = 1 - clamp(p.corruptionLeak / p.costTotal, 0, 0.6);
  for (const k of INDICATORS) {
    const total = (def.effects[k] ?? 0) * leakFactor;
    if (!total) continue;
    const delta = total * dp;
    p.applied[k] = (p.applied[k] ?? 0) + delta;
    scopeIndicator(state, info, p, k, delta);
  }
  scopeIndicator(state, info, p, "economy", def.duringBuild * (1 / 1));
  if (p.progress >= 1) {
    p.status = "complete";
    p.completedMonth = state.clock.monthIndex;
    careerLog(state, `Completed: ${p.label}.`);
    notify(state, `Project complete: ${p.label}.`, "good", "government");
    pushNews(state, { headline: `${p.label} completed in ${info.label}`, body: `Delivered after ${p.durationMonths + p.delays} months.`, topic: info.level === "federal" ? "national" : "state", importance: info.level === "federal" ? 2 : 1, stateId: info.level === "federal" ? null : info.level === "state" ? info.scopeId : info.scopeId.split("-").slice(0, 2).join("-"), source: `project:${p.id}:done`, personal: true });
    state.government.approval = clamp100(state.government.approval + 3);
  }
}

export function startProject(state: GameState, defId: string, funding: Funding): Result {
  const info = execInfo(state);
  const def = POLICY_BY_ID[defId];
  if (!info || !def) return fail("You can't start that project.");
  if (def.level !== info.level) return fail(`This is a ${def.level}-level responsibility; you hold ${info.level}-level executive power.`);
  if (!def.funding.includes(funding)) return fail("That funding route isn't available for this project.");
  if (state.government.projects.some((p) => p.defId === defId && p.status === "active")) return fail("That project is already under way.");
  if (def.minSupport && state.government.legislativeSupport < def.minSupport) return fail(`The legislature won't approve this yet (support ${Math.round(state.government.legislativeSupport)}, needs ${def.minSupport}). Build support or negotiate first.`);
  const cost = Math.round(def.costM * priceLevel(state));
  const bud = jurisdictionBudget(state, info);
  const first = (cost / def.months) * 3;
  if ((funding === "budget" || funding === "partnership") && bud.treasuryM < first) return fail(`The treasury can't cover the first three months of spending (₦${Math.round(first).toLocaleString()}m).`);
  const p: PolicyProject = {
    id: newId(state, "p"), defId, level: info.level, scopeId: info.scopeId, label: def.label, startedMonth: state.clock.monthIndex, durationMonths: def.months,
    progress: 0, costTotal: cost, spent: 0, funding, delays: 0, status: "active", effects: def.effects, institution: def.institution,
    maintenancePerMonth: (cost * def.maintenancePct) / 100 / 12, applied: {}, corruptionLeak: 0,
  };
  state.government.projects.push(p);
  state.government.actions.push({ m: state.clock.monthIndex, text: `Launched: ${def.label} (₦${cost.toLocaleString()}m, ${funding})` });
  careerLog(state, `Launched ${def.label}.`);
  return good(`${def.label} is under way. It will take about ${def.months} months, with some risk of delay.`);
}

export function cancelProject(state: GameState, projectId: string): Result {
  const p = state.government.projects.find((x) => x.id === projectId);
  if (!p || p.status !== "active") return fail("No such active project.");
  p.status = "cancelled";
  state.government.approval = clamp100(state.government.approval - 3);
  return good("Project cancelled. Work done so far keeps its partial benefits, but money already spent is lost.");
}

// ------------------------------------------------------------------ budgets and policy levers
export function setAllocations(state: GameState, a: Record<BudgetLine, number>): Result {
  if (!execInfo(state)) return fail("Only executives set budgets.");
  state.government.allocations = normaliseAllocations(a);
  state.government.lastBudgetMonth = state.clock.monthIndex;
  state.government.actions.push({ m: state.clock.monthIndex, text: "Revised budget allocations" });
  return good("Budget allocations updated. Effects build gradually.");
}

export function setFuelSubsidy(state: GameState, level: number): Result {
  const info = execInfo(state);
  if (info?.level !== "federal") return fail("Fuel pricing policy is set federally.");
  if (state.government.legislativeSupport < 40 && Math.abs(level - state.economy.fuelSubsidy) > 0.25) return fail("The legislature won't back such a large change right now.");
  const prev = state.economy.fuelSubsidy;
  state.economy.fuelSubsidy = clamp(level, 0, 1);
  state.government.actions.push({ m: state.clock.monthIndex, text: `Fuel subsidy set to ${Math.round(level * 100)}% (was ${Math.round(prev * 100)}%)` });
  if (level < prev) {
    state.government.approval = clamp100(state.government.approval - (prev - level) * 18);
    notify(state, "Cutting the subsidy will raise pump prices over the coming months and save revenue.", "warn");
  }
  return good(`Fuel subsidy set to ${Math.round(level * 100)}%. Annual cost ≈ ₦${Math.round(subsidyCostAnnualBn(state.economy)).toLocaleString()}bn.`);
}

export function setDeficitTarget(state: GameState, v: number): Result {
  const info = execInfo(state);
  if (info?.level !== "federal") return fail("Only the President sets federal borrowing.");
  state.flags["deficitTarget"] = clamp(v, 0, 0.5);
  return good(`Planned deficit set to ${Math.round(v * 100)}% of revenue.`);
}

export function deficitTarget(state: GameState): number {
  return (state.flags["deficitTarget"] as number | undefined) ?? 0.2;
}

// ------------------------------------------------------------------ appointments
export const POSTS: Record<"local" | "state" | "federal", string[]> = {
  local: ["Supervisor for Works", "Supervisor for Health", "Supervisor for Education", "Head of Local Administration"],
  state: ["Commissioner for Works", "Commissioner for Health", "Commissioner for Education", "Commissioner for Finance", "Commissioner for Security Liaison"],
  federal: ["Minister of Finance", "Minister of Works", "Minister of Power", "Minister of Health", "Minister of Education", "Minister of Defence", "Minister of Agriculture", "Minister of Petroleum"],
};

export interface Nominee { id: string; name: string; competence: number; loyalty: number; factionId: string | null; integrity: number; partyId: string | null }
export function nomineesFor(state: GameState, post: string): Nominee[] {
  const rng = subRng(state.meta.seed, "nominees", post, Math.floor(state.clock.monthIndex / 12));
  const info = execInfo(state);
  if (!info) return [];
  const pool = Object.values(state.chars).filter((c) => c.kind === "politician" && c.status === "active" && !c.seatId && (info.level === "federal" || c.stateId === (info.level === "state" ? info.scopeId : info.scopeId.split("-").slice(0, 2).join("-"))));
  const myParty = state.player.politics.membership?.partyId;
  const sorted = rng.shuffle([...pool]).slice(0, 12).sort((a, b) => b.attrs.competence - a.attrs.competence);
  return sorted.slice(0, 4).map((c) => ({ id: c.id, name: c.name, competence: Math.round(c.attrs.competence), loyalty: Math.round(40 + (c.partyId === myParty ? 30 : 0) + rng.range(0, 25)), factionId: c.factionId, integrity: Math.round(c.attrs.integrity), partyId: c.partyId }));
}

export function appoint(state: GameState, post: string, charId: string): Result {
  const info = execInfo(state);
  if (!info) return fail("Only executives make these appointments.");
  const c = state.chars[charId];
  if (!c) return fail("Unknown nominee.");
  const gov = state.government;
  const nominee = nomineesFor(state, post).find((n) => n.id === charId);
  gov.appointees = gov.appointees.filter((a) => a.post !== post);
  gov.appointees.push({ id: charId, post, competence: nominee?.competence ?? Math.round(c.attrs.competence), loyalty: nominee?.loyalty ?? 50 });
  c.seatId = null;
  c.role = post;
  adjustRelation(state, charId, 12, "ally");
  if (c.factionId) gov.factionSatisfaction[c.factionId] = clamp((gov.factionSatisfaction[c.factionId] ?? 50) + 6, 0, 100);
  gov.legislativeSupport = clamp100(gov.legislativeSupport + (nominee ? (nominee.loyalty - 50) / 15 : 1));
  pushNews(state, { headline: `${state.player.name} names ${c.name} as ${post}`, topic: info.level === "federal" ? "national" : "state", importance: info.level === "federal" ? 2 : 1, stateId: info.level === "state" ? info.scopeId : null, source: `appoint:${state.clock.monthIndex}:${post}`, personal: true });
  return good(`${c.name} is now ${post}. Lawful patronage and merit both have a price — competent nominees raise delivery, loyal ones strengthen your hand.`);
}

export function appointmentChance(state: GameState, level: "local" | "state" | "federal"): { p: number; note: string } {
  const p = state.player;
  const m = p.politics.membership;
  if (!m) return { p: 0, note: "Join a party first." };
  if (p.politics.seatId) return { p: 0, note: "You already hold elected office." };
  if (p.politics.appointment) return { p: 0, note: "You already hold an appointment." };
  const sid = p.residenceStateId;
  const execSeat = level === "local" ? state.seats[`lgc:${p.residenceLgaId}`] : level === "state" ? state.seats[`gov:${sid}`] : state.seats["pres"];
  if (!execSeat || execSeat.partyId !== m.partyId) return { p: 0, note: "Your party does not hold this executive." };
  const ex = execSeat.holderId && execSeat.holderId !== "player" ? state.chars[execSeat.holderId] : null;
  const aff = ex ? (p.relationships[ex.id]?.affinity ?? 0) : 0;
  const need = { local: 5, state: 20, federal: 35 }[level];
  const chance = clamp(0.25 + (m.standing - 30) / 150 + (aff - need) / 120 + p.fame.national / 400 + p.attrs.politicalExperience / 400, 0.03, 0.85);
  return { p: chance, note: `Your party holds this executive. Relationship with ${ex?.name ?? "them"}: ${Math.round(aff)}.` };
}

/** Try to get a political appointment under a ruling-party executive. */
export function seekAppointment(state: GameState, level: "local" | "state" | "federal"): Result {
  const p = state.player;
  const m = p.politics.membership;
  const ch = appointmentChance(state, level);
  if (ch.p <= 0) return fail(ch.note);
  const sid = p.residenceStateId;
  const rng = subRng(state.meta.seed, "appointment", state.clock.monthIndex, level, Object.keys(p.relationships).length);
  if (!rng.chance(ch.p)) return fail(`No appointment this time (${Math.round(ch.p * 100)}% chance). Build more standing with the governing party.`);
  const label = { local: "Special Adviser to the LGA Chairman", state: "State Commissioner", federal: "Special Adviser to the President" }[level];
  p.politics.appointment = { id: `ap${state.nextId++}`, label, office: label, since: state.clock.monthIndex, level, stateId: level === "federal" ? null : sid };
  p.occupation = { kind: "civil_service", jobId: null, title: label, baseSalary: 0, since: state.clock.monthIndex, grade: 0, timePct: 55 };
  p.attrs.politicalExperience = clamp100(p.attrs.politicalExperience + 6);
  careerLog(state, `Appointed: ${label}.`);
  pushNews(state, { headline: `${p.name} appointed ${label}`, topic: "party", importance: 1, partyId: m!.partyId, stateId: sid, source: `appt:${state.clock.monthIndex}:${level}`, personal: true });
  return good(`You were appointed ${label}. You'll have to resign before contesting any election.`);
}

// ------------------------------------------------------------------ dealing with the legislature
export function negotiateWithLegislature(state: GameState): Result {
  const info = execInfo(state);
  if (!info) return fail("Only executives negotiate budgets with the legislature.");
  const p = state.player;
  if (p.politics.capital < 5) return fail("You need at least 5 political capital.");
  p.politics.capital = clamp100(p.politics.capital - 5);
  const gain = 6 + p.attrs.negotiation / 12;
  state.government.legislativeSupport = clamp100(state.government.legislativeSupport + gain);
  return good(`Quiet negotiations with committee chairs lift legislative support by about ${Math.round(gain)} points.`);
}

/** CORRUPT: divert public money into the player's illicit account. Explicit, consequential, traceable. */
export function divertFunds(state: GameState, amountM: number): Result {
  const info = execInfo(state);
  if (!info) return fail("You have no control over public funds.");
  const bud = jurisdictionBudget(state, info);
  const cap = Math.max(0, bud.treasuryM * 0.2);
  if (amountM <= 0 || amountM > cap) return fail("That amount can't be moved without immediate notice (max 20% of the treasury).");
  addTreasury(state, info, -amountM);
  startScheme(state, { kind: "fund_diversion", label: `Diversion of public funds (${info.label})`, gain: amountM * 1_000_000 * 0.01, category: "criminal", evidence: 40, witnesses: 4, officeId: playerSeat(state)?.id ?? null });
  // services suffer where the money would have gone
  scopeIndicator(state, info, {} as PolicyProject, "infrastructure", -0.8);
  state.government.approval = clamp100(state.government.approval - 1);
  return good("The money moved. Services quietly pay for it — and clerks who handled the paperwork now know.");
}

/** CORRUPT: inflate an active project and take a share (conflict-prone, traceable). */
export function inflateProject(state: GameState, projectId: string): Result {
  const info = execInfo(state);
  const p = state.government.projects.find((x) => x.id === projectId && x.status === "active");
  if (!info || !p) return fail("No such project.");
  if (p.corruptionLeak > 0) return fail("You have already padded this contract.");
  p.corruptionLeak = p.costTotal * 0.1;
  startScheme(state, { kind: "project_inflation", label: `Inflated contract: ${p.label}`, gain: p.costTotal * 0.06 * 1_000_000 * 0.01, category: "criminal", evidence: 26, witnesses: 3, officeId: playerSeat(state)?.id ?? null });
  return good("The contract was padded. The project will deliver less than it should.");
}

/** Award a contract to an ally's firm: conflict of interest, not criminal corruption. */
export function contractForAlly(state: GameState): Result {
  const info = execInfo(state);
  if (!info) return fail("Only executives award contracts.");
  const gov = state.government;
  startScheme(state, { kind: "ally_contract", label: "Contract awarded to an associate's company", gain: 0, category: "conflict_of_interest", evidence: 18, witnesses: 2, officeId: playerSeat(state)?.id ?? null });
  gov.legislativeSupport = clamp100(gov.legislativeSupport + 4);
  gov.approval = clamp100(gov.approval - 0.5);
  state.player.integrity.influence = clamp100(state.player.integrity.influence + 3);
  return good("Your associate is grateful and your coalition steadier. An ethics panel might ask how the contract was awarded.");
}

void partyDefOf;
