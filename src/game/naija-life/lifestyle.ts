import { INVESTMENTS, LUXURIES, STATE_BY_ID } from "./data";
import { bump } from "./helpers";
import { monthIndex, transact } from "./ledger";
import { advisorMonth, marketDynamics } from "./markets";
import { netWorth } from "./kidnap";
import type { HoldingKind, Player } from "./types";
import { T, chance, clamp, naira, rand, uid } from "./util";

export function luxuryCost(p: Player, base: number): number {
  return Math.round(base * Math.pow(p.index, 0.95));
}

export function luxuryBlock(p: Player, id: string): string | null {
  const l = LUXURIES.find((x) => x.id === id);
  if (!l) return T("Unknown item", "Item no dey");
  if (p.prison > 0) return T("You're in prison", "You dey prison");
  if (l.once && p.flags[`own_${id}`]) return T("Already owned", "You don get am already");
  if (p.money < luxuryCost(p, l.cost)) return T("Not enough cash", "Cash no reach");
  if (l.minWealth && netWorth(p) < l.minWealth * Math.pow(p.index, 0.95)) return T("Only for the very rich", "Na only big rich people");
  return null;
}

export function buyLuxury(p: Player, id: string): string {
  const l = LUXURIES.find((x) => x.id === id);
  if (!l) return "";
  const cost = luxuryCost(p, l.cost);
  transact(p, { amount: -cost, reason: l.label, category: "personal" });
  if (l.once) p.flags[`own_${id}`] = true;
  p.prestige += l.prestige;
  if (l.reputation) bump(p, "reputation", l.reputation);
  if (l.connections) bump(p, "connections", l.connections);
  if (l.happiness) bump(p, "happiness", l.happiness);
  if (l.good) p.goodDeeds += 1;
  return T(`You spent ${naira(cost)} on: ${l.label}.`, `You spend ${naira(cost)} on: ${l.label}.`);
}

// ---------------------------------------------------------------------------
// Investments
// ---------------------------------------------------------------------------
export const MARKET_KINDS: HoldingKind[] = ["stocks", "crypto", "fund", "penny", "cryptofund", "reit", "bond"];
export const priceOfKind = (p: Player, k: HoldingKind) =>
  k === "stocks" ? p.market.ngx : k === "crypto" ? p.market.crypto : k === "penny" ? p.market.penny ?? 100 : k === "cryptofund" ? p.market.cfund ?? 100 : k === "reit" ? p.market.reit ?? 100 : k === "bond" ? p.market.bond ?? 100 : p.market.fund;

export function investBlock(p: Player, kind: HoldingKind, amount: number): string | null {
  const opt = INVESTMENTS.find((o) => o.kind === kind);
  if (!opt) return T("Unknown", "Dem no know am");
  if (p.age < 18) return T("Adults only", "Na only grown-ups");
  if (amount < opt.min * p.index) return T(`Minimum ${naira(opt.min * p.index)}`, `Minimum na ${naira(opt.min * p.index)}`);
  if (p.money < amount) return T("Not enough cash", "Cash no reach");
  return null;
}

export function invest(p: Player, kind: HoldingKind, amount: number): string {
  const opt = INVESTMENTS.find((o) => o.kind === kind);
  if (!opt) return "";
  transact(p, { amount: -amount, reason: T(`Invested in ${opt.label.toLowerCase()}`, `Invest for ${opt.label.toLowerCase()}`), category: "investment" });
  const market = MARKET_KINDS.includes(kind);
  const units = market ? amount / priceOfKind(p, kind) : undefined;
  const existing = p.holdings.find((h) => h.kind === kind);
  if (existing) {
    existing.invested += amount;
    existing.value += amount;
    if (units !== undefined) existing.units = (existing.units ?? 0) + units;
  } else {
    p.holdings.push({ id: uid(), kind, label: opt.label, invested: amount, value: amount, units, since: monthIndex(p) });
  }
  if (kind === "school" || kind === "bank") p.prestige += 1;
  return T(`You invested ${naira(amount)} in ${opt.label.toLowerCase()}.`, `You invest ${naira(amount)} for ${opt.label.toLowerCase()}.`);
}

