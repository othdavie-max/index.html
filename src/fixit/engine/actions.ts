/** Player commands. Every command validates, charges the treasury, changes state and returns a short plain-language report. */
import { subRng } from "../../game/engine/rng";
import { STATE_BY_ID } from "../../game/data/states";
import { FUNDING_LABEL, MEASURE_BY_ID, POLICY_BY_ID, PROJECT_BY_ID } from "../data/catalogue";
import type { Funding, FixState } from "./types";
import { advanceMonth } from "./sim";
import { resolveEvent } from "./events";
import { continueNextTerm } from "./legacy";
import { plantForMeasure, plantForPolicy, scheduleEcho } from "./echoes";
import { earn, nudgeGroups, relate } from "./society";
import { setMoment } from "./politics";
import { addMod, clamp, clamp100, debtServiceRatio, delivery, lever, monthLabel, nb, pushReport, realWage, removeMods, round } from "./util";

export interface Result { ok: boolean; message: string; lines?: string[] }
const fail = (message: string): Result => ({ ok: false, message });
export const priceMult = (s: FixState) => 0.6 + 0.4 * (s.eco.priceLevel / 100);

function pay(s: FixState, bn: number): string | null {
  if (bn > s.fin.treasury + 0.001) return `The treasury has ${nb(s.fin.treasury)} but this needs ${nb(bn)}.`;
  s.fin.treasury -= bn;
  return null;
}

// ------------------------------------------------------------------ policies
export function enactPolicy(s: FixState, id: string): Result {
  const d = POLICY_BY_ID[id];
  if (!d) return fail("Unknown policy.");
  if (s.policies[id]?.active) return fail("That policy is already in force.");
  const cost = d.setup * priceMult(s);
  const err = pay(s, cost);
  if (err) return fail(err);
  s.policies[id] = { active: true, since: s.month, level: 1 };
  addMod(s, `policy:${id}`, d.name, d.effects, { duration: null, ramp: Math.max(1, d.delay) });
  const m = s.modifiers.find((x) => x.source === `policy:${id}` && x.start === s.month);
  if (m) m.monthly = d.monthly;
  plantForPolicy(s, id, d.name);
  nudgeGroups(s, `policy:${id}`); earn(s, `policy:${id}`);
  const full = monthLabel(s.month + d.delay);
  const lines = [`${d.what}`, `Setup ${nb(cost)}${d.monthly ? `, then ${d.monthly > 0 ? "about " + nb(d.monthly * priceMult(s)) + " a month" : "saves about " + nb(-d.monthly * priceMult(s)) + " a month"}` : ""}.`, `Short term: ${d.short}`, `Long term: ${d.long}`, `Full effect by ${full}. Risk: ${d.risks}`];
  pushReport(s, { title: `Policy started: ${d.name}`, tone: "neutral", lines });
  return { ok: true, message: `${d.name} is now in force.`, lines };
}
export function repealPolicy(s: FixState, id: string): Result {
  const d = POLICY_BY_ID[id];
  if (!d || !s.policies[id]?.active) return fail("That policy is not in force.");
  s.policies[id].active = false;
  removeMods(s, `policy:${id}`);
  pushReport(s, { title: `Policy ended: ${d.name}`, tone: "neutral", lines: ["Its effects and running costs stop. Rebuilding it later would cost the setup fee again."] });
  return { ok: true, message: `${d.name} has been ended.` };
}

