import { JOB_BY_ID } from "./data";
import { I, bump, enterPrison, luckBonus } from "./helpers";
import { transact } from "./ledger";
import type { Choice, EventDef, Player } from "./types";
import { chance, clamp, naira } from "./util";

export const SERVICE_JOBS = ["soldier", "navy", "airforce", "police"];
const ladderOf = (p: Player) => JOB_BY_ID[p.job?.id ?? "soldier"].ladder;
const rankTitle = (p: Player, rank: number) => ladderOf(p)[Math.min(rank, ladderOf(p).length - 1)].title;

/** Service record score from 0 to 100. */
export function meritOf(p: Player): number {
  const tours = Number(p.flags.tours) || 0;
  return Math.round(clamp(p.stats.fitness * 0.25 + p.stats.smarts * 0.2 + p.stats.reputation * 0.2 + tours * 9 + (p.job?.years ?? 0) * 2.5, 0, 100));
}

/** Years in rank needed before the board will consider you. */
export const boardYears = (rank: number) => (rank >= 2 ? 5 : 2);

export function boardDue(p: Player): boolean {
  const j = p.job;
  if (!j || !SERVICE_JOBS.includes(j.id) || p.flags.training || p.prison > 0) return false;
  if (j.rank >= ladderOf(p).length - 1) return false;
  return j.years >= boardYears(j.rank) && (j.years - boardYears(j.rank)) % 2 === 0;
}

function promote(q: Player): string {
  if (!q.job) return "";
  q.job.rank += 1;
  q.job.years = 0;
  bump(q, "happiness", 6);
  bump(q, "reputation", 3);
  const top = JOB_BY_ID[q.job.id].title;
  if (q.job.rank === ladderOf(q).length - 1 && !q.achievements.includes(`Top of ${top}`)) q.achievements.push(`Top of ${top}`);
  return rankTitle(q, q.job.rank);
}

export const MILITARY_EVENTS: EventDef[] = [
  {
    id: "promotion_board",
    title: "Promotion board",
    weight: () => 0,
    valid: (p) => Boolean(p.job && SERVICE_JOBS.includes(p.job.id) && p.job.rank < ladderOf(p).length - 1),
    text: (p) => {
      const rank = p.job?.rank ?? 0;
      return `The promotion board sits for the next rank: ${rankTitle(p, rank + 1)}. Your service record scores ${meritOf(p)} out of 100${rank >= 2 ? ". Only a handful of officers reach the very top." : "."}`;
    },
    choices: (p) => {
      const rank = p.job?.rank ?? 0;
      const merit = meritOf(p);
      const top = rank >= 2 ? 0.45 : 1;
      const fee = Math.round(I(p, 400_000 * (rank + 1)));
      const result = (win: boolean, q: Player, extraFail = ""): string => {
        if (win) return `Your name is on the list. You are now ${promote(q)}.${extraFail}`;
        bump(q, "stress", 5);
        return "You are passed over this time. A younger officer with better friends is promoted.";
      };
      const out: Choice[] = [
        { label: "Stand on your record", sub: `Merit ${merit}/100`, run: (q) => result(chance(clamp((0.12 + merit / 150 + luckBonus(q)) * top, 0.04, 0.8)), q) },
        {
          label: "Ask a godfather in the high command to speak for you",
          sub: "Needs connections 35+",
          disabled: p.stats.connections < 35 ? "Not enough connections" : false,
          run: (q) => {
            const win = chance(clamp((0.4 + q.stats.connections / 220) * Math.max(top, 0.6), 0.1, 0.85));
            if (!win) bump(q, "reputation", -3);
            else q.flags.indebtedToGodfather = true;
            return result(win, q, " You know you now owe someone a favour.");
          },
        },
        {
          label: "Pay the board a 'processing fee'",
          sub: naira(fee),
          disabled: p.money < fee ? "Not enough cash" : false,
          run: (q) => {
            transact(q, { amount: -fee, reason: "Payment to the promotion board", category: "other" });
            if (chance(0.14 + (rank >= 2 ? 0.08 : 0))) {
              bump(q, "reputation", -14);
              if (rank === 0) { q.job = null; return `An anonymous petition exposes it. You are dismissed from the service.${enterPrison(q, 1)}`; }
              if (q.job) { q.job.rank = Math.max(0, q.job.rank - 1); q.job.years = 0; }
              return "The payment is discovered. You are demoted and a note goes on your record.";
            }
            return result(chance(0.72 * Math.max(top, 0.6)), q);
          },
        },
        { label: "Wait another year", run: (q) => { bump(q, "stress", -1); return "You keep your head down and build your record."; } },
      ];
      return out;
    },
  },
];