export function divest(p: Player, id: string): string {
  const i = p.holdings.findIndex((h) => h.id === id);
  if (i < 0) return "";
  const h = p.holdings[i];
  let proceeds = h.value;
  let note = "";
  if (h.kind === "tbill" && h.since !== undefined && monthIndex(p) - h.since < 12) {
    const penalty = proceeds * 0.03;
    proceeds -= penalty;
    note = T(` (early sale cost ${naira(penalty)})`, ` (early sale cost ${naira(penalty)})`);
  }
  transact(p, { amount: proceeds, reason: T(`Sold ${h.label.toLowerCase()}${proceeds - h.invested >= 0 ? " at a profit" : " at a loss"}`, `Sell ${h.label.toLowerCase()}${proceeds - h.invested >= 0 ? " with profit" : " with loss"}`), category: "investment" });
  p.holdings.splice(i, 1);
  return T(`You cashed out ${h.label.toLowerCase()}: ${naira(proceeds)}${note}.`, `You cash out ${h.label.toLowerCase()}: ${naira(proceeds)}${note}.`);
}

/** Market prices and interest accrue every month. */
export function marketMonth(p: Player, lines: string[]) {
  marketDynamics(p);
  advisorMonth(p, lines);
  for (const h of p.holdings) {
    if (MARKET_KINDS.includes(h.kind) && h.units !== undefined) h.value = Math.round(h.units * priceOfKind(p, h.kind));
    else if (h.kind === "savings") h.value = Math.round(h.value * (1 + p.market.savings / 12));
    else if (h.kind === "tbill") h.value = Math.round(h.value * (1 + p.market.tbill / 12));
    else if (h.kind === "crypto" && chance(0.004)) { h.value = 0; lines.push(T("Your crypto platform collapsed overnight. The money is gone.", "Your crypto platform crash overnight. Money don go.")); }
    if (h.kind === "penny" && chance(0.007)) { h.value = 0; lines.push(T("One of your penny stocks was delisted. It is worth nothing.", "Dem delist one of your penny stocks. E no worth anything again.")); }
  }
  p.holdings = p.holdings.filter((h) => h.value > 0);
}

/** Annual returns for the slower asset classes. `rate` is this year's inflation. */
export function yearlyHoldings(p: Player, rate: number, lines: string[]): void {
  p.market.savings = clamp(0.06 + rate * 0.3 + rand(-0.01, 0.01), 0.05, 0.14);
  p.market.tbill = clamp(0.1 + rate * 0.8 + rand(-0.02, 0.02), 0.08, 0.28);
  for (const h of p.holdings) {
    let r = 0;
    switch (h.kind) {
      case "usd": r = rate * rand(0.8, 1.3); break;
      case "farm": r = rand(-0.1, 0.3) - (STATE_BY_ID[p.state].risk >= 7 ? 0.1 : 0); break;
      case "oil": r = rand(-0.4, 0.9); break;
      case "school": r = rand(0.05, 0.2); break;
      case "bank": r = rand(0.04, 0.16); break;
      default: continue;
    }
    h.value = Math.max(0, Math.round(h.value * (1 + r)));
  }
  void lines;
  p.holdings = p.holdings.filter((h) => h.value > 0);
}

export function yearlyUpkeep(p: Player): number {
  let total = 0;
  for (const l of LUXURIES) {
    if (l.upkeep && p.flags[`own_${l.id}`]) total += luxuryCost(p, l.upkeep);
  }
  return total;
}

export function portfolioValue(p: Player) {
  const value = p.holdings.reduce((s, h) => s + h.value, 0);
  const invested = p.holdings.reduce((s, h) => s + h.invested, 0);
  return { value, invested, gain: value - invested };
}