// ------------------------------------------------------------------ one-off measures
/** how many times a measure was used in the last 12 months */
export function recentUses(s: FixState, id: string): number {
  return String(s.flags[`uses:${id}`] ?? "").split(",").filter(Boolean).map(Number).filter((m) => s.month - m < 12).length;
}
export function applyMeasure(s: FixState, id: string): Result {
  const lines0: string[] = [];
  const d = MEASURE_BY_ID[id];
  if (!d) return fail("Unknown measure.");
  const cd = s.flags[`cd:measure:${id}`];
  if (typeof cd === "number" && s.month < cd) return fail(`Not available again until ${monthLabel(cd)}.`);
  if (id === "fxSale" && s.eco.reserves < 8) return fail("Reserves are too low to sell dollars.");
  const cost = d.cost * priceMult(s);
  const err = pay(s, cost);
  if (err) return fail(err);
  const sd = d.unc === "low" ? 0.1 : d.unc === "medium" ? 0.25 : 0.45;
  const rng = subRng(s.meta.seed, "measure", id, s.month);
  const recent = recentUses(s, id);
  const fatigue = 0.72 ** recent; // the same quick fix works less well each time it is repeated within a year
  const scale = clamp((0.7 + 0.3 * delivery(s)) * (1 + rng.normal(0, sd)) * fatigue, 0.15, 1.6);
  s.flags[`uses:${id}`] = [...String(s.flags[`uses:${id}`] ?? "").split(",").filter(Boolean), String(s.month)].slice(-6).join(",");
  addMod(s, `measure:${id}`, d.name, d.effects, { duration: d.duration, ramp: 1, scale });
  const m = s.modifiers.find((x) => x.source === `measure:${id}` && x.start === s.month);
  if (m && d.monthlyCost) m.monthly = d.monthlyCost;
  s.flags[`cd:measure:${id}`] = s.month + (d.cooldown ?? 4);
  plantForMeasure(s, id, d.name);
  nudgeGroups(s, `measure:${id}`); earn(s, `measure:${id}`);
  if (recent > 0) lines0.push(`Used ${recent} time${recent > 1 ? "s" : ""} in the past year, so it works less well now (people and markets expect it).`);
  const verdict = scale >= 1.1 ? "Early signs are better than expected." : scale >= 0.85 ? "Early signs are in line with expectations." : "Early signs are weaker than hoped.";
  const lines = [...lines0, d.explain, `Cost ${nb(cost)} now${d.monthlyCost ? ` plus ${nb(d.monthlyCost * priceMult(s))} a month for ${d.duration} months` : ""}.`, `Trade-off: ${d.tradeoff}`, `${verdict} Delivery is about ${Math.round(scale * 100)}% of the nominal effect.`];
  pushReport(s, { title: d.name, tone: scale >= 0.85 ? "good" : "neutral", lines });
  return { ok: true, message: `${d.name}: ${verdict}`, lines };
}

// ------------------------------------------------------------------ projects
export function projectCost(s: FixState, defId: string, funding: Funding): number {
  const d = PROJECT_BY_ID[defId];
  return d.cost * (s.eco.priceLevel / 100) * (funding === "ppp" ? 1.12 : 1);
}
export function canStartProject(s: FixState, defId: string, stateId: string, funding: Funding): string | null {
  const d = PROJECT_BY_ID[defId];
  if (!d) return "Unknown project.";
  if (!STATE_BY_ID[stateId]) return "Choose a state for the site.";
  if (d.sites && !d.sites.includes(stateId)) return `${d.name} can only be sited in ${d.sites.map((x) => STATE_BY_ID[x]?.name).join(", ")}.`;
  if (!d.funding.includes(funding)) return "That funding source is not available for this project.";
  const running = s.projects.filter((p) => p.defId === defId && (p.status === "active" || p.status === "stalled")).length;
  const total = s.projects.filter((p) => p.defId === defId && p.status !== "cancelled").length;
  if (d.max && total >= d.max) return `You can only run ${d.max} of these.`;
  if (running >= 3) return "Too many of these are already under construction.";
  if (funding === "concessional" && s.fin.creditRating < 25) return "Lenders will not extend development loans at the current credit rating.";
  if (funding === "ppp" && s.eco.investor < 35) return "Private partners are not interested at the current investor confidence.";
  if (funding === "treasury") {
    const first = projectCost(s, defId, funding) / d.months;
    if (first > s.fin.treasury) return `The treasury cannot cover even the first month (${nb(first)}).`;
  }
  return null;
}
export function startProject(s: FixState, defId: string, stateId: string, funding: Funding, opts: { lgaId?: string; favour?: boolean } = {}): Result {
  const err = canStartProject(s, defId, stateId, funding);
  if (err) return fail(err);
  const d = PROJECT_BY_ID[defId];
  const n = s.projects.length + 1;
  const id = `p${n}`;
  const rng = subRng(s.meta.seed, "project-start", id);
  const cap = clamp100(s.gov.capacity + lever(s, "capacity")), proc = clamp100(s.gov.procurement + lever(s, "procurement"));
  const quality = clamp(0.45 + 0.4 * proc / 100 + 0.2 * cap / 100 + rng.range(-0.15, 0.15) - (opts.favour ? 0.2 : 0), 0.25, 1);
  const cost = projectCost(s, defId, funding);
  const months = Math.round(d.months * (funding === "concessional" ? 1.2 : 1));
  s.projects.push({ id, defId, name: d.name, stateId, lgaId: opts.lgaId, funding, start: s.month, months, delay: 0, progress: 0, cost, baseCost: cost, spent: 0, leaked: 0, quality, status: "active", notes: [], favour: opts.favour });
  s.flags[`fx0:${id}`] = s.eco.fx;
  earn(s, "project"); relate(s, stateId, 4);
  if (opts.favour) {
    s.me.wealth += cost * 40 / 1000 * 1000 / 1000; // ₦m: 4% of the contract
    s.me.wealth = round(s.me.wealth, 1);
    s.me.evidence = clamp100(s.me.evidence + 7);
    s.gov.corruption = clamp100(s.gov.corruption + 0.8);
    s.me.acts.push("kickback");
    scheduleEcho(s, "contractorFails", `You gave the ${d.name.toLowerCase()} contract to a friend's firm`, Math.max(3, Math.round(months / 2)), "Your friend's firm may cut corners on the project", { key: id, stateId });
  }
  const lines = [
    `${d.what}`, `Site: ${STATE_BY_ID[stateId].name}. Budget ${nb(cost)} over about ${months} months, funded by: ${FUNDING_LABEL[funding]}.`,
    `Promised benefit: ${d.benefitText}.`,
    cap < d.capacityNeed ? `Warning: the government's delivery capacity (${Math.round(cap)}) is below what this project needs (${d.capacityNeed}); expect delays and overruns.` : "Delivery capacity looks adequate.",
    `Contractor quality rating: ${Math.round(quality * 100)} out of 100.`,
  ];
  pushReport(s, { title: `Project started: ${d.name}`, tone: "neutral", lines });
  return { ok: true, message: `${d.name} has begun in ${STATE_BY_ID[stateId].name}.`, lines };
}
export function cancelProject(s: FixState, id: string): Result {
  const p = s.projects.find((x) => x.id === id);
  if (!p || (p.status !== "active" && p.status !== "stalled")) return fail("That project cannot be cancelled.");
  p.status = "cancelled";
  s.gov.trust = clamp100(s.gov.trust - 1);
  pushReport(s, { title: `Project cancelled: ${p.name}`, tone: "bad", lines: [`${nb(p.spent)} already spent is lost, and the community is disappointed.`] });
  return { ok: true, message: `${p.name} was cancelled; ${nb(p.spent)} already spent is lost.` };
}

