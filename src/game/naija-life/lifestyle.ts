import { INVESTMENTS, LUXURIES, STATE_BY_ID } from "./data";
import { bump } from "./helpers";
import { netWorth } from "./kidnap";
import type { HoldingKind, Player } from "./types";
import { chance, naira, rand, uid } from "./util";

export function luxuryCost(p: Player, base: number): number {
  return Math.round(base * Math.pow(p.index, 0.95));
}

export function luxuryBlock(p: Player, id: string): string | null {
  const l = LUXURIES.find((x) => x.id === id);
  if (!l) return "Unknown item";
  if (p.prison > 0) return "You're in prison";
  if (l.once && p.flags[`own_${id}`]) return "Already owned";
  if (p.money < luxuryCost(p, l.cost)) return "Not enough cash";
  if (l.minWealth && netWorth(p) < l.minWealth * Math.pow(p.index, 0.95)) return "Only for the very rich";
  return null;
}

export function buyLuxury(p: Player, id: string): string {
  const l = LUXURIES.find((x) => x.id === id);
  if (!l) return "";
  const cost = luxuryCost(p, l.cost);
  p.money -= cost;
  if (l.once) p.flags[`own_${id}`] = true;
  p.prestige += l.prestige;
  if (l.reputation) bump(p, "reputation", l.reputation);
  if (l.connections) bump(p, "connections", l.connections);
  if (l.happiness) bump(p, "happiness", l.happiness);
  if (l.good) p.goodDeeds += 1;
  return `You spent ${naira(cost)} on: ${l.label}.`;
}

export function investBlock(p: Player, kind: HoldingKind, amount: number): string | null {
  const opt = INVESTMENTS.find((o) => o.kind === kind);
  if (!opt) return "Unknown";
  if (amount < opt.min * p.index) return `Minimum ${naira(opt.min * p.index)}`;
  if (p.money < amount) return "Not enough cash";
  return null;
}

export function invest(p: Player, kind: HoldingKind, amount: number): string {
  const opt = INVESTMENTS.find((o) => o.kind === kind);
  if (!opt) return "";
  p.money -= amount;
  const existing = p.holdings.find((h) => h.kind === kind);
  if (existing) {
    existing.invested += amount;
    existing.value += amount;
  } else {
    p.holdings.push({ id: uid(), kind, label: opt.label, invested: amount, value: amount });
  }
  if (kind === "school" || kind === "bank") p.prestige += 1;
  return `You invested ${naira(amount)} in ${opt.label}.`;
}

export function divest(p: Player, id: string): string {
  const i = p.holdings.findIndex((h) => h.id === id);
  if (i < 0) return "";
  const h = p.holdings[i];
  p.money += h.value;
  p.holdings.splice(i, 1);
  return `You cashed out ${h.label}: ${naira(h.value)}.`;
}

/** Annual returns. `rate` is this year's inflation (so USD holds real value). */
export function yearlyHoldings(p: Player, rate: number, lines: string[]): void {
  for (const h of p.holdings) {
    let r = 0;
    switch (h.kind) {
      case "usd": r = rate * rand(0.8, 1.3); break;
      case "stocks": r = rand(-0.25, 0.4); break;
      case "crypto":
        if (chance(0.08)) { lines.push("Your crypto platform rug-pulled. Everything gone."); h.value = 0; continue; }
        r = rand(-0.5, 1.1);
        break;
      case "farm": r = rand(-0.1, 0.3) - (STATE_BY_ID[p.state].risk >= 7 ? 0.1 : 0); break;
      case "oil": r = rand(-0.4, 0.9); break;
      case "school": r = rand(0.05, 0.2); break;
      case "bank": r = rand(0.04, 0.16); break;
    }
    h.value = Math.max(0, Math.round(h.value * (1 + r)));
  }
  p.holdings = p.holdings.filter((h) => h.value > 0);
}

export function yearlyUpkeep(p: Player): number {
  let total = 0;
  for (const l of LUXURIES) {
    if (l.upkeep && p.flags[`own_${l.id}`]) total += luxuryCost(p, l.upkeep);
  }
  return total;
}
