import type { GameDate, GameState } from "./types";
import { RULESETS } from "../data/rules";

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MONTH_SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));

/** Month index 0 = ruleset start (e.g. January 2026). */
export function dateOf(monthIndex: number, startYear = 2026, startMonth = 1): GameDate {
  const total = startYear * 12 + (startMonth - 1) + monthIndex;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}
export function monthIndexOf(year: number, month: number, startYear = 2026, startMonth = 1): number {
  return year * 12 + (month - 1) - (startYear * 12 + (startMonth - 1));
}
export function gameDate(state: Pick<GameState, "meta" | "clock">, monthIndex = state.clock.monthIndex): GameDate {
  const r = RULESETS[state.meta.rulesetId];
  return dateOf(monthIndex, r.startYear, r.startMonth);
}
export function formatDate(d: GameDate): string {
  return `${MONTH_NAMES[d.month - 1]} ${d.year}`;
}
export function formatMonth(state: Pick<GameState, "meta" | "clock">, monthIndex: number): string {
  return formatDate(gameDate(state, monthIndex));
}
export function formatMonthShort(state: Pick<GameState, "meta" | "clock">, monthIndex: number): string {
  const d = gameDate(state, monthIndex);
  return `${MONTH_SHORT[d.month - 1]} ${d.year}`;
}
/** Age in whole years at `monthIndex`. */
export function ageAt(birthMonth: number, monthIndex: number): number {
  return Math.floor((monthIndex - birthMonth) / 12);
}
export function playerAge(state: GameState, monthIndex = state.clock.monthIndex): number {
  return ageAt(state.player.birthMonth, monthIndex);
}
export function calendarMonth(state: Pick<GameState, "meta" | "clock">, monthIndex = state.clock.monthIndex): number {
  return gameDate(state, monthIndex).month;
}
/** Next month index (>= from) whose calendar month equals `month` (1..12). */
export function nextMonthIndexWithCalendarMonth(state: Pick<GameState, "meta" | "clock">, month: number, from = state.clock.monthIndex): number {
  for (let i = from; i < from + 12; i++) if (calendarMonth(state, i) === month) return i;
  return from;
}
export function describeMonthsAway(n: number): string {
  if (n <= 0) return "this month";
  if (n === 1) return "next month";
  if (n < 12) return `in ${n} months`;
  const y = Math.floor(n / 12), m = n % 12;
  return `in ${y} yr${y > 1 ? "s" : ""}${m ? ` ${m} mo` : ""}`;
}