// ------------------------------------------------------------------ fuel subsidy
export type FuelAction = "increase" | "reduce" | "remove" | "reform";
export interface FuelPreview {
  action: FuelAction | "hold";
  coverage: number;
  pumpNow: number;
  pumpTarget: number;
  changePct: number;
  costBefore: number;
  costAfter: number;
  saving: number;
  savingShareOfDeficit: number;
  risk: "low" | "medium" | "high";
  notes: string[];
  setup: number;
}

function fuelCostAt(s: FixState, coverage: number, targeting: number, transfers: boolean) {
  const pl = s.eco.priceLevel / 100;
  const parity = (s.eco.oilPrice * s.eco.fx) / 159 * 1.35;
  const pump = parity * (1 - 0.5 * coverage);
  const leak = clamp(0.06 + 0.3 * (clamp100(s.gov.corruption + lever(s, "corruption")) / 100) * (1 - 0.6 * targeting), 0.04, 0.4);
  const litresM = 1500 * (1 + 0.15 * coverage);
  const tCost = transfers ? 150 * pl * (0.6 + 0.4 * delivery(s)) : 0;
  return { parity, pump, leak, cost: (litresM / 1000) * Math.max(0, parity - pump) * (1 + leak) + tCost };
}
export function previewFuel(s: FixState, action: FuelAction | "hold"): FuelPreview {
  const f = s.fuel;
  let c = f.coverage, t = f.targeting, tr = f.transfers;
  if (action === "increase") c = Math.min(1, c + 0.15);
  if (action === "reduce") c = c * 0.5;
  if (action === "remove") { c = 0; }
  if (action === "reform") { c = Math.min(c, 0.1); t = 0.8; tr = true; }
  const before = fuelCostAt(s, f.coverage, f.targeting, f.transfers);
  const after = fuelCostAt(s, c, t, tr);
  const change = (after.pump / f.pump - 1) * 100;
  const deficit = Math.max(1, s.fin.deficit);
  const rw = realWage(s);
  const score = Math.max(0, change) / 30 + Math.max(0, 100 - rw) / 60 + (50 - s.gov.trust) / 80 - (tr ? 0.4 * delivery(s) : 0);
  const risk = score < 0.5 ? "low" : score < 1.1 ? "medium" : "high";
  const notes: string[] = [];
  notes.push(`Market (import-parity) price now: ₦${Math.round(before.parity)} a litre; pumps charge ₦${Math.round(f.pump)}.`);
  if (change > 1) notes.push(`Pump price heads toward ₦${Math.round(after.pump)} (${round(change)}% higher) over a few months, lifting transport, food and general prices.`);
  if (change < -1) notes.push(`Pump price heads toward ₦${Math.round(after.pump)} (${round(-change)}% lower).`);
  notes.push(`Leakage and smuggling absorb about ${Math.round(before.leak * 100)}% of subsidy spending today${tr ? "" : "; targeted transfers would cut it"}.`);
  if (f.importShare > 0.7) notes.push(`Refineries cover only ${Math.round((1 - f.importShare) * 100)}% of demand, so most of the subsidy goes on imported fuel and dollars.`);
  if (s.eco.fx > 1700) notes.push("A weak naira makes the subsidy bill much bigger.");
  if (s.fin.deficit > 0 && debtServiceRatio(s) > 0.4) notes.push("Debt payments leave little room: savings would ease borrowing.");
  if (action === "reform") notes.push(`Cash transfers reach about ${Math.round((0.25 + 0.6 * s.gov.capacity / 100) * 100)}% of the intended households at today's government capacity; weak systems mean leakage and anger at first.`);
  if (rw < 90) notes.push("Households are already squeezed (real incomes below start), so a price jump is risky.");
  return {
    action, coverage: c, pumpNow: f.pump, pumpTarget: after.pump, changePct: change, costBefore: before.cost, costAfter: after.cost, saving: before.cost - after.cost,
    savingShareOfDeficit: (before.cost - after.cost) / deficit, risk, notes, setup: action === "reform" ? 60 * priceMult(s) : 0,
  };
}
export function applyFuel(s: FixState, action: FuelAction): Result {
  const pv = previewFuel(s, action);
  if (action === "reform" && s.fuel.transfers) return fail("Targeted transfers are already in place.");
  if (action === "increase" && s.fuel.coverage >= 1) return fail("The subsidy is already at its maximum.");
  if ((action === "reduce" || action === "remove") && s.fuel.coverage < 0.02) return fail("There is no subsidy left to cut.");
  const err = pv.setup ? pay(s, pv.setup) : null;
  if (err) return fail(err);
  const f = s.fuel;
  f.coverage = pv.coverage;
  if (action === "reform") {
    f.targeting = 0.8; f.transfers = true;
    const reach = clamp(0.25 + 0.6 * s.gov.capacity / 100, 0.2, 0.9);
    addMod(s, "policy:fuelTransfers", "Targeted fuel transfers", { wage: 4 * reach, happiness: 2.5 * reach, welfare: 4 * reach }, { duration: null, ramp: 4 });
  }
  s.flags.fuelActionMonth = s.month;
  nudgeGroups(s, `fuel:${action}`); earn(s, `fuel:${action}`);
  if (action !== "increase") setMoment(s, "fuel");
  if (action === "remove" || action === "reduce") scheduleEcho(s, "fuelShockWave", action === "remove" ? "You removed the fuel subsidy" : "You halved the fuel subsidy", 2, "Bus fares and food prices will follow fuel up", { key: action });
  if (action === "reform") scheduleEcho(s, "transfersVerdict", "You replaced the fuel subsidy with targeted transfers", 6, "Verdict: are transfers reaching the poor?", { key: action });
  const lines = [
    ...pv.notes,
    `Estimated monthly saving once prices settle: ${nb(pv.saving)} (${Math.round(pv.savingShareOfDeficit * 100)}% of the current monthly deficit).`,
    `Protest risk: ${pv.risk}.`,
  ];
  pushReport(s, { title: `Fuel subsidy: ${action}`, tone: pv.risk === "high" ? "bad" : "neutral", lines });
  return { ok: true, message: `Fuel subsidy ${action === "reform" ? "reformed to targeted transfers" : action === "remove" ? "removed" : action === "reduce" ? "halved" : "increased"}.`, lines };
}

