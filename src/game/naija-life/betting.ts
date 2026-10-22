import { transact } from "./ledger";
import { bump, luckBonus } from "./helpers";
import type { EventDef, Player } from "./types";
import { T, chance, clamp, dual, naira, rand } from "./util";

export type BetKind = "single" | "acca" | "longshot";

export const BET_KINDS: { id: BetKind; label: string; blurb: string }[] = [
  { id: "single", get label() { return T("Single match", "Single match"); }, get blurb() { return T("One game. Odds around 1.4 to 3.2.", "Na one game. Odds dey around 1.4 to 3.2."); } },
  { id: "acca", get label() { return T("5-game accumulator", "5-game acca"); }, get blurb() { return T("Everything must win. Odds from 12 to 45.", "Every game must win. Odds na 12 reach 45."); } },
  { id: "longshot", get label() { return T("Jackpot longshot", "Jackpot long shot"); }, get blurb() { return T("Tiny chance, huge payout. Odds 80 to 400.", "Chance small, but payout big well well. Odds na 80 reach 400."); } },
];

export function betBlock(p: Player, stake: number): string | null {
  if (p.age < 18) return T("Betting is for adults only (18+)", "Betting na for grown-ups only (18+)");
  if (!p.possessions.smartphone && !p.possessions.phone) return T("You need a phone", "You need phone");
  if (p.prison > 0) return T("Not from prison", "You no fit bet from prison");
  if (p.bets.slotsLeft <= 0) return T("No betting slots left this year", "No betting slot remain this year");
  if (stake <= 0) return T("Choose a stake", "Choose how much you go stake");
  if (p.money < stake) return T("Not enough cash", "Cash no reach");
  return null;
}

export function placeBet(p: Player, kind: BetKind, stake: number): string {
  const block = betBlock(p, stake);
  if (block) return block;
  p.bets.slotsLeft -= 1;
  p.bets.count += 1;
  p.bets.staked += stake;
  const odds = kind === "single" ? rand(1.4, 3.2) : kind === "acca" ? rand(12, 45) : rand(80, 400);
  const margin = kind === "single" ? 0.92 : kind === "acca" ? 0.84 : 0.7;
  const prob = clamp((1 / odds) * margin + luckBonus(p) / 20, 0.001, 0.8);
  transact(p, { amount: -stake, reason: T(`Bet placed: ${kind === "single" ? "single match" : kind === "acca" ? "accumulator" : "longshot"} (odds ${odds.toFixed(1)})`, `Bet wey you place: ${kind === "single" ? "single match" : kind === "acca" ? "acca" : "long shot"} (odds ${odds.toFixed(1)})`), category: "betting" });
  if (chance(prob)) {
    const win = Math.round(stake * odds);
    transact(p, { amount: win, reason: T(`Bet won (odds ${odds.toFixed(1)})`, `Bet enter (odds ${odds.toFixed(1)})`), category: "betting" });
    p.bets.won += win;
    p.bets.compulsion = clamp(p.bets.compulsion + 6);
    return T(`The bet enters! You win ${naira(win)}.`, `The bet don enter! You win ${naira(win)}.`);
  }
  p.bets.compulsion = clamp(p.bets.compulsion + 3);
  bump(p, "stress", 3);
  return T(`The bet loses. ${naira(stake)} gone.`, `The bet no enter. ${naira(stake)} don waka.`);
}

export const betProfit = (p: Player) => p.bets.won - p.bets.staked;

export const BET_EVENTS: EventDef[] = [
  {
    id: "betting_trouble",
    title: dual("The betting habit", "The betting habit"),
    weight: (p) => (p.age >= 18 && p.bets.compulsion > 55 ? 3 : 0),
    text: () => T("You check the betting app before you check on anything else. Your friends have started to notice.", "Na betting app you dey check first before anything else. Your padi dem don start to notice am."),
    choices: (p) => [
      { label: T("Seek help and self-exclude", "Go find help, block yourself"), sub: naira(p.money > 0 ? 30_000 * p.index : 0), run: (q) => { transact(q, { amount: -Math.min(q.money, 30_000 * q.index), reason: T("Counselling for gambling", "Counselling for gambling"), category: "health" }); q.bets.compulsion = clamp(q.bets.compulsion - 40); q.bets.slotsLeft = 0; bump(q, "stress", -4); return T("You admit it is a problem, talk to a counsellor and block the apps.", "You accept say na problem, talk to counsellor, then block the apps."); } },
      { label: T("Cut back on your own", "Reduce am by yourself"), run: (q) => { q.bets.compulsion = clamp(q.bets.compulsion - 15); return T("You promise yourself you will only bet small. Sometimes it works.", "You promise yourself say na small small you go dey bet. E dey work sometimes."); } },
      { label: T("Chase your losses", "Chase your loss"), run: (q) => { q.bets.compulsion = clamp(q.bets.compulsion + 10); bump(q, "stress", 8); const amt = Math.min(q.money, 80_000 * q.index); transact(q, { amount: -amt, reason: T("Chasing betting losses", "Dey chase betting loss"), category: "betting" }); return T("You bet more to win it back. It does not end well.", "You bet more to recover am. E no end well."); } },
    ],
  },
];
