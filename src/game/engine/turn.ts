/**
 * Turn processing. One call advances the world by exactly one month, in a fixed documented order:
 *
 *   1. personal circumstances and recurring expenses
 *   2. employment, income and economic changes
 *   3. political relationships and party activity
 *   4. government performance and policy effects
 *   5. events, investigations and public reactions
 *   6. election schedules and deadlines
 *   7. notifications and the updated news feed
 *
 * `clock.processedThrough` guarantees a month is processed once: calling advanceMonth again for a month that is
 * already done is a no-op, so no effect (money, votes, events) can be applied twice.
 */
import type { GameState } from "./types";
import { processExpenses, processIncome, processCareer, processWellbeing } from "./life";
import { stepEconomy } from "./economy";
import { deficitTarget, efficiency, execInfo, processGovernance } from "./governance";
import { processEvents, expirePending } from "./events";
import { processCorruption } from "./corruption";
import { processElections } from "./elections";
import { processPlayerCampaign } from "./campaign";
import { processAi } from "./ai";
import { processPartyFounding, expirePartyOffice } from "./politics";
import { decayRelationships } from "./relationships";
import { closeMonth, netWorth } from "./finance";
import { subRng, clamp100 } from "./rng";
import { pushNews, notify } from "./news";
import { weightedAverageIndicators } from "./world";
import { playerAge, formatMonth, gameDate } from "./calendar";

export function canAdvance(state: GameState): { ok: boolean; reason?: string } {
  if (state.gameOver) return { ok: false, reason: "This life has ended." };
  if (state.pending.length > 0) return { ok: false, reason: "A decision is waiting for you." };
  return { ok: true };
}

export function advanceMonth(state: GameState): boolean {
  const gate = canAdvance(state);
  if (!gate.ok) return false;
  const next = state.clock.monthIndex + 1;
  if (state.clock.processedThrough >= next) return false;
  expirePending(state);
  state.clock.monthIndex = next;
  const jailed = typeof state.flags["jailedUntil"] === "number" && (state.flags["jailedUntil"] as number) > next;

  // 1. personal circumstances
  if (!jailed) processExpenses(state);
  // 2. income and economy
  if (!jailed) processIncome(state);
  const avg = weightedAverageIndicators(state);
  const eco = state.economy;
  const before = { inflation: eco.inflation, fuel: eco.fuelPrice, fx: eco.fxRate, unemployment: eco.unemployment };
  const exec = execInfo(state);
  stepEconomy(eco, { avg, efficiency: exec?.level === "federal" ? efficiency(state) : 0.58, deficitTarget: exec?.level === "federal" ? deficitTarget(state) : 0.2 }, subRng(state.meta.seed, "economy", next));
  processCareer(state);
  // 3. political relationships and party activity
  decayRelationships(state);
  expirePartyOffice(state);
  processPartyFounding(state);
  processAi(state);
  // 4. government performance
  processGovernance(state);
  // 5. events, investigations, reactions
  processEvents(state);
  processCorruption(state);
  processPlayerCampaign(state);
  processWellbeing(state);
  // 6. elections
  processElections(state);
  // 7. news and bookkeeping
  economyNews(state, before);
  closeMonth(state);
  recordHistory(state);
  if (state.player.attrs.health <= 0 && !state.gameOver) {
    state.gameOver = { month: next, kind: "died", text: `${state.player.name}'s health failed.` };
  }
  state.clock.processedThrough = next;
  void jailed;
  return true;
}

function recordHistory(state: GameState) {
  const e = state.economy;
  const p = state.player;
  const fame = Math.max(p.fame.national, ...Object.values(p.fame.states), 0);
  state.history.push({ m: state.clock.monthIndex, inflation: round(e.inflation), unemployment: round(e.unemployment), gdpGrowth: round(e.gdpGrowth), satisfaction: round(e.satisfaction), fx: Math.round(e.fxRate), purchasingPower: round(e.purchasingPower), wealth: Math.round(netWorth(p.finances)), popularity: round(fame) });
  if (state.history.length > 720) state.history.shift();
}
const round = (v: number) => Math.round(v * 10) / 10;

/** Headlines generated from actual indicator movements — never from nothing. */
function economyNews(state: GameState, before: { inflation: number; fuel: number; fx: number; unemployment: number }) {
  const e = state.economy;
  const m = state.clock.monthIndex;
  const bucket = (v: number, step: number) => Math.floor(v / step);
  const last = (k: string) => state.flags[k] as number | undefined;
  const ib = bucket(e.inflation, 5);
  if (last("nb_infl") !== undefined && ib !== last("nb_infl")) {
    const up = ib > (last("nb_infl") as number);
    pushNews(state, { headline: `Inflation ${up ? "climbs to" : "eases to"} ${e.inflation.toFixed(1)}%`, body: `Annual inflation was ${before.inflation.toFixed(1)}% last month.`, topic: "economy", importance: up && e.inflation > 25 ? 3 : 2, source: `econ:infl:${m}` });
  }
  state.flags["nb_infl"] = ib;
  const fuelChange = e.fuelPrice / before.fuel - 1;
  if (Math.abs(fuelChange) > 0.06) {
    pushNews(state, { headline: `Pump price ${fuelChange > 0 ? "rises" : "falls"} to ₦${Math.round(e.fuelPrice).toLocaleString()} a litre`, topic: "economy", importance: fuelChange > 0 ? 2 : 1, source: `econ:fuel:${m}` });
  }
  const fxChange = e.fxRate / before.fx - 1;
  if (Math.abs(fxChange) > 0.05) {
    pushNews(state, { headline: `Naira ${fxChange > 0 ? "weakens" : "strengthens"} to ₦${Math.round(e.fxRate).toLocaleString()} per dollar`, topic: "economy", importance: 2, source: `econ:fx:${m}` });
  }
  const ub = bucket(e.unemployment, 2);
  if (last("nb_unemp") !== undefined && ub !== last("nb_unemp")) {
    pushNews(state, { headline: `Unemployment ${ub > (last("nb_unemp") as number) ? "rises" : "falls"} to ${e.unemployment.toFixed(1)}% (simulated measure)`, topic: "economy", importance: 1, source: `econ:unemp:${m}` });
  }
  state.flags["nb_unemp"] = ub;
}

/** Advance until something worth stopping for happens (or a limit is reached). Returns months advanced. */
export function advanceToNextEvent(state: GameState, maxMonths = 24): number {
  let n = 0;
  const startNotifs = state.notifications.length;
  const startStage = state.player.politics.candidacies.map((c) => c.stage).join(",");
  while (n < maxMonths) {
    if (!advanceMonth(state)) break;
    n++;
    if (state.pending.length || state.gameOver) break;
    const fresh = state.notifications.slice(startNotifs).some((x) => x.level !== "info" && !x.read);
    if (fresh) break;
    if (state.player.politics.candidacies.map((c) => c.stage).join(",") !== startStage) break;
    if (playerAge(state) !== playerAge({ ...state, clock: { ...state.clock, monthIndex: state.clock.monthIndex - 1 } } as GameState)) break; // birthday
  }
  return n;
}

void clamp100; void notify; void formatMonth; void gameDate;