// ------------------------------------------------------------------ money
export type BorrowKind = "domestic" | "bond" | "repay";
export function borrow(s: FixState, kind: BorrowKind, amount: number): Result {
  const f = s.fin, e = s.eco;
  if (!(amount > 0)) return fail("Enter an amount.");
  if (kind === "domestic") {
    if (amount > 3000) return fail("Local banks will lend at most ₦3tn at a time.");
    if (debtServiceRatio(s) > 0.9) return fail("Debt payments already take almost all revenue; lenders refuse.");
    f.treasury += amount; f.domesticDebt += amount; earn(s, "borrow");
    f.domRate = Math.min(34, f.domRate + 0.15 * (amount / 1000));
    s.jobs.sme = clamp100(s.jobs.sme - 0.4 * (amount / 1000));
    if (amount >= 2000) scheduleEcho(s, "crowdOut", `You borrowed ${nb(amount)} from local banks`, 4, "Banks may lend less to businesses", { key: String(amount) });
    const lines = [`Borrowed ${nb(amount)} from local banks at about ${round(f.domRate, 1)}%.`, "Cash is available now, but interest is paid every month and bank lending to businesses is squeezed."];
    pushReport(s, { title: "Borrowed at home", tone: "neutral", lines });
    return { ok: true, message: `Borrowed ${nb(amount)} at home.`, lines };
  }
  if (kind === "bond") {
    if (f.creditRating < 25) return fail("Foreign investors will not buy bonds at the current credit rating.");
    if (amount > 3) return fail("Investors will take at most $3bn at a time.");
    const rate = clamp(8 + (60 - f.creditRating) * 0.15 + 0.1 * Math.max(0, e.inflation - 15), 7, 16);
    f.forRate = (f.forRate * f.foreignDebt + rate * amount) / (f.foreignDebt + amount);
    f.foreignDebt += amount; f.treasury += amount * e.fx; e.reserves += amount * 0.5; earn(s, "borrow");
    scheduleEcho(s, "bondRepay", `You borrowed $${amount}bn in dollars`, 12, "If the naira falls, this dollar debt costs more", { key: String(amount) });
    const lines = [`Issued $${amount}bn of dollar bonds at about ${round(rate, 1)}%.`, `You get ${nb(amount * e.fx)} now. Repayments are in dollars: if the naira falls 20%, the naira cost of this debt rises 20%.`];
    pushReport(s, { title: "Dollar bond issued", tone: "neutral", lines });
    return { ok: true, message: `Issued $${amount}bn of bonds.`, lines };
  }
  const room = Math.max(0, f.treasury - 400 * priceMult(s));
  if (amount > room) return fail(`Only ${nb(room)} can be spared while keeping a cash buffer.`);
  if (amount > f.domesticDebt) return fail("That is more than the local debt.");
  f.treasury -= amount; f.domesticDebt -= amount;
  return { ok: true, message: `Repaid ${nb(amount)} of local debt; interest costs fall.` };
}
export function setFxDefence(s: FixState, level: number): Result {
  s.eco.fxDefence = clamp(level, 0, 1);
  return { ok: true, message: level > 0.5 ? "The central bank will sell dollars heavily to slow the naira's fall; this drains reserves." : level > 0.05 ? "The central bank will sell some dollars to smooth the naira." : "The central bank will let the market set the naira's rate." };
}

