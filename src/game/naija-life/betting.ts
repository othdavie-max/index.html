import { transact } from "./ledger";
import { bump, luckBonus } from "./helpers";
import type { EventDef, Player } from "./types";
import { chance, clamp, naira, rand } from "./util";

export type BetKind = "single" | "acca" | "longshot";

export const BET_KINDS: { id: BetKind; label: string; blurb: string }[] = [
  { id: "single", label: "Single match", blurb: "One game. Odds around 1.4 to 3.2." },
  { id: "acca", label: "5-game accumulator", blurb: "Everything must win. Odds from 12 to 45." },
  { id: "longshot", label: "Jackpot longshot", blurb: "Tiny chance, huge payout. Odds 80 to 400." },
];

export function betBlock(p: Player, stake: number): string | null {
  if (p.age < 18) return "Betting is for adults only (18+)";
  if (!p.possessions.smartphone && !p.possessions.phone) return "You need a phone";
  if (p.prison > 0) return "Not from prison";
  if (p.bets.slotsLeft <= 0) return "No betting slots left this year";
  if (stake <= 0) return "Choose a stake";
  if (p.money < stake) return "Not enough cash";
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
  transact(p, { amount: -stake, reason: `Bet placed: ${kind === "single" ? "single match" : kind === "acca" ? "accumulator" : "longshot"} (odds ${odds.toFixed(1)})`, category: "betting" });
  if (chance(prob)) {
    const win = Math.round(stake * odds);
    transact(p, { amount: win, reason: `Bet won (odds ${odds.toFixed(1)})`, category: "betting" });
    p.bets.won += win;
    p.bets.compulsion = clamp(p.bets.compulsion + 6);
    return `The bet enters! You win ${naira(win)}.`;
  }
  p.bets.compulsion = clamp(p.bets.compulsion + 3);
  bump(p, "stress", 3);
  return `The bet loses. ${naira(stake)} gone.`;
}

export const betProfit = (p: Player) => p.bets.won - p.bets.staked;

export const BET_EVENTS: EventDef[] = [
  {
    id: "betting_trouble",
    title: "The betting habit",
    weight: (p) => (p.age >= 18 && p.bets.compulsion > 55 ? 3 : 0),
    text: () => "You check the betting app before you check on anything else. Your friends have started to notice.",
    choices: (p) => [
      { label: "Seek help and self-exclude", sub: naira(p.money > 0 ? 30_000 * p.index : 0), run: (q) => { transact(q, { amount: -Math.min(q.money, 30_000 * q.index), reason: "Counselling for gambling", category: "health" }); q.bets.compulsion = clamp(q.bets.compulsion - 40); q.bets.slotsLeft = 0; bump(q, "stress", -4); return "You admit it is a problem, talk to a counsellor and block the apps."; } },
      { label: "Cut back on your own", run: (q) => { q.bets.compulsion = clamp(q.bets.compulsion - 15); return "You promise yourself you will only bet small. Sometimes it works."; } },
      { label: "Chase your losses", run: (q) => { q.bets.compulsion = clamp(q.bets.compulsion + 10); bump(q, "stress", 8); const amt = Math.min(q.money, 80_000 * q.index); transact(q, { amount: -amt, reason: "Chasing betting losses", category: "betting" }); return "You bet more to win it back. It does not end well."; } },
    ],
  },
];