// ------------------------------------------------------------------ events and time
export function respond(s: FixState, eventId: string, optionId: string): Result {
  const r = resolveEvent(s, eventId, optionId);
  if ("error" in r) return fail(r.error);
  return { ok: r.ok, message: r.text, lines: [`Chance of success was about ${Math.round(r.chance * 100)}%.`] };
}
export function advance(s: FixState): Result {
  if (s.ended) return fail("This term has ended. Read your legacy report first.");
  const ok = advanceMonth(s);
  return ok ? { ok: true, message: `Now ${monthLabel(s.month)}.` } : fail("Time cannot move forward.");
}
export function nextTerm(s: FixState): Result {
  return continueNextTerm(s) ? { ok: true, message: "Second term begins." } : fail("There is no second term to start.");
}

/** Runs a challenge action chosen on the dashboard. Projects need a site, so the UI collects it first. */
export function performRef(s: FixState, ref: import("./challenge").ActionRef): Result {
  switch (ref.type) {
    case "measure": return applyMeasure(s, ref.id);
    case "policy": return enactPolicy(s, ref.id);
    case "fuel": return applyFuel(s, ref.action);
    case "respond": return respond(s, ref.eventId, ref.optionId);
    case "bond": return borrow(s, "bond", 1);
    case "wait": return { ok: true, message: "You held steady and watched the numbers." };
    case "project": return fail("Choose a site for the project first.");
  }
}
